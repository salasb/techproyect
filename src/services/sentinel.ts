import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

export type SentinelSeverity = 'S0' | 'S1' | 'S2' | 'S3';
export type SentinelType = 'STOCK_CRITICAL' | 'BUDGET_OVERFLOW' | 'INVOICE_OVERDUE' | 'STALE_PROJECT' | 'LOW_MARGIN' | 'QUOTE_FOLLOWUP';

export interface SentinelInsight {
    id: string;
    severity: 'high' | 'amber' | 'info';
    type: string;
    title: string;
    message: string;
    actionHref: string;
    actionLabel: string;
}

export class SentinelService {
    /**
     * Executes the rule engine for an organization and persists alerts/tasks.
     * @param organizationId The organization to analyze.
     * @param force If true, skips the 15-minute cache check.
     */
    static async runAnalysis(organizationId: string, force: boolean = false) {
        const supabase = await createClient();
        const now = new Date();

        // 1. Performance: 15-minute TTL Cache Check
        if (!force) {
            const { data: stats } = await supabase
                .from('OrganizationStats')
                .select('lastSentinelRunAt')
                .eq('organizationId', organizationId)
                .maybeSingle(); // Better handle empty

            if (stats?.lastSentinelRunAt) {
                const lastRun = new Date(stats.lastSentinelRunAt);
                const diffMins = Math.floor((now.getTime() - lastRun.getTime()) / (1000 * 60));
                if (diffMins < 15) return; // Skip if run recently
            }
        }

        // 2. Fetch Thresholds
        const { data: org } = await supabase.from('Organization').select('settings').eq('id', organizationId).maybeSingle();
        const settings = (org?.settings as any) || {};
        const thresholds = {
            marginMin: settings.sentinel_margin_min || 15,
            staleDays: settings.sentinel_stale_project_days || 7,
            quoteFollowupDays: settings.sentinel_quote_followup_days || 5,
        };

        // 3. Rule: Low Margin (S0)
        const { data: projects } = await supabase.from('Project').select('*').eq('organizationId', organizationId).neq('status', 'CERRADO');
        if (projects) {
            for (const p of projects) {
                if (p.marginPct * 100 < thresholds.marginMin) {
                    await this.triggerAlert(organizationId, {
                        type: 'LOW_MARGIN',
                        severity: 'S0',
                        title: `Margen Crítico: ${p.name}`,
                        message: `El margen proyectado (${(p.marginPct * 100).toFixed(1)}%) es inferior al umbral del ${thresholds.marginMin}%.`,
                        metadata: { projectId: p.id }
                    });
                }
            }
        }

        // 4. Rule: Stock Critical (S1)
        const { data: stockItems } = await supabase.from('Product').select('*').eq('organizationId', organizationId);
        if (stockItems) {
            for (const item of stockItems) {
                if (item.stock <= (item.min_stock || 0)) {
                    await this.triggerAlert(organizationId, {
                        type: 'STOCK_CRITICAL',
                        severity: 'S1',
                        title: `Quiebre de Stock: ${item.name}`,
                        message: `Stock actual: ${item.stock}. Mínimo configurado: ${item.min_stock}.`,
                        metadata: { productId: item.id },
                        createTask: true,
                        taskTitle: `Reponer stock: ${item.name}`
                    });
                }
            }
        }

        // 5. Rule: Budget Overflow (S1)
        if (projects) {
            for (const p of projects) {
                const { data: costs } = await supabase.from('CostEntry')
                    .select('amountNet')
                    .eq('projectId', p.id)
                    .eq('organizationId', organizationId); // Multi-tenancy check

                const totalCost = costs?.reduce((sum, c) => sum + c.amountNet, 0) || 0;
                if (p.budgetNet > 0 && totalCost > p.budgetNet) {
                    await this.triggerAlert(organizationId, {
                        type: 'BUDGET_OVERFLOW',
                        severity: 'S1',
                        title: `Presupuesto Excedido: ${p.name}`,
                        message: `Costos actuales ($${totalCost.toLocaleString()}) superan el presupuesto neto ($${p.budgetNet.toLocaleString()}).`,
                        metadata: { projectId: p.id },
                        createTask: true,
                        taskTitle: `Auditar costos excedidos: ${p.name}`
                    });
                }
            }
        }

        // 6. Rule: Stale Project (S2)
        if (projects) {
            for (const p of projects) {
                const updatedAt = new Date(p.updatedAt);
                const diffDays = Math.ceil(Math.abs(now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays > thresholds.staleDays) {
                    await this.triggerAlert(organizationId, {
                        type: 'STALE_PROJECT',
                        severity: 'S2',
                        title: `Proyecto Estancado: ${p.name}`,
                        message: `Sin actividad registrada en los últimos ${diffDays} días.`,
                        metadata: { projectId: p.id },
                        createTask: true,
                        taskTitle: `Revisar estado de proyecto: ${p.name}`
                    });
                }
            }
        }

        // 7. Rule: Quote Follow-up (S2)
        const { data: pendingQuotes } = await supabase.from('Quote')
            .select('*, project:Project(name, company:Company(name))')
            .eq('organizationId', organizationId) // Multi-tenancy fix
            .eq('status', 'SENT');

        if (pendingQuotes) {
            for (const q of pendingQuotes) {
                const sentAt = new Date(q.updatedAt);
                const diffDays = Math.ceil(Math.abs(now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays > thresholds.quoteFollowupDays) {
                    await this.triggerAlert(organizationId, {
                        type: 'QUOTE_FOLLOWUP',
                        severity: 'S2',
                        title: `Seguimiento Cotización: ${(q as any).project?.name}`,
                        message: `Enviada hace ${diffDays} días sin respuesta del cliente (${(q as any).project?.company?.name}).`,
                        metadata: { quoteId: q.id, projectId: q.projectId },
                        createTask: true,
                        taskTitle: `Llamar para seguimiento v${q.version}: ${(q as any).project?.name}`
                    });
                }
            }
        }

        // 8. Rule: Invoice Near Due (S3)
        const in2Days = new Date(now);
        in2Days.setDate(now.getDate() + 2);
        const { data: invoices } = await supabase.from('Invoice')
            .select('*, project:Project(name)')
            .eq('organizationId', organizationId) // Multi-tenancy fix
            .eq('sent', true);

        if (invoices) {
            for (const inv of invoices) {
                if (inv.dueDate) {
                    const dueDate = new Date(inv.dueDate);
                    if (dueDate.toDateString() === in2Days.toDateString()) {
                        await this.triggerAlert(organizationId, {
                            type: 'INVOICE_OVERDUE',
                            severity: 'S3',
                            title: `Vencimiento Próximo: ${inv.id.slice(0, 8)}`,
                            message: `La factura del proyecto "${(inv as any).project?.name}" vence en 48 horas.`,
                            metadata: { invoiceId: inv.id, projectId: inv.projectId },
                            createTask: true,
                            taskTitle: `Recordatorio de pago: ${(inv as any).project?.name}`
                        });
                    }
                }
            }
        }

        // 9. Update lastSentinelRunAt
        await supabase.from('OrganizationStats').upsert({
            organizationId,
            lastSentinelRunAt: now.toISOString()
        }, { onConflict: 'organizationId' });
    }

    /**
     * Internal helper to create an alert and optionally a task.
     * Prevents duplicate alerts and tasks for the same condition.
     */
    private static async triggerAlert(organizationId: string, params: {
        type: SentinelType,
        severity: SentinelSeverity,
        title: string,
        message: string,
        metadata: any,
        createTask?: boolean,
        taskTitle?: string
    }) {
        const supabase = await createClient();

        // 1. Idempotency Check: Existing Open Alert
        const { data: existingAlert } = await supabase.from('SentinelAlert')
            .select('id')
            .eq('organizationId', organizationId)
            .eq('type', params.type)
            .eq('status', 'OPEN')
            .contains('metadata', params.metadata)
            .maybeSingle();

        // 2. Alert Generation
        if (!existingAlert) {
            await supabase.from('SentinelAlert').insert({
                organizationId,
                type: params.type,
                severity: params.severity,
                title: params.title,
                message: params.message,
                metadata: params.metadata,
                status: 'OPEN'
            });
        }

        // 3. Task Generation with Deduplication
        if (params.createTask && params.taskTitle && params.metadata.projectId) {
            const { data: existingTask } = await supabase.from('Task')
                .select('id')
                .eq('organizationId', organizationId)
                .eq('projectId', params.metadata.projectId)
                .eq('title', params.taskTitle)
                .eq('status', 'PENDING')
                .eq('type', 'SENTINEL')
                .maybeSingle();

            if (!existingTask) {
                await supabase.from('Task').insert({
                    organizationId,
                    projectId: params.metadata.projectId,
                    title: params.taskTitle,
                    description: `Generada automáticamente por Sentinel: ${params.message}`,
                    priority: params.severity === 'S0' || params.severity === 'S1' ? 1 : 0,
                    type: 'SENTINEL',
                    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
                });
            }
        }
    }

    /**
     * Gets active alerts for an organization.
     */
    static async getActiveAlerts(organizationId: string) {
        const supabase = await createClient();
        return supabase.from('SentinelAlert')
            .select('*')
            .eq('organizationId', organizationId)
            .neq('status', 'RESOLVED')
            .order('severity', { ascending: true })
            .order('createdAt', { ascending: false });
    }

    /**
     * Get a high-level system health summary for Superadmins
     */
    static async getGlobalSystemHealth() {
        const supabase = await createClient();

        // Count active organizations with serious alerts (S0, S1)
        const { data: alerts } = await supabase
            .from('SentinelAlert')
            .select('severity, status')
            .in('severity', ['S0', 'S1'])
            .eq('status', 'OPEN');

        const { count: orgCount } = await supabase
            .from('Organization')
            .select('*', { count: 'exact', head: true });

        const criticalCount = alerts?.length || 0;

        return {
            status: criticalCount > (orgCount || 0) * 0.5 ? 'review' : 'optimal',
            checksCount: 5, // Number of rules active
            criticalAlerts: criticalCount,
            lastGlobalCheck: new Date().toISOString()
        };
    }

    /**
     * Updates organization statistics for Superadmin dashboard.
     */
    static async updateOrgStats(organizationId: string) {
        const supabase = await createClient();

        // 1. Count modules usage
        const [crmRes, quotesRes, projectsRes, invRes] = await Promise.all([
            supabase.from('Opportunity').select('*', { count: 'exact', head: true }).eq('organizationId', organizationId),
            supabase.from('Quote').select('*', { count: 'exact', head: true }).eq('organizationId', organizationId),
            supabase.from('Project').select('*', { count: 'exact', head: true }).eq('organizationId', organizationId),
            supabase.from('Product').select('*', { count: 'exact', head: true }).eq('organizationId', organizationId)
        ]);

        // 2. Activation metric (Days to 1st Quote)
        let daysToFirstQuote = null;
        const { data: firstQuote } = await supabase.from('Quote')
            .select('createdAt')
            .eq('organizationId', organizationId)
            .order('createdAt', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (firstQuote) {
            const { data: org } = await supabase.from('Organization').select('createdAt').eq('id', organizationId).maybeSingle();
            if (org) {
                const diff = new Date(firstQuote.createdAt).getTime() - new Date(org.createdAt).getTime();
                daysToFirstQuote = Math.floor(diff / (1000 * 60 * 60 * 24));
            }
        }

        // 3. Upsert Stats
        await supabase.from('OrganizationStats').upsert({
            organizationId,
            crmCount: crmRes.count || 0,
            quotesCount: quotesRes.count || 0,
            projectsCount: projectsRes.count || 0,
            inventoryCount: invRes.count || 0,
            daysToFirstQuote,
            lastActivityAt: new Date().toISOString()
        }, { onConflict: 'organizationId' });
    }
}

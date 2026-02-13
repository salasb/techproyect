import { Database } from '@/types/supabase';
import { calculateProjectFinancials } from './financialCalculator';

type Project = Database['public']['Tables']['Project']['Row'] & {
    company: Database['public']['Tables']['Company']['Row'] | null;
    invoices: Database['public']['Tables']['Invoice']['Row'][];
    costEntries: Database['public']['Tables']['CostEntry']['Row'][];
    quoteItems: Database['public']['Tables']['QuoteItem']['Row'][];
};

export class DashboardService {
    static getFocusBoardData(projects: Project[], settings: Database['public']['Tables']['Settings']['Row']) {
        const blockedProjects = projects
            .filter(p => p.status === 'BLOQUEADO')
            .map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
                companyName: p.company?.name || 'Sin Cliente',
                nextAction: p.nextAction,
                nextActionDate: p.nextActionDate,
                blockingReason: p.blockingReason
            }));

        const focusProjects = projects
            .filter(p => p.status === 'EN_CURSO' || p.status === 'EN_ESPERA')
            .sort((a, b) => {
                if (!a.nextActionDate) return 1;
                if (!b.nextActionDate) return -1;
                return new Date(a.nextActionDate).getTime() - new Date(b.nextActionDate).getTime();
            })
            .map(p => {
                // Calculate Financial Health
                const fin = calculateProjectFinancials(p, p.costEntries, p.invoices, settings, p.quoteItems);

                return {
                    id: p.id,
                    name: p.name,
                    status: p.status,
                    companyName: p.company?.name || 'Sin Cliente',
                    companyContactName: p.company?.contactName,
                    companyPhone: p.company?.phone,
                    companyEmail: p.company?.email,
                    nextAction: p.nextAction,
                    nextActionDate: p.nextActionDate,
                    blockingReason: p.blockingReason,
                    financialHealth: fin.trafficLightFinancial // Pass health status
                };
            });

        return { blockedProjects, focusProjects };
    }

    static getActionCenterData(projects: Project[], settings: Database['public']['Tables']['Settings']['Row']) {
        const actions: {
            id: string;
            projectId: string;
            projectName: string;
            companyName: string;
            type: 'CALL' | 'EMAIL' | 'TASK' | 'BLOCKER';
            title: string;
            dueDate?: Date;
            isOverdue?: boolean;
            priority: 'HIGH' | 'MEDIUM' | 'LOW';
        }[] = [];

        const now = new Date();

        projects.forEach(p => {
            // 1. Blockers (High Priority)
            if (p.status === 'BLOQUEADO') {
                actions.push({
                    id: `block-${p.id}`,
                    projectId: p.id,
                    projectName: p.name,
                    companyName: p.company?.name || 'Sin Cliente',
                    type: 'BLOCKER',
                    title: p.blockingReason || 'Proyecto Bloqueado',
                    priority: 'HIGH',
                    dueDate: new Date(p.updatedAt)
                });
            }

            // 2. Next Actions (Medium/High based on date)
            if ((p.status === 'EN_CURSO' || p.status === 'EN_ESPERA') && p.nextAction) {
                const actionDate = p.nextActionDate ? new Date(p.nextActionDate) : null;
                const isOverdue = actionDate ? actionDate < now : false;
                const isToday = actionDate ? actionDate.toDateString() === now.toDateString() : false;

                const lowerAction = p.nextAction.toLowerCase();
                let type: 'CALL' | 'EMAIL' | 'TASK' = 'TASK';
                if (lowerAction.includes('llamar') || lowerAction.includes('call')) type = 'CALL';
                else if (lowerAction.includes('correo') || lowerAction.includes('mail') || lowerAction.includes('enviar')) type = 'EMAIL';

                if (isOverdue || isToday) {
                    actions.push({
                        id: `action-${p.id}`,
                        projectId: p.id,
                        projectName: p.name,
                        companyName: p.company?.name || 'Sin Cliente',
                        type: type,
                        title: p.nextAction,
                        dueDate: actionDate || undefined,
                        isOverdue: isOverdue,
                        priority: isOverdue ? 'HIGH' : 'MEDIUM'
                    });
                }
            }

            // 3. Stale Quotes (Sent > 5 days ago)
            if (p.status === 'EN_ESPERA') {
                const updated = new Date(p.updatedAt);
                const diffTime = Math.abs(now.getTime() - updated.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 5) {
                    actions.push({
                        id: `stale-quote-${p.id}`,
                        projectId: p.id,
                        projectName: p.name,
                        companyName: p.company?.name || 'Sin Cliente',
                        type: 'EMAIL',
                        title: `Seguimiento Cotización (${diffDays} días)`,
                        dueDate: now,
                        isOverdue: true,
                        priority: 'HIGH'
                    });
                }
            }
        });

        // Sort by priority (HIGH first) then by date
        return actions.sort((a, b) => {
            if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
            if (a.priority !== 'HIGH' && b.priority === 'HIGH') return 1;
            if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
            return 0;
        });
    }

    static getFinancialTrends(projects: Project[], period: string = '6m') {
        const now = new Date();
        let startDate = new Date();
        let dateFormat: 'day' | 'month' = 'month';

        switch (period) {
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                dateFormat = 'day';
                break;
            case '6m':
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                dateFormat = 'month';
                break;
            case '12m':
                startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
                dateFormat = 'month';
                break;
            case 'all':
                startDate = new Date(0);
                dateFormat = 'month';
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        }

        const dataMap = new Map<string, { label: string, income: number, cost: number, profit: number, dateVal: number }>();

        // Pre-fill last X months if using monthly view
        if (dateFormat === 'month' && period !== 'all') {
            const monthsBack = period === '12m' ? 12 : 6;
            for (let i = monthsBack - 1; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = d.toLocaleString('es-CL', { month: 'short', year: '2-digit' });
                const label = d.toLocaleString('es-CL', { month: 'short' });
                dataMap.set(key, {
                    label: label.charAt(0).toUpperCase() + label.slice(1),
                    income: 0,
                    cost: 0,
                    profit: 0,
                    dateVal: d.getTime()
                });
            }
        }

        projects.forEach(p => {
            // Cost (Expenses)
            p.costEntries?.forEach((c) => {
                const d = new Date(c.date);
                if (d >= startDate) {
                    const key = dateFormat === 'day'
                        ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
                        : d.toLocaleString('es-CL', { month: 'short', year: '2-digit' });

                    const label = dateFormat === 'day'
                        ? d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
                        : d.toLocaleString('es-CL', { month: 'short' });

                    if (!dataMap.has(key)) {
                        dataMap.set(key, {
                            label: label.charAt(0).toUpperCase() + label.slice(1),
                            income: 0,
                            cost: 0,
                            profit: 0,
                            dateVal: dateFormat === 'day' ? d.getTime() : new Date(d.getFullYear(), d.getMonth(), 1).getTime()
                        });
                    }
                    dataMap.get(key)!.cost += c.amountNet;
                }
            });

            // Income (Invoices Sent)
            p.invoices?.forEach((inv) => {
                if (inv.sent && inv.sentDate) {
                    const d = new Date(inv.sentDate);
                    if (d >= startDate) {
                        const key = dateFormat === 'day'
                            ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
                            : d.toLocaleString('es-CL', { month: 'short', year: '2-digit' });

                        const label = dateFormat === 'day'
                            ? d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
                            : d.toLocaleString('es-CL', { month: 'short' });

                        if (!dataMap.has(key)) {
                            dataMap.set(key, {
                                label: label.charAt(0).toUpperCase() + label.slice(1),
                                income: 0,
                                cost: 0,
                                profit: 0,
                                dateVal: dateFormat === 'day' ? d.getTime() : new Date(d.getFullYear(), d.getMonth(), 1).getTime()
                            });
                        }
                        dataMap.get(key)!.income += inv.amountInvoicedGross; // Using Gross for Cash Flow representation
                    }
                }
            });
        });

        // Calculate Profit and Format
        return Array.from(dataMap.values())
            .map(item => ({
                ...item,
                profit: item.income - item.cost,
                name: item.label // Compatibility with Recharts naming
            }))
            .sort((a, b) => a.dateVal - b.dateVal);
    }

    static getTopClients(projects: Project[]) {
        const clientMap = new Map<string, number>();
        projects.forEach((p) => {
            const cName = p.company?.name || 'Sin Cliente';
            // Determine active contract value (e.g., Sold)
            // Ideally we sum up quote items. But simplified: use 'budget' or 'price' if calculated.
            // Since we pass raw projects here, we might need to rely on 'budget' field if available or sum invoices?
            // Let's use Sum of Invoices for "Revenue" or Budget for "Sales Volume".
            // The prompt implies "Revenue" (Ingresos). Let's sum Invoiced Amount.
            const revenue = p.invoices?.reduce((acc, inv) => acc + (inv.sent ? inv.amountInvoicedGross : 0), 0) || 0;
            clientMap.set(cName, (clientMap.get(cName) || 0) + revenue);
        });

        return Array.from(clientMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7); // Top 7
    }

    static getProjectMargins(processedProjects: any[]) {
        // Accepts projects that already have 'financials' calculated
        return processedProjects
            .filter((p: any) => p.financials.priceNet > 0)
            .sort((a: any, b: any) => b.financials.priceNet - a.financials.priceNet)
            .slice(0, 10)
            .map((p: any) => ({
                name: p.name.substring(0, 15) + (p.name.length > 15 ? '...' : ''),
                marginPct: p.financials.priceNet > 0 ? (p.financials.marginAmountNet / p.financials.priceNet) * 100 : 0
            }));
    }

    static getCashFlowProjection(projects: Project[]) {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1); // Start of next month
        const threeMonthsLater = new Date(now.getFullYear(), now.getMonth() + 4, 1); // 3 months window

        const projectionMap = new Map<string, number>();

        // Init buckets
        for (let i = 0; i < 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
            const key = d.toLocaleString('es-CL', { month: 'long', year: 'numeric' });
            projectionMap.set(key, 0);
        }

        projects.forEach(p => {
            p.invoices?.forEach(inv => {
                if (inv.sent && !inv.amountPaidGross) { // Sent but not fully paid (simplified check)
                    // In a real scenario, we'd check balance due. Here assuming checks "Paid" status or amount.
                    // Let's assume calculated fields earlier handle "Receivable". 
                    // But here we work with raw invoices. 
                    // If amountPaidGross < amountInvoicedGross, it's pending.

                    if (inv.amountPaidGross < inv.amountInvoicedGross) {
                        const amountDue = inv.amountInvoicedGross - inv.amountPaidGross;
                        let dueDate = inv.dueDate ? new Date(inv.dueDate) : null;

                        // If no due date, assume Sent Date + 30 days
                        if (!dueDate && inv.sentDate) {
                            dueDate = new Date(inv.sentDate);
                            dueDate.setDate(dueDate.getDate() + 30);
                        }

                        if (dueDate) {
                            if (dueDate >= nextMonth && dueDate < threeMonthsLater) {
                                const key = dueDate.toLocaleString('es-CL', { month: 'long', year: 'numeric' });
                                if (projectionMap.has(key)) {
                                    projectionMap.set(key, (projectionMap.get(key) || 0) + amountDue);
                                }
                            }
                        }
                    }
                }
            });
        });

        return Array.from(projectionMap.entries())
            .map(([month, amount]) => ({
                name: month,
                value: amount
            }));
    }

    static getAlerts(projects: Project[], settings: Database['public']['Tables']['Settings']['Row']) {
        const alerts: { type: 'danger' | 'warning', message: string, link?: string }[] = [];
        const now = new Date();

        projects.forEach(p => {
            // 1. Low Margin Alerts (Active Projects only)
            if (p.status === 'EN_CURSO' || p.status === 'EN_ESPERA') {
                const fin = calculateProjectFinancials(p, p.costEntries, p.invoices, settings, p.quoteItems);
                // Check Traffic Light Financial directly
                if (fin.trafficLightFinancial === 'RED') {
                    alerts.push({
                        type: 'danger',
                        message: `Bajo Margen: ${p.name}`,
                        link: `/projects/${p.id}/financials`
                    });
                }

                // Check Budget Execution (Profitability Assistant)
                if (fin.calculatedProgress >= 80 && fin.calculatedProgress < 100) {
                    alerts.push({
                        type: 'warning',
                        message: `Presupuesto al ${Math.round(fin.calculatedProgress)}%: ${p.name}`,
                        link: `/projects/${p.id}/financials`
                    });
                } else if (fin.calculatedProgress >= 100) {
                    alerts.push({
                        type: 'danger',
                        message: `Presupuesto Excedido (${Math.round(fin.calculatedProgress)}%): ${p.name}`,
                        link: `/projects/${p.id}/financials`
                    });
                }
            }

            // 2. Overdue Invoices
            p.invoices?.forEach(inv => {
                if (inv.sent && !inv.amountPaidGross) {
                    // Check if Overdue
                    let dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
                    if (!dueDate && inv.sentDate) {
                        const terms = inv.paymentTermsDays ?? settings.defaultPaymentTermsDays;
                        dueDate = new Date(inv.sentDate);
                        dueDate.setDate(dueDate.getDate() + terms);
                    }

                    if (dueDate && dueDate < now) {
                        // It is overdue
                        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysOverdue > 7) { // Only alert if > 7 days late to reduce noise
                            alerts.push({
                                type: 'warning',
                                message: `Pago Atrasado (${daysOverdue} días): ${p.name}`,
                                link: `/projects/${p.id}/invoices`
                            });
                        }
                    }
                }
            });
        });

        return alerts.slice(0, 10); // Limit to 10 alerts
    }

    static getUpcomingDeadlines(projects: Project[], settings: Database['public']['Tables']['Settings']['Row']) {
        const deadlines: {
            id: string;
            title: string;
            date: Date;
            type: 'INVOICE' | 'DELIVERY' | 'MEETING';
            entityName: string;
            subtext?: string;
            link?: string;
        }[] = [];

        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 14); // Look ahead 2 weeks

        projects.forEach(p => {
            // 1. Upcoming Invoices to Collect (Sent but not Paid)
            p.invoices?.forEach(inv => {
                if (inv.sent && !inv.amountPaidGross) {
                    let dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
                    if (!dueDate && inv.sentDate) {
                        const terms = inv.paymentTermsDays ?? settings.defaultPaymentTermsDays;
                        dueDate = new Date(inv.sentDate);
                        dueDate.setDate(dueDate.getDate() + terms);
                    }

                    if (dueDate && dueDate >= now && dueDate <= nextWeek) {
                        deadlines.push({
                            id: `inv-${inv.id}`,
                            title: `Vencimiento Factura`,
                            date: dueDate,
                            type: 'INVOICE',
                            entityName: p.company?.name || p.name,
                            subtext: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(inv.amountInvoicedGross),
                            link: `/projects/${p.id}/invoices`
                        });
                    }
                }
            });

            // 2. Next Actions with Dates (Meetings, Follow-ups)
            if (p.status === 'EN_CURSO' || p.status === 'EN_ESPERA') {
                if (p.nextActionDate && p.nextAction) {
                    const date = new Date(p.nextActionDate);
                    if (date >= now && date <= nextWeek) {
                        deadlines.push({
                            id: `action-${p.id}`,
                            title: p.nextAction,
                            date: date,
                            type: 'MEETING',
                            entityName: p.company?.name || p.name,
                            subtext: 'Próxima Acción',
                            link: `/projects/${p.id}`
                        });
                    }
                }
            }

            // 3. Project Planned End Date
            if (p.status === 'EN_CURSO' && p.plannedEndDate) {
                const date = new Date(p.plannedEndDate);
                if (date >= now && date <= nextWeek) {
                    deadlines.push({
                        id: `end-${p.id}`,
                        title: 'Entrega de Proyecto',
                        date: date,
                        type: 'DELIVERY',
                        entityName: p.company?.name || p.name,
                        subtext: 'Fecha de Término Planificada',
                        link: `/projects/${p.id}`
                    });
                }
            }
        });

        return deadlines.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 10);
    }

    static getGlobalKPIs(projects: Project[], opportunities: any[], period: string, settings: Database['public']['Tables']['Settings']['Row'], dollarValue: number) {
        const now = new Date();
        let startDate = new Date();
        let previousStartDate = new Date();
        let previousEndDate = new Date();

        // 1. Define Filter Ranges
        if (period === '30d') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            previousEndDate = startDate;
        } else if (period === '7d') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            previousEndDate = startDate;
        } else if (period === '12m') {
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            previousStartDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
            previousEndDate = startDate;
        } else {
            // Default 30d
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            previousEndDate = startDate;
        }

        // Helper to sum logic
        const calculateMetrics = (start: Date, end: Date) => {
            let billing = 0;
            let cost = 0;
            let margin = 0;

            projects.forEach(p => {
                const isUsd = p.currency === 'USD';
                const rate = isUsd ? dollarValue : 1;

                // Billing (Invoices Sent/Paid in range)
                // Using 'sentDate' for "Facturación" (Billing) as typical in Sales Dashboards, or 'amountPaid' for Cash Flow.
                // Request says "Facturación Real" -> usually Invoiced. 
                p.invoices?.forEach(inv => {
                    if (inv.sent && inv.sentDate) {
                        const d = new Date(inv.sentDate);
                        if (d >= start && d < end) {
                            billing += (inv.amountInvoicedGross * rate);
                        }
                    }
                });

                // Margin (Price - Cost) *for projects updated/active in range*? 
                // Or Margin of *invoiced* items?
                // Global Margin is tricky providing limited data. 
                // Let's approximate: Global Margin of *Invoices* in this period.
                // Est. Margin % * Invoiced Amount.
                // If we don't have itemized invoice cost, we use Project Margin % * Invoice Amount.

                // Calculate Project Margin %
                const fin = calculateProjectFinancials(p, p.costEntries, p.invoices, settings, p.quoteItems);
                const marginPct = fin.priceNet > 0 ? fin.marginAmountNet / fin.priceNet : 0;

                p.invoices?.forEach(inv => {
                    if (inv.sent && inv.sentDate) {
                        const d = new Date(inv.sentDate);
                        if (d >= start && d < end) {
                            // Net Billing approx (assuming VAT included in Gross)
                            const vatRate = settings.vatRate || 0.19;
                            const amountNet = inv.amountInvoicedGross / (1 + vatRate);
                            margin += (amountNet * marginPct * rate);
                        }
                    }
                });
            });

            return { billing, margin };
        };

        const current = calculateMetrics(startDate, now);
        const previous = calculateMetrics(previousStartDate, previousEndDate);

        // Opportunities (Pipeline)
        // 1. From Opportunity Table (if exists/used)
        let pipelineValue = opportunities
            .filter(op => op.stage !== 'WON' && op.stage !== 'LOST')
            .reduce((acc, op) => acc + (op.value || 0), 0);

        let pipelineCount = opportunities.filter(op => op.stage !== 'WON' && op.stage !== 'LOST').length;

        // 2. From Projects in "EN_ESPERA" (Waiting for Quote Acceptance)
        // This ensures the dashboard shows value even if Opportunity table is empty
        const pendingProjects = projects.filter(p => p.status === 'EN_ESPERA');

        pendingProjects.forEach(p => {
            const isUsd = p.currency === 'USD';
            const rate = isUsd ? dollarValue : 1;

            // Calculate project value (Quote Price)
            const fin = calculateProjectFinancials(p, p.costEntries, p.invoices, settings, p.quoteItems);
            // Default to using Net Price (Revenue potential)
            // If project is generic (no items), might be 0.
            if (fin.priceNet > 0) {
                pipelineValue += (fin.priceNet * rate); // Or Gross? Standard is usually Deal Value (likely Net or Gross depending on org). Let's use Net for consistency with Margin.
            }
        });

        pipelineCount += pendingProjects.length;


        const calcTrend = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        // 6. Total Margin (Projected vs Earned)
        let projectedMargin = 0;
        let earnedMargin = 0;

        projects.forEach(p => {
            const isUsd = p.currency === 'USD';
            const rate = isUsd ? dollarValue : 1;

            const fin = calculateProjectFinancials(p, p.costEntries, p.invoices, settings, p.quoteItems);
            const margin = (fin.marginAmountNet || 0) * rate;

            // Projected: All non-cancelled projects contribute to potential/projected margin
            if (p.status !== 'CANCELADO') {
                projectedMargin += margin;
            }

            // Earned: Only projects that are effectively "Won" (En Curso, Finalizado)
            // Casting to string to avoid TS error if types are stale (FINALIZADO vs CERRADO)
            if (p.status === 'EN_CURSO' || (p.status as string) === 'FINALIZADO') {
                earnedMargin += margin;
            }
        });

        return {
            billing: {
                value: current.billing,
                previous: previous.billing,
                trend: calcTrend(current.billing, previous.billing)
            },
            margin: {
                value: current.margin,
                previous: previous.margin,
                trend: calcTrend(current.margin, previous.margin)
            },
            earnedMargin, // NEW
            projectedMargin, // NEW
            pipeline: {
                value: pipelineValue,
                count: pipelineCount
            }
        };
    }
}

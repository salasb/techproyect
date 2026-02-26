import prisma from "@/lib/prisma";
import {
    SuperadminAlertType,
    SuperadminAlertSeverity,
    SuperadminAlert
} from "@prisma/client";
import { OperationalStateRepo, OperationalMetadataV46 } from "./operational-state-repo";
import { getPlaybookByRule } from "./playbooks-catalog";

interface NotificationMetadata {
    orgId: string;
    severity: string;
    href?: string;
    ruleCode?: string;
    fingerprint?: string;
    isEscalation?: boolean;
}

export class AlertsService {
    /**
     * Ensures the current user is a SUPERADMIN (Unified check)
     */
    private static async ensureSuperadmin() {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        
        if (!access.ok) {
            console.warn(`[AlertsService] ensureSuperadmin: unauthorized user=${access.email} reason=${access.denyReason}`);
            throw new Error("Unauthorized: Superadmin access required");
        }

        if (access.isAllowlisted && !access.isDbSuperadmin) {
            console.log(`[AlertsService] Superadmin authorized via ALLOWLIST for ${access.email} (DB sync pending)`);
        }

        console.log(`[AlertsService] ensureSuperadmin: success for ${access.email}`);
        return { id: access.userId, email: access.email };
    }

    /**
     * Run evaluation for all organizations.
     * v4.6.0: Orchestration + SLA + Playbooks
     */
    static async runAlertsEvaluation(providedTraceId?: string) {
        const adminUser = await this.ensureSuperadmin();
        const startTime = Date.now();
        const traceId = providedTraceId || `EVAL-${Math.random().toString(36).substring(7).toUpperCase()}`;

        const organizations = await prisma.organization.findMany({
            include: {
                subscription: true,
                stats: true,
                _count: {
                    select: { OrganizationMember: true, projects: true }
                }
            }
        });

        const now = new Date();
        const results = { created: 0, updated: 0, resolved: 0, escalated: 0 };

        for (const org of organizations) {
            const activeAlerts = await prisma.superadminAlert.findMany({
                where: { organizationId: org.id, status: { in: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] } }
            });

            // Rule 1: BILLING_PAST_DUE (CRITICAL)
            const isPastDue = ['PAST_DUE', 'UNPAID'].includes(org.subscription?.status || '');
            await this.evaluateRule(
                org.id,
                'BILLING_PAST_DUE',
                isPastDue,
                {
                    severity: 'CRITICAL',
                    title: 'Riesgo de Suspensión: Pago Vencido',
                    description: `La organización ${org.name} (${org.id.substring(0,8)}) tiene facturas vencidas con estado ${org.subscription?.status}.`,
                    reasonCodes: ['SUBSCRIPTION_OVERDUE', org.subscription?.status || 'UNKNOWN'],
                    href: `/admin/orgs/${org.id}`
                },
                activeAlerts,
                results,
                traceId
            );

            // Rule 1.5: BILLING_NOT_CONFIGURED (WARNING)
            const noBilling = org.status === 'ACTIVE' && !org.subscription?.providerCustomerId;
            await this.evaluateRule(
                org.id,
                'BILLING_NOT_CONFIGURED',
                noBilling,
                {
                    severity: 'WARNING',
                    title: 'Facturación no configurada',
                    description: `La organización ${org.name} está activa pero no ha configurado un método de pago.`,
                    reasonCodes: ['BILLING_MISSING'],
                    href: `/admin/orgs/${org.id}`
                },
                activeAlerts,
                results,
                traceId
            );

            // ... (Rule 2 and 3) ...

            // Rule 4: NO_ADMINS_ASSIGNED (CRITICAL)
            // Refined: Check for lack of ADMIN/OWNER roles specifically
            const adminCount = await prisma.organizationMember.count({
                where: { organizationId: org.id, role: { in: ['ADMIN', 'OWNER'] } }
            });
            const noAdmins = adminCount === 0;
            await this.evaluateRule(
                org.id,
                'NO_ADMINS_ASSIGNED',
                noAdmins,
                {
                    severity: 'CRITICAL',
                    title: 'Sin Administradores Asignados',
                    description: `La organización ${org.name} no posee miembros con rol administrativo. Riesgo de bloqueo operativo.`,
                    reasonCodes: ['ADMIN_COUNT_ZERO', 'ORPHANED_NODE'],
                    href: `/admin/orgs/${org.id}`
                },
                activeAlerts,
                results,
                traceId
            );

            // Rule 5: INACTIVE_PRO_ORG (INFO)
            let inactivePro = false;
            let daysInactive = 0;
            if (org.plan !== 'FREE') {
                if (org.stats?.lastActivityAt) {
                    daysInactive = Math.floor((now.getTime() - new Date(org.stats.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
                    inactivePro = daysInactive > 3;
                } else {
                    inactivePro = true; // Never active
                }
            }
            await this.evaluateRule(
                org.id,
                'INACTIVE_ORG',
                inactivePro,
                {
                    severity: 'INFO',
                    title: 'Baja Actividad en Cliente Pago',
                    description: `El cliente ${org.name} (Plan ${org.plan}) no registra actividad hace ${daysInactive} días. Riesgo de Churn.`,
                    reasonCodes: ['CHURN_RISK', `INACTIVE_DAYS_${daysInactive}`], // FIX: Stable reason code first
                    href: `/admin/orgs/${org.id}`
                },
                activeAlerts,
                results,
                traceId
            );
        }

        // Global escalation check for all active alerts
        const allActive = await prisma.superadminAlert.findMany({
            where: { status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } }
        });
        for (const alert of allActive) {
            const meta = OperationalStateRepo.normalize(alert);
            if (meta.sla?.status === 'BREACHED') {
                // Trigger escalation notification if not already done
                const hasEscalated = await prisma.superadminNotification.findFirst({
                    where: { alertId: alert.id, kind: 'ALERT_ESCALATED' }
                });
                if (!hasEscalated) {
                    await prisma.superadminNotification.create({
                        data: {
                            alertId: alert.id,
                            kind: 'ALERT_ESCALATED',
                            title: `ESCALACIÓN: SLA Vencido - ${alert.title}`,
                            body: `El incidente ${alert.fingerprint} ha superado su SLA de ${meta.sla.preset}. Requiere intervención inmediata.`,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            metadata: { orgId: alert.organizationId, severity: 'CRITICAL', ruleCode: meta.ruleCode, fingerprint: alert.fingerprint, isEscalation: true } as any
                        }
                    });
                    results.escalated++;
                }
            }
        }

        const durationMs = Date.now() - startTime;
        // Audit the run
        await prisma.auditLog.create({
            data: {
                userId: adminUser.id,
                action: 'SUPERADMIN_ALERTS_EVALUATED',
                details: `v4.6.0 Engine [${traceId}]: ${results.created} created, ${results.resolved} resolved, ${results.escalated} escalated in ${durationMs}ms.`,
                createdAt: new Date()
            }
        });

        return results;
    }

    private static async evaluateRule(
        orgId: string,
        type: SuperadminAlertType,
        condition: boolean,
        data: { severity: SuperadminAlertSeverity, title: string, description: string, reasonCodes: string[], href?: string },
        activeAlerts: SuperadminAlert[],
        results: { created: number, updated: number, resolved: number },
        traceId: string
    ) {
        const ruleIdentifier = data.reasonCodes[0] || type;
        const fingerprint = `${orgId}:${type}:${ruleIdentifier}`;
        const existingAlert = activeAlerts.find(a => a.fingerprint === fingerprint);

        if (condition) {
            if (!existingAlert) {
                // Create Alert v4.6
                const playbook = getPlaybookByRule(ruleIdentifier);
                const metadata: OperationalMetadataV46 = {
                    version: "v4.6",
                    status: "OPEN",
                    ruleCode: ruleIdentifier,
                    href: data.href,
                    lastTraceId: traceId,
                    sla: OperationalStateRepo.calculateDefaultSla(new Date(), playbook.defaultSlaPreset),
                    playbookSteps: [],
                    owner: playbook.ownerRoleSuggested ? { ownerType: 'role', ownerRole: playbook.ownerRoleSuggested } : null
                };
                
                const alert = await prisma.superadminAlert.create({
                    data: {
                        organizationId: orgId,
                        type,
                        severity: data.severity,
                        title: data.title,
                        description: data.description,
                        reasonCodes: data.reasonCodes,
                        fingerprint,
                        status: 'ACTIVE',
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        metadata: metadata as any
                    }
                });

                // Create Notification
                if (data.severity !== 'INFO') {
                    const notifMetadata: NotificationMetadata = { 
                        orgId, 
                        severity: data.severity, 
                        href: data.href, 
                        ruleCode: ruleIdentifier,
                        fingerprint: fingerprint 
                    };
                    await prisma.superadminNotification.create({
                        data: {
                            alertId: alert.id,
                            kind: 'ALERT_OPEN',
                            title: data.title,
                            body: data.description,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            metadata: notifMetadata as any
                        }
                    });
                }
                results.created++;
            } else {
                // Handle transitions for existing alert v4.6
                if (existingAlert.status === 'RESOLVED') {
                    await OperationalStateRepo.reopen(fingerprint, traceId);
                    console.log(`[AlertsService] REOPENING alert ${fingerprint} via Repo`);
                    results.created++;
                } else {
                    // Normalize and update metadata (SLA check inside)
                    const currentMeta = OperationalStateRepo.normalize(existingAlert);
                    if (
                        existingAlert.severity !== data.severity || 
                        existingAlert.description !== data.description ||
                        currentMeta.lastTraceId !== traceId
                    ) {
                        await OperationalStateRepo.updateMetadata(fingerprint, {
                            description: data.description,
                            lastTraceId: traceId
                        });
                        results.updated++;
                    }
                }
            }
        } else if (existingAlert && existingAlert.status !== 'RESOLVED') {
            // Resolve Alert automatically
            await OperationalStateRepo.updateMetadata(fingerprint, {
                status: 'RESOLVED',
                resolvedAt: new Date().toISOString(),
                resolutionNote: 'Saneado automáticamente por motor de reglas.',
                lastTraceId: traceId
            });
            results.resolved++;
        }
    }

    static async getGlobalAlertsSummary() {
        await this.ensureSuperadmin();
        const now = new Date();

        const alerts = await prisma.superadminAlert.findMany({
            where: { 
                status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
            },
            include: { organization: { select: { id: true, name: true } } },
            orderBy: [
                { severity: 'desc' },
                { detectedAt: 'desc' }
            ]
        });

        console.log(`[AlertsService] getGlobalAlertsSummary: DB found ${alerts.length} alerts`);

        // Filter SNOOZED alerts and normalize to v4.6
        const result = alerts.map(a => {
            const meta = OperationalStateRepo.normalize(a);
            return { ...a, metadata: meta };
        }).filter(a => {
            const meta = a.metadata as OperationalMetadataV46;
            if (meta.snoozedUntil && new Date(meta.snoozedUntil) > now) {
                return false; 
            }
            return true;
        });

        console.log(`[AlertsService] getGlobalAlertsSummary: returning ${result.length} active/non-snoozed alerts`);
        return result;
    }

    static async getCockpitNotifications() {
        await this.ensureSuperadmin();
        return prisma.superadminNotification.findMany({
            where: { readAt: null },
            include: { 
                alert: { 
                    include: { 
                        organization: { 
                            select: { 
                                id: true, 
                                name: true, 
                                createdAt: true, 
                                subscription: { select: { status: true, trialEndsAt: true } },
                                plan: true 
                            } 
                        } 
                    } 
                } 
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
    }

    static async acknowledgeAlert(fingerprint: string) {
        const user = await this.ensureSuperadmin();
        await OperationalStateRepo.updateMetadata(fingerprint, {
            status: 'ACKNOWLEDGED',
            acknowledgedBy: user.email || 'unknown',
            acknowledgedAt: new Date().toISOString()
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'SUPERADMIN_ALERT_ACKNOWLEDGED',
                details: `Alert ${fingerprint} acknowledged by ${user.email}.`,
                createdAt: new Date()
            }
        });
    }

    static async snoozeAlert(fingerprint: string, durationHours: number) {
        const user = await this.ensureSuperadmin();
        const snoozedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
        
        await OperationalStateRepo.updateMetadata(fingerprint, {
            snoozedUntil: snoozedUntil.toISOString()
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'SUPERADMIN_ALERT_SNOOZED',
                details: `Alert ${fingerprint} snoozed until ${snoozedUntil.toISOString()} by ${user.email}.`,
                createdAt: new Date()
            }
        });
    }

    static async resolveAlert(fingerprint: string, note?: string) {
        const user = await this.ensureSuperadmin();
        await OperationalStateRepo.updateMetadata(fingerprint, {
            status: 'RESOLVED',
            resolvedAt: new Date().toISOString(),
            resolvedBy: user.email || 'unknown',
            resolutionNote: note
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'SUPERADMIN_ALERT_RESOLVED',
                details: `Alert ${fingerprint} resolved by ${user.email}. Note: ${note || 'None'}`,
                createdAt: new Date()
            }
        });
    }

    static async assignOwner(fingerprint: string, ownerType: 'user' | 'role', ownerValue: string) {
        const user = await this.ensureSuperadmin();
        const patch: Partial<OperationalMetadataV46> = {
            owner: {
                ownerType,
                ownerId: ownerType === 'user' ? ownerValue : undefined,
                ownerRole: ownerType === 'role' ? ownerValue : undefined,
                assignedBy: user.email || 'unknown',
                assignedAt: new Date().toISOString()
            }
        };
        await OperationalStateRepo.updateMetadata(fingerprint, patch);
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'SUPERADMIN_ALERT_OWNER_ASSIGNED',
                details: `Alert ${fingerprint} assigned to ${ownerType}:${ownerValue} by ${user.email}.`,
                createdAt: new Date()
            }
        });
    }

    static async togglePlaybookStep(fingerprint: string, stepId: string, checked: boolean, traceId: string, note?: string) {
        const user = await this.ensureSuperadmin();
        const alert = await prisma.superadminAlert.findUnique({ 
            where: { fingerprint },
            include: { organization: true }
        });
        if (!alert) throw new Error("Alert not found");

        const meta = OperationalStateRepo.normalize(alert);
        const steps = [...(meta.playbookSteps || [])];
        const existingIdx = steps.findIndex(s => s.stepId === stepId);

        if (existingIdx >= 0) {
            steps[existingIdx] = { 
                ...steps[existingIdx], 
                checked, 
                checkedBy: user.email || 'unknown', 
                checkedAt: new Date().toISOString(),
                note: note || steps[existingIdx].note
            };
        } else {
            steps.push({
                stepId,
                checked,
                checkedBy: user.email || 'unknown',
                checkedAt: new Date().toISOString(),
                note
            });
        }

        await OperationalStateRepo.updateMetadata(fingerprint, { playbookSteps: steps });
        
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: checked ? 'COMPLETE_STEP' : 'RESET_STEP',
                details: `[${traceId}] Playbook Step ${stepId} set to ${checked} for alert ${fingerprint} (${alert.organization?.name || 'Global'}).`,
                createdAt: new Date()
            }
        });
    }

    static async logPlaybookOpened(fingerprint: string, traceId: string) {
        const user = await this.ensureSuperadmin();
        const alert = await prisma.superadminAlert.findUnique({ 
            where: { fingerprint },
            include: { organization: true }
        });
        if (!alert) return;

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'OPEN_PLAYBOOK',
                details: `[${traceId}] Playbook opened for alert ${fingerprint} (${alert.organization?.name || 'Global'}) by ${user.email}.`,
                createdAt: new Date()
            }
        });
    }

    static async resetPlaybookProgress(fingerprint: string, traceId: string) {
        const user = await this.ensureSuperadmin();
        await OperationalStateRepo.updateMetadata(fingerprint, { playbookSteps: [] });
        
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'RESET_PROGRESS',
                details: `[${traceId}] Playbook progress reset for alert ${fingerprint} by ${user.email}.`,
                createdAt: new Date()
            }
        });
    }

    static async markNotificationRead(notificationId: string) {
        await this.ensureSuperadmin();
        
        // Find if this notification is linked to an alert fingerprint
        const notif = await prisma.superadminNotification.findUnique({
            where: { id: notificationId },
            include: { alert: true }
        });

        if (notif?.alert?.fingerprint) {
            // Bulk mark as read for all notifications of this alert to avoid "ghosting" older duplicates
            return prisma.superadminNotification.updateMany({
                where: { 
                    alert: { fingerprint: notif.alert.fingerprint },
                    readAt: null 
                },
                data: { readAt: new Date() }
            });
        }

        // Fallback to single ID if no alert link
        return prisma.superadminNotification.update({
            where: { id: notificationId },
            data: { readAt: new Date() }
        });
    }

    /**
     * Bulk Operations v4.7.2
     */
    static async bulkAcknowledgeAlerts(fingerprints: string[], traceId: string) {
        const user = await this.ensureSuperadmin();
        for (const fp of fingerprints) {
            try {
                await OperationalStateRepo.updateMetadata(fp, {
                    status: 'ACKNOWLEDGED',
                    acknowledgedBy: user.email || 'unknown',
                    acknowledgedAt: new Date().toISOString(),
                    lastTraceId: traceId
                });
            } catch (e) {
                console.error(`[AlertsService][BulkACK] Failed for ${fp}`, e);
            }
        }
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'SUPERADMIN_ALERTS_BULK_ACKNOWLEDGED',
                details: `[${traceId}] Bulk ACK applied to ${fingerprints.length} alerts by ${user.email}.`,
                createdAt: new Date()
            }
        });
    }

    static async bulkSnoozeAlerts(fingerprints: string[], durationHours: number, traceId: string) {
        const user = await this.ensureSuperadmin();
        const snoozedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
        for (const fp of fingerprints) {
            try {
                await OperationalStateRepo.updateMetadata(fp, {
                    snoozedUntil: snoozedUntil.toISOString(),
                    lastTraceId: traceId
                });
            } catch (e) {
                console.error(`[AlertsService][BulkSnooze] Failed for ${fp}`, e);
            }
        }
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'SUPERADMIN_ALERTS_BULK_SNOOZED',
                details: `[${traceId}] Bulk SNOOZE until ${snoozedUntil.toISOString()} applied to ${fingerprints.length} alerts by ${user.email}.`,
                createdAt: new Date()
            }
        });
    }

    static async bulkResolveAlerts(fingerprints: string[], note: string, traceId: string) {
        const user = await this.ensureSuperadmin();
        for (const fp of fingerprints) {
            try {
                await OperationalStateRepo.updateMetadata(fp, {
                    status: 'RESOLVED',
                    resolvedAt: new Date().toISOString(),
                    resolvedBy: user.email || 'unknown',
                    resolutionNote: note,
                    lastTraceId: traceId
                });
            } catch (e) {
                console.error(`[AlertsService][BulkResolve] Failed for ${fp}`, e);
            }
        }
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'SUPERADMIN_ALERTS_BULK_RESOLVED',
                details: `[${traceId}] Bulk RESOLVE applied to ${fingerprints.length} alerts by ${user.email}. Note: ${note}`,
                createdAt: new Date()
            }
        });
    }
}

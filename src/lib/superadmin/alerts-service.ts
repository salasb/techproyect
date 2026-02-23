import prisma from "@/lib/prisma";
import {
    SuperadminAlertType,
    SuperadminAlertSeverity,
    SuperadminAlert
} from "@prisma/client";

interface AlertMetadata {
    href?: string;
    ruleCode?: string;
}

interface NotificationMetadata {
    orgId: string;
    severity: string;
    href?: string;
    ruleCode?: string;
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
     * v4.4.0: Deterministic Operational Alerts
     */
    static async runAlertsEvaluation() {
        const adminUser = await this.ensureSuperadmin();
        const startTime = Date.now();

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
        const results = { created: 0, updated: 0, resolved: 0 };

        for (const org of organizations) {
            const activeAlerts = await prisma.superadminAlert.findMany({
                where: { organizationId: org.id, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } }
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
                results
            );

            // Rule 2: TRIAL_ENDING_SOON (WARNING)
            let trialEnding = false;
            let daysLeft = 0;
            if (org.subscription?.status === 'TRIALING' && org.subscription.trialEndsAt) {
                daysLeft = Math.ceil((new Date(org.subscription.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                trialEnding = daysLeft <= 3 && daysLeft >= 0;
            }
            await this.evaluateRule(
                org.id,
                'TRIAL_ENDING_SOON',
                trialEnding,
                {
                    severity: 'WARNING',
                    title: 'Trial por Vencer (72h)',
                    description: `El periodo de prueba de ${org.name} expira en ${daysLeft} días. Requiere seguimiento comercial.`,
                    reasonCodes: [`DAYS_LEFT_${daysLeft}`, 'TRIAL_EXPIRATION'],
                    href: `/admin/orgs/${org.id}`
                },
                activeAlerts,
                results
            );

            // Rule 3: PENDING_ACTIVATION_STALE (WARNING) - Mapping to SYSTEM_INFO for DB compatibility
            const isStalePending = org.status === 'PENDING' && (now.getTime() - new Date(org.createdAt).getTime() > 48 * 60 * 60 * 1000);
            await this.evaluateRule(
                org.id,
                'SYSTEM_INFO',
                isStalePending,
                {
                    severity: 'WARNING',
                    title: 'Onboarding Estancado',
                    description: `La organización ${org.name} lleva más de 48h en estado PENDING sin activación manual.`,
                    reasonCodes: ['STALE_PENDING', 'MANUAL_REVIEW_REQUIRED'],
                    href: `/admin/orgs/${org.id}`
                },
                activeAlerts,
                results
            );

            // Rule 4: NO_ADMINS_ASSIGNED (CRITICAL)
            const noAdmins = org._count.OrganizationMember === 0;
            await this.evaluateRule(
                org.id,
                'NO_ADMINS_ASSIGNED',
                noAdmins,
                {
                    severity: 'CRITICAL',
                    title: 'Organización Huérfana',
                    description: `La organización ${org.name} no posee miembros. Posible error en flujo de creación o purga accidental.`,
                    reasonCodes: ['MEMBER_COUNT_ZERO', 'ORPHANED_NODE'],
                    href: `/admin/orgs/${org.id}`
                },
                activeAlerts,
                results
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
                    reasonCodes: [`INACTIVE_DAYS_${daysInactive}`, 'CHURN_RISK'],
                    href: `/admin/orgs/${org.id}`
                },
                activeAlerts,
                results
            );
        }

        const durationMs = Date.now() - startTime;
        // Audit the run
        await prisma.auditLog.create({
            data: {
                userId: adminUser.id,
                action: 'SUPERADMIN_ALERTS_EVALUATED',
                details: `v4.4.0 Engine: ${results.created} created, ${results.updated} updated, ${results.resolved} resolved in ${durationMs}ms.`,
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
        results: { created: number, updated: number, resolved: number }
    ) {
        // Unique fingerprint per rule even if base type is shared (e.g. SYSTEM_INFO)
        const ruleIdentifier = data.reasonCodes[0] || type;
        const fingerprint = `${orgId}:${type}:${ruleIdentifier}`;
        const existingAlert = activeAlerts.find(a => a.fingerprint === fingerprint);

        if (condition) {
            if (!existingAlert) {
                // Create Alert
                // Metadata used to store extra actionable context if needed
                const metadata: AlertMetadata = { href: data.href, ruleCode: type };
                
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

                // Create Notification for CRITICAL/WARNING
                if (data.severity !== 'INFO') {
                    const notifMetadata: NotificationMetadata = { orgId, severity: data.severity, href: data.href, ruleCode: type };
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
                // Update existing if description/severity changed
                if (existingAlert.severity !== data.severity || existingAlert.description !== data.description) {
                    const updatedMetadata: AlertMetadata = { ...((existingAlert.metadata as Record<string, unknown>) || {}), href: data.href, ruleCode: type };
                    await prisma.superadminAlert.update({
                        where: { id: existingAlert.id },
                        data: {
                            severity: data.severity,
                            description: data.description,
                            reasonCodes: data.reasonCodes,
                            updatedAt: new Date(),
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            metadata: updatedMetadata as any
                        }
                    });
                    results.updated++;
                }
            }
        } else if (existingAlert) {
            // Resolve Alert
            await prisma.superadminAlert.update({
                where: { id: existingAlert.id },
                data: {
                    status: 'RESOLVED',
                    resolvedAt: new Date()
                }
            });
            results.resolved++;
        }
    }

    static async getGlobalAlertsSummary() {
        await this.ensureSuperadmin();
        return prisma.superadminAlert.findMany({
            where: { status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
            include: { organization: { select: { name: true } } },
            orderBy: [
                { severity: 'desc' },
                { detectedAt: 'desc' }
            ]
        });
    }

    static async getCockpitNotifications() {
        await this.ensureSuperadmin();
        return prisma.superadminNotification.findMany({
            where: { readAt: null },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
    }

    static async acknowledgeAlert(alertId: string) {
        const user = await this.ensureSuperadmin();
        const alert = await prisma.superadminAlert.update({
            where: { id: alertId },
            data: { status: 'ACKNOWLEDGED' }
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'SUPERADMIN_ALERT_ACKNOWLEDGED',
                details: `Alert ${alertId} (${alert.type}) acknowledged.`,
                createdAt: new Date()
            }
        });
        return alert;
    }

    static async markNotificationRead(notificationId: string) {
        await this.ensureSuperadmin();
        return prisma.superadminNotification.update({
            where: { id: notificationId },
            data: { readAt: new Date() }
        });
    }
}

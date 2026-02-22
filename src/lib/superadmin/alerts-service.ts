import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
    SuperadminAlertType,
    SuperadminAlertSeverity,
    SuperadminAlertStatus
} from "@prisma/client";

export class AlertsService {
    /**
     * Ensures the current user is a SUPERADMIN
     */
    private static async ensureSuperadmin() {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { role: true }
        });

        if (profile?.role !== 'SUPERADMIN') {
            throw new Error("Unauthorized: Superadmin role required");
        }
        return user;
    }

    /**
     * Run evaluation for all organizations.
     * Can be called manually from Cockpit or by a cron job in the future.
     */
    static async runAlertsEvaluation() {
        const adminUser = await this.ensureSuperadmin();

        const organizations = await prisma.organization.findMany({
            include: {
                subscription: true,
                stats: true,
                _count: {
                    select: { OrganizationMember: true }
                }
            }
        });

        const now = new Date();
        const results = { created: 0, updated: 0, resolved: 0 };

        for (const org of organizations) {
            const activeAlerts = await prisma.superadminAlert.findMany({
                where: { organizationId: org.id, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } }
            });

            // Rule 1: BILLING_PAST_DUE
            await this.evaluateRule(
                org.id,
                'BILLING_PAST_DUE',
                ['PAST_DUE', 'UNPAID'].includes(org.subscription?.status || ''),
                {
                    severity: 'CRITICAL',
                    title: 'Pago Vencido',
                    description: `La organización ${org.name} tiene facturas pendientes.`,
                    reasonCodes: [org.subscription?.status || 'UNKNOWN']
                },
                activeAlerts,
                results
            );

            // Rule 2: TRIAL_ENDING_SOON
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
                    title: 'Trial por Vencer',
                    description: `El periodo de prueba de ${org.name} vence en ${daysLeft} días.`,
                    reasonCodes: [`DAYS_LEFT_${daysLeft}`]
                },
                activeAlerts,
                results
            );

            // Rule 3: BILLING_NOT_CONFIGURED
            const noBilling = !org.subscription || !org.subscription.providerCustomerId;
            await this.evaluateRule(
                org.id,
                'BILLING_NOT_CONFIGURED',
                noBilling,
                {
                    severity: 'WARNING',
                    title: 'Billing no Configurado',
                    description: `La organización ${org.name} no tiene configurado el sistema de pagos.`,
                    reasonCodes: ['NO_CUSTOMER_ID']
                },
                activeAlerts,
                results
            );

            // Rule 4: NO_ADMINS_ASSIGNED
            const noAdmins = org._count.OrganizationMember === 0;
            await this.evaluateRule(
                org.id,
                'NO_ADMINS_ASSIGNED',
                noAdmins,
                {
                    severity: 'CRITICAL',
                    title: 'Sin Administradores',
                    description: `La organización ${org.name} no tiene ningún miembro asignado.`,
                    reasonCodes: ['MEMBER_COUNT_ZERO']
                },
                activeAlerts,
                results
            );

            // Rule 5: INACTIVE_ORG
            let inactive = false;
            let daysInactive = 0;
            if (org.stats?.lastActivityAt) {
                daysInactive = Math.floor((now.getTime() - new Date(org.stats.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
                inactive = daysInactive > 7;
            } else {
                inactive = true; // Never active
            }
            await this.evaluateRule(
                org.id,
                'INACTIVE_ORG',
                inactive,
                {
                    severity: 'INFO',
                    title: 'Organización Inactiva',
                    description: `La organización ${org.name} no ha tenido actividad por ${daysInactive} días.`,
                    reasonCodes: [`INACTIVE_DAYS_${daysInactive}`]
                },
                activeAlerts,
                results
            );
        }

        // Audit the run
        await prisma.auditLog.create({
            data: {
                userId: adminUser.id,
                action: 'SUPERADMIN_ALERTS_EVALUATED',
                details: `Evaluation completed: ${results.created} created, ${results.updated} updated, ${results.resolved} resolved.`,
                createdAt: new Date()
            }
        });

        return results;
    }

    private static async evaluateRule(
        orgId: string,
        type: SuperadminAlertType,
        condition: boolean,
        data: { severity: SuperadminAlertSeverity, title: string, description: string, reasonCodes: string[] },
        activeAlerts: any[],
        results: { created: number, updated: number, resolved: number }
    ) {
        const fingerprint = `${orgId}:${type}`;
        const existingAlert = activeAlerts.find(a => a.fingerprint === fingerprint);

        if (condition) {
            if (!existingAlert) {
                // Create Alert
                const alert = await prisma.superadminAlert.create({
                    data: {
                        organizationId: orgId,
                        type,
                        severity: data.severity,
                        title: data.title,
                        description: data.description,
                        reasonCodes: data.reasonCodes,
                        fingerprint,
                        status: 'ACTIVE'
                    }
                });

                // Create Notification for CRITICAL/WARNING
                if (data.severity !== 'INFO') {
                    await prisma.superadminNotification.create({
                        data: {
                            alertId: alert.id,
                            kind: 'ALERT_OPEN',
                            title: data.title,
                            body: data.description,
                            metadata: { orgId, severity: data.severity }
                        }
                    });
                }
                results.created++;
            } else {
                // Update existing if description/severity changed
                if (existingAlert.severity !== data.severity || existingAlert.description !== data.description) {
                    await prisma.superadminAlert.update({
                        where: { id: existingAlert.id },
                        data: {
                            severity: data.severity,
                            description: data.description,
                            reasonCodes: data.reasonCodes,
                            updatedAt: new Date()
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

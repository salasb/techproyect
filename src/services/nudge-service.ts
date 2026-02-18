import prisma from "@/lib/prisma";
import { ActivationMilestone } from "./activation-service";

export interface Nudge {
    id: string;
    type: 'ONBOARDING' | 'BILLING' | 'TIP';
    severity: 'info' | 'warn';
    title: string;
    body: string;
    ctaLabel: string;
    ctaHref: string;
    dedupeKey: string;
    expiresAt?: Date;
}

export class NudgeService {
    /**
     * Gets relevant nudges for a user in an organization.
     */
    static async getActiveNudges(organizationId: string, userId: string): Promise<Nudge[]> {
        // 1. Fetch context
        const [events, subscription, dismissed, org] = await Promise.all([
            (prisma as any).activationEvent.findMany({ where: { organizationId } }),
            (prisma as any).subscription.findFirst({ where: { organizationId } }),
            (prisma as any).nudgeDismissed.findMany({
                where: {
                    userId,
                    organizationId,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                }
            }),
            (prisma as any).organization.findUnique({ where: { id: organizationId } })
        ]);

        const findEvent = (name: ActivationMilestone) => events.find((e: any) => e.eventName === name);
        const isDismissed = (key: string) => dismissed.some((d: any) => d.dedupeKey === key);

        const nudges: Nudge[] = [];

        // Rule N_01: No Project
        if (!findEvent('FIRST_PROJECT_CREATED') && !isDismissed('N_01')) {
            nudges.push({
                id: 'N_01',
                type: 'ONBOARDING',
                severity: 'info',
                title: 'Crea tu primer proyecto',
                body: 'Define un nombre y presupuesto para empezar a cotizar.',
                ctaLabel: 'Crear Proyecto',
                ctaHref: '/projects/new',
                dedupeKey: 'N_01'
            });
        }

        // Rule N_02: Project exists but no Quote Draft
        if (findEvent('FIRST_PROJECT_CREATED') && !findEvent('FIRST_QUOTE_DRAFT_CREATED') && !isDismissed('N_02')) {
            nudges.push({
                id: 'N_02',
                type: 'ONBOARDING',
                severity: 'info',
                title: 'Genera tu primera cotización',
                body: 'Agrega ítems a tu proyecto para crear un presupuesto.',
                ctaLabel: 'Ir a Proyectos',
                ctaHref: '/projects',
                dedupeKey: 'N_02'
            });
        }

        // Rule N_03: Quote Draft exists but not Sent
        if (findEvent('FIRST_QUOTE_DRAFT_CREATED') && !findEvent('FIRST_QUOTE_SENT') && !isDismissed('N_03')) {
            nudges.push({
                id: 'N_03',
                type: 'ONBOARDING',
                severity: 'warn',
                title: 'Envía tu cotización',
                body: 'Descarga el PDF y envíalo a tu cliente para cerrar la venta.',
                ctaLabel: 'Ver Cotizaciones',
                ctaHref: '/projects',
                dedupeKey: 'N_03'
            });
        }

        // Rule N_04: Trial Ending
        if (subscription?.status === 'TRIALING' && subscription.trialEndsAt && !isDismissed('N_04')) {
            const diffDays = Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) {
                nudges.push({
                    id: 'N_04',
                    type: 'BILLING',
                    severity: 'warn',
                    title: `Tu trial expira en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`,
                    body: 'Configura tu suscripción para evitar interrupciones en el servicio.',
                    ctaLabel: 'Configurar Plan',
                    ctaHref: '/settings/billing',
                    dedupeKey: 'N_04'
                });
            }
        }

        // Rule N_05: Team Mode but no Members
        if (org?.mode === 'TEAM' && !findEvent('FIRST_TEAM_MEMBER_JOINED') && !isDismissed('N_05')) {
            nudges.push({
                id: 'N_05',
                type: 'ONBOARDING',
                severity: 'info',
                title: 'Invita a tu equipo',
                body: 'Colabora con otros miembros invitándolos a tu organización.',
                ctaLabel: 'Invitar Equipo',
                ctaHref: '/settings/team',
                dedupeKey: 'N_05'
            });
        }

        return nudges;
    }

    /**
     * Dismisses a nudge for a user.
     */
    static async dismissNudge(organizationId: string, userId: string, dedupeKey: string, snoozeHours?: number) {
        const expiresAt = snoozeHours ? new Date(Date.now() + snoozeHours * 60 * 60 * 1000) : null;

        await (prisma as any).nudgeDismissed.upsert({
            where: {
                userId_organizationId_dedupeKey: {
                    userId,
                    organizationId,
                    dedupeKey
                }
            },
            update: {
                dismissedAt: new Date(),
                expiresAt
            },
            create: {
                organizationId,
                userId,
                dedupeKey,
                expiresAt
            }
        });
    }
}

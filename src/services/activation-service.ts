import prisma from "@/lib/prisma";

export type ActivationMilestone =
    | 'ORG_CREATED'
    | 'FIRST_PROJECT_CREATED'
    | 'FIRST_CLIENT_CREATED'
    | 'FIRST_QUOTE_DRAFT_CREATED'
    | 'FIRST_QUOTE_SENT'
    | 'FIRST_INVOICE_CREATED'
    | 'FIRST_TEAM_INVITE_SENT'
    | 'FIRST_TEAM_MEMBER_JOINED'
    // Funnel Events (Wave 5.2)
    | 'TRIAL_STARTED'
    | 'TRIAL_WILL_END'
    | 'TRIAL_EXPIRED'
    | 'UPGRADE_CLICKED'
    | 'CHECKOUT_STARTED'
    | 'CHECKOUT_COMPLETED'
    | 'SUBSCRIPTION_ACTIVE'
    | 'PAYMENT_FAILED'
    | 'SUBSCRIPTION_CANCELED'
    | 'PAUSED_ENTERED'
    | 'PAUSED_EXITED';

export class ActivationService {
    /**
     * Tracks an event for an organization.
     */
    static async track(eventName: string, organizationId: string, userId?: string, entityId?: string, metadata?: any, dedupeKey?: string) {
        try {
            await (prisma as any).activationEvent.upsert({
                where: { dedupeKey: dedupeKey || 'NO_DEDUPE' }, // Fallback if no dedupe
                create: {
                    organizationId,
                    userId,
                    eventName,
                    entityId,
                    metadata: metadata || {},
                    dedupeKey: dedupeKey || null
                },
                update: {} // Do nothing if exists
            });

            // Trigger denormalization/stats update
            await this.updateStats(organizationId);
        } catch (error) {
            if (dedupeKey && (error as any).code === 'P2002') {
                // Ignore unique constraint error if dedupeKey already exists
                return;
            }
            console.error(`[Activation] Failed to track ${eventName} for ${organizationId}:`, error);
        }
    }

    /**
     * Tracks a funnel event with guaranteed idempotency via dedupeKey.
     */
    static async trackFunnelEvent(milestone: ActivationMilestone, organizationId: string, dedupeKey: string, userId?: string, metadata?: any) {
        return this.track(milestone, organizationId, userId, undefined, metadata, dedupeKey);
    }

    /**
     * Tracks a milestone uniquely. Idempotent.
     */
    static async trackFirst(milestone: ActivationMilestone, organizationId: string, userId?: string, entityId?: string, metadata?: any) {
        try {
            // Use traditional check or dedupeKey
            const dedupeKey = `first_${milestone}_${organizationId}`;
            await this.track(milestone, organizationId, userId, entityId, metadata, dedupeKey);
        } catch (error) {
            console.warn(`[Activation] trackFirst ignored for ${milestone}:`, error);
        }
    }

    /**
     * Updates OrganizationStats based on events.
     */
    static async updateStats(organizationId: string) {
        const events = await (prisma as any).activationEvent.findMany({
            where: { organizationId }
        });

        const findEvent = (name: string) => events.find((e: any) => e.eventName === name);

        const orgCreated = findEvent('ORG_CREATED');
        const firstValue = findEvent('FIRST_QUOTE_SENT');

        let ttvDays: number | null = null;
        if (orgCreated && firstValue) {
            const diff = firstValue.occurredAt.getTime() - orgCreated.occurredAt.getTime();
            ttvDays = diff / (1000 * 60 * 60 * 24);
        }

        // Determine Stage
        let stage = 'REGISTERED';
        if (firstValue) stage = 'ACTIVATED';
        else if (findEvent('FIRST_QUOTE_DRAFT_CREATED')) stage = 'VALUE_DISCOVERY';
        else if (findEvent('FIRST_PROJECT_CREATED')) stage = 'ACTIVE_EXPLORER';

        await (prisma.organizationStats as any).upsert({
            where: { organizationId },
            create: {
                organizationId,
                firstValueAt: firstValue?.occurredAt,
                ttvDays,
                attributes: { stage } as any
            },
            update: {
                firstValueAt: firstValue?.occurredAt,
                ttvDays,
                attributes: { stage } as any
            }
        });
    }
}

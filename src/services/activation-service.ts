import prisma from "@/lib/prisma";

export type ActivationMilestone =
    | 'ORG_CREATED'
    | 'FIRST_PROJECT_CREATED'
    | 'FIRST_CLIENT_CREATED'
    | 'FIRST_QUOTE_DRAFT_CREATED'
    | 'FIRST_QUOTE_SENT'
    | 'FIRST_INVOICE_CREATED'
    | 'FIRST_TEAM_INVITE_SENT'
    | 'FIRST_TEAM_MEMBER_JOINED';

export class ActivationService {
    /**
     * Tracks an event for an organization.
     */
    static async track(eventName: string, organizationId: string, userId?: string, entityId?: string, metadata?: any) {
        try {
            await (prisma as any).activationEvent.create({
                data: {
                    organizationId,
                    userId,
                    eventName,
                    entityId,
                    metadata: metadata || {}
                }
            });

            // Trigger denormalization/stats update
            await this.updateStats(organizationId);
        } catch (error) {
            console.error(`[Activation] Failed to track ${eventName} for ${organizationId}:`, error);
        }
    }

    /**
     * Tracks a milestone uniquely. Idempotent.
     */
    static async trackFirst(milestone: ActivationMilestone, organizationId: string, userId?: string, entityId?: string, metadata?: any) {
        try {
            // Check if already exists
            const existing = await (prisma as any).activationEvent.findUnique({
                where: {
                    organizationId_eventName: {
                        organizationId,
                        eventName: milestone
                    }
                }
            });

            if (existing) return;

            await this.track(milestone, organizationId, userId, entityId, metadata);
        } catch (error) {
            // Likely race condition or unique constraint, ignore
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

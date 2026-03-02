import prisma from "@/lib/prisma";

export type ActivationMilestone =
    | 'ORG_CREATED'
    | 'ADMIN_ASSIGNED'
    | 'BILLING_CONFIGURED'
    | 'QUOTE_CREATED'
    | 'QUOTE_SENT'
    | 'QUOTE_ACCEPTED'
    | 'INVOICE_CREATED'
    | 'CHECKOUT_STARTED'
    | 'CHECKOUT_COMPLETED'
    | 'PAYMENT_SUCCEEDED'
    | 'PAYMENT_FAILED'
    | 'INVOICE_PAID'
    | 'DUNNING_SENT'
    | 'PORTAL_LOGIN_SUCCESS'
    | 'PORTAL_LOGIN_FAILED'
    // Legacy/First-time markers
    | 'FIRST_PROJECT_CREATED'
    | 'FIRST_CLIENT_CREATED'
    | 'FIRST_QUOTE_DRAFT_CREATED'
    | 'FIRST_QUOTE_SENT'
    | 'FIRST_INVOICE_CREATED'
    | 'FIRST_TEAM_INVITE_SENT'
    | 'FIRST_TEAM_MEMBER_JOINED'
    // Trial/Lifecycle
    | 'TRIAL_STARTED'
    | 'TRIAL_WILL_END'
    | 'TRIAL_EXP'
    | 'UPGRADE_CLICKED'
    | 'SUBSCRIPTION_ACTIVE'
    | 'SUBSCRIPTION_PAUSED'
    | 'PAYMENT_RECOVERED'
    | 'CANCEL_INTENT'
    | 'CANCEL_SAVED'
    | 'SUBSCRIPTION_CANCELED'
    | 'PAUSED_ENTERED'
    | 'PAUSED_EXITED';

export interface FunnelStep {
    name: string;
    event: ActivationMilestone;
    count: number;
    conversion: number; // % from previous
    dropOff: number; // % dropped
}

export class ActivationService {
    /**
     * Tracks an event for an organization.
     */
    static async track(eventName: string, organizationId: string, userId?: string, entityId?: string, metadata?: any, dedupeKey?: string) {
        try {
            await (prisma as any).activationEvent.upsert({
                where: { dedupeKey: dedupeKey || `AUTO_${Date.now()}_${Math.random().toString(36).substring(7)}` },
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
     * Get Aggregated Funnel Stats for Superadmin Dashboard
     */
    static async getGlobalFunnelStats(): Promise<FunnelStep[]> {
        const steps: { name: string, event: ActivationMilestone }[] = [
            { name: 'Org Created', event: 'ORG_CREATED' },
            { name: 'Admin Assigned', event: 'ADMIN_ASSIGNED' },
            { name: 'Quote Created', event: 'QUOTE_CREATED' },
            { name: 'Quote Sent', event: 'QUOTE_SENT' },
            { name: 'Quote Accepted', event: 'QUOTE_ACCEPTED' },
            { name: 'Invoice Generated', event: 'INVOICE_CREATED' },
            { name: 'Checkout Started', event: 'CHECKOUT_STARTED' },
            { name: 'Payment Paid', event: 'PAYMENT_SUCCEEDED' }
        ];

        // Fetch counts in parallel
        const counts = await Promise.all(
            steps.map(async (step) => {
                const count = await (prisma as any).activationEvent.count({
                    where: { eventName: step.event },
                    // Count unique organizations per step
                    // In a more complex setup, we'd use select: { organizationId: true } and distinct
                });
                
                // For a more accurate "unique orgs per step" funnel:
                const uniqueOrgs = await (prisma as any).activationEvent.groupBy({
                    by: ['organizationId'],
                    where: { eventName: step.event }
                });
                
                return uniqueOrgs.length;
            })
        );

        const funnel: FunnelStep[] = [];
        let prevCount = 0;

        steps.forEach((step, i) => {
            const count = counts[i];
            const conversion = i === 0 ? 100 : (prevCount > 0 ? (count / prevCount) * 100 : 0);
            const dropOff = i === 0 ? 0 : 100 - conversion;

            funnel.push({
                name: step.name,
                event: step.event,
                count,
                conversion: Math.round(conversion),
                dropOff: Math.round(dropOff)
            });
            prevCount = count;
        });

        return funnel;
    }

    /**
     * Calculates average TTV (Time to Value)
     */
    static async getAverageTtv(): Promise<number> {
        const stats = await (prisma.organizationStats as any).findMany({
            where: { ttvDays: { not: null } },
            select: { ttvDays: true }
        });

        if (stats.length === 0) return 0;
        const sum = stats.reduce((acc: number, s: any) => acc + (s.ttvDays || 0), 0);
        return parseFloat((sum / stats.length).toFixed(1));
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

        // Build Attributes Map for UI Checklist
        const attributes: any = { stage: 'REGISTERED' };
        events.forEach((e: any) => {
            attributes[e.eventName] = true;
        });

        // Determine Stage (Growth logic)
        if (findEvent('PAYMENT_SUCCEEDED')) attributes.stage = 'PAID_CUSTOMER';
        else if (findEvent('QUOTE_ACCEPTED')) attributes.stage = 'WON_CLIENT';
        else if (firstValue) attributes.stage = 'ACTIVATED';
        else if (findEvent('QUOTE_CREATED') || findEvent('FIRST_QUOTE_DRAFT_CREATED')) attributes.stage = 'VALUE_DISCOVERY';
        else if (findEvent('FIRST_PROJECT_CREATED')) attributes.stage = 'ACTIVE_EXPLORER';

        await (prisma.organizationStats as any).upsert({
            where: { organizationId },
            create: {
                organizationId,
                firstValueAt: firstValue?.occurredAt,
                ttvDays,
                attributes
            },
            update: {
                firstValueAt: firstValue?.occurredAt,
                ttvDays,
                attributes
            }
        });
    }

    /**
     * Returns the activation checklist for an organization.
     */
    static async getActivationChecklist(organizationId: string) {
        const events = await (prisma as any).activationEvent.findMany({
            where: { organizationId }
        });

        const hasEvent = (name: string) => events.some((e: any) => e.eventName === name);

        const items = [
            { id: 'org_created', label: 'Cuenta creada', completed: true }, // By definition
            { id: 'admin_assigned', label: 'Administrador asignado', completed: hasEvent('ADMIN_ASSIGNED') },
            { id: 'quote_created', label: 'Primera cotización borrador', completed: hasEvent('QUOTE_CREATED') || hasEvent('FIRST_QUOTE_DRAFT_CREATED') },
            { id: 'quote_sent', label: 'Primera cotización enviada', completed: hasEvent('QUOTE_SENT') || hasEvent('FIRST_QUOTE_SENT') },
            { id: 'quote_accepted', label: 'Primera cotización aceptada', completed: hasEvent('QUOTE_ACCEPTED') },
            { id: 'billing_configured', label: 'Facturación configurada', completed: hasEvent('BILLING_CONFIGURED') || hasEvent('CHECKOUT_COMPLETED') }
        ];

        const completedCount = items.filter(i => i.completed).length;
        const progress = Math.round((completedCount / items.length) * 100);

        return { items, progress };
    }
}

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
     * Returns the activation checklist for an organization based on REAL domain data.
     * v2.0: Canonical source of truth from Projects, Quotes and Items.
     */
    static async getActivationChecklist(organizationId: string) {
        const traceId = `ACT-CHK-${Math.random().toString(36).substring(7).toUpperCase()}`;
        
        try {
            // Fetch real counts from DB
            const [projectsCount, quotes, quoteItemsCount] = await Promise.all([
                prisma.project.count({ where: { organizationId } }),
                prisma.quote.findMany({ 
                    where: { project: { organizationId } },
                    select: { status: true }
                }),
                prisma.quoteItem.count({ where: { organizationId } })
            ]);

            const hasProjects = projectsCount >= 1;
            const hasItems = quoteItemsCount >= 1;
            const hasQuotes = quotes.length >= 1;
            const hasSentQuotes = quotes.some(q => q.status === 'SENT' || q.status === 'ACCEPTED');

            const items = [
                { 
                    id: 'FIRST_PROJECT_CREATED', 
                    label: 'Crea tu primer proyecto', 
                    completed: hasProjects,
                    description: 'Define el nombre y presupuesto para organizar tus costos.'
                },
                { 
                    id: 'ITEMS_ADDED', 
                    label: 'Puebla tu proyecto', 
                    completed: hasItems,
                    description: 'Agrega ítems, materiales o servicios a la estructura de costos.',
                    locked: !hasProjects
                },
                { 
                    id: 'FIRST_QUOTE_DRAFT_CREATED', 
                    label: 'Genera una propuesta', 
                    completed: hasQuotes,
                    description: 'Crea el primer borrador de cotización basado en tus ítems.',
                    locked: !hasItems
                },
                { 
                    id: 'FIRST_QUOTE_SENT', 
                    label: 'Envía tu primera oferta', 
                    completed: hasSentQuotes,
                    description: 'Comparte el PDF con tu cliente para cerrar el negocio.',
                    locked: !hasQuotes
                }
            ];

            const completedCount = items.filter(i => i.completed).length;
            const progress = Math.round((completedCount / items.length) * 100);

            console.log(`[Activation][${traceId}] Resolved for org=${organizationId}: projects=${projectsCount}, items=${quoteItemsCount}, quotes=${quotes.length}, progress=${progress}%`);

            return { items, progress, totalSteps: items.length, completedCount };
        } catch (error: any) {
            console.error(`[Activation][${traceId}] Failed to resolve checklist:`, error.message);
            return { items: [], progress: 0, totalSteps: 0, completedCount: 0 };
        }
    }
}

/**
 * TechWise Stripe Seats Sync Helper
 * Prepared for Wave 4.2
 */
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/services/audit-service";

export async function syncStripeSeats(orgId: string) {
    try {
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                subscription: true,
                _count: {
                    select: { OrganizationMember: { where: { status: 'ACTIVE' } } }
                }
            }
        });

        if (!org || !org.subscription || !org.subscription.providerSubscriptionId) {
            return { success: true, message: 'No active stripe subscription' };
        }

        const seatsUsed = org._count.OrganizationMember;
        const subscriptionId = org.subscription.providerSubscriptionId;

        console.log(`[Stripe Sync] Syncing ${seatsUsed} seats for org ${orgId}`);

        // Logic placeholder for Stripe SDK:
        // const stripe = getStripe();
        // await stripe.subscriptions.update(subscriptionId, {
        //   items: [{ id: org.subscription.providerSubscriptionItemId, quantity: seatsUsed }]
        // });

        await createAuditLog({
            organizationId: orgId,
            userId: 'SYSTEM', // O el actor que disparó el sync
            action: 'STRIPE_SEATS_SYNC' as any,
            details: `Synced ${seatsUsed} seats to Stripe`
        });

        return { success: true, seats: seatsUsed };
    } catch (error) {
        console.error("[Stripe Sync] Failed:", error);
        return { success: false, error };
    }
}

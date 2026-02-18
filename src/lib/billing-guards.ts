import prisma from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";

/**
 * Checks if an organization is in a restricted state (Read-Only).
 * Returns true if restricted, false if active/trialing.
 */
export async function isOrganizationRestricted(organizationId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findUnique({
        where: { organizationId }
    });

    if (!subscription) return true; // No subscription = Restricted

    const status = subscription.status;
    return (
        status === SubscriptionStatus.PAST_DUE ||
        status === SubscriptionStatus.PAUSED ||
        status === SubscriptionStatus.CANCELED
    );
}

/**
 * Throws a specific error if the organization is restricted.
 * Use this at the start of Server Actions that modify data.
 */
export async function ensureActivePlan(organizationId: string) {
    const restricted = await isOrganizationRestricted(organizationId);
    if (restricted) {
        throw new Error("READ_ONLY_MODE");
    }
}

import prisma from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { getWriteAccessContext } from "@/lib/auth/write-guard";

/**
 * Checks if an organization is in a read-only state (PAUSED or canceled trial).
 * Deprecated: Use getWriteAccessContext() from @/lib/auth/write-guard instead.
 */
export async function isOrganizationPaused(organizationId: string): Promise<boolean> {
    const context = await getWriteAccessContext();
    return !context.allowed && (context.reason === 'SUBSCRIPTION_PAUSED' || context.reason === 'SUBSCRIPTION_CANCELED' || context.reason === 'TRIAL_EXPIRED');
}

/**
 * Guard for Server Actions. Throws an error if the organization is in read-only mode.
 * Use this at the beginning of any create, update, or delete action.
 * The message "READ_ONLY_MODE" is intercepted by the PaywallProvider.
 */
export async function ensureNotPaused(organizationId: string) {
    const context = await getWriteAccessContext();
    if (!context.allowed) {
        // Log the reason for auditability
        console.log(`[WriteGuard][Blocked] orgId=${organizationId}, reason=${context.reason}`);
        
        // We throw the specific message so PaywallContext can show it to the user
        throw new Error(`READ_ONLY_MODE:${context.message}`);
    }
    return context;
}

/**
 * Utility to get subscription info for UI display
 */
export async function getSubscriptionState(organizationId: string) {
    return prisma.subscription.findUnique({
        where: { organizationId },
        include: { organization: true }
    });
}

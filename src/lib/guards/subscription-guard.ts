import prisma from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";

/**
 * Checks if an organization is in a read-only state (PAUSED or canceled trial).
 */
export async function isOrganizationPaused(organizationId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findUnique({
        where: { organizationId },
        select: {
            status: true,
            trialEndsAt: true
        }
    });

    if (!subscription) return false;

    // Paused if explicitly paused, past due, or canceled
    if ([SubscriptionStatus.PAUSED, SubscriptionStatus.PAST_DUE, SubscriptionStatus.CANCELED].includes(subscription.status)) {
        return true;
    }

    // Trial validation
    if (subscription.status === SubscriptionStatus.TRIALING && subscription.trialEndsAt) {
        return new Date() > subscription.trialEndsAt;
    }

    return false;
}

/**
 * Guard for Server Actions. Throws an error if the organization is paused.
 * Use this at the beginning of any create, update, or delete action.
 */
export async function ensureNotPaused(organizationId: string) {
    const paused = await isOrganizationPaused(organizationId);
    if (paused) {
        throw new Error("ACCIÓN BLOQUEADA: Tu organización está en modo de solo lectura (PAUSED). Por favor, activa un plan para continuar editando.");
    }
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

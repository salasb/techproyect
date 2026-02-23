'use server'

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { normalizeOperationalError } from "@/lib/superadmin/error-normalizer";
import { resolveSuperadminAccess } from "@/lib/auth/superadmin-guard";

/**
 * Overrides a subscription to be "Comped" (Free).
 */
export async function compSubscriptionAction(orgId: string, data: {
    compedUntil: Date | null;
    compedReason: string;
    source?: string;
}) {
    try {
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { success: false, error: "No autorizado." };

        if (!orgId) throw new Error("Organization ID is required");

        await prisma.subscription.update({
            where: { organizationId: orgId },
            data: {
                compedUntil: data.compedUntil,
                compedReason: data.compedReason,
                source: data.source || 'COMPED',
                status: 'ACTIVE'
            }
        });

        revalidatePath(`/admin/orgs/${orgId}`);
        revalidatePath(`/admin/subscriptions`);
        return { success: true };
    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        return { success: false, error: normalized.message };
    }
}

/**
 * Resets a subscription to STRIPE source (Removing comped status).
 */
export async function resetSubscriptionAction(orgId: string) {
    try {
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { success: false, error: "No autorizado." };

        await prisma.subscription.update({
            where: { organizationId: orgId },
            data: {
                compedUntil: null,
                compedReason: null,
                source: 'STRIPE'
            }
        });

        revalidatePath(`/admin/orgs/${orgId}`);
        return { success: true };
    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        return { success: false, error: normalized.message };
    }
}

/**
 * Extends the trial period of a subscription by a given number of days.
 */
export async function extendTrialAction(orgId: string, days: number = 30) {
    try {
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { success: false, error: "No autorizado." };

        const currentSub = await prisma.subscription.findUnique({
            where: { organizationId: orgId }
        });

        if (!currentSub) throw new Error("Subscription not found");

        const newTrialEndsAt = currentSub.trialEndsAt
            ? new Date(currentSub.trialEndsAt.getTime() + days * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        await prisma.subscription.update({
            where: { organizationId: orgId },
            data: {
                status: 'TRIALING',
                trialEndsAt: newTrialEndsAt,
                source: currentSub.source || 'STRIPE'
            }
        });

        revalidatePath(`/admin/orgs/${orgId}`);
        return { success: true, trialEndsAt: newTrialEndsAt };
    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        return { success: false, error: normalized.message };
    }
}


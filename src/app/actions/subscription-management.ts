'use server'

import prisma from "@/lib/prisma";
import { getOrganizationId } from "@/lib/current-org";
import { revalidatePath } from "next/cache";
import { CancellationReason, CancelOutcome, SubscriptionStatus } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { ActivationService } from "@/services/activation-service";

/**
 * Records a cancellation intent for A/B testing and analytics.
 */
export async function logCancelIntent(data: {
    reason: CancellationReason;
    comment?: string;
    variant?: string;
}) {
    const orgId = await getOrganizationId();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!orgId || !user) throw new Error("Unauthorized");

    await prisma.cancelIntent.create({
        data: {
            organizationId: orgId,
            userId: user.id,
            reason: data.reason,
            comment: data.comment,
            variant: data.variant,
            outcome: 'CANCEL_PENDING'
        }
    });

    await ActivationService.trackFunnelEvent('CANCEL_INTENT', orgId, `cancel_intent_${Date.now()}`, user.id, { reason: data.reason });
}

/**
 * Pauses a subscription for 30 days (Read-only mode).
 */
export async function pauseSubscriptionAction() {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    await prisma.subscription.update({
        where: { organizationId: orgId },
        data: { status: SubscriptionStatus.PAUSED }
    });

    // Mark last cancel intent as SAVED_PAUSE
    const lastIntent = await prisma.cancelIntent.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' }
    });

    if (lastIntent) {
        await prisma.cancelIntent.update({
            where: { id: lastIntent.id },
            data: { outcome: 'SAVED_PAUSE' }
        });
    }

    await ActivationService.trackFunnelEvent('CANCEL_SAVED', orgId, `save_pause_${Date.now()}`, undefined, { method: 'PAUSE' });

    revalidatePath('/settings/billing');
    return { success: true };
}

/**
 * Downgrades a TEAM organization to SOLO.
 */
export async function downgradeToSoloAction() {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    await prisma.organization.update({
        where: { id: orgId },
        data: { mode: 'SOLO' }
    });

    await prisma.subscription.update({
        where: { organizationId: orgId },
        data: { seatLimit: 1 }
    });

    // Mark last cancel intent as SAVED_DOWNGRADE
    const lastIntent = await prisma.cancelIntent.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' }
    });

    if (lastIntent) {
        await prisma.cancelIntent.update({
            where: { id: lastIntent.id },
            data: { outcome: 'SAVED_DOWNGRADE' }
        });
    }

    await ActivationService.trackFunnelEvent('CANCEL_SAVED', orgId, `save_solo_${Date.now()}`, undefined, { method: 'SOLO' });

    revalidatePath('/settings/billing');
    return { success: true };
}

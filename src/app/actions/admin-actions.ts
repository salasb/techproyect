'use server'

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Guard that ensures the caller is a SUPERADMIN.
 */
async function ensureSuperadmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true }
    });

    if ((profile?.role as string) !== 'SUPERADMIN') {
        throw new Error("Forbidden: Superadmin access required");
    }

    return user;
}

/**
 * Overrides a subscription to be "Comped" (Free).
 */
export async function compSubscriptionAction(orgId: string, data: {
    compedUntil: Date | null;
    compedReason: string;
    source?: string;
}) {
    await ensureSuperadmin();

    if (!orgId) throw new Error("Organization ID is required");

    await prisma.subscription.update({
        where: { organizationId: orgId },
        data: {
            compedUntil: data.compedUntil,
            compedReason: data.compedReason,
            source: data.source || 'COMPED',
            status: 'ACTIVE'
        } as any
    });

    revalidatePath(`/admin/orgs/${orgId}`);
    revalidatePath(`/admin/subscriptions`);
    return { success: true };
}

/**
 * Resets a subscription to STRIPE source (Removing comped status).
 */
export async function resetSubscriptionAction(orgId: string) {
    await ensureSuperadmin();

    await prisma.subscription.update({
        where: { organizationId: orgId },
        data: {
            compedUntil: null,
            compedReason: null,
            source: 'STRIPE'
        } as any
    });

    revalidatePath(`/admin/orgs/${orgId}`);
    return { success: true };
}

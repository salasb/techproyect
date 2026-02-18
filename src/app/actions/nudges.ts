'use server';

import { NudgeService } from "@/services/nudge-service";
import { getOrganizationId } from "@/lib/current-org";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Fetches active nudges for the current user and organization.
 */
export async function getActiveNudgesAction() {
    const orgId = await getOrganizationId();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!orgId || !user) return [];

    return NudgeService.getActiveNudges(orgId, user.id);
}

/**
 * Dismisses a nudge.
 */
export async function dismissNudgeAction(dedupeKey: string, snoozeHours?: number) {
    const orgId = await getOrganizationId();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!orgId || !user) throw new Error("Unauthorized");

    await NudgeService.dismissNudge(orgId, user.id, dedupeKey, snoozeHours);
    revalidatePath('/dashboard');
    return { success: true };
}

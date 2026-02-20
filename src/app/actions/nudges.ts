'use server';

import { NudgeService } from "@/services/nudge-service";
import { requireOperationalScope } from "@/lib/auth/server-resolver";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Fetches active nudges for the current user and organization.
 */
export async function getActiveNudgesAction() {
    try {
        const scope = await requireOperationalScope();
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return [];

        return NudgeService.getActiveNudges(scope.orgId, user.id);
    } catch (e) {
        return [];
    }
}

/**
 * Dismisses a nudge.
 */
export async function dismissNudgeAction(dedupeKey: string, snoozeHours?: number) {
    const scope = await requireOperationalScope();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    await NudgeService.dismissNudge(scope.orgId, user.id, dedupeKey, snoozeHours);
    revalidatePath('/dashboard');
    return { success: true };
}

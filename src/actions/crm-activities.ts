'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/supabase";

import { requireOperationalScope } from "@/lib/auth/server-resolver";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";

type InteractionType = Database['public']['Enums']['InteractionType'];

export async function logInteraction(data: {
    opportunityId: string;
    type: InteractionType;
    notes: string;
    date?: string; // ISO string, defaults to now
    nextFollowUpDate?: string; // ISO string, optional
}) {
    const scope = await requireOperationalScope();
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();

    // 1. Get Organization ID (implicitly handled by RLS but good to be explicit if creating new records)
    // Actually, we can fetch the opportunity first to get the orgId and clientId
    const { data: opp, error: oppError } = await supabase
        .from('Opportunity')
        .select('organizationId, clientId')
        .eq('id', data.opportunityId)
        .single();

    if (oppError || !opp) {
        throw new Error("Opportunity not found");
    }

    const interactionDate = data.date || new Date().toISOString();

    // 2. Create Interaction Record
    const { error: logError } = await supabase
        .from('Interaction')
        .insert({
            organizationId: opp.organizationId,
            clientId: opp.clientId,
            opportunityId: data.opportunityId,
            type: data.type,
            notes: data.notes,
            date: interactionDate,
            createdAt: new Date().toISOString()
        });

    if (logError) {
        console.error("Error logging interaction:", logError);
        return { success: false, error: "Failed to log interaction" };
    }

    // 3. Update Opportunity (Last Interaction + Next Follow-up)
    const updateData: any = {
        lastInteractionDate: interactionDate,
        updatedAt: new Date().toISOString()
    };

    if (data.nextFollowUpDate) {
        updateData.nextInteractionDate = data.nextFollowUpDate;
    }

    const { error: updateError } = await supabase
        .from('Opportunity')
        .update(updateData)
        .eq('id', data.opportunityId);

    if (updateError) {
        console.error("Error updating opportunity dates:", updateError);
        // We don't fail the whole action if just the update fails, but good to know.
    }

    revalidatePath(`/crm/opportunities/${data.opportunityId}`);
    revalidatePath('/crm');

    return { success: true };
}

export async function scheduleFollowUp(opportunityId: string, date: string) {
    const scope = await requireOperationalScope();
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();

    const { error } = await supabase
        .from('Opportunity')
        .update({
            nextInteractionDate: date,
            updatedAt: new Date().toISOString()
        })
        .eq('id', opportunityId);

    if (error) {
        console.error("Error scheduling follow-up:", error);
        return { success: false, error: "Failed to schedule follow-up" };
    }

    revalidatePath(`/crm/opportunities/${opportunityId}`);
    revalidatePath('/crm');
    return { success: true };
}

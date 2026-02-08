'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleQuoteAcceptance(projectId: string, isAccepted: boolean) {
    const supabase = await createClient();
    const acceptedAt = isAccepted ? new Date().toISOString() : null;

    const { error } = await supabase
        .from('Project')
        .update({ acceptedAt } as any) // Type assertion until types are regenerated
        .eq('id', projectId);

    if (error) {
        console.error("Error toggling quote acceptance:", error);
        throw new Error("Failed to update quote acceptance status");
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/quote`);
    return { success: true };
}

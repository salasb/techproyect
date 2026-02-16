'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getOrganizationId } from "@/lib/current-org";

export async function addLog(projectId: string, content: string, type: 'INFO' | 'BLOCKER' | 'MILESTONE' | 'STATUS_CHANGE' = 'INFO') {
    const orgId = await getOrganizationId();
    const supabase = await createClient();

    const { error } = await supabase.from('ProjectLog').insert({
        id: crypto.randomUUID(),
        organizationId: orgId,
        projectId,
        content,
        type
    });

    if (error) {
        console.error("Error adding log:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function getLogs(projectId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('ProjectLog')
        .select('*')
        .eq('projectId', projectId)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error("Error fetching logs:", error);
        return [];
    }

    return data;
}

'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireOperationalScope } from "@/lib/auth/server-resolver";
export async function addLog(projectId: string, content: string, type: 'INFO' | 'BLOCKER' | 'MILESTONE' | 'STATUS_CHANGE' = 'INFO') {
    const scope = await requireOperationalScope();
    const supabase = await createClient();

    const { error } = await supabase.from('ProjectLog').insert({
        id: crypto.randomUUID(),
        organizationId: scope.orgId,
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
    const scope = await requireOperationalScope();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('ProjectLog')
        .select('*')
        .eq('projectId', projectId)
        .eq('organizationId', scope.orgId)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error("Error fetching logs:", error);
        return [];
    }

    return data;
}

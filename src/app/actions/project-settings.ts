'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

type ProjectUpdate = Database['public']['Tables']['Project']['Update'];

export async function updateProjectSettings(projectId: string, data: ProjectUpdate) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('Project')
        .update(data)
        .eq('id', projectId);

    if (error) {
        throw new Error(`Error updating project: ${error.message}`);
    }

    // Audit Log
    const changes = Object.keys(data).join(', ');
    await supabase.from('AuditLog').insert({
        projectId,
        action: 'UPDATE_SETTINGS',
        details: `Updated fields: ${changes}`,
        userName: 'Usuario Actual' // Placeholder until Auth is fully context aware or passed
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/quote`);
    revalidatePath('/projects');
    revalidatePath('/');
}

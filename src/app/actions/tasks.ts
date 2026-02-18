'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getOrganizationId } from "@/lib/current-org";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";

export async function createTask(projectId: string, data: { title: string; description?: string; dueDate?: string; priority?: number }) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();

    const { error } = await supabase
        .from('Task')
        .insert({
            projectId,
            title: data.title,
            description: data.description,
            dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
            priority: data.priority || 0,
            status: 'PENDING'
        });

    if (error) {
        console.error("Error creating task:", error);
        throw new Error("No se pudo crear la tarea");
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function toggleTaskStatus(taskId: string, projectId: string, currentStatus: string) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();
    const newStatus = currentStatus === 'PENDING' ? 'COMPLETED' : 'PENDING';

    const { error } = await supabase
        .from('Task')
        .update({ status: newStatus })
        .eq('id', taskId);

    if (error) {
        console.error("Error toggling task status:", error);
        throw new Error("No se pudo actualizar el estado de la tarea");
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function deleteTask(taskId: string, projectId: string) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();

    const { error } = await supabase
        .from('Task')
        .delete()
        .eq('id', taskId);

    if (error) {
        console.error("Error deleting task:", error);
        throw new Error("No se pudo eliminar la tarea");
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

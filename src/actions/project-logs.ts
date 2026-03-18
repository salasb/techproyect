'use server'

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/server-resolver";
import prisma from "@/lib/prisma";
import { autoTransitionProjectState } from "@/app/actions/projects";

export async function addLog(projectId: string, content: string, type: 'INFO' | 'BLOCKER' | 'MILESTONE' | 'STATUS_CHANGE' = 'INFO') {
    const traceId = `LOG-ADD-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const scope = await requirePermission('PROJECTS_MANAGE');
        
        console.log(`[Logs][${traceId}] Adding entry to project=${projectId}`);

        const newLog = await prisma.projectLog.create({
            data: {
                id: crypto.randomUUID(),
                organizationId: scope.orgId,
                projectId,
                content,
                type,
                createdAt: new Date()
            }
        });

        // Trigger Auto-transition logic
        if (type !== 'STATUS_CHANGE') {
            await autoTransitionProjectState(projectId, 'LOG_ADDED');
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, id: newLog.id };

    } catch (error: any) {
        console.error(`[Logs][${traceId}] Critical failure:`, error.message);
        return { success: false, error: "No se pudo guardar la nota en la bitácora." };
    }
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

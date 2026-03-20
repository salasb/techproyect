'use server'

import { revalidatePath } from "next/cache";
import { requirePermission, requireOperationalScope } from "@/lib/auth/server-resolver";
import prisma from "@/lib/prisma";
import { autoTransitionProjectState } from "@/app/actions/projects";

export async function addLog(projectId: string, content: string, type: 'INFO' | 'BLOCKER' | 'MILESTONE' | 'STATUS_CHANGE' = 'INFO') {
    const traceId = `LOG-ADD-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const scope = await requirePermission('PROJECTS_MANAGE');
        
        console.log(`[Logs][${traceId}] Adding entry to project=${projectId}`);

        const newLog = await prisma.projectLog.create({
            data: {
                id: Math.random().toString(36).substring(2, 10),
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

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Logs][${traceId}] Critical failure:`, message);
        return { success: false, error: "No se pudo guardar la nota en la bitácora." };
    }
}

export async function getLogs(projectId: string) {
    try {
        const scope = await requireOperationalScope();
        
        const logs = await prisma.projectLog.findMany({
            where: {
                projectId,
                organizationId: scope.orgId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return logs;
    } catch (error) {
        console.error("Error fetching logs via Prisma:", error);
        return [];
    }
}

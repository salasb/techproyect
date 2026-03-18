'use server'

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateProject } from "@/lib/validators";
import { AuditService } from "@/services/auditService";
import { requireOperationalScope, requirePermission } from "@/lib/auth/server-resolver";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import prisma from "@/lib/prisma";

/**
 * PROJECT ACTIONS (v3.0)
 * Centralized logic for project lifecycle using Prisma.
 */

export async function createProject(formData: FormData) {
    const scope = await requireOperationalScope();
    await ensureNotPaused(scope.orgId);

    const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        clientId: formData.get('clientId') as string || null,
        budgetNet: parseFloat(formData.get('budgetNet') as string) || 0,
        currency: (formData.get('currency') as string) || 'CLP',
        status: 'EN_ESPERA',
        stage: 'LEVANTAMIENTO',
        organizationId: scope.orgId,
        responsible: scope.userId
    };

    const errors = validateProject(data);
    if (Object.keys(errors).length > 0) return { errors };

    try {
        const project = await prisma.project.create({
            data: {
                id: `PRJ-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(7).toUpperCase()}`,
                ...data,
                startDate: new Date(),
                plannedEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
            }
        });

        await AuditService.logAction(project.id, 'PROJECT_CREATE', `Proyecto "${data.name}" creado por ${scope.userId}`);

        revalidatePath('/projects');
        return { success: true, id: project.id };
    } catch (error: any) {
        console.error("Error creating project:", error);
        return { error: "No se pudo crear el proyecto. Error de base de datos." };
    }
}

export async function updateProjectStatus(projectId: string, status: string, stage?: string, nextAction?: string, closeReason?: string) {
    const traceId = `PRJ-ST-UPD-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const scope = await requireOperationalScope();
        await ensureNotPaused(scope.orgId);

        console.log(`[Projects][${traceId}] Updating status for project=${projectId}, org=${scope.orgId}, newStatus=${status}`);

        const updateData: any = { status, updatedAt: new Date() };
        if (stage) updateData.stage = stage;
        if (nextAction) updateData.nextAction = nextAction;
        if (closeReason) updateData.closeReason = closeReason;

        // Commercial Lifecycle Enhancements
        if (status === 'EN_ESPERA') {
            const followUpDate = new Date();
            followUpDate.setDate(followUpDate.getDate() + 7);
            updateData.nextAction = 'Seguimiento Cotización';
            updateData.nextActionDate = followUpDate;
            updateData.stage = 'LEVANTAMIENTO';
            updateData.quoteSentDate = new Date();
        }

        if (status === 'EN_CURSO' && stage === 'DISENO') {
            const kickoffDate = new Date();
            kickoffDate.setDate(kickoffDate.getDate() + 2);
            updateData.nextAction = 'Planificar Kickoff';
            updateData.nextActionDate = kickoffDate;
        }

        // [INVENTORY AUTOMATION]
        if (status === 'CERRADO' || stage === 'IMPLEMENTACION') {
            try {
                const { deductStockForProject } = await import("@/helpers/inventory");
                await deductStockForProject(projectId);
            } catch (invError) {
                console.error("[Projects] Inventory automation warning:", invError);
            }
        }

        // Human Interface Mapping
        const STATUS_LABELS: Record<string, string> = {
            'EN_ESPERA': 'En Espera',
            'EN_CURSO': 'En Curso',
            'CERRADO': 'Finalizado',
            'CANCELADO': 'Cancelado',
            'BLOQUEADO': 'Bloqueado'
        };
        const STAGE_LABELS: Record<string, string> = {
            'LEVANTAMIENTO': 'Levantamiento',
            'COTIZACION': 'Cotización',
            'NEGOCIACION': 'Negociación',
            'DISENO': 'Diseño',
            'DESARROLLO': 'Desarrollo',
            'PRUEBAS': 'Pruebas',
            'ENTREGA': 'Entrega'
        };

        const readableStatus = STATUS_LABELS[status] || status;
        const readableStage = stage ? (STAGE_LABELS[stage] || stage) : '';

        // Atomic update and log entry
        await prisma.$transaction([
            prisma.project.update({
                where: { id: projectId, organizationId: scope.orgId },
                data: updateData
            }),
            prisma.projectLog.create({
                data: {
                    id: crypto.randomUUID(),
                    projectId,
                    organizationId: scope.orgId,
                    type: 'STATUS_CHANGE',
                    content: `Estado actualizado a ${readableStatus} ${readableStage ? `(${readableStage})` : ''}`
                }
            })
        ]);

        revalidatePath(`/projects/${projectId}`);
        return { success: true };

    } catch (error: any) {
        console.error(`[Projects][${traceId}] Failed to update status:`, error.message);
        throw new Error("Error interno al actualizar el estado del proyecto.");
    }
}

export async function deleteProject(projectId: string) {
    const traceId = `PRJ-DEL-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const scope = await requireOperationalScope();
    await ensureNotPaused(scope.orgId);

    try {
        console.log(`[Projects][${traceId}] Attempting deletion of project=${projectId} for org=${scope.orgId}`);

        const project = await prisma.project.findUnique({
            where: { id: projectId, organizationId: scope.orgId }
        });

        if (!project) {
            console.warn(`[Projects][${traceId}] Project not found or unauthorized: ${projectId}`);
            return { success: false, error: "Proyecto no encontrado o no tienes permisos." };
        }

        await prisma.$transaction([
            prisma.projectLog.deleteMany({ where: { projectId } }),
            prisma.auditLog.deleteMany({ where: { projectId } }),
            prisma.costEntry.deleteMany({ where: { projectId } }),
            prisma.invoice.deleteMany({ where: { projectId } }),
            prisma.quoteItem.deleteMany({ where: { projectId } }),
            prisma.saleNote.deleteMany({ where: { projectId } }),
            prisma.project.delete({ where: { id: projectId } })
        ]);

        await AuditService.logAction(null, 'PROJECT_DELETE', `Proyecto "${project.name}" eliminado permanentemente.`);

        revalidatePath("/projects");
        return { success: true };

    } catch (error: any) {
        console.error(`[Projects][${traceId}] Critical error during deletion:`, error.message);
        return { success: false, error: "Error de base de datos al eliminar.", traceId };
    }
}

export async function closeProject(projectId: string) {
    return await updateProjectStatus(projectId, 'CERRADO');
}

export async function associateProjectToClient(projectId: string, clientId: string) {
    const traceId = `PRJ-ASC-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const scope = await requireOperationalScope();
        await ensureNotPaused(scope.orgId);

        console.log(`[Projects][${traceId}] Associating project=${projectId} to client=${clientId}`);

        await prisma.project.update({
            where: { id: projectId, organizationId: scope.orgId },
            data: { clientId, updatedAt: new Date() }
        });

        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (error: any) {
        console.error(`[Projects][${traceId}] Failed to associate client:`, error.message);
        throw new Error("No se pudo asociar el cliente.");
    }
}

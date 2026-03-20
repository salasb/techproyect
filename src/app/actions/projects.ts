'use server'

import { revalidatePath } from "next/cache";
import { validateProject } from "@/lib/validators";
import { AuditService } from "@/services/auditService";
import { requireOperationalScope } from "@/lib/auth/server-resolver";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import prisma from "@/lib/prisma";

import { ProjectStatus, ProjectStage } from "@prisma/client";

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
        status: 'EN_ESPERA' as ProjectStatus,
        stage: 'LEVANTAMIENTO' as ProjectStage,
        organizationId: scope.orgId,
        responsible: scope.userId
    };

    const validation = validateProject({
        name: data.name,
        companyId: data.clientId,
        startDate: new Date().toISOString(),
        budget: data.budgetNet
    });
    if (!validation.success) return { errors: validation.errors };

    try {
        const project = await prisma.project.create({
            data: {
                id: `PRJ-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${globalThis.crypto.randomUUID().split("-")[0].toUpperCase()}`,
                ...data,
                startDate: new Date(),
                plannedEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
            }
        });

        await AuditService.logAction({projectId: project.id, action: 'PROJECT_CREATE', details: `Proyecto "${data.name}" creado por ${scope.userId}`});

        revalidatePath('/projects');
        return { success: true, id: project.id };
    } catch (error: any) {
        console.error("Error creating project:", error);
        return { error: "No se pudo crear el proyecto. Error de base de datos." };
    }
}

export async function updateProjectStatus(projectId: string, status: string, stage?: string, nextAction?: string, closeReason?: string) {
    const traceId = `PRJ-ST-UPD-${globalThis.crypto.randomUUID().split("-")[0].toUpperCase()}`;
    try {
        const scope = await requireOperationalScope();
        await ensureNotPaused(scope.orgId);

        console.log(`[Projects][${traceId}] Updating status for project=${projectId}, org=${scope.orgId}, newStatus=${status}`);

        const updateData: any = { status: status as ProjectStatus, updatedAt: new Date() };
        if (stage) updateData.stage = stage as ProjectStage;
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
                    id: globalThis.crypto.randomUUID(),
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
    const traceId = `PRJ-DEL-${globalThis.crypto.randomUUID().split("-")[0].toUpperCase()}`;
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

        await AuditService.logAction({projectId: null, action: 'PROJECT_DELETE', details: `Proyecto "${project.name}" eliminado permanentemente.`});

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
    const traceId = `PRJ-ASC-${globalThis.crypto.randomUUID().split("-")[0].toUpperCase()}`;
    try {
        const scope = await requireOperationalScope();
        await ensureNotPaused(scope.orgId);
        const prisma = (await import("@/lib/prisma")).default;

        console.log(`[Projects][${traceId}] Associating project=${projectId} to client=${clientId}`);

        await prisma.project.update({
            where: { id: projectId, organizationId: scope.orgId },
            data: { clientId, updatedAt: new Date() }
        });

        // Trigger Auto-transition
        await autoTransitionProjectState(projectId, 'CLIENT_ASSIGNED');

        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (error: any) {
        console.error(`[Projects][${traceId}] Failed to associate client:`, error.message);
        throw new Error("No se pudo asociar el cliente.");
    }
}

/**
 * INTELLIGENT STATE MACHINE (v1.0)
 * Automatically transitions project state from 'EN_ESPERA' to 'EN_CURSO'
 * based on real commercial activity triggers.
 */
export async function autoTransitionProjectState(projectId: string, trigger: 'LOG_ADDED' | 'COST_ADDED' | 'ITEM_ADDED' | 'CLIENT_ASSIGNED' | 'QUOTE_GENERATED') {
    const traceId = `PRJ-AUTO-ST-${globalThis.crypto.randomUUID().split("-")[0].toUpperCase()}`;
    try {
        const prisma = (await import("@/lib/prisma")).default;

        // 1. Fetch current state
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { status: true, name: true, organizationId: true, clientId: true }
        });

        if (!project || project.status !== 'EN_ESPERA') return;

        // 2. Evaluate rules
        // For now, any significant activity transitions to 'EN_CURSO' if a client is assigned
        if (!project.clientId) {
            console.log(`[Projects][${traceId}] Auto-transition skipped: No client assigned to "${project.name}"`);
            return;
        }

        console.log(`[Projects][${traceId}] Auto-transitioning project "${project.name}" to EN_CURSO (Trigger: ${trigger})`);

        await prisma.$transaction([
            prisma.project.update({
                where: { id: projectId },
                data: { 
                    status: 'EN_CURSO' as ProjectStatus,
                    updatedAt: new Date()
                }
            }),
            prisma.projectLog.create({
                data: {
                    id: globalThis.crypto.randomUUID(),
                    projectId,
                    organizationId: project.organizationId,
                    type: 'STATUS_CHANGE',
                    content: `Estado actualizado automáticamente a EN CURSO (Hito comercial detectado: ${trigger})`
                }
            })
        ]);

        revalidatePath(`/projects/${projectId}`);
        revalidatePath(`/dashboard`);

    } catch (error: any) {
        console.warn(`[Projects][${traceId}] Non-blocking auto-transition failed:`, error.message);
    }
}


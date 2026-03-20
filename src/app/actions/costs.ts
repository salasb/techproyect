'use server'
import { generateId } from "@/lib/id";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { AuditService } from "@/services/auditService";
import { validateCost } from "@/lib/validators";
import { requirePermission } from "@/lib/auth/server-resolver";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { CostCategory } from "@prisma/client";

export async function addCost(projectId: string, formData: FormData) {
    const traceId = `CST-ADD-${generateId().split("-")[0].toUpperCase()}`;
    try {
        const scope = await requirePermission('PROJECTS_MANAGE');
        await ensureNotPaused(scope.orgId);

        const description = formData.get("description") as string;
        const amount = parseFloat(formData.get("amount") as string);
        const category = formData.get("category") as CostCategory;
        const date = formData.get("date") as string;

        console.log(`[Costs][${traceId}] Adding cost to project=${projectId}, org=${scope.orgId}`);

        const validation = validateCost({ description, amount, category, date });
        if (!validation.success) {
            return { success: false, error: validation.errors.join(", "), traceId };
        }

        const newCost = await prisma.costEntry.create({
            data: {
                id: generateId(),
                organizationId: scope.orgId,
                projectId,
                description,
                amountNet: amount,
                category,
                date: new Date(date)
            }
        });

        await AuditService.logAction({
            projectId: projectId,
            action: 'COST_ADD',
            details: `Costo agregado: "${description}" por $${amount.toLocaleString('es-CL')}`
        });

        // Trigger Auto-transition
        const { autoTransitionProjectState } = await import("@/app/actions/projects");
        await autoTransitionProjectState(projectId, 'COST_ADDED');

        revalidatePath(`/projects/${projectId}`);
        revalidatePath('/');
        return { success: true, id: newCost.id };

    } catch (error: any) {
        console.error(`[Costs][${traceId}] Critical failure:`, error.message);
        return { success: false, error: "No se pudo registrar el costo en la base de datos.", traceId };
    }
}

export async function deleteCost(projectId: string, costId: string) {
    const traceId = `CST-DEL-${generateId().split("-")[0].toUpperCase()}`;
    try {
        const scope = await requirePermission('PROJECTS_MANAGE');
        await ensureNotPaused(scope.orgId);

        console.log(`[Costs][${traceId}] Deleting cost=${costId} from project=${projectId}`);

        await prisma.costEntry.delete({
            where: { 
                id: costId,
                organizationId: scope.orgId 
            }
        });

        await AuditService.logAction({
            projectId: projectId,
            action: 'COST_DELETE',
            details: `Costo eliminado (ID: ${costId})`
        });

        revalidatePath(`/projects/${projectId}`);
        revalidatePath('/');
        return { success: true };

    } catch (error: any) {
        console.error(`[Costs][${traceId}] Critical failure:`, error.message);
        return { success: false, error: "No se pudo eliminar el costo.", traceId };
    }
}

export async function updateCost(projectId: string, costId: string, formData: FormData) {
    const traceId = `CST-UPD-${generateId().split("-")[0].toUpperCase()}`;
    try {
        const scope = await requirePermission('PROJECTS_MANAGE');
        await ensureNotPaused(scope.orgId);
        
        const description = formData.get("description") as string;
        const amount = parseFloat(formData.get("amount") as string);
        const category = formData.get("category") as CostCategory;
        const date = formData.get("date") as string;

        console.log(`[Costs][${traceId}] Updating cost=${costId} in project=${projectId}`);

        const validation = validateCost({ description, amount, category, date });
        if (!validation.success) {
            return { success: false, error: validation.errors.join(", "), traceId };
        }

        await prisma.costEntry.update({
            where: { id: costId, organizationId: scope.orgId },
            data: {
                description,
                amountNet: amount,
                category,
                date: new Date(date)
            }
        });

        await AuditService.logAction({
            projectId: projectId,
            action: 'COST_UPDATE',
            details: `Costo actualizado: "${description}" por $${amount.toLocaleString('es-CL')}`
        });

        revalidatePath(`/projects/${projectId}`);
        revalidatePath('/');
        return { success: true };

    } catch (error: any) {
        console.error(`[Costs][${traceId}] Critical failure:`, error.message);
        return { success: false, error: "No se pudo actualizar el costo.", traceId };
    }
}

'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { AuditService } from "@/services/auditService";

type CostCategory = Database['public']['Enums']['CostCategory'];

import { validateCost } from "@/lib/validators";

import { getOrganizationId } from "@/lib/current-org";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";

export async function addCost(projectId: string, formData: FormData) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const description = formData.get("description") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const category = formData.get("category") as CostCategory;
    const date = formData.get("date") as string;

    const validation = validateCost({ description, amount, category, date });
    if (!validation.success) {
        throw new Error(validation.errors.join(", "));
    }

    await ensureNotPaused(orgId);
    const supabase = await createClient();

    const { error } = await supabase
        .from('CostEntry')
        .insert({
            id: crypto.randomUUID(),
            organizationId: orgId,
            projectId,
            description,
            amountNet: amount,
            category,
            date: new Date(date).toISOString(),
        });

    if (error) {
        throw new Error(`Error al agregar costo: ${error.message}`);
    }

    // Log the action
    await AuditService.logAction(projectId, 'COST_ADD', `Costo agregado: "${description}" por $${amount.toLocaleString('es-CL')}`);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/');
    revalidatePath('/projects');
}

export async function deleteCost(projectId: string, costId: string) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();

    const { error } = await supabase
        .from('CostEntry')
        .delete()
        .eq('id', costId);

    if (error) {
        throw new Error(`Error al eliminar costo: ${error.message}`);
    }

    // Log the action
    await AuditService.logAction(projectId, 'COST_DELETE', `Costo eliminado (ID: ${costId})`);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/');
    revalidatePath('/projects');
}

export async function updateCost(projectId: string, costId: string, formData: FormData) {
    const description = formData.get("description") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const category = formData.get("category") as CostCategory;
    const date = formData.get("date") as string;

    const validation = validateCost({ description, amount, category, date });
    if (!validation.success) {
        throw new Error(validation.errors.join(", "));
    }

    const supabase = await createClient();

    const { error } = await supabase
        .from('CostEntry')
        .update({
            description,
            amountNet: amount,
            category,
            date: new Date(date).toISOString(),
        })
        .eq('id', costId);

    if (error) {
        throw new Error(`Error al actualizar costo: ${error.message}`);
    }

    // Log the action
    await AuditService.logAction(projectId, 'COST_UPDATE', `Costo actualizado: "${description}" por $${amount.toLocaleString('es-CL')}`);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/');
    revalidatePath('/projects');
}

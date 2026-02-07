'use server'

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createProject(formData: FormData) {
    const name = formData.get("name") as string;
    const companyId = formData.get("companyId") as string;
    const newCompanyName = formData.get("newCompanyName") as string;
    const startDate = formData.get("startDate") as string;
    const budget = formData.get("budget") ? parseFloat(formData.get("budget") as string) : 0;

    const supabase = await createClient();

    if (!name || !startDate) {
        throw new Error("Missing required fields");
    }

    let finalCompanyId = companyId;

    // Si seleccionó crear nueva empresa
    if (companyId === "new" && newCompanyName) {
        // Create company with Supabase
        const { data: newCompany, error: companyError } = await supabase
            .from('Company')
            .insert({
                id: crypto.randomUUID(),
                name: newCompanyName,
                // createdAt/updatedAt removed as they don't exist in Company model
            })
            .select()
            .single();

        if (companyError || !newCompany) {
            throw new Error(`Error creating company: ${companyError?.message}`);
        }

        finalCompanyId = newCompany.id;
    }

    // Create Project
    const projectId = `PRJ-${Date.now().toString().slice(-6)}`;
    const { data: project, error: projectError } = await supabase
        .from('Project')
        .insert({
            id: projectId,
            name,
            companyId: finalCompanyId,
            status: "EN_ESPERA",
            stage: "LEVANTAMIENTO",
            startDate: new Date(startDate).toISOString(),
            plannedEndDate: formData.get("plannedEndDate") ? new Date(formData.get("plannedEndDate") as string).toISOString() : new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString(),
            budgetNet: budget,
            responsible: "TBD",
            scopeDetails: formData.get("scopeDetails") as string || null,
            nextAction: formData.get("nextAction") as string || null,
            nextActionDate: formData.get("nextActionDate") ? new Date(formData.get("nextActionDate") as string).toISOString() : null,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        })
        .select()
        .single();

    if (projectError || !project) {
        throw new Error(`Error creating project: ${projectError?.message}`);
    }

    revalidatePath("/projects");
    redirect(`/projects/${project.id}`);
}

export async function deleteProject(projectId: string) {
    const supabase = await createClient();

    // Delete project (cascade should handle related tables if configured in DB, 
    // ensuring we don't leave orphans. If not, we might need manual deletions.
    // Assuming Supabase FKs are set to CASCADE for simplicity in this MVP style app)
    const { error } = await supabase
        .from('Project')
        .delete()
        .eq('id', projectId);

    if (error) {
        throw new Error(`Error deleting project: ${error.message}`);
    }

    revalidatePath("/projects");
    redirect("/projects");
}

export async function closeProject(projectId: string) {
    const supabase = await createClient();

    // 1. Update Project Status
    const { error } = await supabase
        .from('Project')
        .update({
            status: 'FINALIZADO',
            updatedAt: new Date().toISOString()
        })
        .eq('id', projectId);

    if (error) {
        throw new Error(`Error closing project: ${error.message}`);
    }

    // 2. Log the event
    await supabase.from('ProjectLog').insert({
        id: crypto.randomUUID(),
        projectId,
        type: 'STATUS_CHANGE',
        content: 'El proyecto ha sido cerrado automáticamente tras el pago total.',
        createdAt: new Date().toISOString()
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/');
    revalidatePath('/projects');
}

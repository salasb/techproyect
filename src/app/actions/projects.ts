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
            status: "EN_CURSO",
            stage: "LEVANTAMIENTO",
            startDate: new Date(startDate).toISOString(),
            plannedEndDate: new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString(),
            budgetNet: budget,
            responsible: "TBD",
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

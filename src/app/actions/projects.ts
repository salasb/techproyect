'use server'

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import { validateProject } from "@/lib/validators";

export async function createProject(formData: FormData) {
    const name = formData.get("name") as string;
    const companyId = formData.get("companyId") as string;
    const newCompanyName = formData.get("newCompanyName") as string;
    const startDate = formData.get("startDate") as string;
    const budget = formData.get("budget") ? parseFloat(formData.get("budget") as string) : 0;

    const validation = validateProject({ name, companyId, startDate, budget });
    if (!validation.success) {
        throw new Error(validation.errors.join(", "));
    }

    const supabase = await createClient();

    let finalCompanyId = companyId;
    let finalClientId: string | null = null;

    // Handle Prefixed IDs (from SearchableSelect combining Company and Client)
    if (companyId.startsWith("client:")) {
        const selectedClientId = companyId.split(":")[1];
        finalClientId = selectedClientId;

        // Fetch Client Name to sync/find Company
        const { data: clientData } = await supabase.from('Client').select('name').eq('id', selectedClientId).single();
        if (clientData) {
            const clientName = clientData.name;
            // Check if company exists with same name
            const { data: existingCompany } = await supabase.from('Company').select('id').eq('name', clientName).single();

            if (existingCompany) {
                finalCompanyId = existingCompany.id;
            } else {
                // Create Company for this Client (Sync)
                const { data: newCompany, error: createError } = await supabase
                    .from('Company')
                    .insert({
                        id: crypto.randomUUID(),
                        name: clientName
                    })
                    .select()
                    .single();

                if (newCompany) {
                    finalCompanyId = newCompany.id;
                }
            }
        }
    } else if (companyId.startsWith("company:")) {
        finalCompanyId = companyId.split(":")[1];
    }

    // Si seleccionó crear nueva empresa (legacy/direct flow)
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
            clientId: finalClientId,
            status: "EN_ESPERA",
            stage: "LEVANTAMIENTO",
            startDate: new Date(startDate).toISOString(),
            plannedEndDate: formData.get("plannedEndDate") ? new Date(formData.get("plannedEndDate") as string).toISOString() : new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString(),
            budgetNet: budget,
            responsible: "TBD",
            scopeDetails: formData.get("scopeDetails") as string || null,
            nextAction: formData.get("nextAction") as string || 'Preparar Cotización',
            nextActionDate: formData.get("nextActionDate") ? new Date(formData.get("nextActionDate") as string).toISOString() : new Date(startDate).toISOString(),
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        })
        .select()
        .single();

    if (projectError || !project) {
        throw new Error(`Error creating project: ${projectError?.message}`);
    }

    revalidatePath("/projects");
    revalidatePath("/projects");
    return { success: true, projectId: project.id };
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

export async function updateProjectStatus(projectId: string, status: string, stage?: string, nextAction?: string) {
    const supabase = await createClient();

    const updateData: any = {
        status,
        updatedAt: new Date().toISOString()
    };

    if (stage) updateData.stage = stage;
    if (nextAction) {
        updateData.nextAction = nextAction;
        updateData.nextActionDate = new Date().toISOString(); // Default to today/now
    }

    // Special logic for Quote Sent
    if (status === 'EN_ESPERA' && stage === 'COTIZACION') {
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 7); // Follow up in 7 days

        updateData.nextAction = 'Seguimiento Cotización';
        updateData.nextActionDate = followUpDate.toISOString();

        // Correction for DB Enum: 'COTIZACION' is not in the Enum.
        // We map it to 'LEVANTAMIENTO' but set quoteSentDate to track progress.
        updateData.stage = 'LEVANTAMIENTO';
        updateData.quoteSentDate = new Date().toISOString();
    }

    // Special logic for Accepted (Kickoff)
    if (status === 'EN_CURSO' && stage === 'DISENO') { // Assuming DISENO is the stage after acceptance
        const kickoffDate = new Date();
        kickoffDate.setDate(kickoffDate.getDate() + 2); // Kickoff in 2 days

        updateData.nextAction = 'Planificar Kickoff';
        updateData.nextActionDate = kickoffDate.toISOString();
    }

    const { error } = await supabase
        .from('Project')
        .update(updateData)
        .eq('id', projectId);

    if (error) {
        throw new Error(`Error updating project status: ${error.message}`);
    }

    // Human Interface Mapping
    const STATUS_LABELS: Record<string, string> = {
        'EN_ESPERA': 'En Espera',
        'EN_CURSO': 'En Curso',
        'FINALIZADO': 'Finalizado',
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

    // Log it
    await supabase.from('ProjectLog').insert({
        id: crypto.randomUUID(),
        projectId,
        type: 'STATUS_CHANGE',
        content: `Estado actualizado a ${readableStatus} ${readableStage ? `(${readableStage})` : ''}`,
        createdAt: new Date().toISOString()
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

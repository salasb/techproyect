'use server'

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import { validateProject } from "@/lib/validators";
import { AuditService } from "@/services/auditService";
import { requireOperationalScope } from "@/lib/auth/server-resolver";

import { checkSubscriptionLimit } from "@/lib/subscriptions";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { ActivationService } from "@/services/activation-service";

export async function createProject(formData: FormData) {
    const scope = await requireOperationalScope();
    await ensureNotPaused(scope.orgId);

    // 0. Check Subscription Limits
    const limitCheck = await checkSubscriptionLimit(scope.orgId, 'projects');
    if (!limitCheck.allowed) {
        throw new Error(limitCheck.message);
    }

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
                        name: clientName,
                        organizationId: scope.orgId
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
                organizationId: scope.orgId
                // createdAt/updatedAt removed as they don't exist in Company model
            })
            .select()
            .single();

        if (companyError || !newCompany) {
            throw new Error(`Error creating company: ${companyError?.message}`);
        }

        finalCompanyId = newCompany.id;
    }

    // W0: Allow empty/no customer selected
    if (companyId === "none" || !companyId) {
        finalCompanyId = null as any; // Cast as any because Prisma generated types might still expect string if not regenerated
        finalClientId = null;
    }

    // Create Project
    // Generate ID: PRJ-YYMMDD-XXXX (Random 4 chars)
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const projectId = `PRJ-${dateStr}-${randomSuffix}`;
    const { data: project, error: projectError } = await supabase
        .from('Project')
        .insert({
            id: projectId,
            organizationId: scope.orgId,
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

    // Log the creation
    await AuditService.logAction(project.id, 'PROJECT_CREATE', `Proyecto "${name}" creado para ${project.clientId ? 'Client' : 'Company'}: ${finalCompanyId}`);

    // [Activation] Track Milestone
    await ActivationService.trackFirst('FIRST_PROJECT_CREATED', scope.orgId, undefined, project.id);

    revalidatePath("/projects");
    revalidatePath("/projects");
    return { success: true, projectId: project.id };
}

export async function deleteProject(projectId: string) {
    const scope = await requireOperationalScope();
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();

    try {
        // manually cascade delete related records to prevent FK constraints issues
        // (If DB has cascade, this is redundant but safe)

        // 1. Delete associated Logs
        await supabase.from('ProjectLog').delete().eq('projectId', projectId);
        await supabase.from('AuditLog').delete().eq('projectId', projectId); // If AuditLog has tight FK

        // 2. Delete Financials / Items
        await supabase.from('CostEntry').delete().eq('projectId', projectId);
        await supabase.from('Invoice').delete().eq('projectId', projectId);
        await supabase.from('QuoteItem').delete().eq('projectId', projectId);
        await supabase.from('SaleNote').delete().eq('projectId', projectId); // Fixed: Add SaleNote deletion

        // 3. Delete Project
        const { error } = await supabase
            .from('Project')
            .delete()
            .eq('id', projectId)
            .eq('organizationId', scope.orgId);

        if (error) {
            console.error("Error deleting project:", error);
            return { success: false, error: error.message };
        }

        // Log action (using null project ID as it's gone)
        await AuditService.logAction(null, 'PROJECT_DELETE', `Proyecto ID: ${projectId} eliminado permanentemente.`);

        revalidatePath("/projects");
        return { success: true };

    } catch (error) {
        console.error("Server Error deleting project:", error);
        return { success: false, error: "Error interno al eliminar proyecto" };
    }
}

export async function closeProject(projectId: string) {
    const scope = await requireOperationalScope();
    const supabase = await createClient();

    // 1. Update Project Status
    const { error } = await supabase
        .from('Project')
        .update({
            status: 'CERRADO',
            updatedAt: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('organizationId', scope.orgId);

    if (error) {
        throw new Error(`Error closing project: ${error.message}`);
    }

    // 2. Log the event
    await supabase.from('ProjectLog').insert({
        id: crypto.randomUUID(),
        projectId,
        organizationId: scope.orgId,
        type: 'STATUS_CHANGE',
        content: 'El proyecto ha sido cerrado automáticamente tras el pago total.',
        createdAt: new Date().toISOString()
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/');
    revalidatePath('/projects');
}

export async function updateProjectStatus(projectId: string, status: string, stage?: string, nextAction?: string, closeReason?: string) {
    const scope = await requireOperationalScope();
    const supabase = await createClient();

    const updateData: any = {
        status,
        updatedAt: new Date().toISOString()
    };

    if (stage) updateData.stage = stage;
    if (closeReason) updateData.closeReason = closeReason;
    if (nextAction) {
        updateData.nextAction = nextAction;
        updateData.nextActionDate = new Date().toISOString(); // Default to today/now
    }

    // Special logic for Quote Sent (W0: Validate Customer)
    if (status === 'EN_ESPERA' && stage === 'COTIZACION') {
        // Fetch project to check customer
        const { data: project } = await supabase.from('Project').select('companyId, clientId').eq('id', projectId).eq('organizationId', scope.orgId).single();
        if (!project?.companyId && !project?.clientId) {
            throw new Error("Debe asignar un cliente antes de enviar la cotización");
        }

        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 7); // Follow up in 7 days

        updateData.nextAction = 'Seguimiento Cotización';
        updateData.nextActionDate = followUpDate.toISOString();

        updateData.stage = 'LEVANTAMIENTO'; // Keep in Enum range
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
        .eq('id', projectId)
        .eq('organizationId', scope.orgId);


    if (error) {
        throw new Error(`Error updating project status: ${error.message}`);
    }

    // [INVENTORY AUTOMATION]
    // If project is Finalized or set to Implementation, try to deduct stock
    // We import dynamically to avoid circular dependencies if any (though likely safe here)
    if (status === 'CERRADO' || stage === 'IMPLEMENTACION') {
        try {
            const { deductStockForProject } = await import("@/helpers/inventory");
            const result = await deductStockForProject(projectId);
            if (!result.success && result.error) {
                console.error("Inventory deduction failed:", result.error);
                // We don't throw here to avoid rolling back the status change, 
                // but we should probably alert/log.
            }
        } catch (invError) {
            console.error("Error triggering inventory deduction:", invError);
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

    // Log it
    await supabase.from('ProjectLog').insert({
        id: crypto.randomUUID(),
        projectId,
        organizationId: scope.orgId,
        type: 'STATUS_CHANGE',
        content: `Estado actualizado a ${readableStatus} ${readableStage ? `(${readableStage})` : ''}`,
        createdAt: new Date().toISOString()
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function associateProjectToClient(projectId: string, clientId: string) {
    const scope = await requireOperationalScope();
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();

    const { error } = await supabase
        .from('Project')
        .update({ clientId })
        .eq('id', projectId)
        .eq('organizationId', scope.orgId);

    if (error) throw new Error("Error al asociar el cliente al proyecto");

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

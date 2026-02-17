'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Database } from "@/types/supabase";
import { addBusinessDays } from "@/lib/date-utils";

type Opportunity = Database['public']['Tables']['Opportunity']['Row'];
type OpportunityInsert = Database['public']['Tables']['Opportunity']['Insert'];
export type OpportunityStage = 'LEAD' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export async function getOpportunities() {
    const supabase = await createClient();

    // Fetch opportunities with client data
    const { data, error } = await supabase
        .from('Opportunity')
        .select(`
            *,
            Client:clientId (
                id, name, contactName, email, phone
            )
        `)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Error fetching opportunities:', error);
        return [];
    }

    return data;
}

export async function getOpportunitiesByClient(clientId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('Opportunity')
        .select(`
            *,
            Client:clientId (
                id, name, contactName, email, phone
            )
        `)
        .eq('clientId', clientId)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Error fetching client opportunities:', error);
        return [];
    }

    return data;
}

import { getOrganizationId } from "@/lib/current-org";

import { createQuickClient } from "@/actions/clients";

export async function createOpportunity(formData: FormData) {
    const orgId = await getOrganizationId();
    const supabase = await createClient();

    const title = formData.get('title') as string;
    let clientId = formData.get('clientId') as string;
    const value = parseFloat(formData.get('value') as string) || 0;
    const stage = formData.get('stage') as OpportunityStage || 'LEAD';
    const description = formData.get('description') as string;

    // Handle New Prospect Creation
    const contactsJson = formData.get('contactsList') as string;
    const leadName = formData.get('leadName') as string;
    const leadEmail = formData.get('leadEmail') as string;
    const leadPhone = formData.get('leadPhone') as string;

    if (!leadName) throw new Error("Nombre del prospecto es requerido");

    const quickClientFormData = new FormData();
    quickClientFormData.append('name', leadName);
    quickClientFormData.append('email', leadEmail || '');
    quickClientFormData.append('phone', leadPhone || '');
    if (contactsJson) {
        quickClientFormData.append('contactsList', contactsJson);
    }

    const quickResult = await createQuickClient(quickClientFormData);
    if (!quickResult.success || !quickResult.client) {
        throw new Error(quickResult.error || "Error al crear prospecto");
    }
    clientId = quickResult.client.id;

    if (!title || !clientId) {
        throw new Error("Título y Prospecto son requeridos");
    }

    const lastContactDateStr = formData.get('lastContactDate') as string || new Date().toISOString();
    const lastContactType = formData.get('lastContactType') as string || 'EMAIL';

    // Calculate next interaction date (8 business days from last contact)
    const lastContactDate = new Date(lastContactDateStr);
    const nextInteractionDate = addBusinessDays(lastContactDate, 8);

    const newOpp: OpportunityInsert = {
        id: crypto.randomUUID(),
        organizationId: orgId,
        title,
        clientId,
        value,
        stage,
        description,
        probability: 10,
        lastInteractionDate: lastContactDate.toISOString(),
        lastContactType: lastContactType,
        nextInteractionDate: nextInteractionDate.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const { error } = await supabase.from('Opportunity').insert(newOpp);

    if (error) {
        console.error('Error creating opportunity:', error);
        throw new Error('Failed to create opportunity');
    }

    revalidatePath('/crm/pipeline');
    revalidatePath('/crm');
    return { success: true };
}

export async function updateOpportunityStage(id: string, stage: OpportunityStage) {
    const supabase = await createClient();

    // Calculate probability based on stage
    let probability = 0;
    switch (stage) {
        case 'LEAD': probability = 10; break;
        case 'QUALIFIED': probability = 30; break;
        case 'PROPOSAL': probability = 60; break;
        case 'NEGOTIATION': probability = 80; break;
        case 'WON': probability = 100; break;
        case 'LOST': probability = 0; break;
    }

    const { error } = await supabase
        .from('Opportunity')
        .update({
            stage,
            probability,
            updatedAt: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating opportunity stage:', error);
        throw new Error('Failed to update stage');
    }

    revalidatePath('/crm');
    return { success: true };
}

export async function updateOpportunity(id: string, formData: FormData) {
    const supabase = await createClient();

    const title = formData.get('title') as string;
    const value = parseFloat(formData.get('value') as string) || 0;
    const description = formData.get('description') as string;
    const expectedCloseDate = formData.get('expectedCloseDate') as string;
    const nextInteractionDate = formData.get('nextInteractionDate') as string;

    const { error } = await supabase
        .from('Opportunity')
        .update({
            title,
            value,
            description,
            expectedCloseDate: expectedCloseDate || null,
            nextInteractionDate: nextInteractionDate || null,
            updatedAt: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating opportunity:', error);
        throw new Error('Failed to update opportunity');
    }

    revalidatePath('/crm/pipeline');
    revalidatePath(`/crm/opportunities/${id}`);
    revalidatePath('/crm');
    return { success: true };
}

export async function deleteOpportunity(id: string) {
    const supabase = await createClient();

    const { error } = await supabase.from('Opportunity').delete().eq('id', id);

    if (error) {
        console.error('Error deleting opportunity:', error);
        throw new Error('Failed to delete opportunity');
    }

    revalidatePath('/crm/pipeline');
    revalidatePath('/crm');
    return { success: true };
}

export async function convertOpportunityToProject(opportunityId: string) {
    const supabase = await createClient();
    const orgId = await getOrganizationId();

    // 1. Fetch Opportunity with Client
    const { data: opp, error: fetchError } = await supabase
        .from('Opportunity')
        .select(`
            *,
            Client:clientId (*)
        `)
        .eq('id', opportunityId)
        .single();

    if (fetchError || !opp) {
        throw new Error("No se pudo encontrar la oportunidad");
    }

    // 2. Sync/Create Company
    let companyId = "";
    const clientName = opp.Client?.name || "Cliente S/N";

    const { data: existingCompany } = await supabase
        .from('Company')
        .select('id')
        .eq('name', clientName)
        .eq('organizationId', orgId)
        .maybeSingle();

    if (existingCompany) {
        companyId = existingCompany.id;
    } else {
        const { data: newCompany, error: companyError } = await supabase
            .from('Company')
            .insert({
                id: crypto.randomUUID(),
                name: clientName,
                organizationId: orgId,
                email: opp.Client?.email,
                phone: opp.Client?.phone,
                contactName: opp.Client?.contactName,
                address: opp.Client?.address
            })
            .select()
            .single();

        if (companyError || !newCompany) {
            throw new Error("Error al crear la empresa para el proyecto");
        }
        companyId = newCompany.id;
    }

    // 3. Create Project
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const projectId = `PRJ-${dateStr}-${randomSuffix}`;

    const { error: projectError } = await supabase
        .from('Project')
        .insert({
            id: projectId,
            organizationId: orgId,
            name: opp.title,
            companyId: companyId,
            clientId: opp.clientId,
            status: "EN_ESPERA",
            stage: "LEVANTAMIENTO",
            startDate: new Date().toISOString(),
            plannedEndDate: opp.expectedCloseDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            budgetNet: opp.value || 0,
            responsible: "TBD",
            scopeDetails: opp.description || null,
            nextAction: 'Revisión técnica inicial',
            nextActionDate: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });

    if (projectError) {
        console.error("Error creating project from opportunity:", projectError);
        throw new Error("Error al formalizar el proyecto");
    }

    // 4. Update Interaction to link to New Project
    await supabase
        .from('Interaction')
        .update({ projectId: projectId })
        .eq('opportunityId', opportunityId);

    // 5. Update Opportunity (Optionally delete or mark as Converted)
    // We'll keep it as WON for history but maybe we could add a flag if schema allowed.
    // For now, just revalidate.

    revalidatePath('/projects');
    revalidatePath('/crm/pipeline');
    revalidatePath(`/crm/opportunities/${opportunityId}`);

    return { success: true, projectId };
}


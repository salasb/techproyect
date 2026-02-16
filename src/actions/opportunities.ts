'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Database } from "@/types/supabase";

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

export async function createOpportunity(formData: FormData) {
    const orgId = await getOrganizationId();
    const supabase = await createClient();

    const title = formData.get('title') as string;
    const clientId = formData.get('clientId') as string;
    const value = parseFloat(formData.get('value') as string) || 0;
    const stage = formData.get('stage') as OpportunityStage || 'LEAD';
    const description = formData.get('description') as string;

    if (!title || !clientId) {
        throw new Error("Title and Client are required");
    }

    const newOpp: OpportunityInsert = {
        id: crypto.randomUUID(),
        organizationId: orgId,
        title,
        clientId,
        value,
        stage,
        description,
        probability: 10, // Default probability for LEAD
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const { error } = await supabase.from('Opportunity').insert(newOpp);

    if (error) {
        console.error('Error creating opportunity:', error);
        throw new Error('Failed to create opportunity');
    }

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

export async function deleteOpportunity(id: string) {
    const supabase = await createClient();

    const { error } = await supabase.from('Opportunity').delete().eq('id', id);

    if (error) {
        console.error('Error deleting opportunity:', error);
        throw new Error('Failed to delete opportunity');
    }

    revalidatePath('/crm');
    return { success: true };
}

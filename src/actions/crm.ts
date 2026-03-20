'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/supabase";
import { requireOperationalScope, requirePermission } from "@/lib/auth/server-resolver";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";

export async function getClientDetails(clientId: string) {
    const scope = await requireOperationalScope();
    const supabase = await createClient();

    // Fetch Client
    const { data: client, error: clientError } = await supabase
        .from('Client')
        .select('*')
        .eq('id', clientId)
        .eq('organizationId', scope.orgId)
        .single();

    if (clientError) throw new Error(clientError.message);

    // Fetch Contacts
    const { data: contacts, error: contactsError } = await supabase
        .from('Contact')
        .select('*')
        .eq('clientId', clientId)
        .eq('organizationId', scope.orgId)
        .order('createdAt', { ascending: false });

    if (contactsError) throw new Error(contactsError.message);

    // Fetch Interactions
    const { data: interactions, error: interactionsError } = await supabase
        .from('Interaction')
        .select('*, project:Project(name)')
        .eq('clientId', clientId)
        .eq('organizationId', scope.orgId)
        .order('date', { ascending: false });

    if (interactionsError) throw new Error(interactionsError.message);

    // Fetch Projects (Opportunities)
    const { data: projects, error: projectsError } = await supabase
        .from('Project')
        .select('*')
        .eq('clientId', clientId)
        .eq('organizationId', scope.orgId)
        .order('updatedAt', { ascending: false });

    if (projectsError) throw new Error(projectsError.message);

    return {
        client,
        contacts: contacts || [],
        interactions: interactions || [],
        projects: projects || []
    };
}

export async function addContact(clientId: string, formData: FormData) {
    const scope = await requirePermission('CRM_MANAGE');
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as string;

    const { error } = await supabase.from('Contact').insert({
        id: globalThis.crypto.randomUUID(),
        organizationId: scope.orgId,
        clientId,
        name,
        email,
        phone,
        role
    });

    if (error) throw new Error(error.message);
    revalidatePath(`/clients/${clientId}`);
}

export async function addInteraction(clientId: string, formData: FormData) {
    const scope = await requirePermission('CRM_MANAGE');
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();

    const type = formData.get('type') as Database['public']['Enums']['InteractionType'];
    const notes = formData.get('notes') as string;
    const date = formData.get('date') as string || new Date().toISOString();
    const projectId = formData.get('projectId') as string | null;

    const { error } = await supabase.from('Interaction').insert({
        id: globalThis.crypto.randomUUID(),
        organizationId: scope.orgId,
        clientId,
        type,
        notes,
        date,
        projectId: projectId || null
    });

    if (error) throw new Error(error.message);
    revalidatePath(`/clients/${clientId}`);
}

export async function updateClientStatus(clientId: string, status: Database['public']['Enums']['ClientStatus']) {
    const traceId = `CLT-ST-UPD-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const scope = await requirePermission('CRM_MANAGE');
        await ensureNotPaused(scope.orgId);
        const prisma = (await import("@/lib/prisma")).default;

        console.log(`[CRM][${traceId}] Updating client=${clientId} status to ${status} for org=${scope.orgId}`);

        await prisma.client.update({
            where: { id: clientId, organizationId: scope.orgId },
            data: { status: status as any, updatedAt: new Date() }
        });

        revalidatePath(`/clients/${clientId}`);
        revalidatePath(`/clients`);
        return { success: true };
    } catch (error: any) {
        console.error(`[CRM][${traceId}] Critical failure:`, error.message);
        throw new Error("No se pudo actualizar el estado del cliente.");
    }
}

export async function getPipelineProjects() {
    const scope = await requireOperationalScope();
    const supabase = await createClient();

    // Fetch all projects that are not archived/closed if we want active pipeline
    const { data, error } = await supabase
        .from('Project')
        .select('*, client:Client(name)')
        .eq('organizationId', scope.orgId)
        .not('status', 'in', '("CANCELADO","CERRADO")')
        .order('updatedAt', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function updateProjectStage(projectId: string, stage: Database['public']['Enums']['ProjectStage']) {
    const scope = await requirePermission('CRM_MANAGE');
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();

    const { error } = await supabase.from('Project').update({
        stage,
        updatedAt: new Date().toISOString()
    })
        .eq('id', projectId)
        .eq('organizationId', scope.orgId);

    if (error) throw new Error(error.message);
    revalidatePath('/crm/pipeline');
}

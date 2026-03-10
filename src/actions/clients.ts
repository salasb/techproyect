'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateRut, cleanRut, formatRut } from "@/lib/rut";
import { requireOperationalScope, requirePermission } from "@/lib/auth/server-resolver";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { ActivationService } from "@/services/activation-service";

/**
 * Normalizes DB objects for safe Next.js serialization (Dates to Strings)
 */
function normalizeClient(client: any) {
    if (!client) return null;
    return {
        ...client,
        createdAt: client.createdAt instanceof Date ? client.createdAt.toISOString() : client.createdAt,
        updatedAt: client.updatedAt instanceof Date ? client.updatedAt.toISOString() : client.updatedAt,
    };
}

export async function getClients() {
    const scope = await requireOperationalScope();

    const supabase = await createClient();
    const { data, error } = await supabase.from('Client').select('*').eq('organizationId', scope.orgId).order('name');

    if (error) {
        console.error("[getClients] error:", error.message);
        return [];
    }
    return data || [];
}

export async function createClientAction(formData: FormData) {
    const scope = await requirePermission('CRM_MANAGE');
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const taxIdRaw = formData.get('taxId') as string;
    const contactName = formData.get('contactName') as string;
    const contactsJson = formData.get('contactsList') as string;

    // Server-side Validation
    let taxId = taxIdRaw;
    if (taxIdRaw && taxIdRaw.trim() !== '') {
        if (!validateRut(taxIdRaw)) {
            throw new Error(`RUT inválido: ${taxIdRaw}`);
        }
        taxId = formatRut(taxIdRaw);
    }

    const clientId = crypto.randomUUID();

    const { error: clientError } = await supabase.from('Client').insert({
        id: clientId,
        organizationId: scope.orgId,
        name,
        email,
        phone,
        address,
        taxId,
        contactName,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
    });

    if (clientError) throw new Error(clientError.message);

    // [Activation] Track Milestone
    await ActivationService.trackFirst('FIRST_CLIENT_CREATED', scope.orgId, undefined, clientId);

    // Handle multiple contacts if provided
    if (contactsJson) {
        try {
            const contactsList = JSON.parse(contactsJson);
            if (Array.isArray(contactsList) && contactsList.length > 0) {
                const contactsToInsert = contactsList.map((c: any) => ({
                    id: crypto.randomUUID(),
                    clientId,
                    organizationId: scope.orgId,
                    name: c.name || '',
                    role: c.role || '',
                    email: c.email || '',
                    phone: c.phone || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }));

                const { error: contactsError } = await supabase.from('Contact').insert(contactsToInsert);
                if (contactsError) console.error("Error inserting contacts:", contactsError);
            }
        } catch (e) {
            console.error("Failed to parse contacts JSON:", e);
        }
    }

    revalidatePath('/clients');
}

export async function createQuickClient(formData: FormData) {
    const traceId = `CQC-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const scope = await requirePermission('CRM_MANAGE');
    await ensureNotPaused(scope.orgId);
    
    // Unified approach: Use Supabase Data API for consistency and RLS safety
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;

    console.log(`[${traceId}] Creating quick client: ${name} for org: ${scope.orgId}`);

    const clientId = crypto.randomUUID();

    try {
        const { data: newClient, error: clientError } = await supabase
            .from('Client')
            .insert({
                id: clientId,
                organizationId: scope.orgId,
                name,
                email: email || null,
                phone: phone || null,
                status: 'PROSPECT',
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            })
            .select()
            .single();

        if (clientError) {
            console.error(`[${traceId}] Supabase Insert Error:`, clientError.message);
            return { success: false, error: clientError.message };
        }

        // [Activation] Track Milestone
        await ActivationService.trackFirst('FIRST_CLIENT_CREATED', scope.orgId, undefined, clientId);

        revalidatePath('/clients');
        
        // Return normalized object (ISO strings) to prevent serialization errors in Next.js 14
        return { 
            success: true, 
            client: normalizeClient(newClient),
            traceId
        };
    } catch (error: any) {
        console.error(`[${traceId}] Unexpected Error:`, error);
        return { success: false, error: "Error interno al crear cliente rápido", traceId };
    }
}

export async function updateClientAction(clientId: string, formData: FormData) {
    const scope = await requirePermission('CRM_MANAGE');
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const taxIdRaw = formData.get('taxId') as string;
    const contactName = formData.get('contactName') as string;
    const contactsJson = formData.get('contactsList') as string;

    // Server-side Validation
    let taxId = taxIdRaw;
    if (taxIdRaw && taxIdRaw.trim() !== '') {
        if (!validateRut(taxIdRaw)) {
            throw new Error(`RUT inválido: ${taxIdRaw}`);
        }
        taxId = formatRut(taxIdRaw);
    }

    const { error: clientError } = await supabase.from('Client').update({
        name,
        email,
        phone,
        address,
        taxId,
        contactName,
        updatedAt: new Date().toISOString()
    }).eq('id', clientId).eq('organizationId', scope.orgId);

    if (clientError) throw new Error(clientError.message);

    // Sync contacts
    if (contactsJson) {
        try {
            const contactsList = JSON.parse(contactsJson);
            if (Array.isArray(contactsList)) {
                await supabase.from('Contact').delete().eq('clientId', clientId);

                if (contactsList.length > 0) {
                    const contactsToInsert = contactsList.map((c: any) => ({
                        id: crypto.randomUUID(),
                        clientId,
                        organizationId: scope.orgId,
                        name: c.name || '',
                        role: c.role || '',
                        email: c.email || '',
                        phone: c.phone || '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }));

                    const { error: contactsError } = await supabase.from('Contact').insert(contactsToInsert);
                    if (contactsError) console.error("Error syncing contacts:", contactsError);
                }
            }
        } catch (e) {
            console.error("Failed to sync contacts JSON:", e);
        }
    }

    revalidatePath('/clients');
}

export async function deleteClientAction(clientId: string) {
    const scope = await requirePermission('CRM_MANAGE');
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();
    const { error } = await supabase.from('Client').delete().eq('id', clientId).eq('organizationId', scope.orgId);
    if (error) throw new Error(error.message);
    revalidatePath('/clients');
}

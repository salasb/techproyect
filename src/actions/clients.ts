'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateRut, cleanRut, formatRut } from "@/lib/rut";
import { getOrganizationId } from "@/lib/current-org";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { ActivationService } from "@/services/activation-service";

export async function getClients() {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = await createClient();
    const { data, error } = await supabase.from('Client').select('*').eq('organizationId', orgId).order('name');

    if (error) {
        console.error("[getClients] error:", error.message);
        return [];
    }
    return data || [];
}

export async function createClientAction(formData: FormData) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
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
        organizationId: orgId,
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
    await ActivationService.trackFirst('FIRST_CLIENT_CREATED', orgId, undefined, clientId);

    // Handle multiple contacts if provided
    if (contactsJson) {
        try {
            const contactsList = JSON.parse(contactsJson);
            if (Array.isArray(contactsList) && contactsList.length > 0) {
                const contactsToInsert = contactsList.map((c: any) => ({
                    id: crypto.randomUUID(),
                    clientId,
                    organizationId: orgId,
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

export async function updateClientAction(clientId: string, formData: FormData) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
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
    }).eq('id', clientId);

    if (clientError) throw new Error(clientError.message);

    // Sync contacts
    if (contactsJson) {
        try {
            const contactsList = JSON.parse(contactsJson);
            if (Array.isArray(contactsList)) {
                // For simplicity, we delete and recreate contacts for this client
                // A more robust way would be to diff them, but this is faster for MVP
                await supabase.from('Contact').delete().eq('clientId', clientId);

                if (contactsList.length > 0) {
                    const contactsToInsert = contactsList.map((c: any) => ({
                        id: crypto.randomUUID(),
                        clientId,
                        organizationId: orgId,
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
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();
    const { error } = await supabase.from('Client').delete().eq('id', clientId);
    if (error) throw new Error(error.message);
    revalidatePath('/clients');
}

export async function createQuickClient(formData: FormData) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const contactsJson = formData.get('contactsList') as string;

    const clientId = crypto.randomUUID();

    const { data, error } = await supabase.from('Client').insert({
        id: clientId,
        organizationId: orgId,
        name,
        email,
        phone,
        status: 'PROSPECT', // Default for quick creation
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
    }).select().single();

    if (error) return { success: false, error: error.message };

    // [Activation] Track Milestone
    await ActivationService.trackFirst('FIRST_CLIENT_CREATED', orgId, undefined, clientId);

    // Handle multiple contacts if provided
    if (contactsJson) {
        try {
            const contactsList = JSON.parse(contactsJson);
            if (Array.isArray(contactsList) && contactsList.length > 0) {
                const contactsToInsert = contactsList.map((c: any) => ({
                    id: crypto.randomUUID(),
                    clientId,
                    organizationId: orgId,
                    name: c.name || '',
                    role: c.role || '',
                    email: c.email || '',
                    phone: c.phone || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }));

                const { error: contactsError } = await supabase.from('Contact').insert(contactsToInsert);
                if (contactsError) console.error("Error inserting contacts in quick create:", contactsError);
            }
        } catch (e) {
            console.error("Failed to parse contacts JSON in quick create:", e);
        }
    }

    revalidatePath('/clients');
    return { success: true, client: data };
}

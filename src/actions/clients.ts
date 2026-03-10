'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateRut, cleanRut, formatRut } from "@/lib/rut";
import { requirePermission } from "@/lib/auth/server-resolver";
import { ensureWriteAccess } from "@/lib/auth/write-guard";
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
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('Client')
        .select('*')
        .order('name');

    if (error) {
        console.error("[getClients] error:", error.message);
        return [];
    }
    return data || [];
}

export async function createClientAction(formData: FormData) {
    const traceId = `CLT-${Math.random().toString(36).substring(7).toUpperCase()}`;
    console.log(`[Clients][${traceId}] Starting createClientAction`);
    
    try {
        const scope = await requirePermission('CRM_MANAGE');
        const writeAccess = await ensureWriteAccess();
        
        console.log(`[Clients][${traceId}] Context: orgId=${scope.orgId}, userId=${scope.userId}, bypass=${writeAccess.bypassApplied}`);

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
                    if (contactsError) console.error(`[Clients][${traceId}] Error inserting contacts:`, contactsError);
                }
            } catch (e) {
                console.error(`[Clients][${traceId}] Failed to parse contacts JSON:`, e);
            }
        }

        revalidatePath('/clients');
        console.log(`[Clients][${traceId}] Success: Client ${clientId} created.`);
        return { success: true, clientId, traceId };

    } catch (error: any) {
        console.error(`[Clients][${traceId}] Error:`, error.message);
        throw error; // Let the guard error (READ_ONLY_MODE) bubble up to PaywallProvider
    }
}

export async function createQuickClient(formData: FormData) {
    const traceId = `CQC-${Math.random().toString(36).substring(7).toUpperCase()}`;
    console.log(`[Clients][${traceId}] Starting createQuickClient`);
    
    try {
        const scope = await requirePermission('CRM_MANAGE');
        const writeAccess = await ensureWriteAccess();
        
        console.log(`[Clients][${traceId}] Context: orgId=${scope.orgId}, userId=${scope.userId}, bypass=${writeAccess.bypassApplied}, reason=${writeAccess.reason}`);
        
        const supabase = await createClient();

        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;

        if (!name || name.trim() === '') {
            return { success: false, error: "El nombre es requerido", traceId };
        }

        const clientId = crypto.randomUUID();

        const { data: newClient, error: clientError } = await supabase
            .from('Client')
            .insert({
                id: clientId,
                organizationId: scope.orgId,
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                status: 'PROSPECT',
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            })
            .select()
            .single();

        if (clientError) {
            console.error(`[Clients][${traceId}] Supabase Insert Error:`, clientError.message);
            return { success: false, error: `Error en base de datos: ${clientError.message}`, traceId };
        }

        // [Activation] Track Milestone
        try {
            await ActivationService.trackFirst('FIRST_CLIENT_CREATED', scope.orgId, undefined, clientId);
        } catch (e) {
            console.warn(`[Clients][${traceId}] Non-blocking error tracking milestone:`, e);
        }

        revalidatePath('/clients');
        revalidatePath('/projects/new'); 
        
        console.log(`[Clients][${traceId}] Success: Quick Client ${clientId} created.`);

        // Return MINIMAL serializable data
        return { 
            success: true, 
            client: {
                id: String(newClient.id),
                name: String(newClient.name)
            },
            traceId
        };
    } catch (error: any) {
        console.error(`[Clients][${traceId}] Unexpected Error:`, error.message);
        // If it starts with READ_ONLY_MODE, we throw it to trigger the Paywall UI
        if (error.message.startsWith('READ_ONLY_MODE')) {
            throw error;
        }
        return { success: false, error: error.message || "Error interno inesperado", traceId };
    }
}

export async function updateClientAction(clientId: string, formData: FormData) {
    const traceId = `UPC-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    try {
        const scope = await requirePermission('CRM_MANAGE');
        await ensureWriteAccess();
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
                        if (contactsError) console.error(`[Clients][${traceId}] Error syncing contacts:`, contactsError);
                    }
                }
            } catch (e) {
                console.error(`[Clients][${traceId}] Failed to sync contacts JSON:`, e);
            }
        }

        revalidatePath('/clients');
        return { success: true, traceId };
    } catch (error: any) {
        console.error(`[Clients][${traceId}] Error:`, error.message);
        throw error;
    }
}

export async function deleteClientAction(clientId: string) {
    const traceId = `DEL-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    try {
        const scope = await requirePermission('CRM_MANAGE');
        await ensureWriteAccess();
        const supabase = await createClient();
        const { error } = await supabase.from('Client').delete().eq('id', clientId).eq('organizationId', scope.orgId);
        if (error) throw new Error(error.message);
        
        revalidatePath('/clients');
        return { success: true, traceId };
    } catch (error: any) {
        console.error(`[Clients][${traceId}] Error:`, error.message);
        throw error;
    }
}

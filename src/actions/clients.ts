'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateRut, cleanRut, formatRut } from "@/lib/rut";
import { requirePermission } from "@/lib/auth/server-resolver";
import { getWriteAccessContext } from "@/lib/auth/write-guard";
import { ActivationService } from "@/services/activation-service";

/**
 * Normalizes DB objects for safe Next.js serialization
 */
function normalizeClient(client: any) {
    if (!client) return null;
    return {
        id: String(client.id),
        name: String(client.name),
        email: client.email ? String(client.email) : null,
        phone: client.phone ? String(client.phone) : null
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

/**
 * Base Create Client Logic (Shared)
 */
async function performClientCreation(orgId: string, name: string, email?: string, phone?: string) {
    const supabase = await createClient();
    const clientId = crypto.randomUUID();

    const { data, error } = await supabase
        .from('Client')
        .insert({
            id: clientId,
            organizationId: orgId,
            name: name.trim(),
            email: email?.trim() || null,
            phone: phone?.trim() || null,
            status: 'PROSPECT',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function createQuickClient(formData: FormData) {
    const traceId = `CQC-${Math.random().toString(36).substring(7).toUpperCase()}`;
    console.log(`[Clients][${traceId}] Starting createQuickClient`);
    
    try {
        // 1. Permission Check
        const scope = await requirePermission('CRM_MANAGE');
        
        // 2. Write Guard (NO THROW version)
        const writeContext = await getWriteAccessContext();
        
        if (!writeContext.allowed) {
            console.warn(`[Clients][${traceId}] Write blocked: ${writeContext.reason}`);
            return { 
                success: false, 
                error: writeContext.message,
                code: writeContext.reason,
                traceId 
            };
        }

        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;

        if (!name || name.trim() === '') {
            return { success: false, error: "El nombre es requerido", traceId };
        }

        // 3. Database Operation
        const newClient = await performClientCreation(scope.orgId, name, email, phone);

        // 4. Milestones & Revalidation
        try {
            await ActivationService.trackFirst('FIRST_CLIENT_CREATED', scope.orgId, undefined, newClient.id);
            revalidatePath('/clients');
            revalidatePath('/projects/new'); 
        } catch (e) {
            console.warn(`[Clients][${traceId}] Background task warning:`, e);
        }
        
        console.log(`[Clients][${traceId}] Success: Quick Client ${newClient.id} created.`);

        return { 
            success: true, 
            client: normalizeClient(newClient),
            traceId
        };

    } catch (error: any) {
        console.error(`[Clients][${traceId}] UNEXPECTED FATAL ERROR:`, error.message, error.stack);
        return { 
            success: false, 
            error: "Ocurrió un error inesperado al crear el cliente.", 
            traceId 
        };
    }
}

// ... rest of the file stays consistent ...
export async function createClientAction(formData: FormData) {
    const traceId = `CLT-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const scope = await requirePermission('CRM_MANAGE');
        const writeContext = await getWriteAccessContext();
        if (!writeContext.allowed) throw new Error(`READ_ONLY_MODE:${writeContext.message}`);

        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const address = formData.get('address') as string;
        const taxIdRaw = formData.get('taxId') as string;
        const contactName = formData.get('contactName') as string;

        let taxId = taxIdRaw;
        if (taxIdRaw && taxIdRaw.trim() !== '') {
            if (!validateRut(taxIdRaw)) throw new Error(`RUT inválido: ${taxIdRaw}`);
            taxId = formatRut(taxIdRaw);
        }

        const supabase = await createClient();
        const { error } = await supabase.from('Client').insert({
            id: crypto.randomUUID(),
            organizationId: scope.orgId,
            name, email, phone, address, taxId, contactName,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });

        if (error) throw error;
        revalidatePath('/clients');
        return { success: true, traceId };
    } catch (error: any) {
        console.error(`[Clients][${traceId}] Error:`, error.message);
        throw error;
    }
}

export async function updateClientAction(clientId: string, formData: FormData) {
    const traceId = `UPC-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const scope = await requirePermission('CRM_MANAGE');
        const writeContext = await getWriteAccessContext();
        if (!writeContext.allowed) throw new Error(`READ_ONLY_MODE:${writeContext.message}`);

        const supabase = await createClient();
        const { error } = await supabase.from('Client').update({
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            taxId: formData.get('taxId') as string,
            contactName: formData.get('contactName') as string,
            updatedAt: new Date().toISOString()
        }).eq('id', clientId).eq('organizationId', scope.orgId);

        if (error) throw error;
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
        const writeContext = await getWriteAccessContext();
        if (!writeContext.allowed) throw new Error(`READ_ONLY_MODE:${writeContext.message}`);

        const supabase = await createClient();
        const { error } = await supabase.from('Client').delete().eq('id', clientId).eq('organizationId', scope.orgId);
        if (error) throw error;
        revalidatePath('/clients');
        return { success: true, traceId };
    } catch (error: any) {
        console.error(`[Clients][${traceId}] Error:`, error.message);
        throw error;
    }
}

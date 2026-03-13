'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateRut, cleanRut, formatRut } from "@/lib/rut";
import { resolveAccessContext } from "@/lib/auth/access-resolver";
import { ensureWriteAccess } from "@/lib/auth/write-guard";
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
    
    try {
        // 1. Ensure Write Access (Handles Global Bypass)
        const context = await ensureWriteAccess();
        const orgId = context.activeOrgId;
        
        if (!orgId) throw new Error("Se requiere una organización activa.");

        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;

        if (!name || name.trim() === '') {
            return { success: false, error: "El nombre es requerido", traceId };
        }

        // 2. Database Operation
        const newClient = await performClientCreation(orgId, name, email, phone);

        // 3. Milestones & Revalidation
        try {
            await ActivationService.trackFirst('FIRST_CLIENT_CREATED', orgId, undefined, newClient.id);
            revalidatePath('/clients');
            revalidatePath('/projects/new'); 
        } catch (e) {
            console.warn(`[Clients][${traceId}] Background task warning:`, e);
        }
        
        return { 
            success: true, 
            client: normalizeClient(newClient),
            traceId
        };

    } catch (error: any) {
        const errorMsg = error.message || "";
        if (errorMsg.startsWith("READ_ONLY_MODE") || errorMsg.startsWith("ACCESS_DENIED")) {
            return { 
                success: false, 
                error: errorMsg.split(":")[1] === 'TRIAL_EXPIRED' 
                    ? "Tu periodo de prueba ha expirado. Activa un plan para continuar."
                    : "Modo de solo lectura activado.",
                code: errorMsg.split(":")[1],
                traceId 
            };
        }

        console.error(`[Clients][${traceId}] FATAL:`, error.message);
        return { success: false, error: "Error inesperado al crear cliente.", traceId };
    }
}

export async function createClientAction(formData: FormData) {
    const traceId = `CLT-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const context = await ensureWriteAccess();
        const orgId = context.activeOrgId;
        if (!orgId) throw new Error("No active org");

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
            organizationId: orgId,
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
        const context = await ensureWriteAccess();
        const orgId = context.activeOrgId;
        if (!orgId) throw new Error("No active org");

        const supabase = await createClient();
        const { error } = await supabase.from('Client').update({
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            taxId: formData.get('taxId') as string,
            contactName: formData.get('contactName') as string,
            updatedAt: new Date().toISOString()
        }).eq('id', clientId).eq('organizationId', orgId);

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
        const context = await ensureWriteAccess();
        const orgId = context.activeOrgId;
        if (!orgId) throw new Error("No active org");

        const supabase = await createClient();
        const { error } = await supabase.from('Client').delete().eq('id', clientId).eq('organizationId', orgId);
        if (error) throw error;
        revalidatePath('/clients');
        return { success: true, traceId };
    } catch (error: any) {
        console.error(`[Clients][${traceId}] Error:`, error.message);
        throw error;
    }
}

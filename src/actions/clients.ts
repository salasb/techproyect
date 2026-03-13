'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ensureWriteAccess } from "@/lib/auth/write-guard";
import { ActivationService } from "@/services/activation-service";
import { ClientService } from "@/services/client-service";

export type CreateQuickClientResult =
  | {
      ok: true;
      client: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
      };
      traceId: string;
    }
  | {
      ok: false;
      code:
        | 'VALIDATION_ERROR'
        | 'NO_ACTIVE_ORG'
        | 'NO_PERMISSION'
        | 'DUPLICATE_CLIENT'
        | 'READ_ONLY'
        | 'DB_ERROR';
      message: string;
      fieldErrors?: Record<string, string>;
      traceId: string;
    };

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
 * QUICK CLIENT ACTION (v2.0)
 * Uses ClientService for robust creation and validation.
 */
export async function createQuickClient(formData: FormData): Promise<CreateQuickClientResult> {
    const traceId = `ACT-CQC-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    try {
        // 1. Authorization & Write Guard
        let context;
        try {
            context = await ensureWriteAccess();
        } catch (authError: any) {
            console.warn(`[Actions][${traceId}] Auth Denial:`, authError.message);
            return { 
                ok: false, 
                code: 'READ_ONLY', 
                message: 'No tienes permisos de escritura o tu plan ha expirado.',
                traceId 
            };
        }

        const orgId = context.activeOrgId;
        if (!orgId) {
            return { ok: false, code: 'NO_ACTIVE_ORG', message: 'Se requiere una organización activa.', traceId };
        }

        // 2. Data Extraction
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;

        console.log(`[Actions][${traceId}] Attempting quick client: name=${name}, org=${orgId}`);

        // 3. Service Call
        const result = await ClientService.create({
            organizationId: orgId,
            name,
            email,
            phone,
            status: 'PROSPECT'
        });

        if (!result.ok) {
            console.warn(`[Actions][${traceId}] Service failure: ${result.code} - ${result.message}`);
            return { ...result, traceId };
        }

        // 4. Post-Creation Tasks (Async/Background)
        try {
            await ActivationService.trackFirst('FIRST_CLIENT_CREATED', orgId, undefined, result.client.id);
            revalidatePath('/clients');
            revalidatePath('/projects/new'); 
        } catch (e) {
            console.warn(`[Actions][${traceId}] Background tasks warning:`, e);
        }
        
        console.log(`[Actions][${traceId}] Success: Client ${result.client.id} created.`);
        return { ok: true, client: result.client, traceId };

    } catch (error: any) {
        console.error(`[Actions][${traceId}] FATAL UNEXPECTED:`, error.message);
        return { 
            ok: false, 
            code: 'DB_ERROR', 
            message: 'Error inesperado al procesar la creación del cliente.', 
            traceId 
        };
    }
}

/**
 * Standard Create Client Action
 */
export async function createClientAction(formData: FormData) {
    const traceId = `ACT-CLT-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const context = await ensureWriteAccess();
        const orgId = context.activeOrgId;
        if (!orgId) throw new Error("No active org");

        const result = await ClientService.create({
            organizationId: orgId,
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            taxId: formData.get('taxId') as string,
            contactName: formData.get('contactName') as string,
            status: 'ACTIVE'
        });

        if (!result.ok) throw new Error(result.message);

        revalidatePath('/clients');
        return { success: true, traceId };
    } catch (error: any) {
        console.error(`[Actions][${traceId}] Error:`, error.message);
        throw error;
    }
}

export async function updateClientAction(clientId: string, formData: FormData) {
    const traceId = `ACT-UPC-${Math.random().toString(36).substring(7).toUpperCase()}`;
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
        console.error(`[Actions][${traceId}] Error:`, error.message);
        throw error;
    }
}

export async function deleteClientAction(clientId: string) {
    const traceId = `ACT-DEL-${Math.random().toString(36).substring(7).toUpperCase()}`;
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
        console.error(`[Actions][${traceId}] Error:`, error.message);
        throw error;
    }
}

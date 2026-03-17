'use server'

import { revalidatePath } from "next/cache";
import { ensureWriteAccess } from "@/lib/auth/write-guard";
import { ActivationService } from "@/services/activation-service";
import { ClientService } from "@/services/client-service";
import prisma from "@/lib/prisma";

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
        | 'FOREIGN_KEY_ERROR'
        | 'SCHEMA_MISMATCH'
        | 'READ_ONLY'
        | 'DB_ERROR';
      message: string;
      fieldErrors?: Record<string, string>;
      prismaCode?: string;
      traceId: string;
    };

import { resolveAccessContext } from "@/lib/auth/access-resolver";

/**
 * GET CLIENTS (v3.1)
 * Scoped by active organization or Global for superadmins.
 */
export async function getClients() {
    const traceId = `ACT-CLT-LST-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const context = await resolveAccessContext();
        
        if (!context.activeOrgId && !context.isGlobalOperator) {
            console.warn(`[Actions][${traceId}] getClients blocked: No organization context for non-global user.`);
            return [];
        }

        console.log(`[Actions][${traceId}] Fetching clients. mode=${context.effectiveMode}, org=${context.activeOrgId}`);
        return await ClientService.list(context.activeOrgId);
    } catch (error: any) {
        console.error(`[Actions][${traceId}] Error in getClients:`, error.message);
        return [];
    }
}

/**
 * GET CLIENT DETAILS ACTION (v1.1)
 * Centralized entry point for client detail view using Service (Prisma).
 */
export async function getClientDetailsAction(clientId: string): Promise<{ ok: true, client: any, traceId: string } | { ok: false, code: string, message: string, traceId: string }> {
    const traceId = `ACT-CLT-DET-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const context = await resolveAccessContext();
        
        if (!context.activeOrgId && !context.isGlobalOperator) {
            return { ok: false, code: 'NO_CONTEXT', message: 'Debes seleccionar una organización.', traceId };
        }

        // Fetch via Service (Prisma) - Standardizes scoping and data shape
        const result = await ClientService.getById(clientId, context.activeOrgId);
        
        if (!result.ok) return { ok: false, code: result.code, message: result.message, traceId };

        return { 
            ok: true, 
            client: result.client, 
            traceId 
        };
    } catch (error: any) {
        console.error(`[Actions][${traceId}] Critical failure:`, error.message);
        return { ok: false, code: 'ERROR', message: 'Error interno al cargar el detalle.', traceId };
    }
}

/**
 * SEARCH CLIENTS ACTION (v1.0)
 * Scoped search for autocomplete/header search.
 */
export async function searchClientsAction(query: string) {
    const traceId = `ACT-CLT-SRCH-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const context = await resolveAccessContext();
        const orgId = context.activeOrgId;

        if (!orgId || !query || query.length < 2) return [];

        console.log(`[Actions][${traceId}] Searching clients for org=${orgId}, query="${query}"`);
        return await ClientService.search(orgId, query);
    } catch (error: any) {
        console.error(`[Actions][${traceId}] Error in searchClientsAction:`, error.message);
        return [];
    }
}

/**
 * QUICK CLIENT ACTION (v2.1)
 * Uses ClientService with strict trace tracking and error mapping.
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
            console.error(`[Actions][${traceId}] Critical: No activeOrgId in authorized context.`);
            return { ok: false, code: 'NO_ACTIVE_ORG', message: 'Se requiere una organización activa para crear clientes.', traceId };
        }

        // 2. Data Extraction
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;

        console.log(`[Actions][${traceId}] Creation request: user=${context.email}, org=${orgId}, name=${name}`);

        // 3. Service Call (The source of truth for DB operations)
        const result = await ClientService.create({
            organizationId: orgId,
            name,
            email,
            phone,
            status: 'PROSPECT'
        });

        if (!result.ok) {
            console.warn(`[Actions][${traceId}] Service failure: ${result.code} (Prisma: ${result.prismaCode})`);
            return { ...result, traceId };
        }

        // 4. Post-Creation Tasks
        try {
            await ActivationService.trackFirst('FIRST_CLIENT_CREATED', orgId, undefined, result.client.id);
            revalidatePath('/clients');
            revalidatePath('/projects/new'); 
        } catch (e) {
            console.warn(`[Actions][${traceId}] Non-critical background task warning:`, e);
        }
        
        console.log(`[Actions][${traceId}] Success: Client ${result.client.id} registered.`);
        return { ok: true, client: result.client, traceId };

    } catch (error: any) {
        console.error(`[Actions][${traceId}] CRITICAL ACTION FAILURE:`, error.message);
        return { 
            ok: false, 
            code: 'DB_ERROR', 
            message: 'Ocurrió un error inesperado al procesar la acción del cliente.', 
            traceId 
        };
    }
}

/**
 * Standard Create Client Action
 */
export async function createClientAction(formData: FormData) {
    const traceId = `ACT-CLT-CRT-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const context = await ensureWriteAccess();
        const orgId = context.activeOrgId;
        
        if (!orgId) {
            return { ok: false, message: "Debes seleccionar una organización antes de crear un cliente.", traceId };
        }

        const result = await ClientService.create({
            organizationId: orgId,
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            taxId: formData.get('taxId') as string,
            contactName: formData.get('contactName') as string,
            status: 'CLIENT'
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

        console.log(`[Actions][${traceId}] Updating client ${clientId} for org=${orgId}`);

        await prisma.client.update({
            where: { id: clientId, organizationId: orgId },
            data: {
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
                address: formData.get('address') as string,
                taxId: formData.get('taxId') as string,
                contactName: formData.get('contactName') as string,
                updatedAt: new Date()
            }
        });

        revalidatePath('/clients');
        revalidatePath(`/clients/${clientId}`);
        return { success: true, traceId };
    } catch (error: any) {
        console.error(`[Actions][${traceId}] Error:`, error.message);
        throw error;
    }
}

/**
 * DELETE CLIENT ACTION (v2.2)
 */
export async function deleteClientAction(clientId: string) {
    const traceId = `ACT-CLT-DEL-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const context = await ensureWriteAccess();
        
        console.log(`[Actions][${traceId}] Delete intent: id=${clientId}, org=${context.activeOrgId}`);

        // Scoping is handled within Service.delete (allows null orgId for global operators)
        const result = await ClientService.delete(clientId, context.activeOrgId);

        if (!result.ok) {
            return { success: false, message: result.message, traceId };
        }

        revalidatePath('/clients');
        return { success: true, traceId };
    } catch (error: any) {
        console.error(`[Actions][${traceId}] Error in delete:`, error.message);
        return { success: false, message: "No tienes permisos de escritura o falta contexto.", traceId };
    }
}


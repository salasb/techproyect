import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { validateRut, formatRut } from "@/lib/rut";

export type CreateClientData = {
    organizationId: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    taxId?: string | null;
    contactName?: string | null;
    status?: 'PROSPECT' | 'ACTIVE' | 'INACTIVE';
};

export type ClientServiceResult = 
    | { ok: true; client: { id: string; name: string; email: string | null; phone: string | null } }
    | { ok: false; code: 'VALIDATION_ERROR' | 'DUPLICATE_CLIENT' | 'DB_ERROR'; message: string; fieldErrors?: Record<string, string> };

/**
 * CLIENT SERVICE (v1.0)
 * Centralized logic for Client/Prospect lifecycle.
 */
export const ClientService = {
    /**
     * Creates a new client or prospect with validation.
     */
    async create(data: CreateClientData): Promise<ClientServiceResult> {
        const traceId = `SVC-CLT-${Math.random().toString(36).substring(7).toUpperCase()}`;
        
        try {
            // 1. Basic Validation
            if (!data.name || data.name.trim() === '') {
                return { ok: false, code: 'VALIDATION_ERROR', message: 'El nombre es requerido.', fieldErrors: { name: 'Requerido' } };
            }

            // 2. Duplicate Check (within the same organization)
            if (data.email) {
                const existing = await prisma.client.findFirst({
                    where: { 
                        organizationId: data.organizationId,
                        email: data.email.trim().toLowerCase()
                    }
                });
                if (existing) {
                    return { ok: false, code: 'DUPLICATE_CLIENT', message: 'Ya existe un cliente con este correo en tu organización.', fieldErrors: { email: 'Correo duplicado' } };
                }
            }

            // 3. RUT/TaxId Validation if provided
            let taxId = data.taxId;
            if (taxId && taxId.trim() !== '') {
                if (!validateRut(taxId)) {
                    return { ok: false, code: 'VALIDATION_ERROR', message: 'El RUT ingresado no es válido.', fieldErrors: { taxId: 'RUT inválido' } };
                }
                taxId = formatRut(taxId);
            }

            // 4. Persistence via Supabase (to maintain RLS context if needed) or Prisma
            const supabase = await createClient();
            const clientId = crypto.randomUUID();
            
            const { data: newClient, error } = await supabase
                .from('Client')
                .insert({
                    id: clientId,
                    organizationId: data.organizationId,
                    name: data.name.trim(),
                    email: data.email?.trim().toLowerCase() || null,
                    phone: data.phone?.trim() || null,
                    address: data.address?.trim() || null,
                    taxId: taxId || null,
                    contactName: data.contactName?.trim() || null,
                    status: data.status || 'PROSPECT',
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error(`[ClientService][${traceId}] Supabase Error:`, error.message);
                return { ok: false, code: 'DB_ERROR', message: 'Error de base de datos al guardar el cliente.' };
            }

            return {
                ok: true,
                client: {
                    id: newClient.id,
                    name: newClient.name,
                    email: newClient.email,
                    phone: newClient.phone
                }
            };

        } catch (error: any) {
            console.error(`[ClientService][${traceId}] Unexpected Error:`, error.message);
            return { ok: false, code: 'DB_ERROR', message: 'Ocurrió un fallo interno procesando la solicitud.' };
        }
    }
};

import prisma from "@/lib/prisma";
import { validateRut, formatRut } from "@/lib/rut";
import { Prisma } from "@prisma/client";

export type CreateClientData = {
    organizationId: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    taxId?: string | null;
    contactName?: string | null;
    status?: 'LEAD' | 'PROSPECT' | 'CLIENT' | 'CHURNED';
};

export type ClientServiceResult = 
    | { ok: true; client: { id: string; name: string; email: string | null; phone: string | null } }
    | { 
        ok: false; 
        code: 'VALIDATION_ERROR' | 'DUPLICATE_CLIENT' | 'FOREIGN_KEY_ERROR' | 'DB_ERROR' | 'SCHEMA_MISMATCH'; 
        message: string; 
        fieldErrors?: Record<string, string>;
        prismaCode?: string;
    };

/**
 * CLIENT SERVICE (v2.0)
 * Centralized logic for Client/Prospect lifecycle using Prisma for strict schema alignment.
 */
export const ClientService = {
    /**
     * Creates a new client or prospect with validation and robust error mapping.
     */
    async create(data: CreateClientData): Promise<ClientServiceResult> {
        const traceId = `SVC-CLT-${Math.random().toString(36).substring(7).toUpperCase()}`;
        
        try {
            // 1. Basic Validation
            if (!data.name || data.name.trim() === '') {
                return { ok: false, code: 'VALIDATION_ERROR', message: 'El nombre es requerido.', fieldErrors: { name: 'Requerido' } };
            }

            // 2. RUT/TaxId Validation if provided
            let taxId = data.taxId;
            if (taxId && taxId.trim() !== '') {
                if (!validateRut(taxId)) {
                    return { ok: false, code: 'VALIDATION_ERROR', message: 'El RUT ingresado no es válido.', fieldErrors: { taxId: 'RUT inválido' } };
                }
                taxId = formatRut(taxId);
            }

            // 3. Persistence via Prisma (Guarantees Schema Alignment)
            const newClient = await prisma.client.create({
                data: {
                    organizationId: data.organizationId,
                    name: data.name.trim(),
                    email: data.email?.trim().toLowerCase() || null,
                    phone: data.phone?.trim() || null,
                    address: data.address?.trim() || null,
                    taxId: taxId || null,
                    contactName: data.contactName?.trim() || null,
                    status: data.status || 'PROSPECT',
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true
                }
            });

            console.log(`[ClientService][${traceId}] Success: Client created with ID ${newClient.id}`);

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
            console.error(`[ClientService][${traceId}] DB ERROR:`, {
                message: error.message,
                code: error.code,
                meta: error.meta
            });

            // 4. Map Prisma Error Codes to Canonical Contract
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // Unique constraint failed (e.g. Email already exists in this org)
                if (error.code === 'P2002') {
                    const target = (error.meta?.target as string[]) || [];
                    const isEmail = target.includes('email');
                    return { 
                        ok: false, 
                        code: 'DUPLICATE_CLIENT', 
                        message: isEmail ? 'Ya existe un cliente con este correo.' : 'Este cliente ya está registrado.',
                        fieldErrors: isEmail ? { email: 'Duplicado' } : { name: 'Duplicado' },
                        prismaCode: error.code
                    };
                }

                // Foreign key constraint failed (e.g. orgId doesn't exist)
                if (error.code === 'P2003') {
                    return { 
                        ok: false, 
                        code: 'FOREIGN_KEY_ERROR', 
                        message: 'Error de integridad: La organización o referencia no existe.',
                        prismaCode: error.code
                    };
                }

                // Field value out of range or invalid enum
                if (error.code === 'P2005' || error.code === 'P2006') {
                    return { 
                        ok: false, 
                        code: 'SCHEMA_MISMATCH', 
                        message: 'Error de formato: Algunos datos no coinciden con el esquema de la base de datos.',
                        prismaCode: error.code
                    };
                }
            }

            // Fallback for truly unexpected errors
            return { 
                ok: false, 
                code: 'DB_ERROR', 
                message: 'Ocurrió un fallo al guardar en la base de datos. Verifica los datos e intenta nuevamente.',
                prismaCode: error.code || 'UNKNOWN'
            };
        }
    }
};

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
 * CLIENT SERVICE (v2.1)
 * Centralized logic for Client/Prospect lifecycle using Prisma for strict schema alignment.
 * Includes explicit organizationId scoping for all operations.
 */
export const ClientService = {
    /**
     * Creates a new client or prospect with validation and robust error mapping.
     */
    async create(data: CreateClientData): Promise<ClientServiceResult> {
        const traceId = `SVC-CLT-CRT-${Math.random().toString(36).substring(7).toUpperCase()}`;
        console.log(`[ClientService][${traceId}] Create request for org=${data.organizationId}, name=${data.name}`);
        
        try {
            // 1. Basic Validation
            if (!data.name || data.name.trim() === '') {
                return { ok: false, code: 'VALIDATION_ERROR', message: 'El nombre es requerido.', fieldErrors: { name: 'Requerido' } };
            }

            if (!data.organizationId) {
                return { ok: false, code: 'VALIDATION_ERROR', message: 'La organización es obligatoria.', fieldErrors: { organizationId: 'Requerido' } };
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

                if (error.code === 'P2003') {
                    return { 
                        ok: false, 
                        code: 'FOREIGN_KEY_ERROR', 
                        message: 'Error de integridad: La organización o referencia no existe.',
                        prismaCode: error.code
                    };
                }

                if (error.code === 'P2005' || error.code === 'P2006') {
                    return { 
                        ok: false, 
                        code: 'SCHEMA_MISMATCH', 
                        message: 'Error de formato: Algunos datos no coinciden con el esquema de la base de datos.',
                        prismaCode: error.code
                    };
                }
            }

            return { 
                ok: false, 
                code: 'DB_ERROR', 
                message: 'Ocurrió un fallo al guardar en la base de datos.',
                prismaCode: error.code || 'UNKNOWN'
            };
        }
    },

    /**
     * Lists all clients for a specific organization with explicit scoping.
     */
    async list(organizationId: string) {
        const traceId = `SVC-CLT-LST-${Math.random().toString(36).substring(7).toUpperCase()}`;
        console.log(`[ClientService][${traceId}] List request for org=${organizationId}`);

        if (!organizationId) {
            console.warn(`[ClientService][${traceId}] Blocked: No organizationId provided for list.`);
            return [];
        }

        try {
            const clients = await prisma.client.findMany({
                where: { organizationId },
                orderBy: { name: 'asc' },
                include: {
                    _count: {
                        select: { Project: true }
                    }
                }
            });
            console.log(`[ClientService][${traceId}] Success: Found ${clients.length} clients.`);
            return clients;
        } catch (error: any) {
            console.error(`[ClientService][${traceId}] DB ERROR on list:`, error.message);
            return [];
        }
    },

    /**
     * Searches clients by name or email within an organization.
     */
    async search(organizationId: string, query: string) {
        const traceId = `SVC-CLT-SRCH-${Math.random().toString(36).substring(7).toUpperCase()}`;
        console.log(`[ClientService][${traceId}] Search request for org=${organizationId}, query="${query}"`);

        if (!organizationId || !query || query.length < 2) {
            return [];
        }

        try {
            const clients = await prisma.client.findMany({
                where: {
                    organizationId,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { email: { contains: query, mode: 'insensitive' } },
                        { taxId: { contains: query, mode: 'insensitive' } }
                    ]
                },
                take: 10,
                orderBy: { name: 'asc' }
            });
            console.log(`[ClientService][${traceId}] Success: Found ${clients.length} matches.`);
            return clients;
        } catch (error: any) {
            console.error(`[ClientService][${traceId}] DB ERROR on search:`, error.message);
            return [];
        }
    }
};


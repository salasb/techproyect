'use server'

import { resolveAccessContext } from "@/lib/auth/access-resolver";
import prisma from "@/lib/prisma";

/**
 * GLOBAL SEARCH ACTION (v1.0)
 * Centralized server-side search for Projects and Clients.
 * Scoped by active organization.
 */
export async function globalSearchAction(query: string) {
    const traceId = `ACT-SRCH-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    try {
        const context = await resolveAccessContext();
        const orgId = context.activeOrgId;

        if (!orgId) {
            console.warn(`[GlobalSearch][${traceId}] Search blocked: No active organization.`);
            return { projects: [], clients: [] };
        }

        if (!query || query.trim().length < 2) {
            return { projects: [], clients: [] };
        }

        const cleanQuery = query.trim();

        console.log(`[GlobalSearch][${traceId}] Searching for "${cleanQuery}" in org=${orgId}`);

        // Parallel search using Prisma (Bypass RLS, strict scoping)
        const [projects, clients] = await Promise.all([
            prisma.project.findMany({
                where: {
                    organizationId: orgId,
                    name: { contains: cleanQuery, mode: 'insensitive' }
                },
                select: {
                    id: true,
                    name: true,
                    client: { select: { name: true } },
                    company: { select: { name: true } }
                },
                take: 5
            }),
            prisma.client.findMany({
                where: {
                    organizationId: orgId,
                    OR: [
                        { name: { contains: cleanQuery, mode: 'insensitive' } },
                        { email: { contains: cleanQuery, mode: 'insensitive' } }
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    Project: {
                        select: { id: true, name: true },
                        take: 3
                    }
                },
                take: 5
            })
        ]);

        return {
            projects: projects.map(p => ({
                id: p.id,
                name: p.name,
                clientName: p.client?.name || p.company?.name || 'Sin cliente'
            })),
            clients: clients.map(c => ({
                id: c.id,
                name: c.name,
                projects: c.Project
            }))
        };

    } catch (error: any) {
        console.error(`[GlobalSearch][${traceId}] Critical failure:`, error.message);
        return { projects: [], clients: [] };
    }
}

import { SupabaseClient } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'
import { OrgResolutionResult } from './organization-resolver'

export async function resolveActiveOrganizationPrisma(
    supabase: SupabaseClient,
    userId: string,
    cookieOrgId?: string,
    hostname?: string
): Promise<OrgResolutionResult> {
    const DEBUG = process.env.LOG_ORG_RESOLUTION === '1';

    try {
        // 1. Fetch memberships & Profile (owned org) using Prisma
        const [memberships, profile] = await Promise.all([
            prisma.organizationMember.findMany({
                where: { userId, status: 'ACTIVE' },
                select: { organizationId: true, role: true, status: true }
            }),
            prisma.profile.findUnique({
                where: { id: userId },
                select: { organizationId: true, role: true, email: true }
            })
        ]);

        const ownedOrgId = profile?.organizationId;

        if (DEBUG) {
            console.log(`[OrgResolution-Prisma] Trace:`, {
                userId,
                email: profile?.email,
                hostname,
                cookieOrgId,
                membershipsCount: memberships.length,
                ownedOrgId
            });
        }

        // 2. AUTO-REPAIR
        if (memberships.length === 0 && ownedOrgId && profile?.role === 'OWNER') {
            try {
                await prisma.organizationMember.create({
                    data: {
                        organizationId: ownedOrgId,
                        userId: userId,
                        role: 'OWNER',
                        status: 'ACTIVE'
                    }
                });
                return { action: 'ENTER', organizationId: ownedOrgId };
            } catch (repairError) {
                console.error(`[OrgResolution-Prisma] Repair failed:`, repairError);
                return { action: 'ERROR', message: 'Repair failed' };
            }
        }

        // 3. Resolve by Cookie
        if (cookieOrgId) {
            const match = memberships.find(m => m.organizationId === cookieOrgId);
            if (match) return { action: 'ENTER', organizationId: cookieOrgId };
        }

        // 4. Branch
        if (memberships.length === 0) return { action: 'START' };
        if (memberships.length === 1) return { action: 'ENTER', organizationId: memberships[0].organizationId };

        return { action: 'SELECT' };

    } catch (error: any) {
        console.error(`[OrgResolution-Prisma] CRITICAL ERROR:`, error);
        return { action: 'ERROR', message: error.message };
    }
}

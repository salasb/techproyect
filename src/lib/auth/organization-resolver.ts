import { SupabaseClient } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'

export type OrgResolutionResult =
    | { action: 'START' }
    | { action: 'SELECT' }
    | { action: 'ERROR', message?: string }
    | { action: 'ENTER', organizationId: string }

export async function resolveActiveOrganization(
    supabase: SupabaseClient,
    userId: string,
    cookieOrgId?: string,
    hostname?: string
): Promise<OrgResolutionResult> {
    const DEBUG = process.env.LOG_ORG_RESOLUTION === '1';
    const trace: string[] = [];

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
            console.log(`[OrgResolution] Trace:`, {
                userId,
                email: profile?.email,
                hostname,
                cookieOrgId,
                membershipsCount: memberships.length,
                ownedOrgId
            });
        }

        // 2. AUTO-REPAIR: 0 memberships but is the verified OWNER of an organization
        if (memberships.length === 0 && ownedOrgId && profile?.role === 'OWNER') {
            if (DEBUG) console.log(`[OrgResolution] Auto-repair candidate: ${ownedOrgId.slice(0, 8)}...`);

            try {
                await prisma.organizationMember.create({
                    data: {
                        organizationId: ownedOrgId,
                        userId: userId,
                        role: 'OWNER',
                        status: 'ACTIVE'
                    }
                });
                if (DEBUG) console.log(`[OrgResolution] Auto-repair success`);
                return { action: 'ENTER', organizationId: ownedOrgId };
            } catch (repairError) {
                console.error(`[OrgResolution] Repair failed:`, repairError);
                // Don't returned START if repair failed, go to ERROR
                return { action: 'ERROR', message: 'Repair failed' };
            }
        }

        // 3. Resolve by Cookie (Must exist in memberships)
        if (cookieOrgId) {
            const match = memberships.find(m => m.organizationId === cookieOrgId);
            if (match) {
                if (DEBUG) console.log(`[OrgResolution] Decision: ENTER (Cookie)`);
                return { action: 'ENTER', organizationId: cookieOrgId };
            }
            if (DEBUG) console.log(`[OrgResolution] Cookie mismatch/stale: ${cookieOrgId}`);
        }

        // 4. Branch: 0, 1, or Many
        if (memberships.length === 0) {
            if (DEBUG) console.log(`[OrgResolution] Decision: START (No memberships)`);
            return { action: 'START' };
        }

        if (memberships.length === 1) {
            if (DEBUG) console.log(`[OrgResolution] Decision: ENTER (Single)`);
            return { action: 'ENTER', organizationId: memberships[0].organizationId };
        }

        if (DEBUG) console.log(`[OrgResolution] Decision: SELECT (${memberships.length} orgs)`);
        return { action: 'SELECT' };

    } catch (error: any) {
        console.error(`[OrgResolution] CRITICAL ERROR:`, error);
        // CRITICAL: Never return START on error
        return { action: 'ERROR', message: error.message };
    }
}

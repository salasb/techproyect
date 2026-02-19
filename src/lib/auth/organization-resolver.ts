import { SupabaseClient } from '@supabase/supabase-js'

export type OrgResolutionResult =
    | { action: 'START' }
    | { action: 'SELECT' }
    | { action: 'ERROR', message?: string }
    | { action: 'ENTER', organizationId: string }

/**
 * Edge-compatible organization resolver (NO Prisma).
 * Safe for middleware.
 */
export async function resolveActiveOrganization(
    supabase: SupabaseClient,
    userId: string,
    cookieOrgId?: string,
    hostname?: string
): Promise<OrgResolutionResult> {
    const DEBUG = process.env.LOG_ORG_RESOLUTION === '1';

    try {
        // 1. Fetch memberships & Profile (owned org) using Supabase
        const [membershipsRes, profileRes] = await Promise.all([
            supabase
                .from('OrganizationMember')
                .select('organizationId, role, status')
                .eq('userId', userId)
                .eq('status', 'ACTIVE'),
            supabase
                .from('Profile')
                .select('organizationId, role, email')
                .eq('id', userId)
                .single()
        ]);

        // CRITICAL CHECK: If there is an error in fetching, do NOT return START
        if (membershipsRes.error || profileRes.error) {
            console.error(`[OrgResolution-Edge] Query Error:`, {
                memberships: membershipsRes.error?.message,
                profile: profileRes.error?.message
            });
            // If we have any memberships gathered despite error, or if we have a cookie, we might prefer SELECT
            // But safest is ERROR to avoid the /start trap.
            return { action: 'ERROR', message: membershipsRes.error?.message || profileRes.error?.message };
        }

        const memberships = membershipsRes.data || [];
        const profile = profileRes.data;
        const ownedOrgId = profile?.organizationId;

        if (DEBUG) {
            console.log(`[OrgResolution-Edge] Trace:`, {
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
            if (DEBUG) console.log(`[OrgResolution-Edge] Auto-repair candidate: ${ownedOrgId.slice(0, 8)}...`);

            const { error: repairError } = await supabase
                .from('OrganizationMember')
                .insert({
                    organizationId: ownedOrgId,
                    userId: userId,
                    role: 'OWNER',
                    status: 'ACTIVE'
                });

            if (!repairError) {
                if (DEBUG) console.log(`[OrgResolution-Edge] Auto-repair success`);
                return { action: 'ENTER', organizationId: ownedOrgId };
            } else {
                console.error(`[OrgResolution-Edge] Repair failed:`, repairError);
                return { action: 'ERROR', message: 'Repair failed' };
            }
        }

        // 3. Resolve by Cookie (Must exist in memberships)
        if (cookieOrgId) {
            const match = memberships.find(m => m.organizationId === cookieOrgId);
            if (match) {
                if (DEBUG) console.log(`[OrgResolution-Edge] Decision: ENTER (Cookie)`);
                return { action: 'ENTER', organizationId: cookieOrgId };
            }
            if (DEBUG) console.log(`[OrgResolution-Edge] Cookie mismatch/stale: ${cookieOrgId}`);
        }

        // 4. Branch: 0, 1, or Many
        if (memberships.length === 0) {
            if (DEBUG) console.log(`[OrgResolution-Edge] Decision: START (No memberships confirmed)`);
            return { action: 'START' };
        }

        if (memberships.length === 1) {
            if (DEBUG) console.log(`[OrgResolution-Edge] Decision: ENTER (Single)`);
            return { action: 'ENTER', organizationId: memberships[0].organizationId };
        }

        if (DEBUG) console.log(`[OrgResolution-Edge] Decision: SELECT (${memberships.length} orgs)`);
        return { action: 'SELECT' };

    } catch (error: any) {
        console.error(`[OrgResolution-Edge] SCRITICAL ERROR:`, error);
        return { action: 'ERROR', message: error.message };
    }
}

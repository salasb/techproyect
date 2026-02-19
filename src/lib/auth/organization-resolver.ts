
import { SupabaseClient } from '@supabase/supabase-js'

export type OrgResolutionResult =
    | { action: 'START' }
    | { action: 'SELECT' }
    | { action: 'ENTER', organizationId: string }

export async function resolveActiveOrganization(
    supabase: SupabaseClient,
    userId: string,
    cookieOrgId?: string
): Promise<OrgResolutionResult> {

    // 1. Fetch ALL active memberships
    const { data: memberships, error } = await supabase
        .from('OrganizationMember')
        .select('organizationId, role, status')
        .eq('userId', userId)
        .eq('status', 'ACTIVE'); // Crucial: Only active

    if (error || !memberships || memberships.length === 0) {
        console.log(`[OrgResolver] User ${userId}: No active memberships. Action: START`);
        return { action: 'START' };
    }

    // 2. Check Cookie Validity
    if (cookieOrgId) {
        const matchingMembership = memberships.find(m => m.organizationId === cookieOrgId);
        if (matchingMembership) {
            // console.log(`[OrgResolver] User ${userId}: Valid cookie found. Action: ENTER ${cookieOrgId}`);
            return { action: 'ENTER', organizationId: cookieOrgId };
        }
        console.log(`[OrgResolver] User ${userId}: Invalid cookie (${cookieOrgId}). Re-resolving.`);
    }

    // 3. Logic for 1 vs Many
    if (memberships.length === 1) {
        console.log(`[OrgResolver] User ${userId}: Single membership. Action: ENTER ${memberships[0].organizationId}`);
        return { action: 'ENTER', organizationId: memberships[0].organizationId };
    }

    // 4. Multiple memberships and no valid cookie
    console.log(`[OrgResolver] User ${userId}: Multiple memberships (${memberships.length}), no valid cookie. Action: SELECT`);
    return { action: 'SELECT' };
}

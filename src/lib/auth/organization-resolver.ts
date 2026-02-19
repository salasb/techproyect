
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
        return { action: 'START' };
    }

    // 2. Check Cookie Validity
    if (cookieOrgId) {
        const matchingMembership = memberships.find(m => m.organizationId === cookieOrgId);
        if (matchingMembership) {
            return { action: 'ENTER', organizationId: cookieOrgId };
        }
        // If cookie exists but invalid, we ignore it and fall through logic
    }

    // 3. Logic for 1 vs Many
    if (memberships.length === 1) {
        return { action: 'ENTER', organizationId: memberships[0].organizationId };
    }

    // 4. Multiple memberships and no valid cookie
    return { action: 'SELECT' };
}

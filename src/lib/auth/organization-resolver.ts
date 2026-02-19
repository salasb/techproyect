import { SupabaseClient } from '@supabase/supabase-js'

export type OrgResolutionResult =
    | { action: 'START' }
    | { action: 'SELECT' }
    | { action: 'ENTER', organizationId: string }

export async function resolveActiveOrganization(
    supabase: SupabaseClient,
    userId: string,
    cookieOrgId?: string,
    hostname?: string
): Promise<OrgResolutionResult> {
    const DEBUG = process.env.LOG_ORG_RESOLUTION === '1';

    // 1. Fetch memberships & Profile (owned org) in parallel
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

    const memberships = membershipsRes.data || [];
    const profile = profileRes.data;
    const ownedOrgId = profile?.organizationId;

    if (DEBUG) {
        console.log(`[OrgResolution] Diagnóstico:`, {
            userId,
            email: profile?.email,
            hostname,
            cookiePresent: !!cookieOrgId,
            cookieValue: cookieOrgId ? `${cookieOrgId.slice(0, 8)}...` : null,
            membershipsCount: memberships.length,
            ownedOrgId: ownedOrgId ? `${ownedOrgId.slice(0, 8)}...` : null,
            membershipsError: membershipsRes.error?.message,
            profileError: profileRes.error?.message
        });
    }

    // 2. AUTO-REPAIR: 0 memberships but has an owned organization
    if (memberships.length === 0 && ownedOrgId) {
        if (DEBUG) console.log(`[OrgResolution] Auto-repair: Detectada org huérfana ${ownedOrgId}. Creando membresía...`);

        // Determine role: Use profile role or default to OWNER if it's their primary org
        const repairRole = profile?.role === 'ADMIN' ? 'ADMIN' : 'OWNER';

        const { error: repairError } = await supabase
            .from('OrganizationMember')
            .insert({
                organizationId: ownedOrgId,
                userId: userId,
                role: repairRole,
                status: 'ACTIVE'
            });

        if (!repairError) {
            if (DEBUG) console.log(`[OrgResolution] Auto-repair exitoso para ${ownedOrgId}`);
            // Recalculate as if we had this 1 organization
            return { action: 'ENTER', organizationId: ownedOrgId };
        } else {
            console.error(`[OrgResolution] Falló auto-repair:`, repairError);
        }
    }

    // 3. Resolve by Cookie (Must exist in memberships)
    if (cookieOrgId) {
        const matchingMembership = memberships.find(m => m.organizationId === cookieOrgId);
        if (matchingMembership) {
            if (DEBUG) console.log(`[OrgResolution] Resultado: ENTER (Cookie validada)`);
            return { action: 'ENTER', organizationId: cookieOrgId };
        }
        if (DEBUG) console.log(`[OrgResolution] Cookie inválida (${cookieOrgId}). Re-calculando...`);
    }

    // 4. Branch: 0, 1, or Many
    if (memberships.length === 0) {
        // Double check: if they have an ownedOrgId that failed repair (unlikely) or just genuinely 0/0
        if (DEBUG) console.log(`[OrgResolution] Resultado: START (Sin membresías)`);
        return { action: 'START' };
    }

    if (memberships.length === 1) {
        if (DEBUG) console.log(`[OrgResolution] Resultado: ENTER (Única membresía)`);
        return { action: 'ENTER', organizationId: memberships[0].organizationId };
    }

    // Multiple memberships, no valid cookie
    if (DEBUG) console.log(`[OrgResolution] Resultado: SELECT (${memberships.length} orgs)`);
    return { action: 'SELECT' };
}

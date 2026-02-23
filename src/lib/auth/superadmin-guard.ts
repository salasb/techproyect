import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export type DenyReason =
    | 'no_session'
    | 'allowlist_missing'
    | 'allowlist_no_match'
    | 'profile_not_found'
    | 'profile_role_not_superadmin'
    | 'db_permission_error'
    | 'resolver_error';

export interface SuperadminAccessResult {
    ok: boolean;
    email: string | null;
    isSuperadmin: boolean;
    denyReason: DenyReason | null;
    diagnostics: {
        allowlistPresent: boolean;
        allowlistMatch: boolean;
        profileRole: string | null;
        error: string | null;
    };
}

/**
 * Deterministic source of truth for Global Cockpit access.
 * Priority: Allowlist > Profile Role.
 */
export async function resolveSuperadminAccess(): Promise<SuperadminAccessResult> {
    const diagnostics = {
        allowlistPresent: false,
        allowlistMatch: false,
        profileRole: null as string | null,
        error: null as string | null
    };

    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { ok: false, email: null, isSuperadmin: false, denyReason: 'no_session', diagnostics };
        }

        const email = user.email?.toLowerCase().trim() || null;
        
        // 1. Evaluate Allowlist (Deterministic for Founders)
        const allowlistRaw = process.env.SUPERADMIN_ALLOWLIST || '';
        diagnostics.allowlistPresent = allowlistRaw.length > 0;
        
        const allowedEmails = allowlistRaw
            .split(/[,
;]/)
            .map(e => e.trim().toLowerCase())
            .filter(Boolean);
        
        if (email && allowedEmails.includes(email)) {
            diagnostics.allowlistMatch = true;
            return { ok: true, email, isSuperadmin: true, denyReason: null, diagnostics };
        }

        // 2. Fallback to Profile Role (Database consistency)
        try {
            const profile = await prisma.profile.findUnique({
                where: { id: user.id },
                select: { role: true }
            });

            if (!profile) {
                return { ok: false, email, isSuperadmin: false, denyReason: 'profile_not_found', diagnostics };
            }

            diagnostics.profileRole = profile.role;
            
            if (profile.role === 'SUPERADMIN') {
                return { ok: true, email, isSuperadmin: true, denyReason: null, diagnostics };
            }

            return { 
                ok: false, 
                email, 
                isSuperadmin: false, 
                denyReason: diagnostics.allowlistPresent ? 'allowlist_no_match' : 'profile_role_not_superadmin', 
                diagnostics 
            };

        } catch (dbErr: any) {
            diagnostics.error = dbErr.message;
            return { ok: false, email, isSuperadmin: false, denyReason: 'db_permission_error', diagnostics };
        }

    } catch (err: any) {
        diagnostics.error = err.message;
        return { ok: false, email: null, isSuperadmin: false, denyReason: 'resolver_error', diagnostics };
    }
}

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
    isAllowlisted: boolean;
    isDbSuperadmin: boolean;
    denyReason: DenyReason | null;
    userId?: string;
    diagnostics: {
        allowlistPresent: boolean;
        allowlistMatch: boolean;
        allowlistMasked: string; // Safe debugging
        vercelEnv: string; // Confirm environment
        profileRole: string | null;
        error: string | null;
    };
}

/**
 * Deterministic source of truth for Global Cockpit access.
 * Priority: Allowlist > Profile Role.
 */
export async function resolveSuperadminAccess(): Promise<SuperadminAccessResult> {
    const diagnostics: SuperadminAccessResult['diagnostics'] = {
        allowlistPresent: false,
        allowlistMatch: false,
        allowlistMasked: 'none',
        vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
        profileRole: null,
        error: null
    };

    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { ok: false, email: null, isSuperadmin: false, isAllowlisted: false, isDbSuperadmin: false, denyReason: 'no_session', diagnostics };
        }

        const email = user.email?.toLowerCase().trim() || null;
        
        // 1. Evaluate Allowlist (Deterministic for Founders)
        const allowlistRaw = process.env.SUPERADMIN_ALLOWLIST || '';
        diagnostics.allowlistPresent = allowlistRaw.length > 0;
        
        const allowedEmails = allowlistRaw
            .split(/[,\n;]+/)
            .map(e => e.trim().toLowerCase())
            .filter(Boolean);
        
        diagnostics.allowlistMasked = allowedEmails
            .map(e => e.replace(/^(..)(.*)(@.*)$/, '$1***$3'))
            .join(', ') || 'empty';
        
        const isAllowlisted = email ? allowedEmails.includes(email) : false;
        if (isAllowlisted) {
            diagnostics.allowlistMatch = true;
        }

        // 2. Evaluate Profile Role (Database consistency)
        let isDbSuperadmin = false;
        try {
            const profile = await prisma.profile.findUnique({
                where: { id: user.id },
                select: { role: true }
            });

            if (profile) {
                diagnostics.profileRole = profile.role;
                isDbSuperadmin = profile.role === 'SUPERADMIN';
            }
        } catch (dbErr: any) {
            diagnostics.error = dbErr.message;
        }

        const ok = isAllowlisted || isDbSuperadmin;

        return {
            ok,
            email,
            userId: user.id,
            isSuperadmin: ok,
            isAllowlisted,
            isDbSuperadmin,
            denyReason: ok ? null : (diagnostics.allowlistPresent ? 'allowlist_no_match' : 'profile_role_not_superadmin'),
            diagnostics
        };

    } catch (err: any) {
        diagnostics.error = err.message;
        return { ok: false, email: null, isSuperadmin: false, isAllowlisted: false, isDbSuperadmin: false, denyReason: 'resolver_error', diagnostics };
    }
}

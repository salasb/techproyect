import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { ORG_CONTEXT_COOKIE } from './constants';

export type GlobalRole = 'SUPERADMIN' | 'STAFF' | 'USER';

export type SessionContext = {
    userId: string | null;
    email: string | null;
    isAuthenticated: boolean;
    globalRole: GlobalRole | null;
    activeOrgId: string | null;
    contextSource: 'COOKIE' | 'DB_DEFAULT' | 'NONE';
    memberships: Array<{ orgId: string; role: string }>;
    traceId: string;
};

/**
 * SESSION CONTEXT RESOLVER (v1.0)
 * Canonical resolution of the authenticated user and their foundational access context.
 * Resilient against missing cookies in preview environments.
 */
export async function resolveSessionContext(): Promise<SessionContext> {
    const traceId = `SESS-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const supabase = await createClient();
    const cookieStore = await cookies();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return {
            userId: null,
            email: null,
            isAuthenticated: false,
            globalRole: null,
            activeOrgId: null,
            contextSource: 'NONE',
            memberships: [],
            traceId
        };
    }

    const email = user.email ? user.email.toLowerCase() : '';

    // 1. Resolve Profile & Memberships in parallel
    const [profile, memberships] = await Promise.all([
        prisma.profile.findUnique({
            where: { id: user.id },
            select: { role: true, organizationId: true }
        }),
        prisma.organizationMember.findMany({
            where: { userId: user.id, status: 'ACTIVE' },
            select: { organizationId: true, role: true }
        })
    ]);

    // 2. Determine Global Role (with allowlist bootstrap support)
    const allowlist = process.env.SUPERADMIN_ALLOWLIST?.split(/[,
;]/).map(e => e.trim().toLowerCase()).filter(Boolean) || [];
    const isCreator = allowlist.includes(email);

    let globalRole: GlobalRole = (profile?.role as GlobalRole) || 'USER';
    if (isCreator && globalRole !== 'SUPERADMIN') {
        globalRole = 'SUPERADMIN';
    }

    // 3. Resolve Active Context (Resilient)
    let activeOrgId = null;
    let contextSource: SessionContext['contextSource'] = 'NONE';

    // A. Check Cookie First
    const cookieOrgId = cookieStore.get(ORG_CONTEXT_COOKIE)?.value;
    
    if (cookieOrgId && (globalRole === 'SUPERADMIN' || memberships.some(m => m.organizationId === cookieOrgId))) {
        activeOrgId = cookieOrgId;
        contextSource = 'COOKIE';
    } 
    // B. Fallback to Profile Default (Crucial for Vercel Deployments where cookies might drop)
    else if (profile?.organizationId && (globalRole === 'SUPERADMIN' || memberships.some(m => m.organizationId === profile.organizationId))) {
        activeOrgId = profile.organizationId;
        contextSource = 'DB_DEFAULT';
    }
    // C. Fallback to first membership
    else if (memberships.length > 0) {
        activeOrgId = memberships[0].organizationId;
        contextSource = 'DB_DEFAULT';
    }

    const result: SessionContext = {
        userId: user.id,
        email,
        isAuthenticated: true,
        globalRole,
        activeOrgId,
        contextSource,
        memberships: memberships.map(m => ({ orgId: m.organizationId, role: m.role })),
        traceId
    };

    console.log(`[SessionResolver][${traceId}] Resolved: user=${email}, role=${globalRole}, activeOrg=${activeOrgId}, source=${contextSource}`);
    
    return result;
}

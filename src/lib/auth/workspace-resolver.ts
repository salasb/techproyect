import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export interface WorkspaceState {
    hasOrganizations: boolean;
    organizationsCount: number;
    activeOrgId: string | null;
    organizations: { id: string; name: string; rut?: string | null }[];
    userRole?: string;
    error?: string;
    isAutoProvisioned?: boolean;
}

/**
 * Server-side organization resolution.
 * This runs in Node runtime (Prisma safe).
 */
export async function getWorkspaceState(): Promise<WorkspaceState> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return {
            hasOrganizations: false,
            organizationsCount: 0,
            activeOrgId: null,
            organizations: [],
            error: 'Not authenticated'
        };
    }

    try {
        // 1. Fetch memberships & Profile (for global role) using Prisma
        const memberships = await prisma.organizationMember.findMany({
            where: { userId: user.id, status: 'ACTIVE' },
            include: {
                organization: {
                    include: {
                        subscription: true
                    }
                }
            }
        });

        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { role: true }
        });

        // 2. Resolve active organization from cookie or default
        const cookieStore = await cookies();
        const cookieOrgId = cookieStore.get('app-org-id')?.value;

        let activeOrgId = null;
        if (cookieOrgId && memberships.some(m => m.organizationId === cookieOrgId)) {
            activeOrgId = cookieOrgId;
        } else if (memberships.length > 0) {
            activeOrgId = memberships[0].organizationId;
            // Sync cookie if mismatched
            cookieStore.set('app-org-id', activeOrgId, {
                path: '/',
                httpOnly: false,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            });
        }

        return {
            hasOrganizations: memberships.length > 0,
            organizationsCount: memberships.length,
            activeOrgId,
            organizations: memberships.map(m => m.organization),
            userRole: profile?.role
        };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[WorkspaceResolver] CRITICAL ERROR:', error);
        return {
            hasOrganizations: false,
            organizationsCount: 0,
            activeOrgId: null,
            organizations: [],
            error: errorMessage
        };
    }
}

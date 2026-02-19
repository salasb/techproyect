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
            select: { role: true, organizationId: true }
        });

        let activeMemberships = memberships;
        let isAutoProvisioned = false;
        let isRecovered = false;

        // --- AUTO-REPAIR LOGIC ---
        if (activeMemberships.length === 0) {
            console.log('[WorkspaceResolver] No active memberships found. Attempting auto-repair...');

            // Attempt A: Try to recover from Profile.organizationId
            if (profile?.organizationId) {
                const orgExists = await prisma.organization.findUnique({
                    where: { id: profile.organizationId },
                    include: { subscription: true }
                });

                if (orgExists) {
                    console.log(`[WorkspaceResolver] Recovering via Profile.organizationId: ${profile.organizationId}`);
                    const newMember = await prisma.organizationMember.create({
                        data: {
                            userId: user.id,
                            organizationId: profile.organizationId,
                            role: 'OWNER',
                            status: 'ACTIVE'
                        },
                        include: { organization: { include: { subscription: true } } }
                    });
                    activeMemberships = [newMember];
                    isRecovered = true;
                }
            }

            // Attempt B: Try to recover from user's interaction logs if A didn't work
            if (activeMemberships.length === 0) {
                const lastLog = await prisma.auditLog.findFirst({
                    where: { userId: user.id, organizationId: { not: null } },
                    orderBy: { createdAt: 'desc' },
                    include: { organization: { include: { subscription: true } } }
                });

                if (lastLog?.organizationId && lastLog.organization) {
                    console.log(`[WorkspaceResolver] Recovering via AuditLog.organizationId: ${lastLog.organizationId}`);
                    const newMember = await prisma.organizationMember.create({
                        data: {
                            userId: user.id,
                            organizationId: lastLog.organizationId,
                            role: 'OWNER',
                            status: 'ACTIVE'
                        },
                        include: { organization: { include: { subscription: true } } }
                    });
                    activeMemberships = [newMember];
                    isRecovered = true;

                    // Keep Profile synced
                    await prisma.profile.update({
                        where: { id: user.id },
                        data: { organizationId: lastLog.organizationId }
                    });
                }
            }

            // Attempt C: Auto-Provision if completely empty and env var is set
            if (activeMemberships.length === 0 && process.env.AUTO_PROVISION === '1') {
                console.log('[WorkspaceResolver] Auto-provisioning new organization...');
                const newOrg = await prisma.organization.create({
                    data: {
                        name: 'Mi Organización',
                        OrganizationMember: {
                            create: {
                                userId: user.id,
                                role: 'OWNER',
                                status: 'ACTIVE'
                            }
                        },
                        subscription: {
                            create: {
                                status: 'TRIALING'
                            }
                        }
                    },
                    include: {
                        subscription: true,
                        OrganizationMember: {
                            include: {
                                organization: { include: { subscription: true } }
                            }
                        }
                    }
                });

                activeMemberships = newOrg.OrganizationMember;
                isAutoProvisioned = true;
                isRecovered = true;

                await prisma.profile.update({
                    where: { id: user.id },
                    data: { organizationId: newOrg.id }
                });
            }
        }

        // 2. Resolve active organization from cookie or default
        const cookieStore = await cookies();
        const cookieOrgId = cookieStore.get('app-org-id')?.value;

        let activeOrgId = null;
        if (cookieOrgId && activeMemberships.some(m => m.organizationId === cookieOrgId)) {
            activeOrgId = cookieOrgId;
        } else if (activeMemberships.length > 0) {
            activeOrgId = activeMemberships[0].organizationId;
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
            hasOrganizations: activeMemberships.length > 0,
            organizationsCount: activeMemberships.length,
            activeOrgId,
            organizations: activeMemberships.map(m => m.organization),
            userRole: profile?.role,
            isAutoProvisioned,
            error: isRecovered ? 'Workspace Recovered' : undefined
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

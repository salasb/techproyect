import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export type WorkspaceStatus =
    | 'NOT_AUTHENTICATED'
    | 'PROFILE_MISSING'
    | 'NO_ORG'
    | 'ORG_PENDING_APPROVAL'
    | 'ORG_MULTI_NO_SELECTION'
    | 'ORG_ACTIVE_SELECTED'
    | 'WORKSPACE_ERROR';

export interface WorkspaceState {
    status: WorkspaceStatus;
    userId: string | null;
    hasOrganizations: boolean;
    organizationsCount: number;
    activeOrgId: string | null;
    organizations: { id: string; name: string; rut?: string | null; status?: string | null }[];
    userRole?: string;
    isSuperadmin: boolean;
    error?: string;
    isAutoProvisioned?: boolean;
    bootstrapDebug?: {
        enabled: boolean;
        allowlistMatched: boolean;
        attempted: boolean;
        promotedThisRequest: boolean;
        error: string | null;
    };
}

/**
 * Server-side organization resolution conforming to RESET-FUNDACIONAL-WORKSPACE-v1.
 * Strict State Machine output.
 */
export async function getWorkspaceState(): Promise<WorkspaceState> {
    const supabase = await createClient();

    // Safety Wrapper for timeouts - 6 seconds max for DB ops
    const fetchWithTimeout = async <T>(promise: Promise<T>, ms = 6000): Promise<T> => {
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error('Resolver Timeout Exceeded'));
            }, ms);
        });
        return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
    };

    try {
        const { data: { user } } = await fetchWithTimeout(supabase.auth.getUser(), 3000);

        if (!user) {
            return {
                status: 'NOT_AUTHENTICATED',
                userId: null,
                hasOrganizations: false,
                organizationsCount: 0,
                activeOrgId: null,
                organizations: [],
                isSuperadmin: false
            };
        }

        // 1. Fetch memberships & Profile via Prisma
        const membershipsPromise = prisma.organizationMember.findMany({
            where: { userId: user.id, status: 'ACTIVE' },
            include: { organization: true }
        });

        const profilePromise = prisma.profile.findUnique({
            where: { id: user.id },
            select: { role: true, organizationId: true, name: true }
        });

        const [memberships, profile] = await fetchWithTimeout(Promise.all([membershipsPromise, profilePromise]));

        if (!profile) {
            return {
                status: 'PROFILE_MISSING',
                userId: user.id,
                hasOrganizations: false,
                organizationsCount: 0,
                activeOrgId: null,
                organizations: [],
                isSuperadmin: false,
                error: 'Tu cuenta existe, pero el perfil interno no está listo.'
            };
        }

        let isSuperadmin = profile.role === 'SUPERADMIN';

        let bootstrapDebug = {
            enabled: process.env.SUPERADMIN_BOOTSTRAP_ENABLED === 'true',
            allowlistMatched: false,
            attempted: false,
            promotedThisRequest: false,
            error: null as string | null
        };

        // 2. Automagic Bootstrap Strategy
        if (!isSuperadmin && user.email) {
            bootstrapDebug.attempted = true;
            if (bootstrapDebug.enabled) {
                const allowlistEntry = process.env.SUPERADMIN_ALLOWLIST || '';
                const allowedEmails = allowlistEntry.split(',').filter(Boolean).map(e => e.trim().toLowerCase());
                if (allowedEmails.includes(user.email.toLowerCase())) {
                    bootstrapDebug.allowlistMatched = true;
                    try {
                        await prisma.$transaction(async (tx) => {
                            await tx.profile.update({
                                where: { id: user.id },
                                data: { role: 'SUPERADMIN' }
                            });
                            await tx.auditLog.create({
                                data: {
                                    userId: user.id,
                                    action: 'SUPERADMIN_AUTO_BOOTSTRAP',
                                    details: `User ${user.email} promoted automatically via resolver bootstrap.`,
                                    userName: profile.name || user.email
                                }
                            });
                        });
                        isSuperadmin = true;
                        // Actualizamos memoria local
                        profile.role = 'SUPERADMIN';
                        bootstrapDebug.promotedThisRequest = true;
                        console.log(`[WorkspaceResolver] User ${user.email} naturally promoted to SUPERADMIN via ALLOWLIST.`);
                    } catch (err: any) {
                        console.error('[WorkspaceResolver] Failed to bootstrap superadmin:', err);
                        bootstrapDebug.error = err.message;
                    }
                }
            } else {
                bootstrapDebug.error = "Bootstrap disabled by env flag";
            }
        }

        let activeMemberships = memberships;
        let isAutoProvisioned = false;

        const cookieStore = await cookies();
        const cookieOrgId = cookieStore.get('app-org-id')?.value;
        let activeOrgId = null;

        // God-mode for Superadmins: Allow context even without explicit membership
        if (isSuperadmin && cookieOrgId) {
            const orgExists = await prisma.organization.findUnique({
                where: { id: cookieOrgId },
                select: { id: true, name: true, status: true }
            });
            if (orgExists) {
                activeOrgId = cookieOrgId;
            }
        }

        // Auto-provision or NO_ORG check - Skip if Superadmin already resolved an activeOrgId
        if (activeMemberships.length === 0 && !activeOrgId) {
            if (process.env.AUTO_PROVISION === '1') {
                const requireManualApproval = process.env.MANUAL_APPROVAL_REQUIRED === '1';
                console.log('[WorkspaceResolver] Auto-provisioning new organization...');
                const newOrg = await fetchWithTimeout(prisma.organization.create({
                    data: {
                        name: 'Mi Organización',
                        status: requireManualApproval ? 'PENDING' : 'ACTIVE',
                        OrganizationMember: {
                            create: {
                                userId: user.id,
                                role: 'OWNER',
                                status: 'ACTIVE'
                            }
                        },
                        subscription: {
                            create: { status: 'TRIALING' }
                        }
                    },
                    include: {
                        OrganizationMember: {
                            include: { organization: true }
                        }
                    }
                }));

                activeMemberships = newOrg.OrganizationMember;
                isAutoProvisioned = true;

                await fetchWithTimeout(prisma.profile.update({
                    where: { id: user.id },
                    data: { organizationId: newOrg.id }
                }));
            } else {
                return {
                    status: 'NO_ORG',
                    userId: user.id,
                    hasOrganizations: false,
                    organizationsCount: 0,
                    activeOrgId: null,
                    organizations: [],
                    userRole: profile.role,
                    isSuperadmin,
                    bootstrapDebug
                };
            }
        }

        // Resolve activeOrgId for non-superadmin or if not already resolved
        let setCookieId = null;

        if (!activeOrgId) {
            if (cookieOrgId && activeMemberships.some(m => m.organizationId === cookieOrgId)) {
                activeOrgId = cookieOrgId;
            } else if (activeMemberships.length === 1) {
                activeOrgId = activeMemberships[0].organizationId;
                setCookieId = activeOrgId;
                // Sync fallback
                if (profile.organizationId !== activeOrgId) {
                    await prisma.profile.update({
                        where: { id: user.id },
                        data: { organizationId: activeOrgId }
                    }).catch(() => { });
                }
            } else if (activeMemberships.length > 1) {
                const lastActiveOrgId = profile.organizationId;
                if (lastActiveOrgId && activeMemberships.some(m => m.organizationId === lastActiveOrgId)) {
                    activeOrgId = lastActiveOrgId;
                    setCookieId = activeOrgId;
                } else {
                    activeOrgId = null; // Forces Multi Selection State
                }
            }
        }

        if (setCookieId) {
            try {
                const cookieStoreMutable = await cookies();
                cookieStoreMutable.set('app-org-id', setCookieId, {
                    path: '/',
                    httpOnly: false,
                    sameSite: 'lax',
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 60 * 60 * 24 * 7 // 1 week
                });
            } catch (err) {
                // Ignore Next.js Server Component context errors
            }
        }

        if (!activeOrgId && activeMemberships.length > 0) {
            return {
                status: 'ORG_MULTI_NO_SELECTION',
                userId: user.id,
                hasOrganizations: true,
                organizationsCount: activeMemberships.length,
                activeOrgId: null,
                organizations: activeMemberships.map(m => m.organization),
                userRole: profile.role,
                isSuperadmin,
                isAutoProvisioned,
                bootstrapDebug
            };
        }

        // Check if the Selected Org is PENDING
        const selectedOrg = activeMemberships.find(m => m.organizationId === activeOrgId)?.organization;
        if (selectedOrg?.status === 'PENDING') {
            return {
                status: 'ORG_PENDING_APPROVAL',
                userId: user.id,
                hasOrganizations: true,
                organizationsCount: activeMemberships.length,
                activeOrgId: selectedOrg.id,
                organizations: activeMemberships.map(m => m.organization),
                userRole: profile.role,
                isSuperadmin,
                isAutoProvisioned,
                bootstrapDebug
            };
        }

        return {
            status: 'ORG_ACTIVE_SELECTED',
            userId: user.id,
            hasOrganizations: true,
            organizationsCount: activeMemberships.length,
            activeOrgId,
            organizations: activeMemberships.map(m => m.organization),
            userRole: profile.role,
            isSuperadmin,
            isAutoProvisioned,
            bootstrapDebug
        };

    } catch (error: any) {
        console.error('[WorkspaceResolver] CRITICAL ERROR:', error);
        return {
            status: 'WORKSPACE_ERROR',
            userId: null,
            hasOrganizations: false,
            organizationsCount: 0,
            activeOrgId: null,
            organizations: [],
            isSuperadmin: false,
            error: error.message || 'Error resolviendo workspace'
        };
    }
}

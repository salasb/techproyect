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
    recommendedRoute: string; // NEW: Canonical entry point
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

    // Default state for unauthenticated
    const unauthBase = {
        userId: null,
        hasOrganizations: false,
        organizationsCount: 0,
        activeOrgId: null,
        organizations: [],
        isSuperadmin: false,
        recommendedRoute: '/login'
    };

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
                ...unauthBase
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
                recommendedRoute: '/dashboard', // Fallback to let dashboard show the error UI
                error: 'Tu cuenta existe, pero el perfil interno no está listo.'
            };
        }

        let isSuperadmin = profile.role === 'SUPERADMIN';

        const bootstrapDebug = {
            enabled: process.env.SUPERADMIN_BOOTSTRAP_ENABLED === 'true',
            allowlistMatched: false,
            attempted: false,
            promotedThisRequest: false,
            error: null as string | null
        };

        // 2. Automagic Bootstrap Strategy (Policy v2.1.4)
        if (user.email) {
            bootstrapDebug.attempted = true;
            if (bootstrapDebug.enabled) {
                const allowlistRaw = process.env.SUPERADMIN_ALLOWLIST || '';
                // Robust parsing: split by comma, semicolon or newline and filter empty
                const allowedEmails = allowlistRaw
                    .split(/[,\n;]/)
                    .map(e => e.trim().toLowerCase())
                    .filter(Boolean);
                
                const userEmail = user.email.toLowerCase();
                
                if (allowedEmails.includes(userEmail)) {
                    bootstrapDebug.allowlistMatched = true;
                    
                    if (!isSuperadmin) {
                        console.log(`[WorkspaceResolver] User ${userEmail} matched ALLOWLIST. Promoting to SUPERADMIN...`);
                        try {
                            await prisma.$transaction(async (tx) => {
                                await tx.profile.update({
                                    where: { id: user.id },
                                    data: { role: 'SUPERADMIN' }
                                });
                                await tx.auditLog.create({
                                    data: {
                                        userId: user.id,
                                        action: 'SUPERADMIN_BOOTSTRAP_PROMOTED',
                                        details: `User promoted automatically via v2.1.4 policy.`,
                                        userName: profile.name || userEmail
                                    }
                                });
                            });
                            isSuperadmin = true;
                            // Sync local memory profile object for subsequent logic
                            profile.role = 'SUPERADMIN';
                            bootstrapDebug.promotedThisRequest = true;
                            console.log(`[WorkspaceResolver] User ${userEmail} successfully promoted.`);
                        } catch (err: any) {
                            console.error(`[WorkspaceResolver] FAILED promotion for ${userEmail}:`, err.message);
                            bootstrapDebug.error = err.message;
                        }
                    } else {
                        // Already superadmin, but allowlisted (stable state)
                        bootstrapDebug.promotedThisRequest = false;
                    }
                } else {
                    // Safe log for non-match
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(`[WorkspaceResolver] User ${userEmail} not in allowlist.`);
                    }
                }
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
                    recommendedRoute: isSuperadmin ? '/admin' : '/start',
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

        // Determine Final Recommended Route (Entry Policy v2.2.0)
        // Superadmins always favor Global Cockpit by default
        let recommendedRoute = '/dashboard';
        if (isSuperadmin) recommendedRoute = '/admin';
        else if (!activeOrgId && activeMemberships.length > 0) recommendedRoute = '/org/select';
        else if (!activeOrgId) recommendedRoute = '/start';

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
                recommendedRoute,
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
                recommendedRoute: '/pending-activation',
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
            recommendedRoute,
            bootstrapDebug
        };

    } catch (error: any) {
        console.error('[WorkspaceResolver] CRITICAL ERROR:', error);
        return {
            status: 'WORKSPACE_ERROR',
            ...unauthBase,
            recommendedRoute: '/login',
            error: error.message || 'Error resolviendo workspace'
        };
    }
}

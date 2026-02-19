import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export interface WorkspaceState {
    hasOrganizations: boolean;
    organizationsCount: number;
    activeOrgId: string | null;
    organizations: any[];
    error?: string;
    isAutoProvisioned?: boolean;
}

/**
 * Server-side organization resolution and auto-provisioning.
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
        // 1. Fetch memberships & Profile (owned org) using Prisma
        let memberships = await prisma.organizationMember.findMany({
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
            select: { organizationId: true, role: true }
        });

        const ownedOrgId = profile?.organizationId;

        // 2. AUTO-PROVISION: If 0 memberships, create "Mi Organización"
        if (memberships.length === 0) {
            // Check if we should auto-repair first (if they own an org but aren't members)
            if (ownedOrgId && profile?.role === 'OWNER') {
                try {
                    const newMember = await prisma.organizationMember.create({
                        data: {
                            organizationId: ownedOrgId,
                            userId: user.id,
                            role: 'OWNER',
                            status: 'ACTIVE'
                        },
                        include: {
                            organization: {
                                include: {
                                    subscription: true
                                }
                            }
                        }
                    });
                    memberships = [newMember];
                } catch (e) {
                    console.error('[WorkspaceResolver] Auto-repair failed:', e);
                }
            }

            // If still 0, create a new one
            if (memberships.length === 0) {
                try {
                    const newOrg = await prisma.$transaction(async (tx) => {
                        const org = await tx.organization.create({
                            data: {
                                name: 'Mi Organización',
                                mode: 'SOLO',
                                status: 'ACTIVE',
                                plan: 'FREE',
                                settings: {
                                    country: 'CL',
                                    vatRate: 0.19,
                                    isSoloMode: true
                                }
                            }
                        });

                        const member = await tx.organizationMember.create({
                            data: {
                                organizationId: org.id,
                                userId: user.id,
                                role: 'OWNER',
                                status: 'ACTIVE'
                            }
                        });

                        // Create Trial Subscription
                        const trialEndsAt = new Date();
                        trialEndsAt.setDate(trialEndsAt.getDate() + 14);

                        await tx.subscription.create({
                            data: {
                                organizationId: org.id,
                                status: 'TRIALING',
                                planCode: 'PRO_TRIAL',
                                trialEndsAt,
                                seatLimit: 1
                            }
                        });

                        return { ...org, OrganizationMember: [member] };
                    });

                    // Update memberships after creation
                    const fullOrg = await prisma.organization.findUnique({
                        where: { id: newOrg.id },
                        include: { subscription: true }
                    });

                    memberships = [{
                        organizationId: newOrg.id,
                        userId: user.id,
                        organization: fullOrg
                    } as any];

                    // Set cookie via next/headers
                    const cookieStore = await cookies();
                    cookieStore.set('app-org-id', newOrg.id, {
                        path: '/',
                        httpOnly: false,
                        sameSite: 'lax',
                        secure: process.env.NODE_ENV === 'production',
                        maxAge: 60 * 60 * 24 * 7 // 1 week
                    });

                    return {
                        hasOrganizations: true,
                        organizationsCount: 1,
                        activeOrgId: newOrg.id,
                        organizations: memberships.map(m => m.organization),
                        isAutoProvisioned: true
                    };
                } catch (e) {
                    console.error('[WorkspaceResolver] Auto-provision failed:', e);
                }
            }
        }

        // 3. Resolve active organization from cookie or default
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
            organizations: memberships.map(m => m.organization)
        };

    } catch (error: any) {
        console.error('[WorkspaceResolver] CRITICAL ERROR:', error);
        return {
            hasOrganizations: false,
            organizationsCount: 0,
            activeOrgId: null,
            organizations: [],
            error: error.message
        };
    }
}

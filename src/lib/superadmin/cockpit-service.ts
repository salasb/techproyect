import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { MembershipRole } from "@prisma/client";

export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'INCOMPLETE';

export interface OrgCockpitSummary {
    id: string;
    name: string;
    rut: string | null;
    status: string;
    plan: string;
    createdAt: Date;
    health: {
        status: HealthStatus;
        score: number;
        reasons: string[];
        lastActivityAt: Date | null;
    };
    billing: {
        status: string;
        provider: string | null;
        currentPeriodEnd: Date | null;
        trialEndsAt: Date | null;
    };
    metrics: {
        usersCount: number;
        projectsCount: number;
        quotesCount: number;
    };
}

export class CockpitService {
    /**
     * Ensures the current user is a SUPERADMIN
     */
    private static async ensureSuperadmin() {
        console.log("[CockpitService] ensureSuperadmin start");
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            console.error("[CockpitService] ensureSuperadmin: auth failed", authError);
            throw new Error("Not authenticated");
        }

        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { role: true }
        });

        if (profile?.role !== 'SUPERADMIN') {
            console.warn(`[CockpitService] ensureSuperadmin: unauthorized role=${profile?.role} for user=${user.email}`);
            throw new Error("Unauthorized: Superadmin role required");
        }
        console.log("[CockpitService] ensureSuperadmin: success");
        return user;
    }

    /**
     * Get global KPIs for the cockpit header
     */
    static async getGlobalKPIs() {
        await this.ensureSuperadmin();

        const [totalOrgs, subscriptions, stats] = await Promise.all([
            prisma.organization.count(),
            prisma.subscription.findMany({
                select: { status: true, trialEndsAt: true }
            }),
            prisma.organizationStats.findMany({
                select: { lastActivityAt: true }
            })
        ]);

        const issuesCount = subscriptions.filter(s =>
            ['PAST_DUE', 'UNPAID', 'CANCELED'].includes(s.status)
        ).length;

        const activeTrials = subscriptions.filter(s => s.status === 'TRIALING').length;

        const now = new Date();
        const inactiveOrgs = stats.filter(s => {
            if (!s.lastActivityAt) return true;
            const diff = now.getTime() - new Date(s.lastActivityAt).getTime();
            return diff > 7 * 24 * 60 * 60 * 1000; // 7 days
        }).length;

        return {
            totalOrgs,
            issuesCount,
            activeTrials,
            inactiveOrgs,
            timestamp: new Date()
        };
    }

    /**
     * Get the full list of organizations with health and billing context
     */
    static async getOrganizationsList(): Promise<OrgCockpitSummary[]> {
        await this.ensureSuperadmin();
        console.log("[CockpitService] getOrganizationsList: fetching from DB");

        const orgs = await prisma.organization.findMany({
            include: {
                subscription: true,
                stats: true,
                _count: {
                    select: {
                        OrganizationMember: true,
                        projects: true,
                        QuoteItem: true // Proxied for quotes
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`[CockpitService] getOrganizationsList: found ${orgs.length} orgs`);
        const now = new Date();

        return orgs.map(org => {
            const reasons: string[] = [];
            let score = 100;

            // 1. Billing Analysis
            const sub = org.subscription;
            if (!sub) {
                reasons.push("Sin billing configurado");
                score -= 30;
            } else {
                if (['PAST_DUE', 'UNPAID'].includes(sub.status)) {
                    reasons.push(`Facturación: ${sub.status}`);
                    score -= 50;
                }
                if (sub.status === 'TRIALING' && sub.trialEndsAt) {
                    const daysLeft = Math.ceil((new Date(sub.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysLeft < 3) {
                        reasons.push(`Trial vence en ${daysLeft} días`);
                        score -= 20;
                    }
                }
            }

            // 2. Activity Analysis
            const lastActivity = org.stats?.lastActivityAt ? new Date(org.stats.lastActivityAt) : null;
            if (!lastActivity) {
                reasons.push("Sin actividad registrada");
                score -= 40;
            } else {
                const daysInactive = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
                if (daysInactive > 7) {
                    reasons.push(`Inactiva por ${daysInactive} días`);
                    score -= 30;
                }
            }

            // 3. Setup Analysis
            if (org._count.OrganizationMember === 0) {
                reasons.push("Sin administradores");
                score -= 50;
            }

            // Final Status Determination
            let status: HealthStatus = 'HEALTHY';
            if (score <= 40 || org.status === 'INACTIVE') status = 'CRITICAL';
            else if (score < 90) status = 'WARNING';
            if (!sub && org._count.projects === 0) status = 'INCOMPLETE';

            return {
                id: org.id,
                name: org.name,
                rut: org.rut,
                status: org.status || 'PENDING',
                plan: org.plan || 'FREE',
                createdAt: org.createdAt,
                health: {
                    status,
                    score: Math.max(0, score),
                    reasons: reasons.slice(0, 3),
                    lastActivityAt: lastActivity
                },
                billing: {
                    status: sub?.status || 'NONE',
                    provider: sub?.provider || null,
                    currentPeriodEnd: sub?.currentPeriodEnd || null,
                    trialEndsAt: sub?.trialEndsAt || null
                },
                metrics: {
                    usersCount: org._count.OrganizationMember,
                    projectsCount: org._count.projects,
                    quotesCount: org.stats?.quotesCount || 0
                }
            };
        });
    }

    /**
     * Get comprehensive detail for a single organization
     */
    static async getOrganizationDetail(orgId: string) {
        await this.ensureSuperadmin();

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                subscription: true,
                stats: true,
                OrganizationMember: {
                    include: {
                        profile: {
                            select: { name: true, email: true }
                        }
                    },
                    orderBy: { role: 'asc' }
                }
            }
        });

        if (!org) throw new Error("Organization not found");

        const auditLogs = await prisma.auditLog.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        return {
            ...org,
            auditLogs
        };
    }

    /**
     * Log a Superadmin action for audit purposes
     */
    static async auditAdminAction(userId: string, action: string, details: string, organizationId?: string) {
        return prisma.auditLog.create({
            data: {
                userId,
                organizationId,
                action,
                details: `[Superadmin Cockpit] ${details}`,
                createdAt: new Date()
            }
        });
    }
}

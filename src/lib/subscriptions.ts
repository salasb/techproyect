import { createClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_PLANS, PlanTier, PlanFeatures } from "@/config/subscription-plans";
import { resolveAccessContext } from "@/lib/auth/access-resolver";

export type OrgUsage = {
    users: number;
    projects: number;
    quotesMonth: number;
    invoicesMonth: number;
    storage: number;
};

export type OrgSubscription = {
    plan: PlanTier;
    status: string;
    usage: OrgUsage;
    limits: PlanFeatures;
};

/**
 * Retrieves the current subscription status and usage for an organization.
 */
export async function getOrganizationSubscription(orgId: string): Promise<OrgSubscription> {
    const prisma = (await import("@/lib/prisma")).default;

    // 1. Get Org Plan & Subscription Status
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { subscription: true }
    });

    const planId = org?.subscription?.planCode || org?.plan || 'FREE';
    const status = org?.subscription?.status || 'ACTIVE';

    const currentPlanFeatures = SUBSCRIPTION_PLANS[planId as PlanTier] || SUBSCRIPTION_PLANS['FREE'];

    // 2. Usage Counts (Monthly windows)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [userCount, projectCount, quoteCount, invoiceCount] = await Promise.all([
        prisma.organizationMember.count({ where: { organizationId: orgId } }),
        prisma.project.count({ where: { organizationId: orgId } }),
        prisma.quote.count({
            where: {
                project: { organizationId: orgId },
                createdAt: { gte: monthStart }
            }
        }),
        prisma.invoice.count({
            where: {
                organizationId: orgId,
                createdAt: { gte: monthStart }
            }
        })
    ]);

    return {
        plan: planId as PlanTier,
        status,
        usage: {
            users: userCount || 0,
            projects: projectCount || 0,
            quotesMonth: quoteCount || 0,
            invoicesMonth: invoiceCount || 0,
            storage: 0
        },
        limits: currentPlanFeatures
    };
}

/**
 * Checks if an organization can perform an action based on its plan limits.
 */
export async function checkSubscriptionLimit(
    orgId: string,
    resource: 'users' | 'projects' | 'quotes' | 'invoices'
): Promise<{ allowed: boolean; message?: string }> {
    // 1. GLOBAL IDENTITY BYPASS: Superadmins can always bypass limits for testing
    try {
        const context = await resolveAccessContext();
        if (context.isGlobalOperator) {
            console.log(`[SubscriptionLimit] Bypassing ${resource} limit for Global Operator`);
            return { allowed: true };
        }
    } catch (e) {
        console.warn(`[SubscriptionLimit] Could not resolve access context for bypass check:`, e);
    }

    const { usage, limits, plan, status } = await getOrganizationSubscription(orgId);

    // If PAUSED, nothing is allowed (write operations)
    if (status === 'PAUSED') {
        return { allowed: false, message: "Tu cuenta está en modo LECTURA por falta de pago." };
    }

    if (resource === 'users') {
        if (usage.users >= limits.maxUsers) {
            return {
                allowed: false,
                message: `Has alcanzado el límite de ${limits.maxUsers} usuarios en tu ${plan}.`
            };
        }
    }

    if (resource === 'projects') {
        if (usage.projects >= limits.maxProjects) {
            return {
                allowed: false,
                message: `Has alcanzado el límite de ${limits.maxProjects} proyectos en tu ${plan}.`
            };
        }
    }

    if (resource === 'quotes') {
        if (usage.quotesMonth >= limits.maxQuotesPerMonth) {
            return {
                allowed: false,
                message: `Límite mensual de cotizaciones alcanzado (${limits.maxQuotesPerMonth}).`
            };
        }
    }

    if (resource === 'invoices') {
        if (usage.invoicesMonth >= limits.maxInvoicesPerMonth) {
            return {
                allowed: false,
                message: `Límite mensual de facturas alcanzado (${limits.maxInvoicesPerMonth}).`
            };
        }
    }

    return { allowed: true };
}

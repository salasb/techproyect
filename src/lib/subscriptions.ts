import { createClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_PLANS, PlanTier } from "@/config/subscription-plans";

export type OrgSubscription = {
    plan: PlanTier;
    usage: {
        users: number;
        projects: number;
        storage: number;
    };
    limits: typeof SUBSCRIPTION_PLANS['FREE'];
};

/**
 * Retrieves the current subscription status and usage for an organization.
 */
export async function getOrganizationSubscription(orgId: string): Promise<OrgSubscription> {
    const supabase = await createClient();

    // 1. Get Org Plan
    const { data: org } = await supabase
        .from('Organization')
        .select('settings, plan') // Assuming 'plan' might be in settings or root based on previous exploration
        .eq('id', orgId)
        .single();

    // Fallback to FREE if no plan defined
    // We check both 'plan' column (if added) or settings.plan
    const plan: PlanTier = (org?.plan as PlanTier) || (org?.settings as any)?.plan || 'FREE';

    // 2. Get Usage Counts
    // We utilize the 'count' option for efficiency
    const { count: userCount } = await supabase
        .from('OrganizationMember')
        .select('*', { count: 'exact', head: true })
        .eq('organizationId', orgId);

    const { count: projectCount } = await supabase
        .from('Project')
        .select('*', { count: 'exact', head: true })
        .eq('organizationId', orgId);

    // Storage is harder to calc, hardcode 0 or implement later
    const storageUsed = 0;

    return {
        plan,
        usage: {
            users: userCount || 0,
            projects: projectCount || 0,
            storage: storageUsed
        },
        limits: SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS['FREE']
    };
}

/**
 * Checks if an organization can perform an action based on its plan limits.
 */
export async function checkSubscriptionLimit(orgId: string, resource: 'users' | 'projects'): Promise<{ allowed: boolean; message?: string }> {
    const { usage, limits, plan } = await getOrganizationSubscription(orgId);

    if (resource === 'users') {
        if (usage.users >= limits.maxUsers) {
            return {
                allowed: false,
                message: `Has alcanzado el límite de ${limits.maxUsers} usuarios en tu ${plan}. Actualiza a PRO para más.`
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

    return { allowed: true };
}

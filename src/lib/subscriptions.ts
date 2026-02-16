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
        .select('settings, plan')
        .eq('id', orgId)
        .single();

    // Determine current plan tier ID
    const planId = (org?.plan as string) || (org?.settings as any)?.plan || 'FREE';

    // 2. Fetch Plan Details from DB (Dynamic!)
    const { data: planData } = await supabase
        .from('Plan')
        .select('*')
        .eq('id', planId)
        .single();

    // Fallback to hardcoded FREE if DB fails or plan missing
    // We construct the "limits" object which currently holds both limits and features in the codebase types
    let currentPlanFeatures = SUBSCRIPTION_PLANS['FREE'];

    if (planData) {
        // Merge DB limits and features to match the legacy PlanFeatures interface
        // This allows us to switch backend without breaking frontend immediately
        const dbLimits = planData.limits as any;
        const dbFeatures = planData.features as any;

        currentPlanFeatures = {
            ...dbLimits,
            ...dbFeatures
        };
    } else {
        // Optionally fetch 'FREE' from DB if user has a plan that was deleted? 
        // For now, hardcoded fallback is safe for system stability.
    }

    // 3. Get Usage Counts
    const { count: userCount } = await supabase
        .from('OrganizationMember')
        .select('*', { count: 'exact', head: true })
        .eq('organizationId', orgId);

    const { count: projectCount } = await supabase
        .from('Project')
        .select('*', { count: 'exact', head: true })
        .eq('organizationId', orgId);

    return {
        plan: planId as PlanTier,
        usage: {
            users: userCount || 0,
            projects: projectCount || 0,
            storage: 0
        },
        limits: currentPlanFeatures
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

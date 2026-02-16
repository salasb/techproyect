
export type PlanTier = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface PlanFeatures {
    maxUsers: number;
    maxProjects: number;
    maxStorageGB: number;
    supportLevel: 'BASIC' | 'PRIORITY' | 'DEDICATED';
    canAccessAPI: boolean;
    canRemoveBranding: boolean;
    customDomain: boolean;
}

export const SUBSCRIPTION_PLANS: Record<PlanTier, PlanFeatures> = {
    FREE: {
        maxUsers: 1, // Only the owner
        maxProjects: 2,
        maxStorageGB: 1,
        supportLevel: 'BASIC',
        canAccessAPI: false,
        canRemoveBranding: false,
        customDomain: false
    },
    PRO: {
        maxUsers: 5,
        maxProjects: 1000, // Effectively unlimited
        maxStorageGB: 50,
        supportLevel: 'PRIORITY',
        canAccessAPI: true,
        canRemoveBranding: true,
        customDomain: false
    },
    ENTERPRISE: {
        maxUsers: 10000, // Unlimited
        maxProjects: 10000,
        maxStorageGB: 1000,
        supportLevel: 'DEDICATED',
        canAccessAPI: true,
        canRemoveBranding: true,
        customDomain: true
    }
};

export const PLAN_LABELS: Record<PlanTier, string> = {
    FREE: 'Plan Gratuito',
    PRO: 'Plan Pro',
    ENTERPRISE: 'Plan Enterprise'
};

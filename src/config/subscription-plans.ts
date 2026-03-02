
export type PlanTier = 'FREE' | 'PRO' | 'ENTERPRISE' | 'PRO_TRIAL';

export interface PlanFeatures {
    maxUsers: number;
    maxProjects: number;
    maxQuotesPerMonth: number;
    maxInvoicesPerMonth: number;
    maxStorageGB: number;
    supportLevel: 'BASIC' | 'PRIORITY' | 'DEDICATED';
    canAccessAPI: boolean;
    canRemoveBranding: boolean;
    customDomain: boolean;
}

export const SUBSCRIPTION_PLANS: Record<PlanTier, PlanFeatures> = {
    FREE: {
        maxUsers: 1, 
        maxProjects: 2,
        maxQuotesPerMonth: 3,
        maxInvoicesPerMonth: 2,
        maxStorageGB: 1,
        supportLevel: 'BASIC',
        canAccessAPI: false,
        canRemoveBranding: false,
        customDomain: false
    },
    PRO_TRIAL: {
        maxUsers: 5,
        maxProjects: 50,
        maxQuotesPerMonth: 50,
        maxInvoicesPerMonth: 50,
        maxStorageGB: 10,
        supportLevel: 'PRIORITY',
        canAccessAPI: true,
        canRemoveBranding: true,
        customDomain: false
    },
    PRO: {
        maxUsers: 10,
        maxProjects: 1000,
        maxQuotesPerMonth: 200,
        maxInvoicesPerMonth: 200,
        maxStorageGB: 50,
        supportLevel: 'PRIORITY',
        canAccessAPI: true,
        canRemoveBranding: true,
        customDomain: false
    },
    ENTERPRISE: {
        maxUsers: 10000,
        maxProjects: 10000,
        maxQuotesPerMonth: 10000,
        maxInvoicesPerMonth: 10000,
        maxStorageGB: 1000,
        supportLevel: 'DEDICATED',
        canAccessAPI: true,
        canRemoveBranding: true,
        customDomain: true
    }
};

export const PLAN_LABELS: Record<PlanTier, string> = {
    FREE: 'Plan Gratuito',
    PRO_TRIAL: 'Trial Pro (14 días)',
    PRO: 'Plan Pro',
    ENTERPRISE: 'Plan Enterprise'
};

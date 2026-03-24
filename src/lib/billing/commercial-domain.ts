import { WorkspaceState } from "../auth/workspace-resolver";

/**
 * COMMERCIAL DOMAIN CONTRACT (v2.0)
 * Single Source of Truth for:
 * 1. Entitlements (What can the user DO?)
 * 2. Display Logic (What should the user SEE?)
 * 3. Plan Restrictions (Why is the user BLOCKED?)
 */

export interface CommercialContext {
    // Identity
    isGlobalOperator: boolean;
    
    // Plan Info
    plan: string;
    subscriptionStatus: string;
    isTrial: boolean;
    
    // Display Flags
    showTrialBadge: boolean;
    showTrialBanner: boolean;
    showUpgradeCTA: boolean;
    suppressCommercialPrompts: boolean;
    
    // Labels
    operatorLabel: string | null;
    commercialStatusLabel: string;
    
    // Module Access
    visibleModules: string[];
    canExportProjects: boolean;
    
    // Feature Access
    canUseInventory: boolean;
    canUseCatalog: boolean;
    canUseLocations: boolean;
    canUseQR: boolean;
}

export interface CommercialInput {
    userRole?: string;
    isSuperadmin?: boolean;
    subscriptionStatus?: string;
    plan?: string;
}

export function resolveCommercialContext(input: CommercialInput | WorkspaceState): CommercialContext {
    // Normalize input from both sources (WorkspaceState or plain object)
    const isGlobalOperator = Boolean(
        (input as any).isSuperadmin || 
        input.userRole === 'SUPERADMIN' || 
        input.userRole === 'CREATOR' ||
        (input as any).isGlobalOperator
    );
    
    const subscriptionStatus = (input as any).subscriptionStatus || 'TRIALING';
    const isTrial = subscriptionStatus === 'TRIALING';
    const plan = (input as any).orgPlan || (input as any).plan || 'FREE';
    const hasProFeatures = plan === 'PRO' || plan === 'ENTERPRISE';

    const visibleModules = buildVisibleModules(isGlobalOperator, hasProFeatures);

    const base: Partial<CommercialContext> = {
        plan,
        subscriptionStatus,
        isTrial,
        visibleModules,
        canExportProjects: true,
        canUseInventory: isGlobalOperator || hasProFeatures,
        canUseCatalog: isGlobalOperator || hasProFeatures,
        canUseLocations: isGlobalOperator || hasProFeatures,
        canUseQR: isGlobalOperator || hasProFeatures,
    };

    if (isGlobalOperator) {
        return {
            ...base as CommercialContext,
            isGlobalOperator: true,
            showTrialBadge: false,
            showTrialBanner: false,
            showUpgradeCTA: false,
            suppressCommercialPrompts: true,
            operatorLabel: "Modo Operador Global",
            commercialStatusLabel: `Observando (${subscriptionStatus})`,
        };
    }

    return {
        ...base as CommercialContext,
        isGlobalOperator: false,
        showTrialBadge: isTrial,
        showTrialBanner: isTrial,
        showUpgradeCTA: isTrial || subscriptionStatus === 'PAUSED' || subscriptionStatus === 'PAST_DUE',
        suppressCommercialPrompts: false,
        operatorLabel: null,
        commercialStatusLabel: isTrial ? "Período de Prueba" : "Suscripción Activa",
    };
}

function buildVisibleModules(isGlobalSuperadmin: boolean, hasProFeatures: boolean): string[] {
    const core = [
        'dashboard',
        'opportunities',
        'quotes',
        'clients',
        'projects',
        'calendar',
        'invoices',
        'reports',
        'settings',
        'support',
        'integrations',
        'roles',
        'team'
    ];

    if (isGlobalSuperadmin || hasProFeatures) {
        core.push('inventory', 'catalog', 'locations', 'qr');
    }

    return core;
}

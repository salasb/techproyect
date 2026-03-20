export interface CommercialDisplayContext {
    isGlobalOperator: boolean;
    isObservedOrgTrial: boolean;
    showTrialBadge: boolean;
    showTrialBanner: boolean;
    showUpgradeCTA: boolean;
    showTrialLabelInOrgSwitcher: boolean;
    suppressCommercialPrompts: boolean;
    operatorLabel: string | null;
    commercialStatusLabel: string;
    visibleModules: string[];
}

export interface CommercialDisplayInput {
    userRole?: string;
    isSuperadmin?: boolean;
    subscriptionStatus?: string;
    plan?: string;
}

/**
 * RESOLVER CANÓNICO DE PRESENTACIÓN COMERCIAL (v1.0)
 * Centraliza la lógica de qué elementos comerciales mostrar basándose en la identidad del usuario
 * y el estado de la organización observada.
 */
export function resolveCommercialDisplay(input: CommercialDisplayInput): CommercialDisplayContext {
    const isGlobalOperator = Boolean(input.isSuperadmin || input.userRole === 'SUPERADMIN' || input.userRole === 'CREATOR');
    const status = input.subscriptionStatus || 'TRIALING';
    const isTrial = status === 'TRIALING';
    const plan = input.plan || 'FREE';
    const hasProFeatures = plan === 'PRO' || plan === 'ENTERPRISE';

    const visibleModules = buildVisibleModules(isGlobalOperator, hasProFeatures);

    // RULE: Global Operator ALWAYS suppresses commercial prompts regardless of org status
    if (isGlobalOperator) {
        return {
            isGlobalOperator: true,
            isObservedOrgTrial: isTrial,
            showTrialBadge: false,
            showTrialBanner: false,
            showUpgradeCTA: false,
            showTrialLabelInOrgSwitcher: false,
            suppressCommercialPrompts: true,
            operatorLabel: "Modo Operador Global",
            commercialStatusLabel: `Observando (${status})`,
            visibleModules
        };
    }

    return {
        isGlobalOperator: false,
        isObservedOrgTrial: isTrial,
        showTrialBadge: isTrial,
        showTrialBanner: isTrial,
        showUpgradeCTA: isTrial || status === 'PAUSED' || status === 'PAST_DUE',
        showTrialLabelInOrgSwitcher: isTrial,
        suppressCommercialPrompts: false,
        operatorLabel: null,
        commercialStatusLabel: isTrial ? "Período de Prueba" : "Suscripción Activa",
        visibleModules
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

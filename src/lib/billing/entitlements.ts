import { WorkspaceState } from "../auth/workspace-resolver";

export interface Entitlements {
    canBypassCommercialRestrictions: boolean;
    showTrialBanner: boolean;
    showUpgradeCTA: boolean;
    canUseInventory: boolean;
    canUseCatalog: boolean;
    canUseLocations: boolean;
    canUseQR: boolean;
    canExportProjects: boolean;
    visibleModules: string[];
}

export function resolveEntitlements(workspace: WorkspaceState): Entitlements {
    const isGlobalSuperadmin = workspace.isSuperadmin;
    
    // Si workspace es undefined o nulo, proveer default defensivo.
    if (!workspace) {
         return buildDefaultEntitlements(false);
    }

    const plan = (workspace as any).orgPlan || 'FREE';
    const status = workspace.subscriptionStatus || 'TRIALING';

    const hasProFeatures = plan === 'PRO' || plan === 'ENTERPRISE';

    return {
        canBypassCommercialRestrictions: isGlobalSuperadmin,
        showTrialBanner: !isGlobalSuperadmin && status === 'TRIALING',
        showUpgradeCTA: !isGlobalSuperadmin && !hasProFeatures,
        canUseInventory: isGlobalSuperadmin || hasProFeatures,
        canUseCatalog: isGlobalSuperadmin || hasProFeatures,
        canUseLocations: isGlobalSuperadmin || hasProFeatures,
        canUseQR: isGlobalSuperadmin || hasProFeatures,
        canExportProjects: true, 
        visibleModules: buildVisibleModules(isGlobalSuperadmin, hasProFeatures)
    };
}

function buildDefaultEntitlements(isSuperadmin: boolean): Entitlements {
    return {
        canBypassCommercialRestrictions: isSuperadmin,
        showTrialBanner: !isSuperadmin,
        showUpgradeCTA: !isSuperadmin,
        canUseInventory: isSuperadmin,
        canUseCatalog: isSuperadmin,
        canUseLocations: isSuperadmin,
        canUseQR: isSuperadmin,
        canExportProjects: true,
        visibleModules: buildVisibleModules(isSuperadmin, false)
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
        'settings'
    ];

    if (isGlobalSuperadmin || hasProFeatures) {
        core.push('inventory', 'catalog', 'locations', 'qr');
    }

    return core;
}
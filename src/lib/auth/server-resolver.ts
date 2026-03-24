import { resolveAccessContext } from "./access-resolver";
import { getRolePermissions, Permission } from "./rbac";
import { resolveSuperadminAccess } from './superadmin-guard';

/**
 * Operational Scope (v2.0)
 * Canonical result of a multi-org authorization check.
 */
export interface OperationalScope {
    orgId: string;
    userId: string;
    isSuperadmin: boolean;
    role: string | null;
    permissions: string[];
    isPaused?: boolean;
}

export class ScopeError extends Error {
    constructor(message: string, public code: 'UNAUTHORIZED' | 'NO_ORG_CONTEXT' | 'INVALID_ORG_CONTEXT' | 'FORBIDDEN') {
        super(message);
        this.name = 'ScopeError';
    }
}

/**
 * Canonical Scope Resolver (v2.0)
 * Implements GLOBAL IDENTITY FIRST.
 * Returns a valid OperationalScope or throws a ScopeError.
 */
export async function requireOperationalScope(): Promise<OperationalScope> {
    const context = await resolveAccessContext();

    // 1. Check Authentication
    if (!context.userId) {
        throw new ScopeError('User not authenticated', 'UNAUTHORIZED');
    }

    // 2. Handle Global Operator (Rule 1)
    if (context.isGlobalOperator) {
        return {
            orgId: context.activeOrgId || 'GLOBAL_CONTEXT',
            userId: context.userId,
            isSuperadmin: true,
            role: 'SUPERADMIN',
            permissions: getRolePermissions('SUPERADMIN' as any),
            isPaused: false
        };
    }

    // 3. Handle Regular User Org Context
    if (!context.activeOrgId) {
        console.warn(`[AuthZ][${context.traceId}] Denial: No active organization context for user ${context.userId}.`);
        throw new ScopeError('Se requiere seleccionar una organización activa para operar.', 'NO_ORG_CONTEXT');
    }

    return {
        orgId: context.activeOrgId,
        userId: context.userId,
        isSuperadmin: false,
        role: context.localMembershipRole,
        permissions: getRolePermissions((context.localMembershipRole as any) || 'MEMBER'),
        isPaused: context.subscriptionStatus === 'PAUSED'
    };
}

/**
 * Enhanced RBAC Guard (v2.0)
 * Verifies both OperationalScope AND specific granular permission.
 * Strictly respects GLOBAL BYPASS.
 */
export async function requirePermission(permission: Permission): Promise<OperationalScope> {
    const context = await resolveAccessContext();

    if (context.isGlobalOperator) {
        return {
            orgId: context.activeOrgId || 'GLOBAL_CONTEXT',
            userId: context.userId,
            isSuperadmin: true,
            role: 'SUPERADMIN',
            permissions: getRolePermissions('SUPERADMIN' as any),
            isPaused: false
        };
    }

    const scope = await requireOperationalScope();

    if (!scope.permissions.includes(permission)) {
        console.error(`[RBAC] Access denied for user ${scope.userId} requesting ${permission}`);
        throw new ScopeError(`No tienes permiso (${permission}) para realizar esta acción.`, 'FORBIDDEN');
    }

    return scope;
}

/**
 * Subscription Plan Guard (v1.0)
 * Verifies if the active organization has the required plan level.
 * Strictly respects GLOBAL BYPASS only in GLOBAL mode.
 */
export async function requirePlan(requiredPlan: 'PRO' | 'ENTERPRISE'): Promise<OperationalScope> {
    const context = await resolveAccessContext();
    const scope = await requireOperationalScope();

    // OLA 2A-TER: Bypass only if explicitly in GLOBAL mode (Portal Global).
    // If in TENANT mode, even Superadmins are subject to plan checks for QA/UX consistency.
    if (context.effectiveMode === 'GLOBAL') {
        return scope;
    }

    const currentPlan = context.orgPlan || 'FREE';
    
    if (requiredPlan === 'PRO') {
        if (currentPlan !== 'PRO' && currentPlan !== 'ENTERPRISE') {
            throw new ScopeError('Esta funcionalidad requiere un Plan PRO.', 'FORBIDDEN');
        }
    } else if (requiredPlan === 'ENTERPRISE') {
        if (currentPlan !== 'ENTERPRISE') {
            throw new ScopeError('Esta funcionalidad es exclusiva de Plan ENTERPRISE.', 'FORBIDDEN');
        }
    }

    return scope;
}

export async function resolveActiveOrganization(): Promise<string> {
    const scope = await requireOperationalScope();
    return scope.orgId;
}

export { resolveSuperadminAccess };

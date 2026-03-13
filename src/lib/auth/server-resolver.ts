import { getWorkspaceState } from "./workspace-resolver";
import { redirect } from "next/navigation";
import { Permission, getRolePermissions } from "./rbac";
import { resolveAccessContext } from "./access-resolver";

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
        // If superadmin but no active org, they can still have a "Virtual Scope"
        // for global admin pages, but commercial actions will eventually need an orgId.
        return {
            orgId: context.activeOrgId || 'GLOBAL_CONTEXT',
            userId: context.userId,
            isSuperadmin: true,
            role: 'SUPERADMIN',
            permissions: getRolePermissions('SUPERADMIN' as any),
            isPaused: false // Global operators are never paused
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

    // RULE 1: Global operators bypass granular permission checks for operational actions
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
 * Legacy Support
 */
export async function resolveActiveOrganization(): Promise<string> {
    const scope = await requireOperationalScope();
    return scope.orgId;
}

import { resolveSuperadminAccess } from './superadmin-guard';
export { resolveSuperadminAccess };

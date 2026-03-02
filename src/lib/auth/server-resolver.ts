import { getWorkspaceState } from "./workspace-resolver";
import { redirect } from "next/navigation";
import { Permission, hasPermission } from "./rbac";

/**
 * Resolves the active organization for Server Components and Server Actions.
 * If no active organization is found, it may redirect or return null.
 * @deprecated Use requireOperationalScope instead for stricter multi-org isolation.
 */
export async function resolveActiveOrganization(): Promise<string> {
    const state = await getWorkspaceState();

    if (state.activeOrgId) {
        return state.activeOrgId;
    }

    if (state.error === 'Not authenticated') {
        redirect('/login');
    }

    // Fallback: This should ideally not be reached due to Auto-provisioning,
    // but if it is, we redirect to dashboard to trigger the Setup UI.
    redirect('/dashboard');
}

export interface OperationalScope {
    orgId: string;
    userId: string;
    isSuperadmin: boolean;
    role: string | null;
    isPaused?: boolean;
}

export class ScopeError extends Error {
    constructor(message: string, public code: 'UNAUTHORIZED' | 'NO_ORG_CONTEXT' | 'INVALID_ORG_CONTEXT' | 'FORBIDDEN') {
        super(message);
        this.name = 'ScopeError';
    }
}

/**
 * Canonical Scope Resolver (v1.5)
 * Call this at the very beginning of any API route, Server Action, or Page that requires Multi-Org context.
 * It strictly returns a valid OperationalScope or throws a ScopeError.
 *
 * Usage in API:
 * try { const scope = await requireOperationalScope(); } catch (e) { return new Response(e.message, { status: 403 }) }
 */
export async function requireOperationalScope(): Promise<OperationalScope> {
    const state = await getWorkspaceState();

    if (state.status === 'NOT_AUTHENTICATED') {
        console.warn(`[AuthZ] Denial: User not authenticated.`);
        throw new ScopeError('User not authenticated', 'UNAUTHORIZED');
    }

    // If superadmin but no active org is set, they MUST select one to operate commercially.
    if (!state.activeOrgId) {
        console.warn(`[AuthZ] Denial: No active organization context for user ${state.userId}.`);
        throw new ScopeError('Se requiere seleccionar una organización activa para operar.', 'NO_ORG_CONTEXT');
    }

    return {
        orgId: state.activeOrgId,
        userId: state.userId as string,
        isSuperadmin: state.isSuperadmin,
        role: state.userRole || null,
        isPaused: state.subscriptionStatus === 'PAUSED'
    };
}

/**
 * Enhanced RBAC Guard (v1.0)
 * Verifies both OperationalScope AND specific granular permission.
 */
export async function requirePermission(permission: Permission): Promise<OperationalScope> {
    const scope = await requireOperationalScope();

    if (!hasPermission(scope.role, permission)) {
        console.error(`[RBAC] Access denied for user ${scope.userId} (Role: ${scope.role}) requesting ${permission}`);
        throw new ScopeError(`No tienes permiso (${permission}) para realizar esta acción.`, 'FORBIDDEN');
    }

    return scope;
}

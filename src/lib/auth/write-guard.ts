import { resolveAccessContext, AccessContext } from "./access-resolver";

/**
 * Compatibility export for getWriteAccessContext.
 * Returns the full context with explicit allowed/message for legacy consumption.
 * v2.0: Strictly honors GLOBAL bypass.
 */
export async function getWriteAccessContext() {
    const context = await resolveAccessContext();
    const isGlobal = context.isGlobalOperator;
    
    // Rule: Global bypass always allowed
    const allowed = isGlobal || context.effectiveMode === 'TENANT_RW';
    
    return {
        ...context,
        allowed,
        message: allowed ? 'Acceso concedido' : 'Modo de solo lectura'
    };
}

/**
 * Throws a typed error if the context is read-only.
 * Uses the canonical resolveAccessContext for precedence.
 * v2.0: Mandatory for all CUD operations.
 */
export async function ensureWriteAccess(): Promise<AccessContext> {
    const context = await resolveAccessContext();
    
    // Rule: Global operators bypass ALL tenant-level restrictions
    if (context.isGlobalOperator) {
        console.log(`[WriteGuard][${context.traceId}] GLOBAL BYPASS GRANTED for user ${context.email}`);
        return context;
    }

    // Determine if allowed for regular users
    const isAllowed = context.effectiveMode === 'TENANT_RW';

    if (!isAllowed) {
        console.warn(`[WriteGuard][${context.traceId}] DENIED: mode=${context.effectiveMode}, reason=${context.readOnlyReason}`);
        
        // If not explicitly allowed (e.g. TRIAL_EXPIRED), we throw for the UI interceptor
        if (context.effectiveMode === 'TENANT_RO') {
            throw new Error(`READ_ONLY_MODE:${context.readOnlyReason}`);
        }
        
        // Handle context errors (No org, No membership)
        throw new Error(`ACCESS_DENIED:${context.readOnlyReason}`);
    }

    return context;
}

/**
 * Non-throwing version for UI components or soft checks.
 * v2.0: Correct precedence.
 */
export async function getWriteAccessState() {
    try {
        const context = await resolveAccessContext();
        return {
            allowed: context.isGlobalOperator || context.effectiveMode === 'TENANT_RW',
            reason: context.readOnlyReason,
            isGlobal: context.isGlobalOperator,
            mode: context.effectiveMode
        };
    } catch (e) {
        return { allowed: false, reason: 'UNAUTHORIZED', isGlobal: false, mode: 'NO_CONTEXT' };
    }
}

import { resolveAccessContext, AccessContext } from "./access-resolver";

export type WriteAccessResult =
  | { ok: true; mode: 'GLOBAL' | 'TENANT_RW'; context: AccessContext }
  | { ok: false; code: 'TRIAL_EXPIRED' | 'SUBSCRIPTION_PAUSED' | 'SUBSCRIPTION_CANCELED' | 'SUBSCRIPTION_PAST_DUE' | 'NO_ACTIVE_ORG' | 'NO_MEMBERSHIP' | 'TENANT_LOCKED'; message: string; context: AccessContext };

/**
 * Canonical function for Write Permission (v3.0)
 * Evaluates GLOBAL IDENTITY FIRST.
 */
export async function getWriteAccessContext(): Promise<WriteAccessResult> {
    const context = await resolveAccessContext();
    
    console.log(`[WriteGuard][${context.traceId}] Resolving write access for ${context.email} (Global: ${context.isGlobalOperator}, Mode: ${context.effectiveMode})`);

    // Rule 1: Global operators always bypass local write restrictions
    if (context.isGlobalOperator) {
        return { ok: true, mode: 'GLOBAL', context };
    }

    // Rule 2: Tenant check
    if (context.effectiveMode === 'TENANT_RW') {
        return { ok: true, mode: 'TENANT_RW', context };
    }

    // Rule 3: Denied due to specific reason
    const code = context.readOnlyReason === 'NONE' ? 'TENANT_LOCKED' : context.readOnlyReason;
    
    let message = "Modo de solo lectura activado.";
    if (code === 'TRIAL_EXPIRED') message = "Tu periodo de prueba ha expirado. Activa un plan para continuar.";
    if (code === 'SUBSCRIPTION_PAUSED') message = "Suscripción pausada por falta de pago.";
    if (code === 'NO_ACTIVE_ORG') message = "Selecciona una organización activa para operar.";
    
    return { ok: false, code: code as any, message, context };
}

/**
 * Throws a typed error if the context is read-only.
 * Uses the canonical getWriteAccessContext for precedence.
 */
export async function ensureWriteAccess(): Promise<AccessContext> {
    const result = await getWriteAccessContext();
    
    if (!result.ok) {
        console.warn(`[WriteGuard][${result.context.traceId}] DENIED: ${result.code} - ${result.message}`);
        throw new Error(`READ_ONLY_MODE:${result.code}`);
    }

    return result.context;
}

/**
 * Legacy support for components expecting an 'allowed' boolean
 */
export async function getWriteAccessState() {
    try {
        const result = await getWriteAccessContext();
        return {
            allowed: result.ok,
            reason: result.ok ? 'NONE' : result.code,
            isGlobal: result.context.isGlobalOperator,
            mode: result.context.effectiveMode
        };
    } catch (e) {
        return { allowed: false, reason: 'UNAUTHORIZED', isGlobal: false, mode: 'NO_CONTEXT' };
    }
}

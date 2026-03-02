import { requireOperationalScope } from "./server-resolver";

/**
 * Ensures that the organization is not PAUSED for write operations.
 * If paused, only SUPERADMIN can bypass.
 */
export async function requireWriteAccess() {
    const scope = await requireOperationalScope();
    
    if (scope.isPaused && !scope.isSuperadmin) {
        throw new Error("Su cuenta está en modo LECTURA por falta de pago. Por favor actualice su suscripción.");
    }
    
    return scope;
}

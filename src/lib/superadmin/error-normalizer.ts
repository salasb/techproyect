/**
 * Centralized error normalizer for Superadmin operations.
 * Prevents technical objects (like [object Object]) from leaking to the UI.
 */
export function normalizeOperationalError(err: unknown): { message: string; code: string; logPayload: unknown } {
    let message = "Ha ocurrido un error inesperado en el motor operacional.";
    let code = "UNKNOWN_ERROR";
    let logPayload: unknown = { raw: err };

    if (!err) return { message, code, logPayload };

    // 1. Handle Error instance
    if (err instanceof Error) {
        message = err.message;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code = (err as any).code || "SERVICE_ERROR";
        logPayload = { name: err.name, message: err.message, stack: err.stack };
    } 
    // 2. Handle Supabase/Postgrest errors
    else if (typeof err === 'object' && err !== null && 'message' in err && 'code' in err) {
        const e = err as { message: string; code: string; details?: string; hint?: string };
        message = e.message;
        code = e.code;
        logPayload = e;
    }
    // 3. Handle simple strings
    else if (typeof err === 'string') {
        message = err;
        code = "RAW_ERROR_STRING";
    }
    // 4. Handle arbitrary objects (prevent [object Object])
    else if (typeof err === 'object') {
        try {
            message = JSON.stringify(err);
            code = "OBJECT_ERROR";
        } catch {
            message = "Error complejo no serializable";
        }
    }

    // Safety: ensure message is always a string and not empty
    if (typeof message !== 'string' || message.trim() === '') {
        message = "Error sin descripción técnica disponible.";
    }

    // Map common codes to user-friendly messages if needed
    if (code === 'P2002') message = "Conflicto de duplicidad en la base de datos.";
    if (code === 'P2025') message = "El registro solicitado no existe o fue eliminado.";

    return { message, code, logPayload };
}

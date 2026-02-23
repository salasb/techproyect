/**
 * Centralized error normalizer for Superadmin operations (v4.2.3 Reality Patch).
 * Eradicates [object Object] leaks by strictly enforcing string outputs for UI.
 */
export function normalizeOperationalError(err: unknown): { message: string; code: string; logPayload: unknown } {
    let message = "Error inesperado en el motor operacional.";
    let code = "UNKNOWN_ERROR";
    let logPayload: unknown = { raw: err };

    if (err === null || err === undefined) {
        return { message: "Error nulo detectado.", code: "NULL_ERROR", logPayload };
    }

    // 1. Handle Error instance
    if (err instanceof Error) {
        message = String(err.message);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code = (err as any).code || "SERVICE_ERROR";
        logPayload = { name: err.name, message: err.message, stack: err.stack };
    } 
    // 2. Handle Supabase/Postgrest errors or objects with message/code
    else if (typeof err === 'object') {
        const e = err as Record<string, unknown>;
        
        // Extract code
        if (typeof e.code === 'string') code = e.code;
        else if (typeof e.code === 'number') code = String(e.code);

        // Extract message
        if (typeof e.message === 'string') {
            message = e.message;
        } else if (e.message && typeof e.message === 'object') {
            try {
                message = JSON.stringify(e.message);
            } catch {
                message = "Error con payload complejo";
            }
        } else if (e.error_description && typeof e.error_description === 'string') {
            message = e.error_description;
        } else {
            // Last resort for objects: stringify them to avoid [object Object]
            try {
                const str = JSON.stringify(e);
                message = str.length > 100 ? str.substring(0, 97) + "..." : str;
            } catch {
                message = "Error de objeto no serializable";
            }
        }
        logPayload = e;
    }
    // 3. Handle simple strings
    else if (typeof err === 'string') {
        message = err;
        code = "RAW_STRING_ERROR";
    }
    // 4. Handle anything else
    else {
        message = String(err);
        code = "GENERIC_VALUE_ERROR";
    }

    // Safety: Final check to ensure message is a string and not the string "[object Object]"
    if (typeof message !== 'string' || String(message) === "[object Object]" || String(message).trim() === '') {
        message = `Error técnico no serializable (${code}). Consulte logs de auditoría para TraceId.`;
    }

    // Map common codes to user-friendly messages
    if (code === 'P2002') message = "Conflicto de duplicidad en base de datos.";
    if (code === 'P2025') message = "Registro no encontrado.";
    if (code === '42P01') message = "Relación de base de datos no configurada.";
    if (code === 'PGRST116') message = "Fallo de restricción en consulta (Single result expected).";

    return { 
        message: String(message), 
        code: String(code), 
        logPayload 
    };
}

import { SloService } from "@/services/slo-service";

/**
 * Lightweight telemetry wrapper to record SLO events.
 */
export async function trackSlo(sloId: 'AUTH_LOGIN' | 'BILLING_PAYMENT' | 'API_CRITICAL', success: boolean, organizationId?: string, userId?: string, metadata?: any) {
    try {
        // We use the service to record the event
        // Note: In a production environment, this might be asynchronous or offloaded to a queue
        await SloService.recordEvent(sloId, success, organizationId, userId, metadata);
    } catch (error) {
        console.warn(`[Telemetry] Failed to track SLO ${sloId}:`, error);
    }
}

/**
 * Tracks critical system errors for observability.
 */
export async function trackError(context: string, error: any, metadata?: any) {
    const traceId = `ERR-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const message = error instanceof Error ? error.message : String(error);
    
    console.error(`[CRITICAL_ERROR][${traceId}] ${context}: ${message}`, {
        metadata,
        stack: error instanceof Error ? error.stack : undefined
    });

    // We could also record this as a failed SLO event if applicable
    if (context.includes('WEBHOOK')) {
        await trackSlo('BILLING_PAYMENT', false, undefined, undefined, { traceId, context, error: message });
    }

    return traceId;
}

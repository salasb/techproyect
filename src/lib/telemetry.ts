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

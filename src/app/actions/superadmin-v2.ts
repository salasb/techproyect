"use server";

import { AlertsService } from "@/lib/superadmin/alerts-service";
import { MetricsService } from "@/lib/superadmin/metrics-service";
import { revalidatePath } from "next/cache";
import { normalizeOperationalError } from "@/lib/superadmin/error-normalizer";
import { OperationalActionCode } from "@/lib/superadmin/cockpit-data-adapter";

export interface OperationalActionResult<T = unknown> {
    ok: boolean;
    code: OperationalActionCode;
    message: string;
    data?: T;
    meta?: {
        traceId?: string;
        durationMs?: number;
    };
}

/**
 * Manually trigger alerts evaluation
 * v4.2: Phase 2.2 Hardened Server Action
 */
export async function triggerAlertsEvaluation(): Promise<OperationalActionResult> {
    const startTime = Date.now();
    const traceId = `RECALC-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();

        if (!access.ok) {
            console.error(`[${traceId}] UNAUTHORIZED attempt by ${access.email}`);
            return { 
                ok: false, 
                code: "UNAUTHORIZED",
                message: "Acceso denegado: Se requieren permisos globales de Superadmin.",
                meta: { traceId, durationMs: Date.now() - startTime }
            };
        }

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            return { 
                ok: false, 
                code: "DEGRADED_CONFIG",
                message: "Acción no disponible en Modo Seguro. Configure SERVICE_ROLE_KEY para operar.",
                meta: { traceId, durationMs: Date.now() - startTime }
            };
        }

        console.log(`[${traceId}] Executing health evaluation for ${access.email}`);
        const results = await AlertsService.runAlertsEvaluation();
        
        revalidatePath("/admin");
        
        return { 
            ok: true, 
            code: "OK", 
            message: `Engine sincronizado: ${results.created} alertas generadas, ${results.resolved} resueltas.`,
            data: results,
            meta: { traceId, durationMs: Date.now() - startTime }
        };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        console.error(`[${traceId}] SERVICE_ERROR:`, normalized.code);
        return { 
            ok: false, 
            code: "DEGRADED_SERVICE", 
            message: `Fallo en el motor operacional: ${normalized.message}`,
            meta: { traceId, durationMs: Date.now() - startTime }
        };
    }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string): Promise<OperationalActionResult> {
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Sesión sin privilegios suficientes." };

        await AlertsService.acknowledgeAlert(alertId);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: "Alerta reconocida." };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "DEGRADED_SERVICE", message: normalized.message };
    }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<OperationalActionResult> {
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Acción denegada." };

        await AlertsService.markNotificationRead(notificationId);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: "Sincronizado." };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "DEGRADED_SERVICE", message: normalized.message };
    }
}

/**
 * Fetch legacy dashboard data (Adapted to v4.2 contract)
 */
export async function getCockpitV2Data(): Promise<OperationalActionResult> {
    try {
        const [alerts, notifications, metrics] = await Promise.all([
            AlertsService.getGlobalAlertsSummary(),
            AlertsService.getCockpitNotifications(),
            MetricsService.getAggregatedMonthlyMetrics()
        ]);
        return {
            ok: true,
            code: "OK",
            message: "Lectura exitosa.",
            data: { alerts, notifications, metrics }
        };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "DEGRADED_SERVICE", message: normalized.message };
    }
}

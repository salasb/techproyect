"use server";

import { AlertsService } from "@/lib/superadmin/alerts-service";
import { MetricsService } from "@/lib/superadmin/metrics-service";
import { revalidatePath } from "next/cache";
import { normalizeOperationalError } from "@/lib/superadmin/error-normalizer";

export type OperationalActionCode = 
    | "OK" 
    | "UNAUTHORIZED" 
    | "DEGRADED_CONFIG" 
    | "PREVIEW_LOCKED" 
    | "SERVICE_ERROR" 
    | "VALIDATION_ERROR";

export interface OperationalActionResult<T = unknown> {
    ok: boolean;
    code: OperationalActionCode;
    message: string;
    data?: T;
}

/**
 * Manually trigger alerts evaluation
 * v4.1: Operational Action Contract
 */
export async function triggerAlertsEvaluation(): Promise<OperationalActionResult> {
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();

        if (!access.ok) {
            console.error(`[RecalcHealth] UNAUTHORIZED attempt by ${access.email}`);
            return { 
                ok: false, 
                code: "UNAUTHORIZED",
                message: "Tu sesión no tiene permisos globales. Reingresa o revisa configuración de superadmin."
            };
        }

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.warn(`[RecalcHealth] DEGRADED_CONFIG active.`);
            return { 
                ok: false, 
                code: "DEGRADED_CONFIG",
                message: "Recalcular salud no disponible hasta completar configuración del servidor (Admin Key)."
            };
        }

        console.log(`[RecalcHealth] Executing for ${access.email}`);
        const results = await AlertsService.runAlertsEvaluation();
        
        revalidatePath("/admin");
        return { 
            ok: true, 
            code: "OK", 
            message: `Evaluación exitosa: ${results.created} nuevas, ${results.resolved} resueltas.`,
            data: results 
        };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        console.error("[RecalcHealth] SERVICE_ERROR:", normalized.code);
        return { 
            ok: false, 
            code: "SERVICE_ERROR", 
            message: "Fallo crítico al recalcular salud del ecosistema." 
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
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Permisos insuficientes" };

        await AlertsService.acknowledgeAlert(alertId);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: "Alerta reconocida correctamente." };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_ERROR", message: normalized.message };
    }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<OperationalActionResult> {
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Permisos insuficientes" };

        await AlertsService.markNotificationRead(notificationId);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: "Notificación marcada como leída." };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_ERROR", message: normalized.message };
    }
}

/**
 * Fetch data for v2.0 dashboard legacy support (Refactored to v4.1 contract)
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
            message: "Datos sincronizados.",
            data: { alerts, notifications, metrics }
        };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_ERROR", message: normalized.message };
    }
}


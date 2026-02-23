"use server";

import { AlertsService } from "@/lib/superadmin/alerts-service";
import { MetricsService } from "@/lib/superadmin/metrics-service";
import { revalidatePath } from "next/cache";

/**
 * Manually trigger alerts evaluation
 */
export async function triggerAlertsEvaluation() {
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();

        if (!access.ok) {
            console.error(`[RecalcHealth] Unauthorized attempt by ${access.email}`);
            return { 
                success: false, 
                error: "Tu sesión no tiene permisos globales. Reingresa o revisa configuración de superadmin.",
                code: "UNAUTHORIZED"
            };
        }

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.warn(`[RecalcHealth] Safe mode active. Skipping full evaluation.`);
            return { 
                success: false, 
                error: "Recalcular salud no disponible hasta completar configuración del servidor (Admin Key).",
                code: "DEGRADED_CONFIG"
            };
        }

        console.log(`[RecalcHealth] Starting execution for ${access.email}`);
        const results = await AlertsService.runAlertsEvaluation();
        
        revalidatePath("/admin");
        return { success: true, results };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[RecalcHealth] Critical failure:", message);
        return { success: false, error: "Ha ocurrido un error interno al recalcular la salud del ecosistema." };
    }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string) {
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { success: false, error: "Permisos insuficientes" };

        await AlertsService.acknowledgeAlert(alertId);
        revalidatePath("/admin");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string) {
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { success: false, error: "Permisos insuficientes" };

        await AlertsService.markNotificationRead(notificationId);
        revalidatePath("/admin");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
}

/**
 * Fetch data for v2.0 dashboard
 */
export async function getCockpitV2Data() {
    try {
        const [alerts, notifications, metrics] = await Promise.all([
            AlertsService.getGlobalAlertsSummary(),
            AlertsService.getCockpitNotifications(),
            MetricsService.getAggregatedMonthlyMetrics()
        ]);
        return {
            success: true,
            alerts,
            notifications,
            metrics
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
}

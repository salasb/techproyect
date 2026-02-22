"use server";

import { AlertsService } from "@/lib/superadmin/alerts-service";
import { MetricsService } from "@/lib/superadmin/metrics-service";
import { revalidatePath } from "next/cache";

/**
 * Manually trigger alerts evaluation
 */
export async function triggerAlertsEvaluation() {
    try {
        const results = await AlertsService.runAlertsEvaluation();
        revalidatePath("/admin");
        return { success: true, results };
    } catch (error: any) {
        console.error("[Actions] Failed to evaluate alerts:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string) {
    try {
        await AlertsService.acknowledgeAlert(alertId);
        revalidatePath("/admin");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string) {
    try {
        await AlertsService.markNotificationRead(notificationId);
        revalidatePath("/admin");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
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
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

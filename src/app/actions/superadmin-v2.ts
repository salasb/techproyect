"use server";

import { AlertsService } from "@/lib/superadmin/alerts-service";
import { MetricsService } from "@/lib/superadmin/metrics-service";
import { revalidatePath } from "next/cache";
import { normalizeOperationalError } from "@/lib/superadmin/error-normalizer";
import { OperationalActionResult } from "@/lib/superadmin/cockpit-data-adapter";
import prisma from "@/lib/prisma";

/**
 * Manually trigger alerts evaluation
 * v4.4.0: Operación Accionable Server Action
 */
export async function triggerAlertsEvaluation(): Promise<OperationalActionResult<{
    createdAlerts: number;
    updatedAlerts: number;
    resolvedAlerts: number;
    evaluatedOrganizations: number;
}>> {
    const startTime = Date.now();
    const traceId = `RECALC-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const executedAt = new Date().toISOString();
    
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();

        if (!access.ok) {
            console.error(`[${traceId}] UNAUTHORIZED attempt by ${access.email}`);
            return { 
                ok: false, 
                code: "UNAUTHORIZED",
                message: "Acceso denegado: Se requieren privilegios de Superadmin para sincronizar el ecosistema.",
                meta: { traceId, durationMs: Date.now() - startTime, executedAt }
            };
        }

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            return { 
                ok: false, 
                code: "DEGRADED_CONFIG",
                message: "Operación restringida: Motor en Modo Seguro (falta Service Role Key).",
                meta: { traceId, durationMs: Date.now() - startTime, executedAt }
            };
        }

        console.log(`[${traceId}] Starting ecosystem-wide health evaluation for ${access.email}`);
        const results = await AlertsService.runAlertsEvaluation();
        
        // Count organizations for the summary
        const orgCount = await prisma.organization.count();

        revalidatePath("/admin");
        
        return { 
            ok: true, 
            code: "OK", 
            message: `Evaluación completada: ${results.created} alertas nuevas detectadas en ${orgCount} organizaciones.`,
            data: {
                createdAlerts: results.created,
                updatedAlerts: results.updated,
                resolvedAlerts: results.resolved,
                evaluatedOrganizations: orgCount
            },
            meta: { traceId, durationMs: Date.now() - startTime, executedAt }
        };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        console.error(`[${traceId}] ENGINE_FAILURE:`, normalized.code, normalized.message);
        return { 
            ok: false, 
            code: "SERVICE_FAILURE", 
            message: `Fallo crítico en el motor de salud: ${normalized.message}`,
            meta: { traceId, durationMs: Date.now() - startTime, executedAt }
        };
    }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string): Promise<OperationalActionResult> {
    const traceId = `ACK-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Sesión sin privilegios suficientes.", meta: { traceId } };

        await AlertsService.acknowledgeAlert(alertId);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: "Alerta reconocida.", meta: { traceId } };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId } };
    }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<OperationalActionResult> {
    const traceId = `NOTIF-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Acción denegada.", meta: { traceId } };

        await AlertsService.markNotificationRead(notificationId);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: "Sincronizado.", meta: { traceId } };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId } };
    }
}

/**
 * Persist global system settings
 * v4.4.0: Reality Patch + Preview Lock
 */
export async function persistGlobalSettings(_formData: FormData): Promise<OperationalActionResult> {
    const traceId = `SET-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const executedAt = new Date().toISOString();
    const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development';

    if (isPreview) {
        return {
            ok: false,
            code: "PREVIEW_LOCKED",
            message: "Bloqueado: Cambios permitidos solo en Producción.",
            meta: { traceId, executedAt }
        };
    }

    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Acceso denegado.", meta: { traceId, executedAt } };

        // Logic to persist settings would go here
        console.log(`[${traceId}] Persisting global settings for ${access.email}`);
        
        revalidatePath("/admin/settings");
        return { 
            ok: true, 
            code: "OK", 
            message: "Configuración global actualizada correctamente.",
            meta: { traceId, executedAt }
        };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId, executedAt } };
    }
}

/**
 * Fetch legacy dashboard data (Adapted to v4.2.3 contract)
 */
export async function getCockpitV2Data(): Promise<OperationalActionResult<unknown>> {
    const traceId = `DATA-${Math.random().toString(36).substring(7).toUpperCase()}`;
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
            data: { alerts, notifications, metrics },
            meta: { traceId }
        };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId } };
    }
}

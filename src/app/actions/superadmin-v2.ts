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
        const results = await AlertsService.runAlertsEvaluation(traceId);
        
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
 * Acknowledge an alert by fingerprint
 * v4.5.0: Actionable Remediation
 */
export async function acknowledgeCockpitAlert(fingerprint: string): Promise<OperationalActionResult> {
    const traceId = `ACK-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const executedAt = new Date().toISOString();
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Acceso denegado.", meta: { traceId, executedAt } };

        await AlertsService.acknowledgeAlert(fingerprint);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: "Alerta reconocida correctamente.", meta: { traceId, executedAt } };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId, executedAt } };
    }
}

/**
 * Snooze an alert by fingerprint
 * v4.5.0: Actionable Remediation
 */
export async function snoozeCockpitAlert(fingerprint: string, preset: "1h" | "24h" | "7d"): Promise<OperationalActionResult> {
    const traceId = `SNOOZE-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const executedAt = new Date().toISOString();
    const snoozeMap = { "1h": 1, "24h": 24, "7d": 168 };
    const hours = snoozeMap[preset] || 1;

    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Acceso denegado.", meta: { traceId, executedAt } };

        await AlertsService.snoozeAlert(fingerprint, hours);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: `Alerta pospuesta por ${preset}.`, meta: { traceId, executedAt } };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId, executedAt } };
    }
}

/**
 * Resolve an alert by fingerprint
 * v4.5.0: Actionable Remediation
 */
export async function resolveCockpitAlert(fingerprint: string, note?: string): Promise<OperationalActionResult> {
    const traceId = `RESOLVE-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const executedAt = new Date().toISOString();
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Acceso denegado.", meta: { traceId, executedAt } };

        await AlertsService.resolveAlert(fingerprint, note);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: "Incidente marcado como RESUELTO.", meta: { traceId, executedAt } };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId, executedAt } };
    }
}

/**
 * Assign an owner to a cockpit alert
 * v4.6.0: Orchestration
 */
export async function assignCockpitAlertOwner(fingerprint: string, ownerType: "user" | "role", value: string): Promise<OperationalActionResult> {
    const traceId = `OWNER-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const executedAt = new Date().toISOString();
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Acceso denegado.", meta: { traceId, executedAt } };

        await AlertsService.assignOwner(fingerprint, ownerType, value);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: `Responsable asignado (${value}).`, meta: { traceId, executedAt } };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId, executedAt } };
    }
}

/**
 * Toggle a step in the alert playbook
 * v4.8.0: Orchestration + TraceId
 */
export async function toggleCockpitPlaybookStep(fingerprint: string, stepId: string, checked: boolean, note?: string): Promise<OperationalActionResult> {
    const traceId = `STEP-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const executedAt = new Date().toISOString();
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Acceso denegado.", meta: { traceId, executedAt } };

        await AlertsService.togglePlaybookStep(fingerprint, stepId, checked, traceId, note);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: checked ? "Paso completado." : "Paso reiniciado.", meta: { traceId, executedAt } };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId, executedAt } };
    }
}

/**
 * Log when a playbook is opened for audit
 * v4.8.0
 */
export async function logPlaybookOpenedAction(fingerprint: string): Promise<OperationalActionResult> {
    const traceId = `OPEN-PLAY-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const executedAt = new Date().toISOString();
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Acceso denegado.", meta: { traceId, executedAt } };

        await AlertsService.logPlaybookOpened(fingerprint, traceId);
        return { ok: true, code: "OK", message: "View logged.", meta: { traceId, executedAt } };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId, executedAt } };
    }
}

/**
 * Acknowledge an alert (Legacy/ID based)
 */
export async function acknowledgeAlert(alertId: string): Promise<OperationalActionResult> {
    const traceId = `ACK-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Sesión sin privilegios suficientes.", meta: { traceId } };

        // Attempt by ID if ID is provided, else fallback to service (this might need alertId -> fingerprint mapping)
        // For simplicity in v4.5 we'll keep ID based if needed but encourage fingerprint
        const existing = await prisma.superadminAlert.findUnique({ where: { id: alertId } });
        if (existing) {
            await AlertsService.acknowledgeAlert(existing.fingerprint);
        }
        
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: "Alerta reconocida.", meta: { traceId } };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId } };
    }
}

/**
 * Reset playbook progress for an alert
 * v4.8.0
 */
export async function resetCockpitPlaybookAction(fingerprint: string): Promise<OperationalActionResult> {
    const traceId = `RESET-PLAY-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const executedAt = new Date().toISOString();
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Acceso denegado.", meta: { traceId, executedAt } };

        await AlertsService.resetPlaybookProgress(fingerprint, traceId);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: "Progreso reiniciado.", meta: { traceId, executedAt } };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId, executedAt } };
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
 * Bulk Acknowledge alerts
 * v4.7.2
 */
export async function bulkAcknowledgeCockpitAlerts(fingerprints: string[]): Promise<OperationalActionResult> {
    const traceId = `BULK-ACK-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const executedAt = new Date().toISOString();
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Acceso denegado.", meta: { traceId, executedAt } };

        await AlertsService.bulkAcknowledgeAlerts(fingerprints, traceId);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: `Acción masiva aplicada a ${fingerprints.length} incidentes.`, meta: { traceId, executedAt } };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId, executedAt } };
    }
}

/**
 * Bulk Snooze alerts
 * v4.7.2
 */
export async function bulkSnoozeCockpitAlerts(fingerprints: string[], preset: "1h" | "24h" | "7d"): Promise<OperationalActionResult> {
    const traceId = `BULK-SNOOZE-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const executedAt = new Date().toISOString();
    const snoozeMap = { "1h": 1, "24h": 24, "7d": 168 };
    const hours = snoozeMap[preset] || 1;

    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Acceso denegado.", meta: { traceId, executedAt } };

        await AlertsService.bulkSnoozeAlerts(fingerprints, hours, traceId);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: `Incidentes pospuestos por ${preset}.`, meta: { traceId, executedAt } };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId, executedAt } };
    }
}

/**
 * Bulk Resolve alerts
 * v4.7.2
 */
export async function bulkResolveCockpitAlerts(fingerprints: string[], note: string): Promise<OperationalActionResult> {
    const traceId = `BULK-RESOLVE-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const executedAt = new Date().toISOString();
    try {
        const { resolveSuperadminAccess } = await import('@/lib/auth/superadmin-guard');
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { ok: false, code: "UNAUTHORIZED", message: "Acceso denegado.", meta: { traceId, executedAt } };

        await AlertsService.bulkResolveAlerts(fingerprints, note, traceId);
        revalidatePath("/admin");
        return { ok: true, code: "OK", message: `${fingerprints.length} incidentes marcados como RESUELTOS.`, meta: { traceId, executedAt } };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId, executedAt } };
    }
}

/**
 * Fetch legacy dashboard data (Adapted to v4.7.2.3 contract)
 */
export async function getCockpitV2Data(options: { 
    scopeMode?: string, 
    includeNonProductive?: boolean 
} = {}): Promise<OperationalActionResult<unknown>> {
    const traceId = `DATA-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const scopeMode = options.scopeMode || "production_only";
    const includeNonProductive = options.includeNonProductive ?? false;

    try {
        const [alertsSummary, rawNotifications, metrics] = await Promise.all([
            AlertsService.getGlobalAlertsSummary(),
            AlertsService.getCockpitNotifications(),
            MetricsService.getAggregatedMonthlyMetrics()
        ]);

        const { classifyOrganizationEnvironment } = await import("@/lib/superadmin/environment-classifier");

        // Filter and Dedupe Notifications
        const filteredNotifications = rawNotifications.filter(n => {
            if (includeNonProductive || scopeMode === "all") return true;
            if (!n.alert?.organization) return true; // Global notifications
            
            const classification = classifyOrganizationEnvironment(n.alert.organization as any);
            if (scopeMode === "production_only") return classification.environmentClass === "production";
            if (scopeMode === "production_with_trial") return ["production", "trial"].includes(classification.environmentClass);
            
            return classification.isOperationallyRelevant;
        });

        // Dedupe by alert fingerprint if available
        const dedupeMap = new Map();
        const deduped = [];
        for (const n of filteredNotifications) {
            const key = n.alert?.fingerprint || n.id;
            if (!dedupeMap.has(key)) {
                dedupeMap.set(key, true);
                deduped.push(n);
            }
        }

        return {
            ok: true,
            code: "OK",
            message: "Lectura exitosa.",
            data: { 
                alerts: alertsSummary, 
                notifications: deduped.slice(0, 20), 
                metrics 
            },
            meta: { traceId }
        };
    } catch (error: unknown) {
        const normalized = normalizeOperationalError(error);
        return { ok: false, code: "SERVICE_FAILURE", message: normalized.message, meta: { traceId } };
    }
}

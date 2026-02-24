import { getServerRuntimeConfig } from "@/lib/config/server-runtime";
import { CockpitService, OrgCockpitSummary, OperationalMetrics } from "./cockpit-service";
import { AlertsService } from "./alerts-service";
import { MetricsService, MonthlyMetrics } from "./metrics-service";
import { normalizeOperationalError } from "./error-normalizer";
import { OperationalStateRepo, OperationalAlertSla, OperationalAlertOwner, PlaybookStepExecution } from "./operational-state-repo";

/**
 * PHASE 4.6.0 ORCHESTRATION CONTRACT
 */
export type OperationalBlockStatus = "ok" | "empty" | "degraded_config" | "degraded_service";

export type OperationalActionCode =
  | "OK"
  | "UNAUTHORIZED"
  | "DEGRADED_CONFIG"
  | "DEGRADED_SERVICE"
  | "VALIDATION_ERROR"
  | "NO_CHANGES"
  | "PREVIEW_LOCKED"
  | "SERVICE_FAILURE"
  | "NOOP";

export interface OperationalBlockResult<T> {
  status: OperationalBlockStatus;
  data: T;
  message: string;      // SIEMPRE string legible para UI
  code: string;         // Ej: CONFIG_MISSING, SERVICE_FAILURE, etc.
  meta: {
    traceId: string;     // obligatorio para trazabilidad
    durationMs: number;
    rowCount?: number;
    lastUpdatedAt?: string; // ISO
  };
}

export interface OperationalActionResult<T = undefined> {
  ok: boolean;
  code: OperationalActionCode;
  message: string;       // SIEMPRE string amigable
  data?: T;
  meta: {
    traceId: string;
    durationMs?: number;
    executedAt?: string; // ISO
  };
}

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertState = "open" | "acknowledged" | "snoozed" | "resolved";

export interface CockpitOperationalAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  state: AlertState;
  ruleCode: string;
  entityType?: "organization" | "user" | "subscription";
  entityId?: string;
  href?: string;
  detectedAt: string;
  traceId: string;
  fingerprint: string;
  snoozedUntil?: string | null;
  organization?: { name: string } | null;
  
  // v4.6 Orchestration
  sla?: OperationalAlertSla | null;
  owner?: OperationalAlertOwner | null;
  playbookSteps?: PlaybookStepExecution[];
}

export interface CockpitDataPayloadV42 {
    systemStatus: 'operational' | 'safe_mode';
    loadTimeMs: number;
    blocks: {
        kpis: OperationalBlockResult<{ totalOrgs: number; issuesCount: number; activeTrials: number; inactiveOrgs: number; timestamp: Date }>;
        orgs: OperationalBlockResult<OrgCockpitSummary[]>;
        alerts: OperationalBlockResult<CockpitOperationalAlert[]>;
        metrics: OperationalBlockResult<MonthlyMetrics[]>;
        ops: OperationalBlockResult<OperationalMetrics>;
    };
}

/**
 * Robust adapter to fetch all Cockpit data with high-fidelity status reporting.
 * v4.6.0: Actionable Operation + Remediation Loop + Orchestration
 */
export async function getCockpitDataSafe(): Promise<CockpitDataPayloadV42> {
    const startTime = Date.now();
    const config = getServerRuntimeConfig();
    const traceId = `CKP-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const nowISO = new Date().toISOString();
    const now = new Date();
    
    console.log(`[CockpitAdapter][${traceId}] Start Aggregated Fetch (Mode: ${config.mode})`);

    async function fetchBlockSafe<T>(
        name: string,
        promise: Promise<T>,
        fallback: T,
        requiresAdmin: boolean = true
    ): Promise<OperationalBlockResult<T>> {
        const blockStart = Date.now();
        
        if (requiresAdmin && !config.isAdminClientEnabled) {
            return { 
                status: 'degraded_config', 
                data: fallback, 
                code: 'MISSING_ADMIN_CONFIG',
                message: 'Disponible al completar configuración del servidor (SERVICE_ROLE)',
                meta: { durationMs: 0, traceId, lastUpdatedAt: nowISO }
            };
        }

        try {
            const data = await promise;
            const durationMs = Date.now() - blockStart;
            
            const isEmpty = Array.isArray(data) ? data.length === 0 : !data;
            const status = isEmpty ? 'empty' : 'ok';
            const rowCount = Array.isArray(data) ? data.length : undefined;

            console.log(`[CockpitAdapter][${traceId}][Block:${name}] Status: ${status} Duration: ${durationMs}ms`);
            
            return { 
                status, 
                data: data ?? fallback,
                message: status === 'ok' ? 'Datos sincronizados correctamente.' : 'Sin datos disponibles en este bloque.',
                code: status === 'ok' ? 'SYNC_OK' : 'EMPTY_RESULT',
                meta: { durationMs, rowCount, traceId, lastUpdatedAt: nowISO }
            };
        } catch (err: unknown) {
            const durationMs = Date.now() - blockStart;
            const normalized = normalizeOperationalError(err);
            
            console.error(`[CockpitAdapter][${traceId}][Block:${name}] FAILED: ${normalized.code} Message: ${normalized.message}`);
            
            return { 
                status: 'degraded_service', 
                data: fallback, 
                code: normalized.code,
                message: normalized.message,
                meta: { durationMs, traceId, lastUpdatedAt: nowISO }
            };
        }
    }

    // Parallel fetch with full isolation
    const [kpis, orgs, alerts, metrics, ops] = await Promise.all([
        fetchBlockSafe('KPIs', CockpitService.getGlobalKPIs(), { totalOrgs: 0, issuesCount: 0, activeTrials: 0, inactiveOrgs: 0, timestamp: new Date() }),
        fetchBlockSafe('Orgs', CockpitService.getOrganizationsList(), []),
        fetchBlockSafe('Alerts', AlertsService.getGlobalAlertsSummary().then(items => items.map(item => {
            // Use OperationalStateRepo to ensure v4.6 normalized data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const meta = OperationalStateRepo.normalize(item as any);
            
            // Map status to operational states v4.6
            let state: AlertState = 'open';
            if (item.status === 'ACKNOWLEDGED' || meta.status === 'ACKNOWLEDGED') state = 'acknowledged';
            if (item.status === 'RESOLVED' || meta.status === 'RESOLVED') state = 'resolved';
            if (meta.snoozedUntil && new Date(meta.snoozedUntil) > now) {
                state = 'snoozed';
            }

            return {
                id: item.id,
                title: item.title,
                description: item.description,
                severity: item.severity.toLowerCase() as AlertSeverity,
                state,
                ruleCode: meta.ruleCode,
                entityType: 'organization',
                entityId: item.organizationId || undefined,
                href: meta.href,
                detectedAt: item.detectedAt.toISOString(),
                traceId: meta.lastTraceId || 'N/A',
                fingerprint: item.fingerprint,
                snoozedUntil: meta.snoozedUntil,
                organization: item.organization,
                
                // Orchestration v4.6
                sla: meta.sla,
                owner: meta.owner,
                playbookSteps: meta.playbookSteps
            } as CockpitOperationalAlert;
        })), []),
        fetchBlockSafe('Metrics', MetricsService.getAggregatedMonthlyMetrics(), []),
        fetchBlockSafe('Ops', CockpitService.getOperationalMetrics(), { mttaMinutes: 0, mttrHours: 0, openAlerts: 0, breachedAlerts: 0, slaComplianceRate: 100 })
    ]);

    const totalDuration = Date.now() - startTime;
    console.log(`[CockpitAdapter][${traceId}] Aggregate Completed in ${totalDuration}ms`);

    return {
        systemStatus: config.mode === 'operational' ? 'operational' : 'safe_mode',
        loadTimeMs: totalDuration,
        blocks: { kpis, orgs, alerts, metrics, ops }
    };
}

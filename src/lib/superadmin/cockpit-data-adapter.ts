import { getServerRuntimeConfig } from "@/lib/config/server-runtime";
import { CockpitService, OrgCockpitSummary, OperationalMetrics } from "./cockpit-service";
import { AlertsService } from "./alerts-service";
import { MetricsService, MonthlyMetrics } from "./metrics-service";
import { normalizeOperationalError } from "./error-normalizer";
import { OperationalStateRepo, OperationalAlertSla, OperationalAlertOwner, PlaybookStepExecution } from "./operational-state-repo";
import { classifyOrganizationEnvironment, EnvironmentClass } from "./environment-classifier";

/**
 * PHASE 4.7.1 OPERATIONAL HYGIENE CONTRACT
 */
export type OperationalBlockStatus = "ok" | "empty" | "degraded_config" | "degraded_service";
export type CockpitScopeMode = "production_only" | "all";

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
  organization?: { id: string; name: string; environmentClass?: EnvironmentClass } | null;
  
  // v4.6 Orchestration
  sla?: OperationalAlertSla | null;
  owner?: OperationalAlertOwner | null;
  playbookSteps?: PlaybookStepExecution[];

  // v4.7.1 Hygiene
  environmentClass: EnvironmentClass;
  isOperationallyRelevant: boolean;
}

/**
 * v4.7.2 AGGREGATION CONTRACT
 */
export interface CockpitAlertGroup {
  groupKey: string; // ruleCode|severity|operationalState
  ruleCode: string;
  severity: AlertSeverity;
  operationalState: AlertState;
  title: string; 
  count: number; 
  orgCount: number; 
  organizationsPreview: Array<{ orgId: string; orgName: string }>;
  oldestDetectedAt?: string;
  newestDetectedAt?: string;
  worstSlaStatus?: "BREACHED" | "AT_RISK" | "ON_TRACK" | null;
  itemIds: string[]; 
  items: CockpitOperationalAlert[];
}

export interface CockpitDataPayloadV42 {
    systemStatus: 'operational' | 'safe_mode';
    loadTimeMs: number;
    scopeMode: CockpitScopeMode;
    hygiene: {
        totalRawIncidents: number;
        totalOperationalIncidents: number;
        hiddenByEnvironmentFilter: number;
        orgsByClass: Record<EnvironmentClass, number>;
    };
    blocks: {
        kpis: OperationalBlockResult<{ totalOrgs: number; issuesCount: number; activeTrials: number; inactiveOrgs: number; timestamp: Date }>;
        orgs: OperationalBlockResult<(OrgCockpitSummary & { environmentClass: EnvironmentClass })[]>;
        alerts: OperationalBlockResult<CockpitOperationalAlert[]>;
        alertGroups: OperationalBlockResult<CockpitAlertGroup[]>;
        metrics: OperationalBlockResult<MonthlyMetrics[]>;
        ops: OperationalBlockResult<OperationalMetrics>;
    };
}

/**
 * Robust adapter to fetch all Cockpit data with high-fidelity status reporting.
 * v4.7.1: Operational Hygiene + Classification + Scope Control
 * v4.7.2: Operational Aggregation + Grouping
 */
export async function getCockpitDataSafe(options: { 
    scopeMode?: CockpitScopeMode,
    includeNonProductive?: boolean 
} = {}): Promise<CockpitDataPayloadV42> {
    const startTime = Date.now();
    const config = getServerRuntimeConfig();
    const traceId = `CKP-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const nowISO = new Date().toISOString();
    const now = new Date();
    
    const scopeMode = options.scopeMode || "production_only";
    const includeNonProductive = options.includeNonProductive ?? false;

    console.log(`[CockpitAdapter][${traceId}] Start Aggregated Fetch (Mode: ${config.mode}, Scope: ${scopeMode})`);

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
    const [kpisRaw, orgsRaw, rawAlerts, metrics, opsRaw] = await Promise.all([
        fetchBlockSafe('KPIs', CockpitService.getGlobalKPIs(), { totalOrgs: 0, issuesCount: 0, activeTrials: 0, inactiveOrgs: 0, timestamp: new Date() }),
        fetchBlockSafe('Orgs', CockpitService.getOrganizationsList(), []),
        fetchBlockSafe('Alerts', AlertsService.getGlobalAlertsSummary(), []),
        fetchBlockSafe('Metrics', MetricsService.getAggregatedMonthlyMetrics(), []),
        fetchBlockSafe('Ops', CockpitService.getOperationalMetrics(), { mttaMinutes: 0, mttrHours: 0, openAlerts: 0, breachedAlerts: 0, slaComplianceRate: 100 })
    ]);

    // FASE 1 - Clasificación y Enriquecimiento
    const orgsWithClass = orgsRaw.data.map(org => {
        const classification = classifyOrganizationEnvironment({
            name: org.name,
            createdAt: org.createdAt,
            subscription: org.billing ? { status: org.billing.status, trialEndsAt: org.billing.trialEndsAt } : null,
            plan: org.plan
        });
        return { ...org, environmentClass: classification.environmentClass, isRelevant: classification.isOperationallyRelevant };
    });

    const orgClassMap = new Map(orgsWithClass.map(o => [o.id, { class: o.environmentClass, isRelevant: o.isRelevant }]));

    // Snapshot instrumentation
    if (Array.isArray(rawAlerts.data)) {
        const fingerprints = rawAlerts.data.map(a => a.fingerprint);
        const uniqueFp = new Set(fingerprints);
        console.log(`[CockpitAdapter][${traceId}] Alerts Snapshot:`, {
            total: rawAlerts.data.length,
            unique: uniqueFp.size,
            isDuplicated: uniqueFp.size !== rawAlerts.data.length
        });
    }

    // FASE 2 - Dedupe Semántico (Guarda anti-regresión)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueMap = new Map<string, any>();
    rawAlerts.data.forEach(a => {
        const parts = (a.fingerprint || "").split(':');
        const stableKey = parts.length >= 2 ? `${parts[0]}:${parts[1]}` : a.fingerprint;
        if (uniqueMap.has(stableKey)) {
            const existing = uniqueMap.get(stableKey);
            const existingDate = existing.updatedAt || existing.detectedAt || new Date(0);
            const newDate = a.updatedAt || a.detectedAt || new Date(0);
            if (new Date(newDate) > new Date(existingDate)) uniqueMap.set(stableKey, a);
        } else {
            uniqueMap.set(stableKey, a);
        }
    });
    const deduplicatedRawAlerts = Array.from(uniqueMap.values());

    // FASE 3 - Filtrado por Higiene Operacional
    const hygieneStats = {
        totalRawIncidents: deduplicatedRawAlerts.length,
        totalOperationalIncidents: 0,
        hiddenByEnvironmentFilter: 0,
        orgsByClass: { production: 0, demo: 0, test: 0, qa: 0, trial: 0, unknown: 0 } as Record<EnvironmentClass, number>
    };

    const enrichedAlerts = deduplicatedRawAlerts.map(item => {
        const orgInfo = orgClassMap.get(item.organizationId) || { class: "unknown" as EnvironmentClass, isRelevant: false };
        const meta = OperationalStateRepo.normalize(item as any);
        
        let state: AlertState = 'open';
        if (item.status === 'ACKNOWLEDGED' || meta.status === 'ACKNOWLEDGED') state = 'acknowledged';
        if (item.status === 'RESOLVED' || meta.status === 'RESOLVED') state = 'resolved';
        if (meta.snoozedUntil && new Date(meta.snoozedUntil) > now) state = 'snoozed';

        hygieneStats.orgsByClass[orgInfo.class]++;

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
            organization: item.organization ? { ...item.organization, id: item.organizationId, environmentClass: orgInfo.class } : null,
            sla: meta.sla,
            owner: meta.owner,
            playbookSteps: meta.playbookSteps,
            environmentClass: orgInfo.class,
            isOperationallyRelevant: orgInfo.isRelevant
        } as CockpitOperationalAlert;
    });

    const filteredAlerts = enrichedAlerts.filter(a => {
        if (includeNonProductive) return true;
        if (scopeMode === "production_only") return a.isOperationallyRelevant;
        return true;
    });

    hygieneStats.totalOperationalIncidents = filteredAlerts.length;
    hygieneStats.hiddenByEnvironmentFilter = hygieneStats.totalRawIncidents - filteredAlerts.length;

    // FASE 4 - Agrupación Operativa (v4.7.2)
    const groupsMap = new Map<string, CockpitAlertGroup>();
    filteredAlerts.forEach(alert => {
        const groupKey = `${alert.ruleCode}|${alert.severity}|${alert.state}`;
        if (!groupsMap.has(groupKey)) {
            groupsMap.set(groupKey, {
                groupKey,
                ruleCode: alert.ruleCode,
                severity: alert.severity,
                operationalState: alert.state,
                title: alert.title,
                count: 0,
                orgCount: 0,
                organizationsPreview: [],
                itemIds: [],
                items: [],
                worstSlaStatus: null
            });
        }
        const group = groupsMap.get(groupKey)!;
        group.count++;
        group.itemIds.push(alert.id);
        group.items.push(alert);
        
        const slaOrder = { "BREACHED": 3, "AT_RISK": 2, "ON_TRACK": 1, "null": 0 };
        const currentSlaStatus = (alert.sla?.status || "null") as keyof typeof slaOrder;
        const worstSlaStatus = (group.worstSlaStatus || "null") as keyof typeof slaOrder;
        if (slaOrder[currentSlaStatus] > slaOrder[worstSlaStatus]) {
            group.worstSlaStatus = alert.sla?.status as any;
        }

        if (!group.oldestDetectedAt || new Date(alert.detectedAt) < new Date(group.oldestDetectedAt)) {
            group.oldestDetectedAt = alert.detectedAt;
        }
        if (!group.newestDetectedAt || new Date(alert.detectedAt) > new Date(group.newestDetectedAt)) {
            group.newestDetectedAt = alert.detectedAt;
        }

        if (alert.organization && !group.organizationsPreview.some(o => o.orgId === alert.organization!.id)) {
            group.orgCount++;
            if (group.organizationsPreview.length < 3) {
                group.organizationsPreview.push({ orgId: alert.organization.id, orgName: alert.organization.name });
            }
        }
    });

    // FASE 5 - Re-cálculo de KPIs basados en el Scope
    const filteredOrgs = orgsWithClass.filter(o => includeNonProductive ? true : (scopeMode === "production_only" ? o.isRelevant : true));
    
    const alerts: OperationalBlockResult<CockpitOperationalAlert[]> = {
        ...rawAlerts,
        data: filteredAlerts,
        meta: { ...rawAlerts.meta, rowCount: filteredAlerts.length }
    };

    const alertGroups: OperationalBlockResult<CockpitAlertGroup[]> = {
        status: groupsMap.size > 0 ? 'ok' : 'empty',
        data: Array.from(groupsMap.values()),
        message: 'Alertas agrupadas correctamente.',
        code: 'SYNC_OK',
        meta: { durationMs: 0, rowCount: groupsMap.size, traceId, lastUpdatedAt: nowISO }
    };

    const orgs: OperationalBlockResult<(OrgCockpitSummary & { environmentClass: EnvironmentClass })[]> = {
        ...orgsRaw,
        data: filteredOrgs,
        meta: { ...orgsRaw.meta, rowCount: filteredOrgs.length }
    };

    const totalDuration = Date.now() - startTime;
    return {
        systemStatus: config.mode === 'operational' ? 'operational' : 'safe_mode',
        loadTimeMs: totalDuration,
        scopeMode,
        hygiene: hygieneStats,
        blocks: { kpis: kpisRaw, orgs, alerts, alertGroups, metrics, ops: opsRaw }
    };
}

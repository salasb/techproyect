import { getServerRuntimeConfig } from "@/lib/config/server-runtime";
import { CockpitService, OrgCockpitSummary } from "./cockpit-service";
import { AlertsService } from "./alerts-service";
import { MetricsService, MonthlyMetrics } from "./metrics-service";
import { normalizeOperationalError } from "./error-normalizer";

export type OperationalBlockStatus = 'ok' | 'empty' | 'degraded_config' | 'degraded_service';

export interface OperationalBlockResult<T> {
    status: OperationalBlockStatus;
    data: T;
    message?: string;
    code?: string;
    meta: {
        durationMs: number;
        rowCount?: number;
        source?: string;
    };
}

export interface CockpitDataPayloadV4 {
    systemStatus: 'operational' | 'safe_mode';
    loadTimeMs: number;
    blocks: {
        kpis: OperationalBlockResult<{ totalOrgs: number; issuesCount: number; activeTrials: number; inactiveOrgs: number; timestamp: Date }>;
        orgs: OperationalBlockResult<OrgCockpitSummary[]>;
        alerts: OperationalBlockResult<Record<string, unknown>[]>;
        metrics: OperationalBlockResult<MonthlyMetrics[]>;
    };
}

/**
 * Robust adapter to fetch all Cockpit data with high-fidelity status reporting.
 * v4.1: Phase 2 Real Hardening + Error Normalization
 */
export async function getCockpitDataSafe(): Promise<CockpitDataPayloadV4> {
    const startTime = Date.now();
    const config = getServerRuntimeConfig();
    
    console.log(`[CockpitAdapter][Config] Mode=${config.mode} AdminClientEnabled=${config.isAdminClientEnabled}`);

    async function fetchBlockSafe<T>(
        name: string,
        promise: Promise<T>,
        fallback: T,
        requiresAdmin: boolean = true
    ): Promise<OperationalBlockResult<T>> {
        const blockStart = Date.now();
        
        if (requiresAdmin && !config.isAdminClientEnabled) {
            console.log(`[CockpitAdapter][Block:${name}] Status: degraded_config`);
            return { 
                status: 'degraded_config', 
                data: fallback, 
                code: 'MISSING_ADMIN_CONFIG',
                message: 'Disponible al completar configuración del servidor',
                meta: { durationMs: 0 }
            };
        }

        try {
            const data = await promise;
            const durationMs = Date.now() - blockStart;
            
            const isEmpty = Array.isArray(data) ? data.length === 0 : !data;
            const status = isEmpty ? 'empty' : 'ok';
            const rowCount = Array.isArray(data) ? data.length : undefined;

            console.log(`[CockpitAdapter][Block:${name}] Status: ${status} Duration: ${durationMs}ms`);
            
            return { 
                status, 
                data: data ?? fallback,
                meta: { durationMs, rowCount, source: 'service' }
            };
        } catch (err: unknown) {
            const durationMs = Date.now() - blockStart;
            const normalized = normalizeOperationalError(err);
            
            console.error(`[CockpitAdapter][Block:${name}] Status: degraded_service Code: ${normalized.code} Message: ${normalized.message} Duration: ${durationMs}ms`);
            
            return { 
                status: 'degraded_service', 
                data: fallback, 
                code: normalized.code,
                message: normalized.message,
                meta: { durationMs }
            };
        }
    }

    // Parallel fetch with isolation
    const [kpis, orgs, alerts, metrics] = await Promise.all([
        fetchBlockSafe('KPIs', CockpitService.getGlobalKPIs(), { totalOrgs: 0, issuesCount: 0, activeTrials: 0, inactiveOrgs: 0, timestamp: new Date() }),
        fetchBlockSafe('Orgs', CockpitService.getOrganizationsList(), []),
        fetchBlockSafe('Alerts', AlertsService.getGlobalAlertsSummary(), []),
        fetchBlockSafe('Metrics', MetricsService.getAggregatedMonthlyMetrics(), [])
    ]);

    const totalDuration = Date.now() - startTime;
    console.log(`[CockpitAdapter] Aggregated Load: ${totalDuration}ms`);

    return {
        systemStatus: config.mode === 'operational' ? 'operational' : 'safe_mode',
        loadTimeMs: totalDuration,
        blocks: { kpis, orgs, alerts, metrics }
    };
}

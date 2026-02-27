import prisma from "@/lib/prisma";
import { ActivationService } from "./activation-service";

export interface SloDefinition {
    id: string;
    name: string;
    target: number; // e.g. 0.999 for 99.9%
    windowDays: number; // e.g. 30
}

export interface SloStatus {
    id: string;
    name: string;
    sli: number; // current success rate
    errorBudgetRemaining: number;
    burnRate1h: number;
    burnRate6h: number;
    isAlerting: boolean;
}

export const SLO_DEFINITIONS: Record<string, SloDefinition> = {
    'AUTH_LOGIN': { id: 'AUTH_LOGIN', name: 'Disponibilidad de Login', target: 0.999, windowDays: 30 },
    'BILLING_PAYMENT': { id: 'BILLING_PAYMENT', name: 'Procesamiento de Pagos', target: 0.98, windowDays: 30 },
    'API_CRITICAL': { id: 'API_CRITICAL', name: 'Operaciones Críticas (API)', target: 0.995, windowDays: 30 },
};

export class SloService {
    /**
     * Records a telemetry event for SLO calculation.
     */
    static async recordEvent(sloId: string, success: boolean, organizationId?: string, userId?: string, metadata?: any) {
        const eventName = `TELEMETRY:${sloId}:${success ? 'SUCCESS' : 'FAILURE'}`;
        // Using ActivationService to persist in activationEvent table
        await ActivationService.track(eventName, organizationId || 'SYSTEM', userId, undefined, metadata);
    }

    /**
     * Calculates the current status of all SLOs.
     */
    static async getGlobalStatus(): Promise<SloStatus[]> {
        const statuses: SloStatus[] = [];
        const now = new Date();

        for (const sloId in SLO_DEFINITIONS) {
            const def = SLO_DEFINITIONS[sloId];
            
            // 1. Fetch data for windows
            const [events1h, events6h, events30d] = await Promise.all([
                this.getEvents(sloId, 1),
                this.getEvents(sloId, 6),
                this.getEvents(sloId, def.windowDays * 24)
            ]);

            // 2. Calculate SLI (30d)
            const sli = this.calculateSli(events30d);
            
            // 3. Error Budget Remaining
            const totalEvents = events30d.length;
            const errors = events30d.filter(e => e.eventName.endsWith(':FAILURE')).length;
            const allowedErrors = Math.floor(totalEvents * (1 - def.target));
            const errorBudgetRemaining = totalEvents > 0 
                ? Math.max(0, (allowedErrors - errors) / (allowedErrors || 1)) 
                : 1;

            // 4. Burn Rates
            // Burn rate = (error_rate_in_window) / (allowed_error_rate)
            const allowedErrorRate = 1 - def.target;
            
            const burnRate1h = this.calculateBurnRate(events1h, allowedErrorRate);
            const burnRate6h = this.calculateBurnRate(events6h, allowedErrorRate);

            // 5. Alerting State (Fast/Slow Burn)
            // Fast: 14.4x (Consumes 2% budget in 1h)
            // Slow: 6.0x (Consumes 5% budget in 6h)
            const isAlerting = burnRate1h > 14.4 || burnRate6h > 6.0;

            statuses.push({
                id: sloId,
                name: def.name,
                sli,
                errorBudgetRemaining,
                burnRate1h,
                burnRate6h,
                isAlerting
            });
        }

        return statuses;
    }

    private static async getEvents(sloId: string, hours: number) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        return (prisma as any).activationEvent.findMany({
            where: {
                eventName: { startsWith: `TELEMETRY:${sloId}:` },
                occurredAt: { gte: since }
            }
        });
    }

    private static calculateSli(events: any[]): number {
        if (events.length === 0) return 1;
        const success = events.filter(e => e.eventName.endsWith(':SUCCESS')).length;
        return success / events.length;
    }

    private static calculateBurnRate(events: any[], allowedErrorRate: number): number {
        if (events.length === 0 || allowedErrorRate === 0) return 0;
        const errors = events.filter(e => e.eventName.endsWith(':FAILURE')).length;
        const windowErrorRate = errors / events.length;
        return windowErrorRate / allowedErrorRate;
    }

    /**
     * Synchronizes SLO alerts into SuperadminAlerts.
     */
    static async syncAlerts() {
        const statuses = await this.getGlobalStatus();
        const { AlertsService } = await import("./alerts-service");

        for (const status of statuses) {
            if (status.isAlerting) {
                const burnType = status.burnRate1h > 14.4 ? 'FAST' : 'SLOW';
                const severity = burnType === 'FAST' ? 'CRITICAL' : 'WARNING';
                
                // Idempotency fingerprint
                const fingerprint = `SLO_BURN:${status.id}:${burnType}`;
                
                // We create a SuperadminAlert via AlertsService or directly
                await (prisma as any).superadminAlert.upsert({
                    where: { fingerprint },
                    create: {
                        type: 'SYSTEM_INFO', // We could add a new type but SYSTEM_INFO is a safe fallback
                        severity: severity as any,
                        title: `SLO Burn Rate ${burnType}: ${status.name}`,
                        description: `El SLO ${status.name} está consumiendo su presupuesto de error demasiado rápido. Burn Rate: ${burnType === 'FAST' ? status.burnRate1h.toFixed(1) : status.burnRate6h.toFixed(1)}x.`,
                        fingerprint,
                        status: 'ACTIVE',
                        metadata: {
                            sloId: status.id,
                            burnRate1h: status.burnRate1h,
                            burnRate6h: status.burnRate6h,
                            sli: status.sli,
                            playbook: `/docs/playbooks/slo-${status.id.toLowerCase()}.md`
                        }
                    },
                    update: {
                        description: `El SLO ${status.name} está consumiendo su presupuesto de error demasiado rápido. Burn Rate: ${burnType === 'FAST' ? status.burnRate1h.toFixed(1) : status.burnRate6h.toFixed(1)}x.`,
                        updatedAt: new Date()
                    }
                });
            }
        }
    }
}

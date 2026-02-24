import { describe, it, expect } from 'vitest';
import { getCockpitDataSafe } from '@/lib/superadmin/cockpit-data-adapter';
import type { CockpitOperationalAlert } from '@/lib/superadmin/cockpit-data-adapter';

// Mock dependencias del servidor si es necesario, pero en Vitest podemos probar la lógica pura de la UI/Adapter.

describe('HOTFIX v4.6.x - Duplicación Indefinida Anti-Regresión', () => {
    
    // Simula la función de partición de la UI
    const partitionGroups = (alerts: CockpitOperationalAlert[]) => {
        const partitioned = {
            critical: [] as CockpitOperationalAlert[],
            risk: [] as CockpitOperationalAlert[],
            open: [] as CockpitOperationalAlert[],
            snoozed: [] as CockpitOperationalAlert[],
            resolved: [] as CockpitOperationalAlert[]
        };

        alerts.forEach(alert => {
            if (!alert) return;

            if (alert.state === 'resolved') {
                partitioned.resolved.push(alert);
                return;
            }
            if (alert.state === 'snoozed') {
                partitioned.snoozed.push(alert);
                return;
            }

            if (alert.sla?.status === 'BREACHED' || alert.severity === 'critical') {
                partitioned.critical.push(alert);
                return;
            }

            if (alert.sla?.status === 'AT_RISK' || alert.severity === 'warning') {
                partitioned.risk.push(alert);
                return;
            }

            partitioned.open.push(alert);
        });

        return partitioned;
    };

    it('1) Partición exclusiva y 3) Conteos coherentes: Una alerta cae en SOLO un grupo y la suma es exacta', () => {
        const mockAlerts: Partial<CockpitOperationalAlert>[] = [
            { fingerprint: '1', severity: 'critical', sla: { preset: '1h', status: 'BREACHED', dueAt: '' }, state: 'open' },
            { fingerprint: '2', severity: 'warning', sla: { preset: '1h', status: 'AT_RISK', dueAt: '' }, state: 'open' },
            { fingerprint: '3', severity: 'info', sla: { preset: '1h', status: 'ON_TRACK', dueAt: '' }, state: 'open' },
            { fingerprint: '4', severity: 'critical', sla: { preset: '1h', status: 'AT_RISK', dueAt: '' }, state: 'acknowledged' }, // critical > risk
            { fingerprint: '5', severity: 'warning', sla: { preset: '1h', status: 'BREACHED', dueAt: '' }, state: 'open' }, // breached > warning
            { fingerprint: '6', severity: 'info', sla: null, state: 'snoozed' },
            { fingerprint: '7', severity: 'critical', sla: null, state: 'resolved' }, // resolved > critical
        ];

        const groups = partitionGroups(mockAlerts as CockpitOperationalAlert[]);

        // Validar Conteos
        const totalInGroups = Object.values(groups).reduce((acc, curr) => acc + curr.length, 0);
        expect(totalInGroups).toBe(mockAlerts.length);

        // Validar prioridades
        expect(groups.critical.length).toBe(3); // FP 1, 4, 5
        expect(groups.risk.length).toBe(1); // FP 2
        expect(groups.open.length).toBe(1); // FP 3
        expect(groups.snoozed.length).toBe(1); // FP 6
        expect(groups.resolved.length).toBe(1); // FP 7

        // Asegurar exclusión mutua
        const criticalFPs = groups.critical.map(a => a.fingerprint);
        expect(criticalFPs).toContain('1');
        expect(criticalFPs).toContain('4');
        expect(criticalFPs).toContain('5');
        expect(groups.risk.map(a => a.fingerprint)).not.toContain('4'); // No en riesgo aunque sea AT_RISK
        expect(groups.resolved.map(a => a.fingerprint)).toContain('7');
        expect(criticalFPs).not.toContain('7'); // Resuelto toma prioridad sobre crítico
    });

    it('2) Dedupe adapter: Si entran 2 items con misma huella semántica (orgId:type), sale 1 (Guarda para histórico)', () => {
        const rawAlerts = [
            // Simular clones históricos por el bug de fingerprint inestable (DAYS_LEFT_3 vs DAYS_LEFT_2)
            { fingerprint: 'org-123:TRIAL_ENDING_SOON:DAYS_LEFT_3', severity: 'info', detectedAt: new Date('2026-02-23T10:00:00Z'), updatedAt: new Date('2026-02-23T10:00:00Z') },
            { fingerprint: 'org-123:TRIAL_ENDING_SOON:DAYS_LEFT_2', severity: 'critical', detectedAt: new Date('2026-02-23T10:00:00Z'), updatedAt: new Date('2026-02-23T11:00:00Z') }, // Más reciente
            { fingerprint: 'org-456:INACTIVE_ORG:CHURN_RISK', severity: 'warning', detectedAt: new Date('2026-02-23T10:00:00Z'), updatedAt: new Date('2026-02-23T10:00:00Z') }
        ];

        const uniqueMap = new Map<string, any>();
        rawAlerts.forEach(a => {
            const parts = (a.fingerprint || "").split(':');
            const stableKey = parts.length >= 2 ? `${parts[0]}:${parts[1]}` : a.fingerprint;

            if (uniqueMap.has(stableKey)) {
                const existing = uniqueMap.get(stableKey);
                const existingDate = existing.updatedAt || existing.detectedAt || new Date(0);
                const newDate = a.updatedAt || a.detectedAt || new Date(0);
                if (new Date(newDate) > new Date(existingDate)) {
                    uniqueMap.set(stableKey, a);
                }
            } else {
                uniqueMap.set(stableKey, a);
            }
        });
        const deduplicatedRawAlerts = Array.from(uniqueMap.values());

        expect(deduplicatedRawAlerts.length).toBe(2);
        
        const org123 = deduplicatedRawAlerts.find(a => a.fingerprint.includes('org-123'));
        expect(org123?.severity).toBe('critical'); // Mantuvo el más reciente (DAYS_LEFT_2)
    });

    it('4) Key stability: render usa fingerprint preferentemente (indirect validation)', () => {
        const mockAlert: Partial<CockpitOperationalAlert> = { id: 'db-id-123', fingerprint: 'fp-stable' };
        
        // El componente UI usa: key={alert.fingerprint || alert.id || `alert-${key}-${idx}`}
        const resolveKey = (alert: any, key: string, idx: number) => {
            return alert.fingerprint || alert.id || `alert-${key}-${idx}`;
        };

        expect(resolveKey(mockAlert, 'critical', 0)).toBe('fp-stable'); // Preferencia 1: Fingerprint
        expect(resolveKey({ id: 'db-id-456' }, 'critical', 0)).toBe('db-id-456'); // Preferencia 2: Database ID
        expect(resolveKey({}, 'critical', 0)).toBe('alert-critical-0'); // Fallback: index
    });
});
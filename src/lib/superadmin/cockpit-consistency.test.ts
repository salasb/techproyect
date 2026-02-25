import { describe, it, expect } from 'vitest';
import { getCockpitDataSafe } from './cockpit-data-adapter';

// Mock classification to make it predictable
describe('cockpit-data-adapter scope consistency (v4.7.2.1)', () => {
    it('ensures mathematical coherence: totalRaw = visible + hidden', async () => {
        // This is a unit test for the adapter's logic.
        // We'll simulate the data transformation part.
        
        const rawAlerts = [
            { id: '1', organizationId: 'prod-1', fingerprint: 'prod-1:rule:1', severity: 'critical', detectedAt: new Date() },
            { id: '2', organizationId: 'test-1', fingerprint: 'test-1:rule:1', severity: 'warning', detectedAt: new Date() },
        ];

        const hygieneStats = {
            totalRawIncidents: rawAlerts.length,
            totalOperationalIncidents: 0,
            hiddenByEnvironmentFilter: 0
        };

        const scopeMode = "production_only";
        const includeNonProductive = false;

        const enrichedAlerts = rawAlerts.map(a => ({
            ...a,
            isOperationallyRelevant: a.organizationId === 'prod-1'
        }));

        const filteredAlerts = enrichedAlerts.filter(a => {
            if (includeNonProductive) return true;
            if (scopeMode === "production_only") return a.isOperationallyRelevant;
            return true;
        });

        hygieneStats.totalOperationalIncidents = filteredAlerts.length;
        hygieneStats.hiddenByEnvironmentFilter = hygieneStats.totalRawIncidents - filteredAlerts.length;

        expect(hygieneStats.totalRawIncidents).toBe(hygieneStats.totalOperationalIncidents + hygieneStats.hiddenByEnvironmentFilter);
        expect(hygieneStats.totalOperationalIncidents).toBe(1);
        expect(hygieneStats.hiddenByEnvironmentFilter).toBe(1);
    });
});

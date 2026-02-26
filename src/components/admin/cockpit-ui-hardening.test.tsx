import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { SuperadminTriagePanel } from './SuperadminV2Components';

describe('SuperadminTriagePanel Hygiene Card (v4.7.2.3)', () => {
    it('renders exactly one hygiene card when filter is active', () => {
        const stats = { total: 10, open: 5, critical: 2, breached: 1, snoozed: 2 };
        const hygiene = { totalRawIncidents: 100, totalOperationalIncidents: 10, hiddenByEnvironmentFilter: 90 };
        
        const html = renderToString(
            <SuperadminTriagePanel 
                stats={stats} 
                hygiene={hygiene}
                includeNonProductive={false}
            />
        );

        // Count occurrences of the test id
        const count = (html.match(/data-testid="hygiene-card"/g) || []).length;
        expect(count).toBe(1);
    });

    it('renders zero hygiene cards when filter is zero', () => {
        const stats = { total: 10, open: 5, critical: 2, breached: 1, snoozed: 2 };
        const hygiene = { totalRawIncidents: 10, totalOperationalIncidents: 10, hiddenByEnvironmentFilter: 0 };
        
        const html = renderToString(
            <SuperadminTriagePanel 
                stats={stats} 
                hygiene={hygiene}
                includeNonProductive={false}
            />
        );

        const count = (html.match(/data-testid="hygiene-card"/g) || []).length;
        expect(count).toBe(0);
    });
});

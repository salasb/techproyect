import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { SuperadminTriagePanel } from './SuperadminV2Components';

describe('SuperadminTriagePanel Hygiene Card (v4.8.0)', () => {
    it('renders ZERO hygiene cards even when filter is active (moved to page level)', () => {
        const stats = { total: 10, open: 5, critical: 2, breached: 1, snoozed: 2 };
        const hygiene = { totalRawIncidents: 100, totalOperationalIncidents: 10, hiddenByEnvironmentFilter: 90 };
        
        const html = renderToString(
            <SuperadminTriagePanel 
                stats={stats} 
                includeNonProductive={false}
            />
        );

        // Should be 0 now as it moved to page.tsx
        const count = (html.match(/data-testid="hygiene-card"/g) || []).length;
        expect(count).toBe(0);
    });
});

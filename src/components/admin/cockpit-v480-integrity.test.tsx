import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { SuperadminTriagePanel, PlaybookExecutionPanel } from './SuperadminV2Components';

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

describe('PlaybookExecutionPanel (v4.8.0)', () => {
    it('renders correct progress text', () => {
        const alert: any = {
            ruleCode: 'BILLING_NOT_CONFIGURED',
            fingerprint: 'org:alert',
            playbookSteps: [
                { stepId: 'verify_plan', checked: true, checkedBy: 'test@user.com' }
            ]
        };

        const html = renderToString(
            <PlaybookExecutionPanel alert={alert} onClose={() => {}} />
        );

        // BILLING_NOT_CONFIGURED has 3 steps. With 1 checked, should show "1 / 3"
        // Using regex to handle React SSR comment markers <!-- -->
        expect(html).toMatch(/1.*\/.*3/);
        expect(html).toContain('completados');
    });
});

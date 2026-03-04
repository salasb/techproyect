import { test, expect } from '@playwright/test';
import { COCKPIT_CONTRACT_VERSION } from '../src/lib/versions';

/**
 * Cockpit v4.7.2 Smoke Test
 * Goal: Verify superadmin access and UI integrity.
 */
test.describe('Global Cockpit v4.7.2 Smoke Suite', () => {

    test.beforeEach(async ({ page }) => {
        // Assume auth setup is handled via storageState (auth.setup.ts)
        // If not, this test will fail on redirect to /login
    });

    test('Superadmin can access /admin and see correct version', async ({ page }) => {
        await page.goto('/admin');
        
        // 1. Verify H1 version
        const h1 = page.locator('h1');
        await expect(h1).toContainText(`Global Cockpit v${COCKPIT_CONTRACT_VERSION}`);
        
        // 2. Verify Operational Badge
        const badge = page.getByTestId('cockpit-global-mode-badge');
        await expect(badge).toBeVisible();
    });

    test('Debug overlay is hidden by default and shown with ?debugCockpit=1', async ({ page }) => {
        // Hidden by default
        await page.goto('/admin');
        const overlay = page.locator('text=FORENSICS OVERLAY');
        await expect(overlay).not.toBeVisible();

        // Shown with query param
        await page.goto('/admin?debugCockpit=1');
        await expect(page.locator('text=FORENSICS OVERLAY')).toBeVisible();
    });

    test('Cockpit UI elements are interactive', async ({ page }) => {
        await page.goto('/admin');
        
        // Operational KPIs should be visible
        const kpis = page.getByTestId('cockpit-operational-kpis');
        await expect(kpis).toBeVisible();

        // Triage Panel should load
        const triage = page.getByTestId('cockpit-triage-panel');
        await expect(triage).toBeVisible();
    });
});

import { test, expect } from '@playwright/test';

const authFileSuperadmin = 'playwright/.auth/superadmin.json';
const authFileAdmin = 'playwright/.auth/admin.json';

test.describe('Superadmin Global Cockpit v2.0', () => {

    test('Superadmin can access the global cockpit v2.0 and view alerts & metrics', async ({ page }) => {
        // Use Superadmin storage state
        const authData = JSON.parse(require('fs').readFileSync(authFileSuperadmin, 'utf-8'));
        await page.context().addCookies(authData.cookies);

        await page.goto('/admin');

        // 1. Verify Identity & Role Badge
        await expect(page.getByTestId('user-identity-chip')).toBeVisible();
        await expect(page.getByTestId('user-role-badge')).toBeVisible();
        await expect(page.getByTestId('global-mode-badge')).toBeVisible();

        // 2. Verify Cockpit v2.0 Header
        await expect(page.locator('h1:has-text("Global Cockpit v2.0")')).toBeVisible();
        await expect(page.locator('text=Gestión proactiva')).toBeVisible();

        // 3. Verify v2.0 Specific Components
        // Notification Bell
        await expect(page.locator('button.relative:has(.lucide-bell)')).toBeVisible();

        // Metrics Chart Title
        await expect(page.locator('text=Rendimiento Mensual TechWise')).toBeVisible();

        // 4. Verify organizations list still renders
        const orgRows = page.locator('table tbody tr');
        await expect(orgRows.first()).toBeVisible();
    });

    test('Superadmin can open notification center', async ({ page }) => {
        const authData = JSON.parse(require('fs').readFileSync(authFileSuperadmin, 'utf-8'));
        await page.context().addCookies(authData.cookies);
        await page.goto('/admin');

        // Trigger notification center
        await page.locator('button.relative:has(.lucide-bell)').click();

        // Check content
        await expect(page.locator('h4:has-text("Notificaciones")')).toBeVisible();
    });

    test('Superadmin can safely enter organization context and return to v2.0', async ({ page }) => {
        const authData = JSON.parse(require('fs').readFileSync(authFileSuperadmin, 'utf-8'));
        await page.context().addCookies(authData.cookies);

        await page.goto('/admin');

        // Find an org in the list
        const firstRow = page.locator('table tbody tr').first();
        const firstOrgName = await firstRow.locator('td').first().locator('div.text-sm.font-bold').innerText();
        console.log(`Testing context switch for: ${firstOrgName}`);

        // View detail
        await firstRow.locator('a[href*="/admin/orgs/"]').click();
        await page.waitForURL('**/admin/orgs/**');

        // Enter Context
        await page.getByRole('button', { name: 'Entrar a Contexto' }).click();

        // Redirect to dashboard
        await page.waitForURL('**/dashboard**', { timeout: 15000 });

        // Validate Banner and Context Identity
        await expect(page.getByTestId('local-context-banner')).toBeVisible();
        await expect(page.getByTestId('local-context-org-name')).toContainText(firstOrgName);
        await expect(page.getByTestId('user-role-badge')).toBeVisible();

        // Return to Cockpit
        await page.getByTestId('back-to-cockpit-button').click();
        await page.waitForURL('**/admin');
        await expect(page.getByTestId('global-mode-badge')).toBeVisible();
    });

    test('Non-Superadmin is restricted from v2.0 cockpit', async ({ page }) => {
        const authData = JSON.parse(require('fs').readFileSync(authFileAdmin, 'utf-8'));
        await page.context().addCookies(authData.cookies);

        await page.goto('/admin');

        // Should not see the specific v2.0 title
        await expect(page.locator('text=Global Cockpit v2.0')).not.toBeVisible();
    });
});

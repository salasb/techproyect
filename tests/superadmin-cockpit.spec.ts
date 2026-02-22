import { test, expect } from '@playwright/test';

const authFileSuperadmin = 'playwright/.auth/superadmin.json';
const authFileAdmin = 'playwright/.auth/admin.json';

test.describe('Superadmin Global Cockpit v1.9', () => {

    test('Superadmin can access the global cockpit and view organization list', async ({ page }) => {
        // Use Superadmin storage state
        await page.context().addCookies(JSON.parse(require('fs').readFileSync(authFileSuperadmin, 'utf-8')).cookies);

        await page.goto('/admin');

        // 1. Verify Cockpit Elements
        await expect(page.locator('h1:has-text("Global Cockpit v1.9")')).toBeVisible();
        await expect(page.locator('text=Estado Operativo Global')).toBeVisible();

        // 2. Verify organizations list
        const orgRows = page.locator('table tbody tr');
        await expect(orgRows.first()).toBeVisible();

        // 3. Navigate to detail - Using the specific icon/link
        await orgRows.first().locator('a[href*="/admin/orgs/"]').click();
        await page.waitForURL('**/admin/orgs/**');

        // Use more robust text search
        await expect(page.getByText('Identificación', { exact: false })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Billing & Stripe', { exact: false })).toBeVisible();
    });

    test('Superadmin can safely enter organization context', async ({ page }) => {
        await page.context().addCookies(JSON.parse(require('fs').readFileSync(authFileSuperadmin, 'utf-8')).cookies);

        await page.goto('/admin');

        const firstRow = page.locator('table tbody tr').first();
        // Extract name carefully from the first cell using a more specific selector
        const firstOrgName = await firstRow.locator('td').first().locator('div.text-sm.font-bold').innerText();
        console.log(`Testing with Org: ${firstOrgName}`);

        // Go to detail
        await firstRow.locator('a[href*="/admin/orgs/"]').click();
        await page.waitForURL('**/admin/orgs/**');

        // Click "Entrar a Contexto"
        await page.getByRole('button', { name: 'Entrar a Contexto' }).click();

        // Should redirect to dashboard
        await page.waitForURL('**/dashboard**', { timeout: 15000 });

        // 4. Verify OperatingContextBanner
        await expect(page.locator('text=Modo Superadmin')).toBeVisible();
        // Check if the org name is in the banner - Use a simpler text lookup
        await expect(page.locator('div:has-text("Operando en:")')).toContainText(firstOrgName);

        // 5. Return to Cockpit
        await page.getByRole('link', { name: 'Volver al Cockpit' }).click();
        await page.waitForURL('**/admin');
        await expect(page.locator('h1:has-text("Global Cockpit v1.9")')).toBeVisible();
    });

    test('Non-Superadmin is restricted from accessing the cockpit', async ({ page }) => {
        // Use regular Admin storage state
        await page.context().addCookies(JSON.parse(require('fs').readFileSync(authFileAdmin, 'utf-8')).cookies);

        await page.goto('/admin');

        // Expect a redirect or 403 (depending on middleware/resolver)
        // Based on previous knowledge, it likely redirects to dashboard or shows an error.
        // Let's check for the absence of the cockpit header
        await expect(page.locator('text=Global Cockpit v1.9')).not.toBeVisible();
    });
});

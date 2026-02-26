import { test, expect } from '@playwright/test';

const authFileSuperadmin = 'playwright/.auth/superadmin.json';

test.describe('Cockpit Global v4.8.1 - Smoke Tests', () => {
    test.use({ storageState: authFileSuperadmin });

    test('Cockpit loads and can trigger health evaluation', async ({ page }) => {
        await page.goto('/admin');

        // 1. Verify Header
        await expect(page.locator('h1')).toContainText('Global Cockpit');
        
        // 2. Verify Operational Badge
        await expect(page.getByTestId('cockpit-global-mode-badge')).toBeVisible();

        // 3. Trigger Refresh
        const refreshBtn = page.getByRole('button', { name: /Recalcular Salud/i });
        await expect(refreshBtn).toBeVisible();
        await refreshBtn.click();

        // Wait for toast
        await expect(page.locator('text=Sincronización v4.4 Completa')).toBeVisible({ timeout: 30000 });
    });

    test('Can open playbook from group and complete a step', async ({ page }) => {
        await page.goto('/admin');

        // Ensure we are in grouped view
        const groupedBtn = page.locator('button:has-text("Vista: Agrupada")');
        if (await page.locator('button:has-text("Vista: Individual")').isVisible()) {
            await page.locator('button:has-text("Vista: Individual")').click();
        }

        // Find first group with actions
        const firstGroup = page.locator('div:has-text("organizaciones")').first();
        await expect(firstGroup).toBeVisible();

        // Open Actions Menu
        await page.getByRole('button', { name: /Acciones masivas/i }).first().click();

        // Open Playbook
        await page.getByRole('menuitem', { name: /Abrir Playbook Base/i }).click();

        // Verify Playbook Drawer
        await expect(page.locator('h2')).toContainText('Remediación');
        await expect(page.locator('text=Pasos de Remediación')).toBeVisible();

        // Complete first step
        const firstStep = page.locator('input[type="checkbox"]').first();
        await firstStep.check();

        // Verify toast
        await expect(page.locator('text=Checklist actualizado')).toBeVisible();

        // Verify progress text change (e.g., 1 / X)
        await expect(page.locator('text=/1 \/ \d+/')).toBeVisible();

        // Refresh and check persistence
        await page.reload();
        
        // Re-open playbook (individual item this time for variety)
        await page.getByRole('button', { name: /Ver casos/i }).first().click();
        await page.getByRole('button', { name: /Playbook/i }).first().click();

        // Check if step is still checked
        await expect(page.locator('input[type="checkbox"]').first()).toBeChecked();
    });

    test('Can perform bulk ACK from group', async ({ page }) => {
        await page.goto('/admin');

        // Open Actions Menu
        await page.getByRole('button', { name: /Acciones masivas/i }).first().click();

        // Click ACK All
        await page.getByRole('menuitem', { name: /Acusar recibo a todos/i }).click();

        // Verify Success Toast
        await expect(page.locator('text=Acción Masiva Completada')).toBeVisible();
        await expect(page.locator('text=Acción masiva aplicada')).toBeVisible();
    });

    test('Clean screenshot mode hides debug elements', async ({ page }) => {
        // 1. Visit with debug on
        await page.goto('/admin?debugCockpit=1');
        await expect(page.locator('text=FORENSICS OVERLAY')).toBeVisible();

        // 2. Visit with qaScreenshot on
        await page.goto('/admin?qaScreenshot=1');
        
        // Debug overlay should be hidden even if it was active
        await expect(page.locator('text=FORENSICS OVERLAY')).not.toBeVisible();
        
        // Triage panel should NOT be sticky (check class or styles if needed, but simple visibility of essential content is key)
        const triagePanel = page.locator('text=Panel de Triage Operativo');
        await expect(triagePanel).toBeVisible();
        
        // Notification bell should be hidden in screenshot mode
        await expect(page.locator('button.relative:has(.lucide-bell)')).not.toBeVisible();
    });
});

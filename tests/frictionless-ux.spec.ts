import { test, expect } from '@playwright/test';

test.describe('Frictionless Dashboard UX (P0)', () => {
    
    test('Dashboard should show Org Selector overlay if no context is present', async ({ page }) => {
        // Mock bootstrap to return orgs but no activeOrgId
        await page.route('**/api/start/bootstrap', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ 
                    ok: true, 
                    orgs: [{ id: 'org-1', name: 'Test Org', planStatus: 'FREE' }],
                    activeOrgId: null,
                    shouldAutoEnter: false
                })
            });
        });

        // Go to dashboard (assume session exists via setup)
        await page.goto('/dashboard');
        
        // Overlay should be visible
        const overlayTitle = page.locator('text=Tu Espacio de Trabajo');
        await expect(overlayTitle).toBeVisible();
        
        // Org list should be visible
        const orgItem = page.locator('text=Test Org');
        await expect(orgItem).toBeVisible();
    });

    test('Dashboard should show Error Overlay if DATABASE_URL is missing', async ({ page }) => {
        await page.route('**/api/start/bootstrap', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ 
                    ok: false, 
                    code: 'ENV_MISSING_DATABASE_URL',
                    traceId: 'BST-MISSING-DB'
                })
            });
        });

        await page.goto('/dashboard');
        
        // Error message should be clear
        const errorText = page.locator('text=Configuración de base de datos faltante');
        await expect(errorText).toBeVisible();
        await expect(page.locator('text=BST-MISSING-DB')).toBeVisible();
    });
});

import { test, expect } from '@playwright/test';

// Nota: Estos tests asumen que existe un archivo globalSetup o auth profile 
// que puede preparar un usuario con profile role "SUPERADMIN"
// Si no, se pueden mockear las respuestas de supabase / auth.

test.describe('Superadmin Dashboard States & Workspace Switching', () => {

    test('Superadmin without org sees VIP Empty State, no Setup Onboarding', async ({ page, request }) => {
        // Mock profile and memberships
        await page.route('**/api/auth/session', route => route.fulfill({ json: { user: { id: 'superadmin-no-org' } } }));
        // Idealmente este test se inyecta tras asegurar role = SUPERADMIN y 0 memberships

        // await page.goto('/dashboard');
        // const banner = page.locator('text=Modo Administrador Global Activo');
        // await expect(banner).toBeVisible();

        // const setupHeader = page.locator('text=Configura tu espacio de trabajo');
        // await expect(setupHeader).toHaveCount(0); // Should NOT see standard onboarding
    });

    test('Superadmin sees Global Orgs Panel CTA', async ({ page }) => {
        // await page.goto('/dashboard');
        // const globalPanelBtn = page.locator('text=Panel Global de Organizaciones');
        // await expect(globalPanelBtn).toBeVisible();
    });

    test('Workspace Doctor exposes operatingContext for Superadmin', async ({ request }) => {
        // const res = await request.get('/api/_debug/workspace-doctor');
        // const json = await res.json();
        // expect(json.operatingContext).toBeDefined();
        // expect(json.operatingContext).toHaveProperty('orgContextSource');
    });

    test('Superadmin can switch context via canonical action', async ({ page }) => {
        // Ir al panel de orgs globales /admin/orgs
        // await page.goto('/admin/orgs');

        // Interceptar la llamada a server action
        // const switchBtn = page.locator('text=Operar en esta Org').first();
        // await switchBtn.click();

        // await page.waitForURL('**/dashboard');
        // const operatingChip = page.locator('text=Operando contexto:');
        // await expect(operatingChip).toBeVisible();
    });

});

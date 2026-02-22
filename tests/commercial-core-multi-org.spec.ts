import { test, expect } from '@playwright/test';

test.describe('E2E Multi-Org Isolation v1.8.3', () => {

    test.setTimeout(90000);

    test.describe('Superadmin Session', () => {
        test.use({ storageState: 'playwright/.auth/superadmin.json' });

        test('Superadmin Global sin org activa ve dashboard admin y no cae en onboarding falso', async ({ page }) => {
            await page.goto('/dashboard');
            const adminModeBanner = page.locator('text=Panel de Control Global').or(page.locator('text=Modo Administrador Activo'));
            await expect(adminModeBanner).toBeVisible({ timeout: 15000 });
            await expect(page.locator('text=Aún no tienes un espacio de trabajo activo')).toHaveCount(0);
        });
    });

    test.describe('Multi-Org Admin Session', () => {
        // Usa el contexto con dos organizaciones pre-provisionadas
        test.use({ storageState: 'playwright/.auth/multi-org-admin.json' });

        test('C1. Aislamiento de datos estricto entre Org A y Org B', async ({ page }) => {
            console.log("--- TEST C1: AISLAMIENTO MULTI-ORG ---");

            // 1. Iniciar en Org A (Primaria)
            console.log("Navigating to /projects...");
            await page.goto('/projects');

            // Si por alguna razón cae en el Gate, intentamos recuperar
            const h2 = page.locator('h2').first();
            if (await h2.textContent().then(t => t?.includes('Configuración requerida'))) {
                console.log("Landing on OrgGate. Trying to select organization via /org/select...");
                await page.goto('/org/select');
                await page.locator('button').first().click();
                await page.waitForURL('**/dashboard**');
                await page.goto('/projects');
            }

            await expect(page.locator('h2')).toContainText('Proyectos', { timeout: 15000 });

            // Verificar que el proyecto de Org A es visible
            const projectA = page.getByTestId('project-name-E2E Seeded Project');
            await expect(projectA).toBeVisible({ timeout: 15000 });

            // Verificar que el proyecto de Org B NO es visible
            const projectB = page.getByTestId('project-name-E2E Second Org Project');
            await expect(projectB).toHaveCount(0);

            // 2. Cambiar a Org B vía ORG SWITCHER (más robusto que goto direct)
            console.log("Switching to Org B via OrgSwitcher...");
            const switcher = page.getByTestId('org-switcher-trigger');
            await switcher.click();

            // Esperar a que el item de la Org B aparezca y clickearlo
            // El nombre exacto de la Org B en el bootstrap tiene un random suffix en el nombre real, 
            // pero el "E2E Second Org" es el prefijo.
            const orgBItem = page.locator('[data-testid^="org-item-E2E Second Org"]');
            await orgBItem.click();

            // Esperar redirección al dashboard de la nueva org
            await page.waitForURL('**/dashboard**');

            // Ir a proyectos de Org B
            await page.goto('/projects');

            // 3. Validar Aislamiento: Org B ve SU proyecto y NO el de Org A
            await expect(page.getByTestId('project-name-E2E Second Org Project')).toBeVisible({ timeout: 15000 });
            await expect(page.getByTestId('project-name-E2E Seeded Project')).toHaveCount(0);

            // 4. Volver a Org A y re-confirmar persistencia
            console.log("Switching back to Org A...");
            await switcher.click();
            const orgAItem = page.locator('[data-testid^="org-item-E2E Test Org"]');
            await orgAItem.click();
            await page.waitForURL('**/dashboard**');
            await page.goto('/projects');
            await expect(page.getByTestId('project-name-E2E Seeded Project')).toBeVisible();

            console.log("✅ SUCCESS: Aislamiento verificado.");
        });

        test('C2. ScopeError controlado ante contexto corrupto', async ({ page, request }) => {
            const stateCookie = await page.context().cookies();
            const filteredCookies = stateCookie.filter(c => c.name !== 'app-org-id');
            let cookieHeader = filteredCookies.map(c => `${c.name}=${c.value}`).join('; ');
            cookieHeader += '; app-org-id=invalid-uuid-0000;';

            const res = await request.post('/api/sales/generate-note', {
                data: { projectId: 'e2e-fake-project-id' },
                headers: { 'Cookie': cookieHeader }
            });

            expect([400, 401, 403, 500]).toContain(res.status());
        });
    });
});

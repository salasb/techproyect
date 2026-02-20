import { test, expect } from '@playwright/test';

test.describe('Domain Hop Workspace Resolution (Smoke)', () => {

    test('Usuario con 1 Org que pierde cookie -> Autoselecciona', async ({ page }) => {
        // En un test real habría que sembrar la Base de datos con usuario de exactamente 1 Org y Profile.organizationId 
        // y NO mandar la cookie app-org-id (simulando que venimos de otro subdominio)

        // Simular borrado de cookie de la URL principal
        await page.context().clearCookies();

        await page.goto('/dashboard');

        // El Resolver en Node Runtime debe detectar cookies empty pero memberships.length === 1
        // por lo tanto, forzará la organización, recreará la cookie y la inyectará en Layout.
        // No deberíamos ver el modal o banner que pide "Seleccionar Organización" forzosamente
        const setupBanner = page.locator('text=Aún no tienes un espacio de trabajo activo');
        await expect(setupBanner).toHaveCount(0);

        // Debería ver el dashboard normal de su única empresa
        await expect(page.locator('button', { hasText: 'Seleccionar Org' }).or(page.locator('button:has(.lucide-building-2)'))).toBeVisible();
    });

    test('Usuario con N Orgs que pierde cookie y NO tiene LastActiveOrg congruente -> Pide Seleccion', async ({ page }) => {
        await page.context().clearCookies();
        await page.goto('/dashboard');

        // El Resolver en Node Runtime al ver activeMemberships.length > 1 y sin cookie válida,
        // resolverá activeOrgId = null. 
        // Por ende el Dashboard debe mostrar el banner flotante obligando a escoger.

        // Caso B: orgId null + hasOrganizations true => muestra selector "Sesión de trabajo no especificada"
        const forceSelector = page.locator('text=Sesión de trabajo no especificada');
        await expect(forceSelector).toBeVisible();

        // Verifica que no aparezca el setup banner de usuario nuevo
        const setupBanner = page.locator('text=Aún no tienes un espacio de trabajo activo');
        await expect(setupBanner).toHaveCount(0);

        await expect(page).toHaveURL(/.*dashboard/);
    });
});

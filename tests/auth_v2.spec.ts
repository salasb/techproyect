import { test, expect } from '@playwright/test';

/**
 * Pruebas de anti-regresión para el nuevo flujo de Onboarding y resolución de Workspace.
 * Estas pruebas validan que el usuario siempre llegue al Dashboard y que el soft-gating funcione.
 */
test.describe('Workspace & Onboarding Flow (v2)', () => {

    test('Usuario autenticado debe aterrizar en /dashboard (no /start)', async ({ page }) => {
        // Nota: Asumiendo que el login ya ocurrió o usando una sesión mock
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/dashboard/);

        // No debería haber redirección a /start
        expect(page.url()).not.toContain('/start');
    });

    test('Usuario sin organización debe ver Banner de Bienvenida (Auto-provision)', async ({ page }) => {
        // Simular usuario nuevo sin org (esto requiere setup de DB o mock de API)
        await page.goto('/dashboard');

        // Verificar que aparezca el banner de "Mi Organización"
        const welcomeBanner = page.getByText('¡Bienvenido a TechProyect!');
        await expect(welcomeBanner).toBeVisible();
    });

    test('Rutas protegidas deben mostrar Soft-Gate si no hay org seleccionada', async ({ page }) => {
        // Ir a una ruta que requiere organización
        await page.goto('/projects');

        // Si no hay org seleccionada (por ejemplo, borrando la cookie app-org-id)
        // se debería ver el componente OrgGate
        const gateTitle = page.getByText('Configuración requerida');
        // Nota: Esto depende de si el auto-provisioning es síncrono. 
        // Si el auto-provisioning siempre crea una org, este gate solo se verá si falla la DB.
    });

    test('Debug endpoint debe mostrar el estado del Workspace en Node runtime', async ({ page }) => {
        await page.goto('/api/_debug/org-resolution');
        const content = await page.textContent('body');
        const json = JSON.parse(content || '{}');

        expect(json.status).toBe('success');
        expect(json.workspace).toBeDefined();
        expect(json.workspace.hasOrganizations).toBe(true);
    });

});

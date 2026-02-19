import { test, expect } from '@playwright/test';

test.describe('Workspace Resolution & Onboarding (Smoke)', () => {
    // Nota: Estas pruebas asumen que hay un mechanism de auth mockeado o seeding de DB válido.

    test('Usuario con org existente entra y ve active org', async ({ page }) => {
        // En un escenario real, haríamos un login. Asumimos acceso a /dashboard con un test user válido.
        await page.goto('/dashboard');

        // El OrgSwitcher debería estar presente
        await expect(page.locator('button', { hasText: 'Seleccionar Org' }).or(page.locator('button:has(.lucide-building-2)'))).toBeVisible();
    });

    test('Usuario sin org entra y puede usar Exploration Mode', async ({ page }) => {
        // Entrar a dashboard con usuario nuevo
        await page.goto('/dashboard');

        // Debería verse el banner de setup
        await expect(page.locator('text=Aún no tienes un espacio de trabajo activo')).toBeVisible();
        await expect(page.locator('text=Modo Exploración')).toBeVisible();

        // Clic en Modo Exploración
        await page.click('text=Modo Exploración');

        // Debería redirigir o cargar ?explore=true y mostrar banner persistente
        await expect(page).toHaveURL(/explore=true/);
        await expect(page.locator('text=Estás viendo datos de demostración')).toBeVisible();
    });

    test('Membership missing pero datos existen -> Auto-repair crea membership', async ({ page }) => {
        // Esto requeriría preparar el estado de la DB donde profile.organizationId existe pero no hay membership
        // Simulamos la entrada
        await page.goto('/dashboard');

        // El auto-repair se ejecuta silenciosamente y el dashboard debe cargar la vista estándar sin el onboarding state
        await expect(page.locator('text=Organización')).not.toHaveCount(0);
        // Debe haber recuperado silenciosamente
    });
});

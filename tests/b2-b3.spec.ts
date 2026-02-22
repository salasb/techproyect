import { test, expect } from '@playwright/test';

test.describe('B2 & B3 Validación', () => {

    test('B2. Cambio de contexto y B3. Contexto inválido', async ({ page, request }) => {
        // Asume que estamos usando storageState del ADMIN (tiene 1 org)
        await page.goto('/dashboard');
        await expect(page.locator('h2', { hasText: 'Command Center' })).toBeVisible();

        // Obtener el ID de la organización activa desde la cookie
        const cookies = await page.context().cookies();
        const activeOrgCookie = cookies.find(c => c.name === 'app-org-id');
        expect(activeOrgCookie).toBeDefined();

        // B3: Simular un "app-org-id" inválido/fantasma (UUID inexistente)
        await page.context().addCookies([{
            name: 'app-org-id',
            value: '00000000-0000-0000-0000-000000000000',
            domain: activeOrgCookie!.domain,
            path: '/'
        }]);

        await page.goto('/dashboard');

        // Debería recuperar silenciosamente si el resolver auto-asigna su única org, 
        // o pedir seleccionar la org. En TechProyect con 1 org y cookie inválida, 
        // autoselecciona la org válida de sus memberships.
        await expect(page.locator('h2', { hasText: 'Command Center' })).toBeVisible();

        // Verificar que la cookie fue corregida
        const newCookies = await page.context().cookies();
        const newOrgCookie = newCookies.find(c => c.name === 'app-org-id');
        expect(newOrgCookie?.value).not.toBe('00000000-0000-0000-0000-000000000000');
        expect(newOrgCookie?.value).toBe(activeOrgCookie!.value);
    });

});

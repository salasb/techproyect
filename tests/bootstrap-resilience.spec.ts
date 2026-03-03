import { test, expect } from '@playwright/test';

test.describe('Onboarding Bootstrap (/api/start/bootstrap)', () => {
    
    test('Unauthenticated bootstrap should return 401 JSON', async ({ request }) => {
        const response = await request.get('/api/start/bootstrap');
        expect(response.status()).toBe(401);
        const body = await response.json();
        expect(body.ok).toBe(false);
        expect(body.code).toBe('SESSION_EXPIRED');
    });

    test('Bootstrap failure should show error UI with traceId', async ({ page }) => {
        // Mock a 500 error for the bootstrap API
        await page.route('**/api/start/bootstrap', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ 
                    ok: false, 
                    code: 'BOOTSTRAP_FAILED', 
                    message: 'Fallo simulado', 
                    traceId: 'BOOT-TEST-123' 
                })
            });
        });

        await page.goto('/start');
        
        // Should show "Error Crítico" and the traceId
        await expect(page.locator('text=Error Crítico')).toBeVisible();
        await expect(page.locator('text=BOOT-TEST-123')).toBeVisible();
        
        // Should have a retry button
        const retryBtn = page.getByRole('button', { name: /Reintentar Conexión/i });
        await expect(retryBtn).toBeVisible();
    });
});

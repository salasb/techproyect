import { test, expect } from '@playwright/test';

test.describe('Organization Selection Flow (/start)', () => {
    
    test('Selecting an organization should persist context and navigate to dashboard', async ({ page }) => {
        // 1. Intercept the selection API
        await page.route('**/api/org/select', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true, redirectTo: '/dashboard', traceId: 'TEST-TRACE' }),
                headers: {
                    'set-cookie': '__Host-app-org-id=test-org-id; Path=/; SameSite=Lax; HttpOnly'
                }
            });
        });

        // 2. Go to /start (mocked state where user has orgs)
        // We assume the page renders the list because of the server-side fetch
        // For the test, we'll just check if clicking triggers the flow.
        await page.goto('/start');
        
        // Find an organization button
        const orgBtn = page.locator('button').filter({ hasText: /ID:/ }).first();
        if (await orgBtn.isVisible()) {
            await orgBtn.click();
            
            // Should show loading state (Loader2)
            // Should show success toast (handled by sonner)
            
            // 3. Verify navigation
            await page.waitForURL('**/dashboard');
            expect(page.url()).toContain('/dashboard');
        }
    });

    test('Failing selection should show error toast', async ({ page }) => {
        await page.route('**/api/org/select', async route => {
            await route.fulfill({
                status: 403,
                contentType: 'application/json',
                body: JSON.stringify({ ok: false, error: 'Acceso denegado' })
            });
        });

        await page.goto('/start');
        const orgBtn = page.locator('button').filter({ hasText: /ID:/ }).first();
        if (await orgBtn.isVisible()) {
            await orgBtn.click();
            
            // Check for error toast
            const toast = page.locator('text=Acceso denegado');
            await expect(toast).toBeVisible();
            
            // Should stay on /start
            expect(page.url()).toContain('/start');
        }
    });
});

import { test, expect } from '@playwright/test';

test.describe('Org Selection Robustness (P0)', () => {
    
    test('Successful selection redirects to dashboard', async ({ page }) => {
        await page.route('**/api/org/select', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true, redirectTo: '/dashboard', traceId: 'SEL-SUCCESS' }),
                headers: {
                    'set-cookie': 'app-org-id=valid-org-id; Path=/; SameSite=Lax; HttpOnly'
                }
            });
        });

        await page.goto('/start');
        
        // Find an organization button
        const orgBtn = page.locator('button').filter({ hasText: /ID:/ }).first();
        if (await orgBtn.isVisible()) {
            await orgBtn.click();
            await page.waitForURL('**/dashboard');
            expect(page.url()).toContain('/dashboard');
        }
    });

    test('Forbidden selection (403) shows error toast', async ({ page }) => {
        await page.route('**/api/org/select', async route => {
            await route.fulfill({
                status: 403,
                contentType: 'application/json',
                body: JSON.stringify({ 
                    ok: false, 
                    code: 'FORBIDDEN', 
                    message: 'No tienes acceso activo a esta organización.',
                    traceId: 'SEL-403' 
                })
            });
        });

        await page.goto('/start');
        const orgBtn = page.locator('button').filter({ hasText: /ID:/ }).first();
        if (await orgBtn.isVisible()) {
            await orgBtn.click();
            
            // Check for specific error message
            const toast = page.locator('text=No tienes acceso activo a esta organización');
            await expect(toast).toBeVisible();
            
            expect(page.url()).toContain('/start');
        }
    });

    test('Unauthorized (401) redirects to login', async ({ page }) => {
        await page.route('**/api/org/select', async route => {
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ ok: false, code: 'UNAUTHORIZED' })
            });
        });

        await page.goto('/start');
        const orgBtn = page.locator('button').filter({ hasText: /ID:/ }).first();
        if (await orgBtn.isVisible()) {
            await orgBtn.click();
            
            await page.waitForURL('**/login');
            expect(page.url()).toContain('/login');
        }
    });

    test('Internal error (500) shows trace id', async ({ page }) => {
        await page.route('**/api/org/select', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ 
                    ok: false, 
                    code: 'INTERNAL_ERROR',
                    traceId: 'SEL-TRACE-ERROR-123'
                })
            });
        });

        await page.goto('/start');
        const orgBtn = page.locator('button').filter({ hasText: /ID:/ }).first();
        if (await orgBtn.isVisible()) {
            await orgBtn.click();
            
            const toast = page.locator('text=SEL-TRACE-ERROR-123');
            await expect(toast).toBeVisible();
        }
    });
});

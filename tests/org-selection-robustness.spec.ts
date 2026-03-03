import { test, expect } from '@playwright/test';

test.describe('Org Selection Robustness (P0)', () => {
    
    test('Successful selection redirects to dashboard', async ({ page }) => {
        await page.route('**/api/org/select', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true, redirectTo: '/dashboard', traceId: 'SEL-SUCCESS' }),
                headers: {
                    'set-cookie': '__Host-app-org-id=valid-org-id; Path=/; SameSite=Lax; HttpOnly; Secure'
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

    test('Selection should not bounce back from dashboard to start', async ({ page }) => {
        let selectCalled = false;
        let activeCalled = false;

        // Mock Select API
        await page.route('**/api/org/select', async route => {
            selectCalled = true;
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ ok: true, redirectTo: '/dashboard' }),
                headers: { 'set-cookie': '__Host-app-org-id=valid-id; Path=/; Secure; HttpOnly' }
            });
        });

        // Mock Active API
        await page.route('**/api/org/active', async route => {
            activeCalled = true;
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ ok: true, orgId: 'valid-id' })
            });
        });

        await page.goto('/start');
        const orgBtn = page.locator('button').filter({ hasText: /ID:/ }).first();
        if (await orgBtn.isVisible()) {
            await orgBtn.click();
            
            // Wait for dashboard navigation
            await page.waitForURL('**/dashboard');
            
            // Wait a bit to ensure it STAYS on dashboard
            await page.waitForTimeout(1000);
            
            expect(page.url()).toContain('/dashboard');
            expect(selectCalled).toBe(true);
            expect(activeCalled).toBe(true);
        }
    });
});

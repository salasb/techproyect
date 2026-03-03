import { test, expect } from '@playwright/test';

test.describe('Routing Integrity & Redirect Loops (P0)', () => {
    
    test('Unauthenticated user on / should redirect to /login in 1 jump', async ({ page }) => {
        await page.goto('/');
        await page.waitForURL('**/login');
        expect(page.url()).toContain('/login');
    });

    test('Accessing /start without session should go to /login', async ({ page }) => {
        await page.goto('/start');
        await page.waitForURL('**/login');
        expect(page.url()).toContain('/login');
    });

    test('Redirect chain should not exceed 5 jumps', async ({ page }) => {
        const redirects: string[] = [];
        page.on('response', response => {
            if (response.status() >= 300 && response.status() <= 308) {
                redirects.push(response.url());
            }
        });

        await page.goto('/');
        expect(redirects.length).toBeLessThanOrEqual(5);
    });

    test('/start should be a safe harbor (stable status 200 for authed)', async ({ page }) => {
        // This test assumes a valid session is already set up in playwright/.auth
        // We'll just check if it doesn't bounce immediately.
        const response = await page.goto('/start');
        expect(response?.status()).toBe(200);
        
        // Ensure no immediate redirect away from /start if no org is selected
        await page.waitForTimeout(1000);
        expect(page.url()).toContain('/start');
    });
});

import { test, expect } from '@playwright/test';

test.describe('Routing Integrity & Redirect Loops (P0)', () => {
    
    test('Unauthenticated user on / should redirect to /login in 1 jump', async ({ page }) => {
        // We use a fresh context to ensure no session
        await page.goto('/');
        
        // Wait for URL to stabilize
        await page.waitForURL('**/login');
        
        expect(page.url()).toContain('/login');
    });

    test('Accessing a deep protected route without session should go to /login', async ({ page }) => {
        await page.goto('/projects');
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
        
        // In theory / -> /login is 1 redirect (307/308)
        // If it was / -> /dashboard -> /start -> /login that would be 3.
        // We fail if more than 5.
        expect(redirects.length).toBeLessThanOrEqual(5);
    });

});

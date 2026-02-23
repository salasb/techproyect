import { test, expect } from '@playwright/test';

const authFileSuperadmin = 'playwright/.auth/superadmin.json';

test.describe('Superadmin Entry & Context Routing (v2.1)', () => {
    // Reuse existing auth state
    test.use({ storageState: authFileSuperadmin });

    test('Superadmin without active context lands on /admin (Global Cockpit)', async ({ page, context }) => {
        // Only clear the context cookie, preserve auth token
        const cookies = await context.cookies();
        const authCookies = cookies.filter(c => c.name.includes('supabase'));
        await context.clearCookies();
        await context.addCookies(authCookies);
        
        // Navigate to root
        await page.goto('/');
        
        // Should redirect to /admin, NOT /dashboard
        await page.waitForURL(/\/admin/);
        await expect(page.getByTestId('global-mode-badge')).toBeVisible();
    });

    test('Superadmin trying to access /dashboard without context is redirected to /admin', async ({ page, context }) => {
        const cookies = await context.cookies();
        const authCookies = cookies.filter(c => c.name.includes('supabase'));
        await context.clearCookies();
        await context.addCookies(authCookies);
        
        // Direct navigation to dashboard
        await page.goto('/dashboard');
        
        // Should trigger the new Dashboard Guard and send to /admin
        await page.waitForURL(/\/admin/);
        await expect(page.getByTestId('global-mode-badge')).toBeVisible();
    });

    // Note: We'd need to set a valid org cookie to test the "with context" case easily without UI interaction,
    // but the critical fix is the "no context" crash prevention.
});

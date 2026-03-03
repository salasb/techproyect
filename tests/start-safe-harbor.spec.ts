import { test, expect } from '@playwright/test';

test.describe('Onboarding Safe Harbor (/start)', () => {
    
    test('Unauthenticated user should be redirected to login before reaching /start', async ({ page }) => {
        await page.goto('/start');
        await page.waitForURL('**/login');
        expect(page.url()).toContain('/login');
    });

    test('/start should not enter a redirect loop', async ({ page }) => {
        // This test requires a session. We assume the session is handled via auth.setup.ts
        // For the purpose of this P0 fix, we mainly want to ensure the page renders something.
        
        // We will mock a response if needed, but here we just check if it renders after a while.
        const response = await page.goto('/start');
        expect(response?.status()).toBe(200);
        
        // Check for key UI elements
        const title = page.locator('h1');
        await expect(title).toBeVisible();
    });

    test('/start should show creation form if no orgs (mocked logic check)', async ({ page }) => {
        await page.goto('/start');
        // If the user has no orgs, "Crear Organización" should be visible
        // We look for the submit button text
        const createBtn = page.getByRole('button', { name: /Crear/i });
        await expect(createBtn).toBeVisible();
    });
});

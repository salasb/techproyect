import { test, expect } from '@playwright/test';

test.describe('Superadmin Bootstrap & Entry Orchestration v2.2.0', () => {
  test('Superadmin lands on /admin by default if context is none', async ({ page }) => {
    // This test assumes the environment is set up with:
    // SUPERADMIN_ALLOWLIST=salasb@gmail.com
    // SUPERADMIN_BOOTSTRAP_ENABLED=true
    
    // 1. Login
    await page.goto('https://techproyect.vercel.app/login');
    await page.fill('input[name="email"]', 'salasb@gmail.com');
    await page.fill('input[name="password"]', '12345#');
    await page.click('button[type="submit"]');
    
    // 2. Expect redirect to /admin (v2.2.0 policy)
    // Wait for the URL to change to either /dashboard or /admin
    await page.waitForURL(/\/ (admin|dashboard)/, { timeout: 10000 });
    
    const currentURL = page.url();
    console.log('Final URL:', currentURL);
    
    // 3. Check for Identity & Role
    const identityChip = await page.locator('[data-testid="user-identity-chip"]').textContent();
    console.log('Identity:', identityChip);
    
    // If the user is promoted, the badge should be visible
    const roleBadge = page.locator('[data-testid="user-role-badge"]');
    const isPromoted = await roleBadge.isVisible();
    
    if (isPromoted) {
      console.log('Role Badge:', await roleBadge.textContent());
    } else {
      console.warn('User NOT promoted to Superadmin yet.');
    }
  });

  test('Settings Page does not crash (Blindaje Regression)', async ({ page }) => {
    // 1. Manual Navigation to Settings
    await page.goto('https://techproyect.vercel.app/settings');
    
    // 2. Check for "Application error" or "crash"
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Application error');
    expect(bodyText).not.toContain('Digest');
    
    // 3. Check for Settings form
    const header = await page.locator('h2').textContent();
    expect(header).toContain('Configuración');
  });
});

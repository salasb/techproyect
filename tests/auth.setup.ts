import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFileSuperadmin = 'playwright/.auth/superadmin.json';
const authFileAdmin = 'playwright/.auth/admin.json';

// Ensure the directory exists
const authDir = path.dirname(authFileSuperadmin);
if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
}

setup('authenticate as Superadmin', async ({ request, page, context }) => {
    console.log('--- STARTING SUPERADMIN BOOTSTRAP ---');

    // 1. Trigger robust external Bootstrap to setup DB
    const res = await request.post('/api/e2e/bootstrap', {
        headers: {
            'Authorization': `Bearer ${process.env.E2E_TEST_SECRET || 'E2E_LOCAL_TEST_SECRET'}`,
            'Content-Type': 'application/json'
        },
        data: {
            role: 'SUPERADMIN',
            email: 'e2e_superadmin@test.com',
            password: 'E2eTest1234!'
        }
    });

    if (!res.ok()) {
        console.error("Superadmin Bootstrap Failed:", res.status(), await res.text());
    }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    console.log("Bootstrap success:", data);

    // 2. Perform UI Auth to obtain Supabase Cookies via proper Next.js workflow
    await page.goto('/login');
    await page.fill('input[name="email"]', 'e2e_superadmin@test.com');
    await page.fill('input[name="password"]', 'E2eTest1234!');
    await page.click('button[type="submit"]');

    // Wait for the login router push
    await page.waitForURL('**/dashboard**');

    // Check for success elements
    await expect(page.locator('text=Panel Global')).toBeVisible();

    // 3. Save Context
    await page.context().storageState({ path: authFileSuperadmin });
});

setup('authenticate as Admin', async ({ request, page }) => {
    console.log('--- STARTING ADMIN BOOTSTRAP ---');

    // 1. Trigger robust external Bootstrap to setup DB (Profile + Org + Membership)
    const res = await request.post('/api/e2e/bootstrap', {
        headers: {
            'Authorization': `Bearer ${process.env.E2E_TEST_SECRET || 'E2E_LOCAL_TEST_SECRET'}`,
            'Content-Type': 'application/json'
        },
        data: {
            role: 'ADMIN',
            email: 'e2e_admin@test.com',
            password: 'E2eTest1234!'
        }
    });

    if (!res.ok()) {
        console.error("Admin Bootstrap Failed:", res.status(), await res.text());
    }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    console.log("Bootstrap success:", data);

    // 2. Perform UI Auth to obtain Supabase Cookies
    await page.goto('/login');
    await page.fill('input[name="email"]', 'e2e_admin@test.com');
    await page.fill('input[name="password"]', 'E2eTest1234!');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('**/dashboard**');

    // 3. Save Context
    await page.context().storageState({ path: authFileAdmin });
});

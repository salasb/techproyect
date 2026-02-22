import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFileSuperadmin = 'playwright/.auth/superadmin.json';
const authFileAdmin = 'playwright/.auth/admin.json';
const authFileMultiOrgAdmin = 'playwright/.auth/multi-org-admin.json';

// Ensure the directory exists
const authDir = path.dirname(authFileSuperadmin);
if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
}

setup('authenticate as Superadmin', async ({ request, page }) => {
    console.log('--- STARTING SUPERADMIN BOOTSTRAP ---');

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

    await page.goto('/login');
    await page.fill('input[name="email"]', 'e2e_superadmin@test.com');
    await page.fill('input[name="password"]', 'E2eTest1234!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**');
    
    // Wait for the page to be fully loaded and role to be resolved
    await page.waitForLoadState('networkidle');
    
    // Check for either the NO_ORG superadmin banner or the Global Control Panel banner
    const superadminIndicator = page.locator('text=Panel de Control Global')
        .or(page.locator('text=Modo Administrador Global'))
        .or(page.locator('text=Portal Admin'))
        .first();
        
    await expect(superadminIndicator).toBeVisible({ timeout: 10000 });

    await page.context().storageState({ path: authFileSuperadmin });
});

setup('authenticate as Admin', async ({ request, page }) => {
    console.log('--- STARTING ADMIN BOOTSTRAP ---');

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

    await page.goto('/login');
    await page.fill('input[name="email"]', 'e2e_admin@test.com');
    await page.fill('input[name="password"]', 'E2eTest1234!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**');

    // Manual cookie injection for robustness
    if (data.bootstrap.activeOrgId) {
        await page.context().addCookies([{
            name: 'app-org-id',
            value: data.bootstrap.activeOrgId,
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax'
        }]);
    }

    await page.context().storageState({ path: authFileAdmin });
});

setup('authenticate as Multi-Org Admin', async ({ request, page }) => {
    console.log('--- STARTING MULTI-ORG ADMIN BOOTSTRAP ---');

    const res = await request.post('/api/e2e/bootstrap', {
        headers: {
            'Authorization': `Bearer ${process.env.E2E_TEST_SECRET || 'E2E_LOCAL_TEST_SECRET'}`,
            'Content-Type': 'application/json'
        },
        data: {
            role: 'ADMIN',
            email: 'e2e_multiorg_admin@test.com',
            password: 'E2eTest1234!',
            additionalOrg: true
        }
    });

    if (!res.ok()) {
        console.error("Multi-Org Admin Bootstrap Failed:", res.status(), await res.text());
    }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    console.log("Bootstrap success:", data);

    await page.goto('/login');
    await page.fill('input[name="email"]', 'e2e_multiorg_admin@test.com');
    await page.fill('input[name="password"]', 'E2eTest1234!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard|org\/select)/);

    // Manual cookie injection for Org A as baseline
    if (data.bootstrap.activeOrgId) {
        await page.context().addCookies([{
            name: 'app-org-id',
            value: data.bootstrap.activeOrgId,
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax'
        }]);
    }

    await page.context().storageState({ path: authFileMultiOrgAdmin });
});

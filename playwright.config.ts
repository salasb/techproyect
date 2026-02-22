import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',

        /* E2E Secret token used inside the auth setup */
        extraHTTPHeaders: {
            'x-e2e-secret': process.env.E2E_TEST_SECRET || 'E2E_LOCAL_TEST_SECRET',
        },
    },

    projects: [
        // Setup Project: Runs the E2E Bootstrap API to hydrate storage state
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Explicitly tie it to the saved Admin cookie by default, tests can override
                storageState: 'playwright/.auth/admin.json',
            },
            dependencies: ['setup'],
        },
        // {
        //   name: 'webkit',
        //   use: { ...devices['Desktop Safari'] },
        //   dependencies: ['setup'],
        // },
    ],

    /* Run your local dev server before starting the tests */
    // webServer: {
    //   command: 'npm run start',
    //   url: 'http://127.0.0.1:3000',
    //   reuseExistingServer: !process.env.CI,
    // },
});

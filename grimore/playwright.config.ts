import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests for the web build.
 *
 *   npm run e2e                      mock mode: builds the web app, serves it locally and
 *                                    answers Supabase with fixtures (no account needed)
 *   with E2E_EMAIL and E2E_PASSWORD set (and optionally E2E_BASE_URL):
 *                                    live mode: a real test account, against a deployed site
 *                                    or the local build. Use a test account, never your own.
 */
const live = !!(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
const port = 4173;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${port}`,
    ...devices['Pixel 7'],
    colorScheme: 'dark',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
  },
  projects: [{ name: live ? 'live' : 'mock', grep: live ? /@live/ : /@mock/ }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx expo export --platform web && npx --yes serve -s dist -l ${port}`,
        url: `http://localhost:${port}`,
        timeout: 300_000,
        reuseExistingServer: true,
      },
});

import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for eTommerce end-to-end UI tests.
 *
 * The frontend runs via `next dev` on port 3000. Backend (Laravel) must
 * already be reachable at http://127.0.0.1:8000 — see README for how to
 * start it.
 */

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },

  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Backend state is shared across tests (same seeded stores, rate limits).
  // Running single-worker keeps tests deterministic.
  workers: 1,

  reporter: isCI
    ? [['html', { open: 'never' }], ['github']]
    : [['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

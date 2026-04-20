import { defineConfig, devices } from '@playwright/test';

const apiPort = Number(process.env.E2E_API_PORT || 4100);
const webPort = Number(process.env.E2E_WEB_PORT || 3100);
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: './retired-browser-tests',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  globalSetup: './retired-browser-tests/global.setup.ts',
  globalTeardown: './retired-browser-tests/global.teardown.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `API_PORT=${apiPort} FRONTEND_URL=http://127.0.0.1:${webPort} pnpm --filter @tcrn/api start`,
      url: `http://127.0.0.1:${apiPort}/api/v1/health/live`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `TMS_API_ORIGIN=http://127.0.0.1:${apiPort} pnpm --filter @tcrn/web exec next dev --port ${webPort}`,
      url: `http://127.0.0.1:${webPort}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});

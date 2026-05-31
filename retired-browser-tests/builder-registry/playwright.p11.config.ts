import { defineConfig, devices } from '@playwright/test';

const apiPort = Number(process.env.E2E_API_PORT || 4100);
const webPort = Number(process.env.E2E_WEB_PORT || 3100);

export default defineConfig({
  testDir: '.',
  testMatch: /p11-builder-registry\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || `http://127.0.0.1:${webPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
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
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `TMS_API_ORIGIN=http://127.0.0.1:${apiPort} pnpm --filter @tcrn/web exec next dev --port ${webPort}`,
      url: `http://127.0.0.1:${webPort}/login`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});

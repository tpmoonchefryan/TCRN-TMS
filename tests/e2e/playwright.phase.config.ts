import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

for (const envFile of ['.env.local', '.env']) {
  const envPath = resolve(repoRoot, envFile);

  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}

const apiPort = Number(process.env.E2E_API_PORT || 4100);
const webPort = Number(process.env.E2E_WEB_PORT || 3100);
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: '.',
  testMatch: [
    'p4-platform-tool-connections.spec.ts',
    'p5-observability-adapter-foundation.spec.ts',
    'p6-runtime-feature-flag-adapter.spec.ts',
  ],
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
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

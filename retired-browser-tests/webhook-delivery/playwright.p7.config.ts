import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /p7-webhook-delivery-adapter\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

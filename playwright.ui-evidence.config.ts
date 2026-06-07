import { defineConfig, devices } from '@playwright/test';

const storybookPort = Number(process.env.TCRN_STORYBOOK_PORT || 6007);
const storybookBaseURL = process.env.TCRN_STORYBOOK_BASE_URL || `http://127.0.0.1:${storybookPort}`;

function assertLocalStorybookBaseURL(urlValue: string) {
  const parsed = new URL(urlValue);
  const allowedHosts = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

  if (parsed.protocol !== 'http:' || !allowedHosts.has(parsed.hostname)) {
    throw new Error('Storybook UI evidence base URL must be an explicit local http URL.');
  }
}

assertLocalStorybookBaseURL(storybookBaseURL);

export default defineConfig({
  testDir: './tests/ui-evidence',
  testMatch: ['public-presence-storybook-axe.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  outputDir: '.tmp/ui-evidence/test-results',
  use: {
    baseURL: storybookBaseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'desktop-public-presence',
      use: { ...devices['Desktop Chrome'], viewport: { height: 900, width: 1440 } },
    },
    {
      name: 'mobile-public-presence',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: `pnpm exec storybook dev --ci --no-open --port ${storybookPort} --host 127.0.0.1`,
    reuseExistingServer: true,
    timeout: 180_000,
    url: storybookBaseURL,
  },
});

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT Test Fixtures - Common utilities for acceptance testing

import { test as base, expect, Page } from '@playwright/test';

// UAT Test User Credentials
// Passwords should be set via environment variables for security
// Set E2E_UAT_PASSWORD and E2E_AC_PASSWORD in your .env.test file
const UAT_PASSWORD = process.env.E2E_UAT_PASSWORD || 'REPLACE_WITH_TEST_PASSWORD';
const AC_PASSWORD = process.env.E2E_AC_PASSWORD || 'REPLACE_WITH_TEST_PASSWORD';

export const UAT_USERS = {
  // UAT_CORP Users
  corpAdmin: { tenant: 'UAT_CORP', username: 'corp_admin', password: UAT_PASSWORD },
  corpAdmin2: { tenant: 'UAT_CORP', username: 'corp_admin2', password: UAT_PASSWORD },
  gamingManager: { tenant: 'UAT_CORP', username: 'gaming_manager', password: UAT_PASSWORD },
  musicManager: { tenant: 'UAT_CORP', username: 'music_manager', password: UAT_PASSWORD },
  sakuraManager: { tenant: 'UAT_CORP', username: 'sakura_manager', password: UAT_PASSWORD },
  lunaManager: { tenant: 'UAT_CORP', username: 'luna_manager', password: UAT_PASSWORD },
  hanaManager: { tenant: 'UAT_CORP', username: 'hana_manager', password: UAT_PASSWORD },
  viewerHq: { tenant: 'UAT_CORP', username: 'viewer_hq', password: UAT_PASSWORD },
  viewerGaming: { tenant: 'UAT_CORP', username: 'viewer_gaming', password: UAT_PASSWORD },
  viewerSakura: { tenant: 'UAT_CORP', username: 'viewer_sakura', password: UAT_PASSWORD },

  // UAT_SOLO Users
  soloOwner: { tenant: 'UAT_SOLO', username: 'solo_owner', password: UAT_PASSWORD },
  soloContent: { tenant: 'UAT_SOLO', username: 'solo_content', password: UAT_PASSWORD },
  soloViewer: { tenant: 'UAT_SOLO', username: 'solo_viewer', password: UAT_PASSWORD },

  // AC Admin
  acAdmin: { tenant: 'AC', username: 'ac_admin', password: AC_PASSWORD },
};

export type UatUserKey = keyof typeof UAT_USERS;

/**
 * Login helper function
 */
export async function login(
  page: Page,
  user: { tenant: string; username: string; password: string }
): Promise<void> {
  await page.goto('/login');

  // Fill tenant code if visible
  const tenantInput = page.locator('[data-testid="tenant-code"]');
  if (await tenantInput.isVisible()) {
    await tenantInput.fill(user.tenant);
  }

  await page.fill('[data-testid="username"]', user.username);
  await page.fill('[data-testid="password"]', user.password);
  await page.click('[data-testid="login-button"]');

  // Wait for redirect to dashboard or organization page
  await page.waitForURL(/\/(dashboard|organization)/);
}

/**
 * Logout helper function
 */
export async function logout(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await expect(page).toHaveURL('/login');
}

/**
 * Navigate to a specific section
 */
export async function navigateTo(page: Page, section: string): Promise<void> {
  const sectionMap: Record<string, string> = {
    customers: '/customers',
    organization: '/organization',
    users: '/users',
    roles: '/roles',
    reports: '/reports',
    settings: '/settings',
    marshmallow: '/marshmallow',
    homepage: '/homepage',
    logs: '/admin/logs/changes',
  };

  const url = sectionMap[section] || section;
  await page.goto(url);
}

/**
 * Wait for toast notification
 */
export async function waitForToast(
  page: Page,
  expectedText: string
): Promise<void> {
  await expect(page.locator('[data-testid="toast"]')).toContainText(expectedText);
}

/**
 * Check if element is disabled (for permission tests)
 */
export async function expectDisabled(
  page: Page,
  testId: string
): Promise<void> {
  const element = page.locator(`[data-testid="${testId}"]`);
  await expect(element).toBeDisabled();
}

/**
 * Check API response status
 */
export async function expectApiStatus(
  page: Page,
  urlPattern: string | RegExp,
  expectedStatus: number
): Promise<void> {
  const response = await page.waitForResponse(
    (response) =>
      (typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())) &&
      response.status() === expectedStatus
  );
  expect(response.status()).toBe(expectedStatus);
}

// Extended test with UAT fixtures
export const test = base.extend<{
  loginAs: (userKey: UatUserKey) => Promise<void>;
}>({
  loginAs: async ({ page }, use) => {
    const loginAs = async (userKey: UatUserKey) => {
      const user = UAT_USERS[userKey];
      await login(page, user);
    };
    await use(loginAs);
  },
});

export { expect };

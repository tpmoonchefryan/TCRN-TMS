// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

import { loadWebSmokeFixtureSync } from '../fixtures/web-smoke-fixture';
import { generateTotpCode } from '../fixtures/totp';

const fixture = loadWebSmokeFixtureSync();
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function openLogin(page: Page) {
  await page.goto('/login');
}

async function submitCredentials(
  page: Page,
  params: {
    username: string;
    password: string;
  },
) {
  await page.fill('#tenantCode', fixture.tenantCode);
  await page.fill('#login', params.username);
  await page.fill('#password', params.password);
  await page.locator('form button[type="submit"]').click();
}

async function expectManagementLanding(page: Page) {
  await expect(page).toHaveURL(/\/tenant\/[^/]+\/organization-structure$/, {
    timeout: 15_000,
  });
  await expect(
    page.getByRole('heading', { name: 'Organization Structure', exact: true }),
  ).toBeVisible();
}

async function submitApiLoginAttempt(
  request: APIRequestContext,
  params: {
    username: string;
    password: string;
    forwardedFor: string;
  },
) {
  return request.post(`${API_BASE_URL}/api/v1/auth/login`, {
    data: {
      tenantCode: fixture.tenantCode,
      login: params.username,
      password: params.password,
    },
    headers: {
      'X-Forwarded-For': params.forwardedFor,
    },
  });
}

test.describe('Login Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await openLogin(page);
  });

  test('successful login redirects to the business workspace', async ({ page }) => {
    await submitCredentials(page, fixture.users.standard);

    await expectManagementLanding(page);
  });

  test('wrong password shows the backend error message', async ({ page }) => {
    await submitCredentials(page, {
      username: fixture.users.standard.username,
      password: 'WrongPassword123!',
    });

    await expect(page.getByText('Invalid username or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('TOTP verification completes inside the login screen', async ({ page }) => {
    await submitCredentials(page, fixture.users.totp);

    await expect(page.locator('#code')).toBeVisible();

    await page.fill('#code', generateTotpCode(fixture.users.totp.secret ?? ''));
    await page.locator('form button[type="submit"]').click();

    await expectManagementLanding(page);
  });

  test('account lockout blocks the next correct-password attempt', async ({
    page,
    request,
  }) => {
    const lockoutIp = '203.0.113.42';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await submitApiLoginAttempt(request, {
        username: fixture.users.lockout.username,
        password: 'WrongPassword123!',
        forwardedFor: lockoutIp,
      });

      expect(response.status()).toBe(401);
    }

    await submitCredentials(page, fixture.users.lockout);

    await expect(
      page.getByText('Account is locked. Please try again later.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

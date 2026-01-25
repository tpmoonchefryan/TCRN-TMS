// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toContainText('testuser');
  });

  test('wrong password shows error message', async ({ page }) => {
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      '用户名或密码错误'
    );
    await expect(page).toHaveURL('/login');
  });

  test('TOTP verification flow', async ({ page }) => {
    // Test with 2FA enabled account
    await page.fill('[data-testid="username"]', 'totp_user');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');

    // Should redirect to TOTP verification
    await expect(page).toHaveURL('/login/totp');

    // Enter TOTP code
    await page.fill('[data-testid="totp-input"]', '123456');
    await page.click('[data-testid="verify-button"]');
  });

  test('account lockout after failed attempts', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="username"]', 'locktest_user');
      await page.fill('[data-testid="password"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      await page.waitForTimeout(500);
    }

    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      '账户已锁定'
    );
  });
});

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { test, expect } from '@playwright/test';

async function loginAsAdmin(page: any) {
  await page.goto('/login');
  await page.fill('[data-testid="username"]', 'admin');
  await page.fill('[data-testid="password"]', 'AdminPassword123!');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL('/dashboard');
}

test.describe('Customer Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/customers');
  });

  test('create individual customer profile', async ({ page }) => {
    await page.click('[data-testid="create-customer-button"]');

    // Fill form
    await page.fill('[data-testid="nickname"]', '测试客户');
    await page.selectOption('[data-testid="profile-type"]', 'individual');
    await page.fill('[data-testid="given-name"]', '三');
    await page.fill('[data-testid="family-name"]', '张');
    await page.fill('[data-testid="phone"]', '+86 13800138000');
    await page.fill('[data-testid="email"]', 'test@example.com');

    await page.click('[data-testid="save-button"]');

    // Verify success
    await expect(page.locator('[data-testid="toast"]')).toContainText('创建成功');
    await expect(page.locator('table')).toContainText('测试客户');
  });

  test('search customers', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', '测试');
    await page.click('[data-testid="search-button"]');

    await expect(
      page.locator('table tbody tr').first()
    ).toBeVisible();
  });

  test('PII service failure shows graceful degradation', async ({ page }) => {
    // Mock PII service unavailable
    await page.route('**/pii-service/**', (route) => route.abort());

    await page.click('[data-testid="customer-row-1"]');

    // Should show error alert but not crash
    await expect(page.locator('[data-testid="pii-error-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="pii-error-alert"]')).toContainText(
      '无法获取客户敏感信息'
    );

    // Non-PII data should display normally
    await expect(page.locator('[data-testid="customer-nickname"]')).toBeVisible();
  });
});

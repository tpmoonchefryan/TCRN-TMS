// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { test, expect } from '@playwright/test';

test.describe('External Homepage', () => {
  test('visit published talent homepage', async ({ page }) => {
    await page.goto('/p/test-talent');

    // Verify basic elements
    await expect(page.locator('h1')).toContainText('Test Talent');
    await expect(page.locator('[data-testid="social-links"]')).toBeVisible();
  });

  test('unpublished homepage returns 404', async ({ page }) => {
    const response = await page.goto('/p/unpublished-talent');

    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toContainText('页面不存在');
  });

  test('mobile responsive layout is correct', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/p/test-talent');

    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-menu"]')).not.toBeVisible();
  });

  test('homepage loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/p/test-talent');
    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });
});

test.describe('External Marshmallow', () => {
  test('submit anonymous message', async ({ page }) => {
    await page.goto('/m/test-talent');

    await page.fill('[data-testid="message-input"]', '这是一条测试消息');
    await page.click('[data-testid="submit-button"]');

    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      '感谢'
    );
  });

  test('rate limit shows warning', async ({ page }) => {
    await page.goto('/m/test-talent');

    // Submit multiple messages quickly
    for (let i = 0; i < 6; i++) {
      await page.fill('[data-testid="message-input"]', `消息 ${i}`);
      await page.click('[data-testid="submit-button"]');
      await page.waitForTimeout(100);
    }

    await expect(page.locator('[data-testid="rate-limit-warning"]')).toBeVisible();
  });
});

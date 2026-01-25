// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT E2E Tests - Customer Management Scenarios

import { test, expect, UAT_USERS, login } from '../fixtures/uat-fixtures';
import path from 'path';

test.describe('UAT - Customer Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, UAT_USERS.sakuraManager);
    await page.goto('/customers');
  });

  test('S10 - Create individual customer profile', async ({ page }) => {
    await page.click('[data-testid="create-customer-button"]');

    // Fill form
    await page.fill('[data-testid="nickname"]', 'UAT Test Customer');
    await page.selectOption('[data-testid="profile-type"]', 'individual');
    await page.fill('[data-testid="given-name"]', 'Test');
    await page.fill('[data-testid="family-name"]', 'Customer');
    await page.fill('[data-testid="phone"]', '+81 90-1234-5678');
    await page.fill('[data-testid="email"]', 'uat.test@example.com');
    await page.selectOption('[data-testid="status-select"]', 'ACTIVE');

    await page.click('[data-testid="save-button"]');

    // Verify success
    await expect(page.locator('[data-testid="toast"]')).toContainText(/成功|success/i);
    await expect(page.locator('table')).toContainText('UAT Test Customer');
  });

  test('S11 - View customer details with PII data', async ({ page }) => {
    // Click on first customer row
    await page.click('[data-testid="customer-row"]');

    // PII fields should be visible (not skeleton)
    await expect(page.locator('[data-testid="customer-nickname"]')).toBeVisible();
    await expect(page.locator('[data-testid="customer-details-panel"]')).toBeVisible();

    // Check that PII is not showing skeleton loader for too long
    await page.waitForTimeout(2000);
    const skeletonVisible = await page.locator('.skeleton').isVisible().catch(() => false);
    expect(skeletonVisible).toBe(false);
  });

  test('S12 - PII service failure shows graceful degradation', async ({ page }) => {
    // Mock PII service unavailable
    await page.route('**/pii-service/**', (route) => route.abort());
    await page.route('**/api/v1/customers/*/pii**', (route) => route.abort());

    await page.click('[data-testid="customer-row"]');

    // Should show error alert
    await expect(page.locator('[data-testid="pii-error-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="pii-error-alert"]')).toContainText(
      /无法获取|获取失败|failed/i
    );

    // Non-PII data should still be visible
    await expect(page.locator('[data-testid="customer-nickname"]')).toBeVisible();
    await expect(page.locator('[data-testid="customer-status"]')).toBeVisible();
  });

  test('S13 - Add platform identity to customer', async ({ page }) => {
    await page.click('[data-testid="customer-row"]');

    // Go to platform identities tab
    await page.click('[data-testid="tab-identities"]');
    await page.click('[data-testid="add-identity-button"]');

    // Fill identity form
    await page.selectOption('[data-testid="platform-select"]', 'YOUTUBE');
    await page.fill('[data-testid="platform-uid"]', 'UC1234567890abcdef');
    await page.fill('[data-testid="platform-nickname"]', 'TestChannel');
    await page.click('[data-testid="save-identity-button"]');

    // Verify success
    await expect(page.locator('[data-testid="toast"]')).toContainText(/成功|success/i);
    await expect(page.locator('[data-testid="identity-list"]')).toContainText('YouTube');
  });

  test('S14 - Add membership record', async ({ page }) => {
    await page.click('[data-testid="customer-row"]');

    // Go to membership tab
    await page.click('[data-testid="tab-memberships"]');
    await page.click('[data-testid="add-membership-button"]');

    // Fill membership form
    await page.selectOption('[data-testid="membership-class"]', 'SUBSCRIPTION');
    await page.selectOption('[data-testid="membership-type"]', 'YOUTUBE_MEMBER');
    await page.selectOption('[data-testid="membership-level"]', 'YT_LEVEL_1');
    await page.fill('[data-testid="valid-from"]', '2026-01-01');
    await page.fill('[data-testid="valid-to"]', '2026-12-31');
    await page.click('[data-testid="save-membership-button"]');

    // Verify success
    await expect(page.locator('[data-testid="toast"]')).toContainText(/成功|success/i);
    await expect(page.locator('[data-testid="membership-summary"]')).toBeVisible();
  });

  test('S16 - Batch operation on multiple customers', async ({ page }) => {
    // Select multiple customers
    await page.click('[data-testid="customer-checkbox-0"]');
    await page.click('[data-testid="customer-checkbox-1"]');
    await page.click('[data-testid="customer-checkbox-2"]');

    // Open batch actions
    await page.click('[data-testid="batch-actions-button"]');
    await page.click('[data-testid="batch-deactivate"]');

    // Confirm
    await page.click('[data-testid="confirm-batch-action"]');

    // Verify success
    await expect(page.locator('[data-testid="toast"]')).toContainText(/批量|batch/i);
  });

  test('Customer search filters work', async ({ page }) => {
    // Search by nickname
    await page.fill('[data-testid="search-input"]', 'CoolGamer');
    await page.click('[data-testid="search-button"]');

    await expect(page.locator('table tbody tr')).toHaveCount(1);

    // Filter by status
    await page.fill('[data-testid="search-input"]', '');
    await page.selectOption('[data-testid="status-filter"]', 'VIP');
    await page.click('[data-testid="search-button"]');

    // All visible customers should be VIP
    const statusBadges = page.locator('[data-testid="customer-status-badge"]');
    const count = await statusBadges.count();
    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toContainText('VIP');
    }
  });
});

test.describe('UAT - Customer Import', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, UAT_USERS.corpAdmin);
    await page.goto('/customers');
  });

  test('S15 - Batch import customers via CSV', async ({ page }) => {
    await page.click('[data-testid="import-button"]');

    // Create a test CSV file
    const csvContent = `nickname,profile_type,given_name,family_name,primary_language,phone_numbers,emails,status_code
ImportTest1,individual,Test,User1,en,+1234567890,test1@example.com,ACTIVE
ImportTest2,individual,Test,User2,zh,+0987654321,test2@example.com,ACTIVE
ImportTest3,individual,Test,User3,ja,+1122334455,test3@example.com,VIP`;

    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="upload-csv-button"]');
    const fileChooser = await fileChooserPromise;

    // Create a temporary file buffer
    await fileChooser.setFiles({
      name: 'test-import.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Wait for preview
    await expect(page.locator('[data-testid="import-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="row-count"]')).toContainText('3');

    // Start import
    await page.click('[data-testid="start-import-button"]');

    // Wait for progress
    await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();

    // Wait for completion (with timeout)
    await expect(page.locator('[data-testid="import-status"]')).toContainText(
      /完成|success|completed/i,
      { timeout: 30000 }
    );
  });
});

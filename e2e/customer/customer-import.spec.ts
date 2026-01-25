// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * E2E Tests for Customer Import
 * These tests cover the complete customer import workflow
 */
test.describe('Customer Import Flow', () => {
  // Helper to login as test user
  async function login(page: Page) {
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'import_test_user');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');
  }

  // Helper to navigate to customer import
  async function navigateToImport(page: Page) {
    await page.click('[data-testid="nav-customers"]');
    await page.waitForURL('**/customers');
    await page.click('[data-testid="import-button"]');
    await page.waitForSelector('[data-testid="import-dialog"]');
  }

  // Create test CSV file
  function createTestCsv(filename: string, content: string): string {
    const tempDir = path.join(__dirname, '../fixtures');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Import Dialog', () => {
    test('should open import dialog from customer list', async ({ page }) => {
      await page.click('[data-testid="nav-customers"]');
      await page.waitForURL('**/customers');
      
      await page.click('[data-testid="import-button"]');
      
      await expect(page.locator('[data-testid="import-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="import-dialog-title"]')).toContainText(/Import|导入/i);
    });

    test('should show upload dropzone', async ({ page }) => {
      await navigateToImport(page);
      
      await expect(page.locator('[data-testid="upload-dropzone"]')).toBeVisible();
    });

    test('should provide template download', async ({ page }) => {
      await navigateToImport(page);
      
      const templateLink = page.locator('[data-testid="download-template"]');
      await expect(templateLink).toBeVisible();
      
      const downloadPromise = page.waitForEvent('download');
      await templateLink.click();
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toContain('.csv');
    });

    test('should close dialog on cancel', async ({ page }) => {
      await navigateToImport(page);
      
      await page.click('[data-testid="cancel-import-button"]');
      
      await expect(page.locator('[data-testid="import-dialog"]')).not.toBeVisible();
    });
  });

  test.describe('File Upload', () => {
    test('should accept CSV file upload', async ({ page }) => {
      await navigateToImport(page);
      
      const csvContent = `name,email,phone,platform,tier
Customer 1,customer1@example.com,+1234567890,YouTube,Silver
Customer 2,customer2@example.com,+1234567891,Twitch,Gold`;
      
      const filePath = createTestCsv('test-import.csv', csvContent);
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(filePath);
      
      // Should show file name
      await expect(page.locator('[data-testid="uploaded-filename"]')).toContainText('test-import.csv');
      
      // Clean up
      fs.unlinkSync(filePath);
    });

    test('should reject non-CSV files', async ({ page }) => {
      await navigateToImport(page);
      
      const txtPath = createTestCsv('invalid.txt', 'This is not a CSV');
      // Rename to .txt for test
      const invalidPath = txtPath.replace('.csv', '.txt');
      if (fs.existsSync(txtPath)) {
        fs.renameSync(txtPath, invalidPath);
      }
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(invalidPath);
      
      // Should show error
      await expect(page.locator('[data-testid="file-error"]')).toContainText(/CSV|格式/i);
      
      // Clean up
      if (fs.existsSync(invalidPath)) {
        fs.unlinkSync(invalidPath);
      }
    });

    test('should validate file size limit', async ({ page }) => {
      await navigateToImport(page);
      
      // Create a large file (>10MB)
      const largeContent = 'name,email\n' + 'a'.repeat(11 * 1024 * 1024);
      const largePath = createTestCsv('large.csv', largeContent);
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(largePath);
      
      // Should show size error
      await expect(page.locator('[data-testid="file-error"]')).toContainText(/size|大小/i);
      
      // Clean up
      fs.unlinkSync(largePath);
    });
  });

  test.describe('CSV Validation', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToImport(page);
    });

    test('should validate required columns', async ({ page }) => {
      const invalidCsv = `invalid_column,another_column
Value 1,Value 2`;
      
      const filePath = createTestCsv('missing-columns.csv', invalidCsv);
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(filePath);
      
      // Proceed to validation step
      await page.click('[data-testid="validate-button"]');
      
      // Should show validation errors about missing columns
      await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-errors"]')).toContainText(/column|列/i);
      
      fs.unlinkSync(filePath);
    });

    test('should validate email format', async ({ page }) => {
      const invalidEmailCsv = `name,email,phone,platform,tier
Customer 1,invalid-email,+1234567890,YouTube,Silver`;
      
      const filePath = createTestCsv('invalid-email.csv', invalidEmailCsv);
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(filePath);
      
      await page.click('[data-testid="validate-button"]');
      
      // Should show email format error
      await expect(page.locator('[data-testid="row-errors"]')).toContainText(/email|邮箱/i);
      
      fs.unlinkSync(filePath);
    });

    test('should show validation summary', async ({ page }) => {
      const validCsv = `name,email,phone,platform,tier
Customer 1,customer1@example.com,+1234567890,YouTube,Silver
Customer 2,customer2@example.com,+1234567891,Twitch,Gold
Customer 3,customer3@example.com,+1234567892,Bilibili,Bronze`;
      
      const filePath = createTestCsv('valid-import.csv', validCsv);
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(filePath);
      
      await page.click('[data-testid="validate-button"]');
      
      // Should show validation summary
      await expect(page.locator('[data-testid="validation-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-rows"]')).toContainText('3');
      await expect(page.locator('[data-testid="valid-rows"]')).toContainText('3');
      
      fs.unlinkSync(filePath);
    });

    test('should detect and report duplicate entries', async ({ page }) => {
      const duplicateCsv = `name,email,phone,platform,tier
Customer 1,duplicate@example.com,+1234567890,YouTube,Silver
Customer 2,duplicate@example.com,+1234567891,Twitch,Gold`;
      
      const filePath = createTestCsv('duplicate.csv', duplicateCsv);
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(filePath);
      
      await page.click('[data-testid="validate-button"]');
      
      // Should show duplicate warning
      await expect(page.locator('[data-testid="duplicate-warning"]')).toBeVisible();
      
      fs.unlinkSync(filePath);
    });
  });

  test.describe('Import Execution', () => {
    test('should import valid customers successfully', async ({ page }) => {
      await navigateToImport(page);
      
      const validCsv = `name,email,phone,platform,tier
Import Test ${Date.now()},importtest${Date.now()}@example.com,+1234567890,YouTube,Silver`;
      
      const filePath = createTestCsv('import-exec.csv', validCsv);
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(filePath);
      
      // Validate
      await page.click('[data-testid="validate-button"]');
      await page.waitForSelector('[data-testid="validation-summary"]');
      
      // Confirm import
      await page.click('[data-testid="confirm-import-button"]');
      
      // Wait for import to complete
      await expect(page.locator('[data-testid="import-success"]')).toBeVisible({ timeout: 30000 });
      
      fs.unlinkSync(filePath);
    });

    test('should show import progress', async ({ page }) => {
      await navigateToImport(page);
      
      // Create a larger CSV for visible progress
      let largeCsv = 'name,email,phone,platform,tier\n';
      for (let i = 0; i < 50; i++) {
        largeCsv += `Customer ${i},customer${i}_${Date.now()}@example.com,+1234567${String(i).padStart(3, '0')},YouTube,Silver\n`;
      }
      
      const filePath = createTestCsv('large-import.csv', largeCsv);
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(filePath);
      
      await page.click('[data-testid="validate-button"]');
      await page.waitForSelector('[data-testid="validation-summary"]');
      
      await page.click('[data-testid="confirm-import-button"]');
      
      // Should show progress indicator
      await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('[data-testid="import-success"]')).toBeVisible({ timeout: 60000 });
      
      fs.unlinkSync(filePath);
    });

    test('should handle partial import with errors', async ({ page }) => {
      await navigateToImport(page);
      
      // Mix of valid and invalid rows
      const mixedCsv = `name,email,phone,platform,tier
Valid Customer,valid@example.com,+1234567890,YouTube,Silver
Invalid Customer,not-an-email,invalid,InvalidPlatform,Unknown`;
      
      const filePath = createTestCsv('mixed-import.csv', mixedCsv);
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(filePath);
      
      await page.click('[data-testid="validate-button"]');
      await page.waitForSelector('[data-testid="validation-summary"]');
      
      // Should show some valid, some invalid
      await expect(page.locator('[data-testid="valid-rows"]')).toContainText('1');
      await expect(page.locator('[data-testid="invalid-rows"]')).toContainText('1');
      
      fs.unlinkSync(filePath);
    });
  });

  test.describe('Import History', () => {
    test('should show import history', async ({ page }) => {
      await page.click('[data-testid="nav-customers"]');
      await page.waitForURL('**/customers');
      
      await page.click('[data-testid="import-history-button"]');
      
      await expect(page.locator('[data-testid="import-history-list"]')).toBeVisible();
    });

    test('should display import details', async ({ page }) => {
      await page.click('[data-testid="nav-customers"]');
      await page.waitForURL('**/customers');
      
      await page.click('[data-testid="import-history-button"]');
      
      const historyItem = page.locator('[data-testid="import-history-item"]').first();
      
      if (await historyItem.count() > 0) {
        await historyItem.click();
        
        // Should show import details
        await expect(page.locator('[data-testid="import-detail-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="import-date"]')).toBeVisible();
        await expect(page.locator('[data-testid="import-stats"]')).toBeVisible();
      } else {
        test.skip();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await navigateToImport(page);
      
      const validCsv = `name,email,phone,platform,tier
Customer 1,customer1@example.com,+1234567890,YouTube,Silver`;
      
      const filePath = createTestCsv('network-test.csv', validCsv);
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(filePath);
      
      await page.click('[data-testid="validate-button"]');
      await page.waitForSelector('[data-testid="validation-summary"]');
      
      // Simulate network failure by intercepting requests
      await page.route('**/api/v1/import/**', route => {
        route.abort('failed');
      });
      
      await page.click('[data-testid="confirm-import-button"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="import-error"]')).toBeVisible();
      
      fs.unlinkSync(filePath);
    });

    test('should allow retry on failed import', async ({ page }) => {
      // This test would need a way to trigger failure then success
      // Skipping implementation for now as it requires specific test setup
      test.skip();
    });
  });
});

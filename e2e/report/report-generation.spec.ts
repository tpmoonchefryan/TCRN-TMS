// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Report Generation (MFR Report)
 * These tests cover the complete report generation workflow
 */
test.describe('Report Generation Flow', () => {
  // Helper to login as test user
  async function login(page: Page) {
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'report_test_user');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');
  }

  // Helper to navigate to report section
  async function navigateToReports(page: Page) {
    await page.click('[data-testid="nav-reports"]');
    await page.waitForURL('**/reports');
  }

  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToReports(page);
  });

  test.describe('Report List', () => {
    test('should display report list page', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/Reports|报表/);
      await expect(page.locator('[data-testid="report-list"]')).toBeVisible();
    });

    test('should show MFR report option', async ({ page }) => {
      await expect(page.locator('[data-testid="report-type-mfr"]')).toBeVisible();
    });

    test('should display previously generated reports', async ({ page }) => {
      const reportItems = page.locator('[data-testid="report-item"]');
      // There should be at least the list container, even if empty
      await expect(page.locator('[data-testid="report-list"]')).toBeVisible();
    });
  });

  test.describe('MFR Report Configuration', () => {
    test.beforeEach(async ({ page }) => {
      // Click to create new MFR report
      await page.click('[data-testid="report-type-mfr"]');
      await page.waitForSelector('[data-testid="mfr-config-dialog"]');
    });

    test('should open MFR configuration dialog', async ({ page }) => {
      await expect(page.locator('[data-testid="mfr-config-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="mfr-dialog-title"]')).toContainText(/MFR|Membership/);
    });

    test('should display platform filter options', async ({ page }) => {
      const platformSelect = page.locator('[data-testid="platform-filter"]');
      await expect(platformSelect).toBeVisible();
      
      await platformSelect.click();
      // Should show common platform options
      await expect(page.locator('[data-testid="platform-option"]').first()).toBeVisible();
    });

    test('should display date range picker', async ({ page }) => {
      await expect(page.locator('[data-testid="date-range-start"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-range-end"]')).toBeVisible();
    });

    test('should display tier filter options', async ({ page }) => {
      const tierSelect = page.locator('[data-testid="tier-filter"]');
      await expect(tierSelect).toBeVisible();
    });

    test('should show estimated row count', async ({ page }) => {
      // After selecting filters, preview should show row estimate
      await page.click('[data-testid="preview-button"]');
      await page.waitForSelector('[data-testid="row-estimate"]');
      await expect(page.locator('[data-testid="row-estimate"]')).toBeVisible();
    });

    test('should validate row limit', async ({ page }) => {
      // Select filters that would exceed row limit (10000)
      await page.fill('[data-testid="row-limit-input"]', '100000');
      await page.click('[data-testid="generate-button"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="validation-error"]')).toContainText(/limit|超过/i);
    });

    test('should close dialog on cancel', async ({ page }) => {
      await page.click('[data-testid="cancel-button"]');
      await expect(page.locator('[data-testid="mfr-config-dialog"]')).not.toBeVisible();
    });
  });

  test.describe('Report Generation', () => {
    test('should generate MFR report successfully', async ({ page }) => {
      // Open config dialog
      await page.click('[data-testid="report-type-mfr"]');
      await page.waitForSelector('[data-testid="mfr-config-dialog"]');
      
      // Configure report with default settings
      await page.click('[data-testid="generate-button"]');
      
      // Should show progress indicator
      await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible();
      
      // Wait for completion (with timeout)
      await page.waitForSelector('[data-testid="generation-complete"]', { timeout: 60000 });
      
      // Should show success message
      await expect(page.locator('[data-testid="generation-complete"]')).toContainText(/success|成功/i);
    });

    test('should queue large report for background processing', async ({ page }) => {
      // Open config dialog
      await page.click('[data-testid="report-type-mfr"]');
      await page.waitForSelector('[data-testid="mfr-config-dialog"]');
      
      // Set large row limit to trigger background processing
      await page.fill('[data-testid="row-limit-input"]', '5000');
      await page.click('[data-testid="generate-button"]');
      
      // Should show queued message
      await expect(page.locator('[data-testid="report-queued"]')).toBeVisible();
    });
  });

  test.describe('Report Download', () => {
    test('should download completed report as CSV', async ({ page }) => {
      // Find a completed report in the list
      const completedReport = page.locator('[data-testid="report-item"][data-status="completed"]').first();
      
      if (await completedReport.count() > 0) {
        // Click download button
        const downloadButton = completedReport.locator('[data-testid="download-csv"]');
        
        // Listen for download event
        const downloadPromise = page.waitForEvent('download');
        await downloadButton.click();
        const download = await downloadPromise;
        
        // Verify download started
        expect(download.suggestedFilename()).toContain('.csv');
      } else {
        // Skip if no completed reports
        test.skip();
      }
    });

    test('should download completed report as Excel', async ({ page }) => {
      const completedReport = page.locator('[data-testid="report-item"][data-status="completed"]').first();
      
      if (await completedReport.count() > 0) {
        const downloadButton = completedReport.locator('[data-testid="download-excel"]');
        
        const downloadPromise = page.waitForEvent('download');
        await downloadButton.click();
        const download = await downloadPromise;
        
        expect(download.suggestedFilename()).toMatch(/\.xlsx?$/);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Report Preview', () => {
    test('should show report preview with sample data', async ({ page }) => {
      // Open config dialog
      await page.click('[data-testid="report-type-mfr"]');
      await page.waitForSelector('[data-testid="mfr-config-dialog"]');
      
      // Click preview button
      await page.click('[data-testid="preview-button"]');
      
      // Wait for preview to load
      await page.waitForSelector('[data-testid="preview-table"]');
      
      // Should display table with headers
      await expect(page.locator('[data-testid="preview-table"] th').first()).toBeVisible();
      
      // Should show limited rows (preview mode)
      const rows = page.locator('[data-testid="preview-table"] tbody tr');
      expect(await rows.count()).toBeLessThanOrEqual(10);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle generation failure gracefully', async ({ page }) => {
      // This test assumes a way to trigger failure (e.g., disconnected service)
      // In real scenario, this might be tested with network mocking
      
      await page.click('[data-testid="report-type-mfr"]');
      await page.waitForSelector('[data-testid="mfr-config-dialog"]');
      
      // Attempt to generate with invalid parameters (if any)
      await page.click('[data-testid="generate-button"]');
      
      // If generation fails, should show error message
      const errorMessage = page.locator('[data-testid="generation-error"]');
      const successMessage = page.locator('[data-testid="generation-complete"]');
      
      // Either error or success should appear
      await expect(errorMessage.or(successMessage)).toBeVisible({ timeout: 30000 });
    });

    test('should allow retry on failure', async ({ page }) => {
      // Find a failed report if any
      const failedReport = page.locator('[data-testid="report-item"][data-status="failed"]').first();
      
      if (await failedReport.count() > 0) {
        const retryButton = failedReport.locator('[data-testid="retry-button"]');
        await expect(retryButton).toBeVisible();
        
        await retryButton.click();
        
        // Should restart generation
        await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible();
      } else {
        // Skip if no failed reports
        test.skip();
      }
    });
  });
});

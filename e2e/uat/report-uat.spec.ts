// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT E2E Tests - Report Generation Scenarios

import { test, expect, UAT_USERS, login } from '../fixtures/uat-fixtures';

test.describe('UAT - MFR Report Generation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, UAT_USERS.corpAdmin);
    await page.goto('/reports');
  });

  test('Report list displays jobs', async ({ page }) => {
    await expect(page.locator('[data-testid="report-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-table"]')).toBeVisible();
  });

  test('S23 - MFR report configuration dialog', async ({ page }) => {
    await page.click('[data-testid="create-report-button"]');
    await page.click('[data-testid="report-type-mfr"]');

    // Config dialog should open
    await expect(page.locator('[data-testid="mfr-config-dialog"]')).toBeVisible();

    // Platform filter
    await page.click('[data-testid="platform-filter-YOUTUBE"]');
    await page.click('[data-testid="platform-filter-BILIBILI"]');

    // Date range
    await page.fill('[data-testid="date-from"]', '2026-01-01');
    await page.fill('[data-testid="date-to"]', '2026-01-31');

    // Preview data should load
    await expect(page.locator('[data-testid="preview-row-count"]')).toBeVisible();
  });

  test('S23 - Row count limit warning', async ({ page }) => {
    await page.click('[data-testid="create-report-button"]');
    await page.click('[data-testid="report-type-mfr"]');

    // Select all platforms to potentially exceed limit
    await page.click('[data-testid="select-all-platforms"]');

    // Check for warning if row count exceeds 50k
    const rowCount = await page.locator('[data-testid="preview-row-count"]').textContent();
    const count = parseInt(rowCount?.replace(/[^0-9]/g, '') || '0');

    if (count > 50000) {
      await expect(page.locator('[data-testid="row-limit-warning"]')).toBeVisible();
    }
  });

  test('S24 - Generate report job', async ({ page }) => {
    await page.click('[data-testid="create-report-button"]');
    await page.click('[data-testid="report-type-mfr"]');

    // Configure report
    await page.click('[data-testid="platform-filter-BILIBILI"]');
    await page.fill('[data-testid="date-from"]', '2026-01-01');
    await page.fill('[data-testid="date-to"]', '2026-01-31');

    // Submit
    await page.click('[data-testid="generate-report-button"]');

    // Should show job created
    await expect(page.locator('[data-testid="toast"]')).toContainText(/任务|job|created/i);

    // Job should appear in list
    await page.goto('/reports');
    await expect(page.locator('[data-testid="report-job-row"]').first()).toBeVisible();
  });

  test('S24 - Report progress updates', async ({ page }) => {
    // Create a new report job
    await page.click('[data-testid="create-report-button"]');
    await page.click('[data-testid="report-type-mfr"]');
    await page.click('[data-testid="platform-filter-BILIBILI"]');
    await page.click('[data-testid="generate-report-button"]');

    // Wait for job to start
    await page.goto('/reports');

    // Check for progress indicator
    const statusCell = page.locator('[data-testid="report-job-status"]').first();
    
    // Status should be PENDING, RUNNING, or SUCCESS
    await expect(statusCell).toContainText(/PENDING|RUNNING|SUCCESS|待处理|处理中|成功/i);
  });

  test('S25 - Download completed report', async ({ page }) => {
    // Find a completed report
    await expect(page.locator('[data-testid="report-job-row"]').first()).toBeVisible();

    // Click download on a SUCCESS job
    const downloadButton = page.locator('[data-testid="download-report-button"]').first();
    
    if (await downloadButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    }
  });

  test('S26 - Expired report shows regenerate option', async ({ page }) => {
    // Look for expired report (if any)
    const expiredStatus = page.locator('text=EXPIRED');
    
    if (await expiredStatus.isVisible()) {
      await expiredStatus.click();
      
      // Should show regenerate option
      await expect(page.locator('[data-testid="regenerate-button"]')).toBeVisible();
    }
  });
});

test.describe('UAT - Report Permissions', () => {
  test('Viewer can view but not generate reports', async ({ page }) => {
    await login(page, UAT_USERS.viewerHq);
    await page.goto('/reports');

    // Report list should be visible
    await expect(page.locator('[data-testid="report-list"]')).toBeVisible();

    // Create button should be disabled or hidden
    const createButton = page.locator('[data-testid="create-report-button"]');
    const isDisabled = await createButton.isDisabled().catch(() => true);
    const isHidden = !(await createButton.isVisible().catch(() => false));

    expect(isDisabled || isHidden).toBe(true);
  });

  test('Manager can generate reports for their scope', async ({ page }) => {
    await login(page, UAT_USERS.gamingManager);
    await page.goto('/reports');

    // Create button should be enabled
    await expect(page.locator('[data-testid="create-report-button"]')).toBeEnabled();
  });
});

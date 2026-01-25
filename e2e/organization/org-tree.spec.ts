// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { test, expect } from '@playwright/test';

test.describe('Organization Tree E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/organization');
  });

  test.skip('should display organization tree', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /organization/i })).toBeVisible();
    await expect(page.getByTestId('org-tree')).toBeVisible();
  });

  test.skip('should expand tree nodes', async ({ page }) => {
    const expandButton = page.getByTestId('tree-expand').first();
    await expandButton.click();
    
    // Check children are visible
    const children = page.getByTestId('tree-children').first();
    await expect(children).toBeVisible();
  });

  test.skip('should search organization', async ({ page }) => {
    await page.getByPlaceholder(/search/i).fill('Marketing');
    await page.keyboard.press('Enter');
    
    // Verify search results
    await expect(page.getByText('Marketing')).toBeVisible();
  });

  test.skip('should create subsidiary', async ({ page }) => {
    await page.getByRole('button', { name: /add subsidiary/i }).click();
    
    await page.getByLabel(/name/i).fill('New Department');
    await page.getByLabel(/code/i).fill('NEW_DEPT');
    await page.getByRole('button', { name: /create/i }).click();
    
    await expect(page.getByText('New Department')).toBeVisible();
  });

  test.skip('should create talent under subsidiary', async ({ page }) => {
    // Select a subsidiary
    await page.getByTestId('tree-node').first().click();
    
    await page.getByRole('button', { name: /add talent/i }).click();
    
    await page.getByLabel(/name/i).fill('New Talent');
    await page.getByLabel(/code/i).fill('NEW_TALENT');
    await page.getByRole('button', { name: /create/i }).click();
    
    await expect(page.getByText('New Talent')).toBeVisible();
  });

  test.skip('should drag and drop to reorder', async ({ page }) => {
    const source = page.getByTestId('tree-node').nth(0);
    const target = page.getByTestId('tree-node').nth(2);
    
    await source.dragTo(target);
    
    await expect(page.getByText(/reordered/i)).toBeVisible();
  });
});

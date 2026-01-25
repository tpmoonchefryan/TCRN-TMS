// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { test, expect } from '@playwright/test';

test.describe('Homepage Editor Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/homepage/editor');
  });

  test.skip('should display homepage editor', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /homepage/i })).toBeVisible();
    await expect(page.getByTestId('homepage-editor')).toBeVisible();
  });

  test.skip('should load existing homepage content', async ({ page }) => {
    // Wait for content to load
    await page.waitForSelector('[data-testid="editor-content"]');
    
    // Verify editor has content
    const editor = page.getByTestId('editor-content');
    await expect(editor).not.toBeEmpty();
  });

  test.skip('should save draft', async ({ page }) => {
    // Make a change
    await page.getByTestId('editor-content').fill('New content');
    
    // Save draft
    await page.getByRole('button', { name: /save draft/i }).click();
    
    await expect(page.getByText(/draft saved/i)).toBeVisible();
  });

  test.skip('should publish homepage', async ({ page }) => {
    await page.getByRole('button', { name: /publish/i }).click();
    
    // Confirm publish
    await page.getByRole('button', { name: /confirm/i }).click();
    
    await expect(page.getByText(/published/i)).toBeVisible();
  });

  test.skip('should preview homepage', async ({ page }) => {
    await page.getByRole('button', { name: /preview/i }).click();
    
    // Check preview opens
    const preview = page.getByTestId('homepage-preview');
    await expect(preview).toBeVisible();
  });

  test.skip('should change theme', async ({ page }) => {
    await page.getByRole('button', { name: /theme/i }).click();
    await page.getByRole('menuitem', { name: /dark/i }).click();
    
    // Verify theme changed
    await expect(page.getByTestId('homepage-editor')).toHaveClass(/dark/);
  });

  test.skip('should revert to previous version', async ({ page }) => {
    await page.getByRole('button', { name: /versions/i }).click();
    await page.getByRole('listitem').first().click();
    await page.getByRole('button', { name: /revert/i }).click();
    
    await expect(page.getByText(/reverted/i)).toBeVisible();
  });
});

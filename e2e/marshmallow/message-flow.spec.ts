// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { test, expect } from '@playwright/test';

test.describe('Marshmallow Message Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marshmallow');
  });

  test.skip('should display message inbox', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /marshmallow/i })).toBeVisible();
    await expect(page.getByTestId('message-list')).toBeVisible();
  });

  test.skip('should filter messages by status', async ({ page }) => {
    await page.getByRole('tab', { name: /pending/i }).click();
    
    // Verify only pending messages are shown
    const statusBadges = await page.getByTestId('message-status').all();
    for (const badge of statusBadges) {
      await expect(badge).toHaveText(/pending/i);
    }
  });

  test.skip('should approve a message', async ({ page }) => {
    await page.getByTestId('message-card').first().click();
    await page.getByRole('button', { name: /approve/i }).click();
    
    await expect(page.getByText(/approved/i)).toBeVisible();
  });

  test.skip('should reject a message with reason', async ({ page }) => {
    await page.getByTestId('message-card').first().click();
    await page.getByRole('button', { name: /reject/i }).click();
    
    await page.getByLabel(/reason/i).fill('Contains inappropriate content');
    await page.getByRole('button', { name: /confirm/i }).click();
    
    await expect(page.getByText(/rejected/i)).toBeVisible();
  });

  test.skip('should reply to a message', async ({ page }) => {
    await page.getByTestId('message-card').first().click();
    await page.getByRole('textbox', { name: /reply/i }).fill('Thank you for your message!');
    await page.getByRole('button', { name: /send/i }).click();
    
    await expect(page.getByText(/reply sent/i)).toBeVisible();
  });

  test.skip('should star a message', async ({ page }) => {
    const starButton = page.getByTestId('star-button').first();
    await starButton.click();
    
    await expect(starButton).toHaveClass(/starred/);
  });

  test.skip('should batch approve messages', async ({ page }) => {
    // Select multiple messages
    await page.getByRole('checkbox').nth(0).check();
    await page.getByRole('checkbox').nth(1).check();
    
    // Batch approve
    await page.getByRole('button', { name: /batch actions/i }).click();
    await page.getByRole('menuitem', { name: /approve all/i }).click();
    
    await expect(page.getByText(/approved/i)).toBeVisible();
  });
});

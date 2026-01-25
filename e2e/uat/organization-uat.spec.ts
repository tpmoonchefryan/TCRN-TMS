// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT E2E Tests - Organization Structure Scenarios

import { test, expect, UAT_USERS, login } from '../fixtures/uat-fixtures';

test.describe('UAT - Organization Structure Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, UAT_USERS.corpAdmin);
    await page.goto('/organization');
  });

  test('S7 - Create subsidiary under root', async ({ page }) => {
    await page.click('[data-testid="add-subsidiary-button"]');

    // Fill form
    await page.fill('[data-testid="subsidiary-code"]', 'NEW_DIVISION');
    await page.fill('[data-testid="subsidiary-name-en"]', 'New Division');
    await page.fill('[data-testid="subsidiary-name-zh"]', '新事业部');
    await page.fill('[data-testid="subsidiary-name-ja"]', '新事業部');
    await page.click('[data-testid="save-button"]');

    // Verify creation
    await expect(page.locator('[data-testid="toast"]')).toContainText(/成功|success/i);
    await expect(page.locator('text=New Division')).toBeVisible();
  });

  test('S8 - Move talent to different subsidiary', async ({ page }) => {
    // Select a talent
    await page.click('text=Sakura Ch.');

    // Initiate move
    await page.click('[data-testid="move-talent-button"]');

    // Select new parent
    await page.click('[data-testid="subsidiary-select"]');
    await page.click('text=Studio Beta');
    await page.click('[data-testid="confirm-move-button"]');

    // Verify move
    await expect(page.locator('[data-testid="toast"]')).toContainText(/移动|moved/i);
  });

  test('S9 - Cannot delete subsidiary with talents', async ({ page }) => {
    // Try to delete Studio Alpha which has talents
    await page.click('text=Studio Alpha');
    await page.click('[data-testid="subsidiary-actions-menu"]');
    await page.click('[data-testid="delete-subsidiary-button"]');

    // Should show warning
    await expect(page.locator('[data-testid="delete-warning"]')).toContainText(
      /先移动|move first|有艺人/i
    );

    // Delete should be disabled or show confirmation
    const deleteConfirm = page.locator('[data-testid="confirm-delete-button"]');
    const isDisabled = await deleteConfirm.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('Organization tree displays nested structure', async ({ page }) => {
    // Verify tree structure
    await expect(page.locator('text=Headquarters')).toBeVisible();
    await expect(page.locator('text=Gaming Division')).toBeVisible();
    await expect(page.locator('text=Music Division')).toBeVisible();
    await expect(page.locator('text=Studio Alpha')).toBeVisible();
    await expect(page.locator('text=Studio Beta')).toBeVisible();
  });

  test('Talent list shows correct talent count', async ({ page }) => {
    // Click on Gaming Division
    await page.click('text=Gaming Division');

    // Should show 2 studios
    await expect(page.locator('[data-testid="subsidiary-count"]')).toContainText('2');

    // Click on Studio Alpha
    await page.click('text=Studio Alpha');

    // Should show talents under this studio
    await expect(page.locator('text=Sakura Ch.')).toBeVisible();
    await expect(page.locator('text=Luna Gaming')).toBeVisible();
  });
});

test.describe('UAT - Solo Tenant Organization', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, UAT_USERS.soloOwner);
  });

  test('Solo tenant has flat structure', async ({ page }) => {
    await page.goto('/organization');

    // Should show talents directly without subsidiaries
    await expect(page.locator('text=Solo Star Channel')).toBeVisible();
    await expect(page.locator('text=Indie Creative')).toBeVisible();
  });

  test('Can create talent without subsidiary', async ({ page }) => {
    await page.goto('/organization');
    await page.click('[data-testid="add-talent-button"]');

    await page.fill('[data-testid="talent-code"]', 'NEW_TALENT');
    await page.fill('[data-testid="talent-name-en"]', 'New Talent');
    await page.fill('[data-testid="talent-display-name"]', 'New Talent Channel');
    await page.click('[data-testid="save-button"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText(/成功|success/i);
  });
});

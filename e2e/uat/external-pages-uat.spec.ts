// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT E2E Tests - External Pages (Homepage & Marshmallow) Scenarios

import { test, expect, UAT_USERS, login } from '../fixtures/uat-fixtures';

test.describe('UAT - Homepage Editor', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, UAT_USERS.sakuraManager);
    await page.goto('/homepage');
  });

  test('S17 - Homepage editor loads with components', async ({ page }) => {
    // Editor should be visible
    await expect(page.locator('[data-testid="homepage-editor"]')).toBeVisible();

    // Component panel should show available components
    await expect(page.locator('[data-testid="component-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-hero"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-about"]')).toBeVisible();
  });

  test('S17 - Drag and drop component to canvas', async ({ page }) => {
    // Drag hero component to canvas
    const heroComponent = page.locator('[data-testid="component-hero"]');
    const canvas = page.locator('[data-testid="editor-canvas"]');

    await heroComponent.dragTo(canvas);

    // Verify component was added
    await expect(page.locator('[data-testid="canvas-component-hero"]')).toBeVisible();
  });

  test('S17 - Edit component properties', async ({ page }) => {
    // Click on a component
    await page.click('[data-testid="canvas-component-hero"]');

    // Properties panel should show
    await expect(page.locator('[data-testid="properties-panel"]')).toBeVisible();

    // Edit title
    await page.fill('[data-testid="prop-title"]', 'Welcome to Sakura Channel!');
    await page.fill('[data-testid="prop-subtitle"]', 'Your favorite VTuber');

    // Preview should update
    await expect(page.locator('[data-testid="preview-panel"]')).toContainText(
      'Welcome to Sakura Channel!'
    );
  });

  test('S17 - Save draft', async ({ page }) => {
    // Make changes
    await page.click('[data-testid="canvas-component-hero"]');
    await page.fill('[data-testid="prop-title"]', 'Draft Test');

    // Save draft
    await page.click('[data-testid="save-draft-button"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText(/保存|saved/i);
    await expect(page.locator('[data-testid="draft-indicator"]')).toBeVisible();
  });

  test('S18 - Publish homepage', async ({ page }) => {
    // Click publish
    await page.click('[data-testid="publish-button"]');

    // Confirm dialog
    await page.click('[data-testid="confirm-publish-button"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText(/发布|published/i);
  });

  test('S19 - Version history and rollback', async ({ page }) => {
    // Open version history
    await page.click('[data-testid="version-history-button"]');

    await expect(page.locator('[data-testid="version-history-sheet"]')).toBeVisible();

    // Should show version list
    await expect(page.locator('[data-testid="version-item"]').first()).toBeVisible();

    // Rollback to previous version
    await page.click('[data-testid="version-item-rollback"]');
    await page.click('[data-testid="confirm-rollback-button"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText(/恢复|restored/i);
  });
});

test.describe('UAT - Public Homepage Access', () => {
  test('Published homepage is accessible', async ({ page }) => {
    // Access public homepage (sakura-ch is the path)
    await page.goto('/p/sakura-ch');

    await expect(page).toHaveURL('/p/sakura-ch');
    await expect(page.locator('[data-testid="public-homepage"]')).toBeVisible();
  });

  test('Unpublished homepage returns 404', async ({ page }) => {
    // hana-live is not published in UAT data
    const response = await page.goto('/p/hana-live');

    expect(response?.status()).toBe(404);
  });

  test('Mobile responsive layout works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/p/sakura-ch');

    // Check mobile layout elements
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
  });
});

test.describe('UAT - Marshmallow Messages', () => {
  test('S20 - Submit anonymous message', async ({ page }) => {
    // Go to public marshmallow page
    await page.goto('/m/sakura-ch/ask');

    // Fill message form
    await page.fill('[data-testid="message-content"]', 'Hello Sakura! I love your streams!');
    await page.check('[data-testid="anonymous-checkbox"]');
    await page.click('[data-testid="submit-message-button"]');

    // Should show thank you message
    await expect(page.locator('[data-testid="thank-you-message"]')).toBeVisible();
  });

  test('S20 - Submit named message', async ({ page }) => {
    await page.goto('/m/sakura-ch/ask');

    await page.fill('[data-testid="sender-name"]', 'TestFan');
    await page.fill('[data-testid="message-content"]', 'Question: When is your next stream?');
    await page.uncheck('[data-testid="anonymous-checkbox"]');
    await page.click('[data-testid="submit-message-button"]');

    await expect(page.locator('[data-testid="thank-you-message"]')).toBeVisible();
  });

  test('S22 - Rate limiting shows warning', async ({ page }) => {
    await page.goto('/m/sakura-ch/ask');

    // Submit multiple messages quickly
    for (let i = 0; i < 6; i++) {
      await page.fill('[data-testid="message-content"]', `Spam message ${i}`);
      await page.click('[data-testid="submit-message-button"]');
      await page.waitForTimeout(100);
    }

    // Should show rate limit warning or CAPTCHA
    await expect(
      page.locator('[data-testid="rate-limit-warning"], [data-testid="captcha-container"]')
    ).toBeVisible();
  });
});

test.describe('UAT - Marshmallow Admin', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, UAT_USERS.sakuraManager);
    await page.goto('/marshmallow');
  });

  test('S21 - Approve pending message', async ({ page }) => {
    // Click on pending tab
    await page.click('[data-testid="tab-pending"]');

    // Click on first pending message
    await page.click('[data-testid="message-row"]');

    // Approve
    await page.click('[data-testid="approve-button"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText(/批准|approved/i);
  });

  test('S21 - Reject message with reason', async ({ page }) => {
    await page.click('[data-testid="tab-pending"]');
    await page.click('[data-testid="message-row"]');

    // Reject
    await page.click('[data-testid="reject-button"]');
    await page.selectOption('[data-testid="rejection-reason"]', 'spam');
    await page.click('[data-testid="confirm-reject-button"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText(/拒绝|rejected/i);
  });

  test('S21 - Reply to message', async ({ page }) => {
    await page.click('[data-testid="tab-approved"]');
    await page.click('[data-testid="message-row"]');

    // Reply
    await page.fill('[data-testid="reply-content"]', 'Thank you for your message!');
    await page.click('[data-testid="send-reply-button"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText(/回复|replied/i);
  });

  test('Message list shows correct counts', async ({ page }) => {
    // Check tab counts
    await expect(page.locator('[data-testid="tab-pending-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-approved-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-rejected-count"]')).toBeVisible();
  });
});

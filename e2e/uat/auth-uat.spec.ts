// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT E2E Tests - Authentication & Authorization Scenarios

import { test, expect, UAT_USERS, login, logout } from '../fixtures/uat-fixtures';

test.describe('UAT - Authentication Flow', () => {
  test('S1 - Successful login redirects to dashboard', async ({ page }) => {
    await login(page, UAT_USERS.corpAdmin);

    await expect(page).toHaveURL(/\/(dashboard|organization)/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('S1 - Multi-tenant login with tenant code', async ({ page }) => {
    await page.goto('/login');

    // Enter tenant code
    await page.fill('[data-testid="tenant-code"]', UAT_USERS.corpAdmin.tenant);
    await page.fill('[data-testid="username"]', UAT_USERS.corpAdmin.username);
    await page.fill('[data-testid="password"]', UAT_USERS.corpAdmin.password);
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/\/(dashboard|organization)/);
  });

  test('S4 - Account lockout after 5 failed attempts', async ({ page }) => {
    await page.goto('/login');

    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="tenant-code"]', 'UAT_CORP');
      await page.fill('[data-testid="username"]', 'corp_admin');
      await page.fill('[data-testid="password"]', 'WrongPassword!');
      await page.click('[data-testid="login-button"]');
      await page.waitForTimeout(500);
    }

    // 6th attempt should show lockout message
    await page.fill('[data-testid="password"]', 'WrongPassword!');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      /锁定|locked/i
    );
  });

  test('Logout clears session', async ({ page }) => {
    await login(page, UAT_USERS.corpAdmin);
    await logout(page);

    // Try to access protected page
    await page.goto('/customers');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('UAT - Authorization & Permission Inheritance', () => {
  test('S5 - Subsidiary manager can access talent under their division', async ({
    page,
  }) => {
    // Login as Gaming Division Manager
    await login(page, UAT_USERS.gamingManager);

    // Should be able to access talents under Gaming Division
    await page.goto('/organization');
    await expect(page.locator('text=Studio Alpha')).toBeVisible();
    await expect(page.locator('text=Studio Beta')).toBeVisible();
  });

  test('S6 - Read-only user cannot edit', async ({ page }) => {
    // Login as viewer
    await login(page, UAT_USERS.viewerHq);

    await page.goto('/customers');

    // Create button should be disabled or hidden
    const createButton = page.locator('[data-testid="create-customer-button"]');
    const isDisabled = await createButton.isDisabled().catch(() => true);
    const isHidden = !(await createButton.isVisible().catch(() => false));

    expect(isDisabled || isHidden).toBe(true);
  });

  test('S6 - Read-only user gets 403 on write API', async ({ page }) => {
    await login(page, UAT_USERS.viewerSakura);

    // Try to make a POST request
    const response = await page.request.post('/api/v1/customers', {
      data: {
        nickname: 'Test Customer',
        profileType: 'individual',
      },
    });

    expect(response.status()).toBe(403);
  });

  test('Talent manager can only access their talent', async ({ page }) => {
    // Login as Sakura's manager
    await login(page, UAT_USERS.sakuraManager);

    // Should see Sakura's data
    await page.goto('/customers');
    await expect(page).toHaveURL(/customers/);

    // Try to access Luna's data - should be forbidden or filtered
    const response = await page.request.get('/api/v1/talents/TALENT_LUNA/customers');
    expect([403, 404]).toContain(response.status());
  });
});

test.describe('UAT - Cross-Tenant Isolation', () => {
  test('UAT_CORP user cannot access UAT_SOLO data', async ({ page }) => {
    await login(page, UAT_USERS.corpAdmin);

    // Try to access solo tenant's data via API
    const response = await page.request.get('/api/v1/tenants/UAT_SOLO/customers');
    expect([403, 404]).toContain(response.status());
  });

  test('Each tenant sees only their own users', async ({ page }) => {
    // Login to UAT_CORP
    await login(page, UAT_USERS.corpAdmin);
    await page.goto('/users');

    // Should see corp users but not solo users
    await expect(page.locator('text=corp_admin')).toBeVisible();

    // solo_owner should not be visible
    const soloUserVisible = await page.locator('text=solo_owner').isVisible().catch(() => false);
    expect(soloUserVisible).toBe(false);
  });
});

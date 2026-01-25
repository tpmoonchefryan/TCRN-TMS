// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT E2E Tests - Security & Protection Scenarios

import { test, expect, UAT_USERS, login } from '../fixtures/uat-fixtures';

test.describe('UAT - Rate Limiting', () => {
  test('S27 - API rate limiting triggers after threshold', async ({ page }) => {
    await login(page, UAT_USERS.corpAdmin);

    // Make many requests quickly
    const requests: Promise<Response>[] = [];
    for (let i = 0; i < 65; i++) {
      requests.push(
        page.request.get('/api/v1/customers?page=1&limit=10')
      );
    }

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter((r) => r.status() === 429);

    // At least some requests should be rate limited
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test('Rate limit response includes retry-after header', async ({ page }) => {
    await login(page, UAT_USERS.corpAdmin);

    // Trigger rate limit
    const requests: Promise<Response>[] = [];
    for (let i = 0; i < 70; i++) {
      requests.push(page.request.get('/api/v1/customers'));
    }

    const responses = await Promise.all(requests);
    const rateLimited = responses.find((r) => r.status() === 429);

    if (rateLimited) {
      const headers = rateLimited.headers();
      expect(headers['retry-after'] || headers['x-ratelimit-reset']).toBeDefined();
    }
  });
});

test.describe('UAT - Blocklist & Content Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, UAT_USERS.corpAdmin);
  });

  test('S28 - Blocklist management UI', async ({ page }) => {
    await page.goto('/settings');
    await page.click('[data-testid="tab-security"]');

    // Blocklist manager should be visible
    await expect(page.locator('[data-testid="blocklist-manager"]')).toBeVisible();
  });

  test('S28 - Add blocklist entry', async ({ page }) => {
    await page.goto('/settings');
    await page.click('[data-testid="tab-security"]');

    await page.click('[data-testid="add-blocklist-entry"]');
    await page.fill('[data-testid="blocklist-pattern"]', 'spam_keyword');
    await page.selectOption('[data-testid="blocklist-type"]', 'keyword');
    await page.click('[data-testid="save-blocklist-entry"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText(/成功|success/i);
  });

  test('S28 - Content with blocked word is rejected', async ({ page }) => {
    // First add a blocklist entry
    await page.goto('/settings');
    await page.click('[data-testid="tab-security"]');
    await page.click('[data-testid="add-blocklist-entry"]');
    await page.fill('[data-testid="blocklist-pattern"]', 'blocked_test_word');
    await page.selectOption('[data-testid="blocklist-type"]', 'keyword');
    await page.click('[data-testid="save-blocklist-entry"]');

    // Now try to submit marshmallow with blocked word
    await page.goto('/m/sakura-ch/ask');
    await page.fill('[data-testid="message-content"]', 'This contains blocked_test_word');
    await page.click('[data-testid="submit-message-button"]');

    // Should be rejected or flagged
    await expect(
      page.locator('[data-testid="error-message"], [data-testid="content-warning"]')
    ).toBeVisible();
  });

  test('Pattern tester works', async ({ page }) => {
    await page.goto('/settings');
    await page.click('[data-testid="tab-security"]');

    await page.click('[data-testid="pattern-tester-button"]');
    await page.fill('[data-testid="test-pattern"]', 'spam.*');
    await page.fill('[data-testid="test-content"]', 'This is spammy content');
    await page.click('[data-testid="run-test-button"]');

    await expect(page.locator('[data-testid="test-result"]')).toContainText(/match|匹配/i);
  });
});

test.describe('UAT - IP Access Rules', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, UAT_USERS.corpAdmin);
    await page.goto('/settings');
    await page.click('[data-testid="tab-security"]');
  });

  test('S29 - IP rules management UI', async ({ page }) => {
    await expect(page.locator('[data-testid="ip-rule-manager"]')).toBeVisible();
  });

  test('S29 - Add IP whitelist rule', async ({ page }) => {
    await page.click('[data-testid="tab-whitelist"]');
    await page.click('[data-testid="add-ip-rule"]');
    await page.fill('[data-testid="ip-address"]', '192.168.1.0/24');
    await page.fill('[data-testid="ip-rule-note"]', 'Office network');
    await page.click('[data-testid="save-ip-rule"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText(/成功|success/i);
  });

  test('S29 - Add IP blacklist rule', async ({ page }) => {
    await page.click('[data-testid="tab-blacklist"]');
    await page.click('[data-testid="add-ip-rule"]');
    await page.fill('[data-testid="ip-address"]', '10.0.0.1');
    await page.fill('[data-testid="ip-rule-note"]', 'Blocked IP');
    await page.click('[data-testid="save-ip-rule"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText(/成功|success/i);
  });

  test('IP checker tool works', async ({ page }) => {
    await page.click('[data-testid="ip-checker-button"]');
    await page.fill('[data-testid="check-ip-input"]', '192.168.1.100');
    await page.click('[data-testid="check-ip-button"]');

    await expect(page.locator('[data-testid="ip-check-result"]')).toBeVisible();
  });
});

test.describe('UAT - Technical Fingerprint', () => {
  test('S30 - API responses include fingerprint header', async ({ page }) => {
    await login(page, UAT_USERS.corpAdmin);

    const response = await page.request.get('/api/v1/customers');

    // Check for fingerprint header
    const headers = response.headers();
    expect(headers['x-tcrn-fp']).toBeDefined();
    expect(headers['x-tcrn-fp-version']).toBeDefined();
  });

  test('Fingerprint is consistent for same user', async ({ page }) => {
    await login(page, UAT_USERS.corpAdmin);

    const response1 = await page.request.get('/api/v1/customers');
    const response2 = await page.request.get('/api/v1/customers');

    const fp1 = response1.headers()['x-tcrn-fp'];
    const fp2 = response2.headers()['x-tcrn-fp'];

    expect(fp1).toBe(fp2);
  });

  test('Different users have different fingerprints', async ({ page, browser }) => {
    // Login as first user
    await login(page, UAT_USERS.corpAdmin);
    const response1 = await page.request.get('/api/v1/customers');
    const fp1 = response1.headers()['x-tcrn-fp'];

    // Create new context for second user
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await login(page2, UAT_USERS.corpAdmin2);
    const response2 = await page2.request.get('/api/v1/customers');
    const fp2 = response2.headers()['x-tcrn-fp'];

    await context2.close();

    // Fingerprints should be different
    expect(fp1).not.toBe(fp2);
  });
});

test.describe('UAT - Audit Logging', () => {
  test('Change log records user actions', async ({ page }) => {
    await login(page, UAT_USERS.corpAdmin);

    // Perform an action that should be logged
    await page.goto('/customers');
    await page.click('[data-testid="create-customer-button"]');
    await page.fill('[data-testid="nickname"]', 'AuditTestCustomer');
    await page.selectOption('[data-testid="profile-type"]', 'individual');
    await page.click('[data-testid="save-button"]');

    // Check change log
    await page.goto('/admin/logs/changes');

    // Recent action should be visible
    await expect(page.locator('table')).toContainText(/CREATE|customer/i);
  });

  test('Security events are logged', async ({ page }) => {
    // Failed login attempt
    await page.goto('/login');
    await page.fill('[data-testid="tenant-code"]', 'UAT_CORP');
    await page.fill('[data-testid="username"]', 'corp_admin');
    await page.fill('[data-testid="password"]', 'WrongPassword');
    await page.click('[data-testid="login-button"]');

    // Now login correctly and check security logs
    await login(page, UAT_USERS.corpAdmin);
    await page.goto('/admin/logs/events');

    // Should see login failure event
    await expect(page.locator('table')).toContainText(/LOGIN_FAILED|FAILED|失败/i);
  });
});

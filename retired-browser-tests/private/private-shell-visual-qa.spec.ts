import { expect, test, type Locator, type Page } from '@playwright/test';

const sessionStorageKey = 'tcrn.web.session';

const visualQaSession = {
  accessToken: 'visual-qa-token',
  tokenType: 'Bearer',
  expiresIn: 3600,
  authenticatedAt: '2026-05-06T00:00:00.000Z',
  tenantId: 'tenant-visual',
  tenantName: 'Visual Tenant',
  tenantTier: 'standard',
  tenantCode: 'VISUAL',
  user: {
    id: 'user-visual',
    username: 'visual-user',
    email: 'visual@example.com',
    displayName: 'Visual Operator',
    avatarUrl: null,
    preferredLanguage: 'en',
    totpEnabled: false,
    forceReset: false,
    passwordExpiresAt: null,
  },
};

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return Math.ceil(scrollWidth - window.innerWidth);
  });

  expect(overflow, `${label} horizontal overflow`).toBeLessThanOrEqual(1);
}

async function tabUntilFocused(page: Page, locator: Locator, maxTabs = 10) {
  for (let index = 0; index < maxTabs; index += 1) {
    if (
      await locator.evaluate((element) => document.activeElement === element).catch(() => false)
    ) {
      return;
    }

    await page.keyboard.press('Tab');
  }

  await expect(locator).toBeFocused();
}

async function usePrivateSession(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    },
    { key: sessionStorageKey, value: visualQaSession }
  );
}

async function mockPrivateRuntimeApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/v1/organization/tree') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            tenantId: visualQaSession.tenantId,
            subsidiaries: [],
            directTalents: [],
          },
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe('private shell browser visual QA', () => {
  test.beforeEach(async ({ page }) => {
    await usePrivateSession(page);
    await mockPrivateRuntimeApi(page);
  });

  test('mobile hierarchy shell navigation is reachable and traps keyboard focus', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant/tenant-visual/business');

    const openNavigationButton = page.getByRole('button', { name: 'Open workspace navigation' });
    await expect(openNavigationButton).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile private hierarchy shell');

    await tabUntilFocused(page, openNavigationButton);
    await page.keyboard.press('Enter');

    const navigationDialog = page.getByRole('dialog', { name: 'Main navigation' });
    const closeNavigationButton = page.getByRole('button', { name: 'Close workspace navigation' });
    const businessOverviewLink = navigationDialog.getByRole('link', { name: 'Business overview' });
    const organizationStructureLink = navigationDialog.getByRole('link', {
      name: 'Organization Structure',
    });

    await expect(navigationDialog).toBeVisible();
    await expect(closeNavigationButton).toBeFocused();
    await expect(businessOverviewLink).toBeVisible();
    await expect(organizationStructureLink).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile private hierarchy shell drawer');

    await page.keyboard.press('Tab');
    await expect(businessOverviewLink).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(organizationStructureLink).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeNavigationButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(navigationDialog).toBeHidden();
    await expect(openNavigationButton).toBeFocused();
  });
});

import { expect, test, type Locator, type Page } from '@playwright/test';

const sessionStorageKey = 'tcrn.web.session';
const localeOverrideStorageKey = 'tcrn.web.locale.override';

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

const privateLocaleVisualQaCases = [
  {
    name: 'English',
    locale: 'en',
    openNavigationLabel: 'Open workspace navigation',
    tableLabel: 'System users',
  },
  {
    name: 'Simplified Chinese',
    locale: 'zh_HANS',
    openNavigationLabel: '打开工作区导航',
    tableLabel: '系统用户',
  },
  {
    name: 'Traditional Chinese',
    locale: 'zh_HANT',
    openNavigationLabel: '開啟工作區導覽',
    tableLabel: '系统用户',
  },
  {
    name: 'Japanese',
    locale: 'ja',
    openNavigationLabel: 'ワークスペースナビゲーションを開く',
    tableLabel: 'システムユーザー',
  },
  {
    name: 'Korean',
    locale: 'ko',
    openNavigationLabel: '워크스페이스 탐색 열기',
    tableLabel: 'System users',
  },
  {
    name: 'French',
    locale: 'fr',
    openNavigationLabel: 'Ouvrir la navigation de l’espace de travail',
    tableLabel: 'System users',
  },
];

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return Math.ceil(scrollWidth - window.innerWidth);
  });

  expect(overflow, `${label} horizontal overflow`).toBeLessThanOrEqual(1);
}

async function hideFrameworkDevTools(page: Page) {
  await page.addStyleTag({
    content: `
      nextjs-portal,
      button[aria-label="Open Next.js Dev Tools"] {
        display: none !important;
      }
    `,
  });
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

async function useLocaleOverride(page: Page, locale: string) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: localeOverrideStorageKey, value: locale }
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

    if (url.pathname === '/api/v1/users/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: visualQaSession.user.id,
            username: visualQaSession.user.username,
            email: visualQaSession.user.email,
            phone: null,
            displayName: visualQaSession.user.displayName,
            avatarUrl: null,
            preferredLanguage: 'en',
            totpEnabled: false,
            forceReset: false,
            lastLoginAt: '2026-05-06T04:00:00.000Z',
            passwordChangedAt: '2026-05-01T04:00:00.000Z',
            passwordExpiresAt: null,
            createdAt: '2026-05-01T00:00:00.000Z',
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/users/me/sessions') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'session-current',
              deviceInfo: 'Visual QA browser',
              ipAddress: '127.0.0.1',
              createdAt: '2026-05-06T03:00:00.000Z',
              lastActiveAt: '2026-05-06T04:00:00.000Z',
              isCurrent: true,
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-visual') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'talent-visual',
            code: 'VISUAL_TALENT',
            displayName: 'Visual Talent',
            lifecycleStatus: 'published',
            isActive: true,
            profileStore: null,
            stats: {
              customerCount: 0,
              homepageVersionCount: 0,
              marshmallowMessageCount: 1,
            },
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-visual/marshmallow/config') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'marshmallow-config-visual',
            talentId: 'talent-visual',
            isEnabled: true,
            title: 'Visual Mailbox',
            welcomeText: 'Leave a deterministic message.',
            placeholderText: 'Write your message...',
            thankYouText: 'Thanks for your message.',
            allowAnonymous: true,
            captchaMode: 'auto',
            moderationEnabled: true,
            autoApprove: false,
            profanityFilterEnabled: true,
            externalBlocklistEnabled: true,
            maxMessageLength: 500,
            minMessageLength: 1,
            rateLimitPerIp: 5,
            rateLimitWindowHours: 1,
            reactionsEnabled: true,
            allowedReactions: ['heart', 'star'],
            theme: {},
            avatarUrl: null,
            termsContentEn: null,
            termsContentZh: null,
            termsContentJa: null,
            privacyContentEn: null,
            privacyContentZh: null,
            privacyContentJa: null,
            stats: {
              totalMessages: 1,
              pendingCount: 1,
              approvedCount: 0,
              rejectedCount: 0,
              unreadCount: 1,
            },
            marshmallowUrl: 'https://example.test/m/visual-mailbox',
            createdAt: '2026-05-06T03:00:00.000Z',
            updatedAt: '2026-05-06T04:00:00.000Z',
            version: 1,
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-visual/marshmallow/messages') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'message-visual',
                content: 'Visual moderation message',
                senderName: 'Visual Fan',
                isAnonymous: false,
                status: 'pending',
                rejectionReason: null,
                isRead: false,
                isStarred: false,
                isPinned: false,
                replyContent: null,
                repliedAt: null,
                repliedBy: null,
                reactionCounts: {},
                profanityFlags: [],
                imageUrl: null,
                imageUrls: [],
                socialLink: null,
                createdAt: '2026-05-06T04:00:00.000Z',
              },
            ],
            meta: {
              total: 1,
              stats: {
                pendingCount: 1,
                approvedCount: 0,
                rejectedCount: 0,
                unreadCount: 1,
              },
            },
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/system-users') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'user-visual-operator',
              username: 'visual.operator',
              email: 'visual.operator@example.com',
              displayName: 'Visual Operator',
              avatarUrl: null,
              isActive: true,
              isTotpEnabled: true,
              forceReset: false,
              lastLoginAt: '2026-05-06T04:00:00.000Z',
              createdAt: '2026-05-06T03:00:00.000Z',
            },
          ],
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/system-roles') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/delegated-admins') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
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
    await hideFrameworkDevTools(page);

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
    await expect(page).toHaveScreenshot('private-hierarchy-shell-mobile-drawer.png', {
      animations: 'disabled',
      fullPage: true,
    });

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

  for (const localeCase of privateLocaleVisualQaCases) {
    test(`private shell and dense user table keep mobile layout for ${localeCase.name} copy`, async ({
      page,
    }) => {
      await useLocaleOverride(page, localeCase.locale);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/tenant/tenant-visual/user-management');
      await hideFrameworkDevTools(page);

      const openNavigationButton = page.getByRole('button', {
        name: localeCase.openNavigationLabel,
      });
      const userTable = page.getByRole('table', { name: localeCase.tableLabel });

      await expect(openNavigationButton).toBeVisible();
      await expect(userTable).toBeVisible();
      await expect(page.getByText('visual.operator@example.com')).toBeVisible();
      await expectNoHorizontalOverflow(page, `${localeCase.name} private shell user table`);
    });
  }

  test('mobile profile security gates mutating forms behind action drawers', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant/tenant-visual/profile/security');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Account Security' })).toBeVisible();
    await expect(page.getByText('Active Sessions')).toBeVisible();
    await expect(page.getByLabel('Current password')).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'mobile profile security gated first level');

    await page.getByRole('button', { name: 'Open password change' }).click();
    const passwordDrawer = page.getByRole('dialog', { name: 'Password' });
    await expect(passwordDrawer).toBeVisible();
    await expect(passwordDrawer.getByLabel('Current password')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile profile security password drawer');
  });

  test('mobile marshmallow management keeps configuration behind a drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant/tenant-visual/talent/talent-visual/marshmallow');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Marshmallow Management' })).toBeVisible();
    await expect(page.getByText('Visual moderation message')).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'mobile marshmallow gated first level');

    await page.getByRole('button', { name: 'Configure mailbox' }).click();
    const configDrawer = page.getByRole('dialog', { name: 'Configuration' });
    await expect(configDrawer).toBeVisible();
    await expect(configDrawer.getByLabel('Title')).toHaveValue('Visual Mailbox');
    await expectNoHorizontalOverflow(page, 'mobile marshmallow config drawer');
  });
});

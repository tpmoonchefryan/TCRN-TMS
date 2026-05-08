import { expect, test, type Locator, type Page } from '@playwright/test';

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseCssColor(value: string): RgbaColor {
  const match = value.trim().match(/^rgba?\(([^)]+)\)$/i);

  if (!match) {
    throw new Error(`Unsupported CSS color: ${value}`);
  }

  const [r, g, b, a = '1'] = match[1].split(',').map((part) => part.trim());

  return {
    r: Number(r),
    g: Number(g),
    b: Number(b),
    a: Number(a),
  };
}

function blendOverWhite(color: RgbaColor): RgbaColor {
  if (color.a >= 1) {
    return color;
  }

  return {
    r: color.r * color.a + 255 * (1 - color.a),
    g: color.g * color.a + 255 * (1 - color.a),
    b: color.b * color.a + 255 * (1 - color.a),
    a: 1,
  };
}

function relativeLuminance(color: RgbaColor) {
  const [r, g, b] = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string) {
  const fg = blendOverWhite(parseCssColor(foreground));
  const bg = blendOverWhite(parseCssColor(background));
  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg));

  return (lighter + 0.05) / (darker + 0.05);
}

async function expectReadableContrast(locator: Locator, label: string, minimumRatio = 4.5) {
  const colors = await locator.evaluate((element) => {
    function isVisibleBackground(value: string) {
      return value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)';
    }

    let current: Element | null = element;
    let background = 'rgb(255, 255, 255)';

    while (current) {
      const candidate = window.getComputedStyle(current).backgroundColor;
      if (candidate && isVisibleBackground(candidate)) {
        background = candidate;
        break;
      }
      current = current.parentElement;
    }

    return {
      foreground: window.getComputedStyle(element).color,
      background,
    };
  });
  const ratio = contrastRatio(colors.foreground, colors.background);

  expect(ratio, `${label} contrast ratio`).toBeGreaterThanOrEqual(minimumRatio);
}

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

const localeOverrideStorageKey = 'tcrn.web.locale.override';

const visualQaFixture = {
  displayName: 'Playwright Public Talent',
  homepagePath: 'browser-visual-homepage',
  darkHomepagePath: 'browser-visual-homepage-dark',
  marshmallowPath: 'browser-visual-marshmallow',
  marshmallowMissingCaptchaPath: 'browser-visual-marshmallow-missing-captcha',
  marshmallowConfiguredCaptchaPath: 'browser-visual-marshmallow-configured-captcha',
  marshmallowTitle: 'Ask The Talent',
  welcomeText: 'Drop a thoughtful question.',
};

const localeVisualQaCases = [
  {
    name: 'English',
    locale: 'en',
    homepageBadge: 'Public Homepage',
    messageLabel: 'Message',
    anonymousLabel: 'Submit anonymously',
    sendButton: 'Send message',
  },
  {
    name: 'Simplified Chinese',
    locale: 'zh_HANS',
    homepageBadge: '公开主页',
    messageLabel: '消息内容',
    anonymousLabel: '匿名提交',
    sendButton: '发送消息',
  },
  {
    name: 'Traditional Chinese',
    locale: 'zh_HANT',
    homepageBadge: '公開主頁',
    messageLabel: '訊息內容',
    anonymousLabel: '匿名提交',
    sendButton: '送出訊息',
  },
  {
    name: 'Japanese',
    locale: 'ja',
    homepageBadge: '公開ホームページ',
    messageLabel: 'メッセージ',
    anonymousLabel: '匿名で送信',
    sendButton: 'メッセージを送信',
  },
  {
    name: 'Korean',
    locale: 'ko',
    homepageBadge: '공개 홈페이지',
    messageLabel: '메시지',
    anonymousLabel: '익명으로 제출',
    sendButton: '메시지 보내기',
  },
  {
    name: 'French',
    locale: 'fr',
    homepageBadge: "Page d'accueil publique",
    messageLabel: 'Message',
    anonymousLabel: 'Envoyer anonymement',
    sendButton: 'Envoyer le message',
  },
];

const visualQaTheme = {
  preset: 'default',
  visualStyle: 'simple',
  colors: {
    primary: '#5599FF',
    accent: '#FF88CC',
    background: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#666666',
  },
  background: { type: 'solid', value: '#F5F7FA' },
  card: { background: '#FFFFFF', borderRadius: 'medium', shadow: 'small' },
  typography: { fontFamily: 'system', headingWeight: 'bold' },
  animation: { enableEntrance: true, enableHover: true, intensity: 'medium' },
  decorations: { type: 'none' },
};

const visualQaDarkTheme = {
  preset: 'dark',
  visualStyle: 'simple',
  colors: {
    primary: '#5599FF',
    accent: '#FF88CC',
    background: '#1A1A1A',
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
  },
  background: { type: 'solid', value: '#0D0D0D' },
  card: { background: '#2A2A2A', borderRadius: 'medium', shadow: 'medium' },
  typography: { fontFamily: 'system', headingWeight: 'bold' },
  animation: { enableEntrance: true, enableHover: true, intensity: 'medium' },
  decorations: { type: 'none' },
};

const visualQaHighContrastTheme = {
  preset: 'minimal',
  visualStyle: 'flat',
  colors: {
    primary: '#FFFF00',
    accent: '#00FFFF',
    background: '#000000',
    text: '#FFFFFF',
    textSecondary: '#F5F5F5',
  },
  background: { type: 'solid', value: '#000000' },
  card: { background: '#111111', borderRadius: 'medium', shadow: 'none' },
  typography: { fontFamily: 'system', headingWeight: 'bold' },
  animation: { enableEntrance: false, enableHover: false, intensity: 'low' },
  decorations: { type: 'none' },
};

function buildHomepageResponse(input: { displayName: string; theme: typeof visualQaTheme }) {
  return {
    success: true,
    data: {
      talent: {
        displayName: input.displayName,
        avatarUrl: null,
        timezone: 'UTC',
      },
      content: {
        version: '1.0.0',
        components: [
          {
            id: 'profile-card',
            type: 'ProfileCard',
            props: {
              displayName: input.displayName,
              bio: 'Visual profile card bio',
            },
            order: 0,
            visible: true,
          },
        ],
      },
      theme: input.theme,
      seo: {
        title: input.displayName,
        description: 'Visual homepage hero description',
        ogImageUrl: null,
      },
      updatedAt: '2026-05-06T00:00:00.000Z',
    },
  };
}

async function useLocaleOverride(page: Page, locale: string) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: localeOverrideStorageKey, value: locale }
  );
}

async function mockPublicRuntimeApi(page: Page) {
  await page.route('**/api/v1/public/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === `/api/v1/public/homepage/${visualQaFixture.homepagePath}`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          buildHomepageResponse({
            displayName: visualQaFixture.displayName,
            theme: visualQaTheme,
          })
        ),
      });
      return;
    }

    if (url.pathname === `/api/v1/public/homepage/${visualQaFixture.darkHomepagePath}`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          buildHomepageResponse({
            displayName: `${visualQaFixture.displayName} Dark`,
            theme: visualQaDarkTheme,
          })
        ),
      });
      return;
    }

    if (
      url.pathname === `/api/v1/public/marshmallow/${visualQaFixture.marshmallowPath}/config` ||
      url.pathname === `/api/v1/public/marshmallow/${visualQaFixture.marshmallowMissingCaptchaPath}/config` ||
      url.pathname === `/api/v1/public/marshmallow/${visualQaFixture.marshmallowConfiguredCaptchaPath}/config`
    ) {
      const isMissingCaptchaRoute =
        url.pathname === `/api/v1/public/marshmallow/${visualQaFixture.marshmallowMissingCaptchaPath}/config`;
      const isConfiguredCaptchaRoute =
        url.pathname === `/api/v1/public/marshmallow/${visualQaFixture.marshmallowConfiguredCaptchaPath}/config`;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            talent: {
              displayName: visualQaFixture.displayName,
              avatarUrl: null,
            },
            title: isMissingCaptchaRoute
              ? 'Missing Turnstile Mailbox'
              : isConfiguredCaptchaRoute
                ? 'Configured Turnstile Mailbox'
                : visualQaFixture.marshmallowTitle,
            welcomeText: visualQaFixture.welcomeText,
            placeholderText: 'Type your question here',
            allowAnonymous: true,
            captchaMode: isMissingCaptchaRoute || isConfiguredCaptchaRoute ? 'always' : 'never',
            turnstile: {
              siteKeyConfigured: !isMissingCaptchaRoute,
              secretKeyConfigured: !isMissingCaptchaRoute,
              source: isMissingCaptchaRoute ? 'none' : 'environment',
              providerReady: !isMissingCaptchaRoute,
              runtimeBypass: isMissingCaptchaRoute,
              environment: isMissingCaptchaRoute ? 'test' : 'staging',
              ready: true,
            },
            maxMessageLength: 500,
            minMessageLength: 5,
            reactionsEnabled: false,
            allowedReactions: [],
            theme: {},
            terms: { en: null, zh: null, ja: null },
            privacy: { en: null, zh: null, ja: null },
          },
        }),
      });
      return;
    }

    if (
      url.pathname === `/api/v1/public/marshmallow/${visualQaFixture.marshmallowPath}/messages` ||
      url.pathname === `/api/v1/public/marshmallow/${visualQaFixture.marshmallowMissingCaptchaPath}/messages` ||
      url.pathname === `/api/v1/public/marshmallow/${visualQaFixture.marshmallowConfiguredCaptchaPath}/messages`
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            messages: [],
            cursor: null,
            hasMore: false,
          },
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe('public runtime browser visual QA', () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicRuntimeApi(page);
  });

  test('public homepage keeps readable hero copy without horizontal overflow', async ({ page }) => {
    const breakpoints = [
      { name: 'desktop', width: 1280, height: 900 },
      { name: 'mobile', width: 390, height: 844 },
    ];
    const homepageCases = [
      {
        name: 'default theme',
        path: visualQaFixture.homepagePath,
        displayName: visualQaFixture.displayName,
        snapshotName: 'default',
      },
      {
        name: 'dark theme',
        path: visualQaFixture.darkHomepagePath,
        displayName: `${visualQaFixture.displayName} Dark`,
        snapshotName: 'dark',
      },
    ];

    for (const homepageCase of homepageCases) {
      for (const breakpoint of breakpoints) {
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
        await page.goto(`/p/${homepageCase.path}`);
        await hideFrameworkDevTools(page);

        const heroHeading = page.getByRole('heading', { name: homepageCase.displayName, level: 1 });
        const heroDescription = page.getByText('Visual homepage hero description');
        const profileHeading = page.getByRole('heading', {
          name: homepageCase.displayName,
          level: 2,
        });
        const profileBio = page.getByText('Visual profile card bio');

        await expect(
          heroHeading,
          `${homepageCase.name} ${breakpoint.name} hero heading`
        ).toBeVisible();
        await expect(
          heroDescription,
          `${homepageCase.name} ${breakpoint.name} hero description`
        ).toBeVisible();
        await expectReadableContrast(
          heroHeading,
          `${homepageCase.name} ${breakpoint.name} homepage hero`
        );
        await expectReadableContrast(
          heroDescription,
          `${homepageCase.name} ${breakpoint.name} homepage hero description`
        );
        await expectNoHorizontalOverflow(page, `${homepageCase.name} ${breakpoint.name} homepage`);

        await expect(
          profileHeading,
          `${homepageCase.name} ${breakpoint.name} profile card heading`
        ).toBeVisible();
        await expect(
          profileBio,
          `${homepageCase.name} ${breakpoint.name} profile card bio`
        ).toBeVisible();
        await expectReadableContrast(
          profileHeading,
          `${homepageCase.name} ${breakpoint.name} profile heading`
        );
        await expectReadableContrast(
          profileBio,
          `${homepageCase.name} ${breakpoint.name} profile bio`
        );

        await expect(page).toHaveScreenshot(
          `public-homepage-${homepageCase.snapshotName}-${breakpoint.name}.png`,
          {
            animations: 'disabled',
            fullPage: true,
          }
        );
      }
    }
  });

  test('public homepage high-contrast theme keeps readable core copy', async ({ page }) => {
    await page.route('**/api/v1/public/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname === `/api/v1/public/homepage/browser-visual-homepage-high-contrast`) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            buildHomepageResponse({
              displayName: `${visualQaFixture.displayName} High Contrast`,
              theme: visualQaHighContrastTheme,
            })
          ),
        });
        return;
      }

      await route.fallback();
    });

    const breakpoints = [
      { name: 'desktop', width: 1280, height: 900 },
      { name: 'mobile', width: 390, height: 844 },
    ];

    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.goto('/p/browser-visual-homepage-high-contrast');
      await hideFrameworkDevTools(page);

      const heroHeading = page.getByRole('heading', {
        name: `${visualQaFixture.displayName} High Contrast`,
        level: 1,
      });
      const heroDescription = page.getByText('Visual homepage hero description');
      const profileHeading = page.getByRole('heading', {
        name: `${visualQaFixture.displayName} High Contrast`,
        level: 2,
      });
      const profileBio = page.getByText('Visual profile card bio');

      await expect(heroHeading).toBeVisible();
      await expect(heroDescription).toBeVisible();
      await expect(profileHeading).toBeVisible();
      await expect(profileBio).toBeVisible();
      await expectReadableContrast(heroHeading, `high contrast ${breakpoint.name} homepage hero`);
      await expectReadableContrast(
        heroDescription,
        `high contrast ${breakpoint.name} homepage hero description`
      );
      await expectReadableContrast(
        profileHeading,
        `high contrast ${breakpoint.name} homepage profile heading`
      );
      await expectReadableContrast(
        profileBio,
        `high contrast ${breakpoint.name} homepage profile bio`
      );
      await expectNoHorizontalOverflow(page, `high contrast homepage ${breakpoint.name}`);
      await expect(page).toHaveScreenshot(
        `public-homepage-high-contrast-${breakpoint.name}.png`,
        {
          animations: 'disabled',
          fullPage: true,
        }
      );
    }
  });

  for (const localeCase of localeVisualQaCases) {
    test(`public runtime keeps mobile layout for ${localeCase.name} copy`, async ({ page }) => {
      await useLocaleOverride(page, localeCase.locale);
      await page.setViewportSize({ width: 390, height: 844 });

      await page.goto(`/p/${visualQaFixture.homepagePath}`);
      await expect(page.getByText(localeCase.homepageBadge)).toBeVisible();
      await expectNoHorizontalOverflow(page, `${localeCase.name} mobile homepage`);

      await page.goto(`/m/${visualQaFixture.marshmallowPath}`);

      const messageInput = page.getByLabel(localeCase.messageLabel);
      const anonymousCheckbox = page.getByLabel(localeCase.anonymousLabel);
      const sendButton = page.getByRole('button', { name: localeCase.sendButton });

      await expect(messageInput).toBeVisible();
      await expect(anonymousCheckbox).toBeVisible();
      await expect(sendButton).toBeVisible();
      await expectNoHorizontalOverflow(page, `${localeCase.name} mobile marshmallow`);
      await expectReadableContrast(sendButton, `${localeCase.name} mobile marshmallow send button`);
    });
  }

  test('public marshmallow keeps mobile form controls reachable by keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/m/${visualQaFixture.marshmallowPath}`);
    await hideFrameworkDevTools(page);

    const title = page.getByRole('heading', { name: visualQaFixture.marshmallowTitle, level: 1 });
    const messageInput = page.getByLabel('Message');
    const anonymousCheckbox = page.getByLabel('Submit anonymously');
    const sendButton = page.getByRole('button', { name: 'Send message' });

    await expect(title).toBeVisible();
    await expect(messageInput).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile marshmallow');
    await expectReadableContrast(title, 'mobile marshmallow title');
    await expectReadableContrast(sendButton, 'mobile marshmallow send button');
    await expect(page).toHaveScreenshot('public-marshmallow-mobile.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await tabUntilFocused(page, messageInput);
    await page.keyboard.type('Hello from browser QA');
    await page.keyboard.press('Tab');
    await expect(anonymousCheckbox).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(sendButton).toBeFocused();
  });

  test('public marshmallow keeps submission available when runtime bypass is active', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/m/${visualQaFixture.marshmallowMissingCaptchaPath}`);
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Missing Turnstile Mailbox', level: 1 })).toBeVisible();
    await expect(page.getByText('Submission is temporarily unavailable. Please try again later.')).toHaveCount(0);
    await expect(page.getByText('Turnstile verification')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
    await expectNoHorizontalOverflow(page, 'mobile marshmallow missing Turnstile config');
  });

  test('public marshmallow renders Turnstile when runtime config is ready', async ({ page }) => {
    test.skip(!process.env.TURNSTILE_SITE_KEY, 'Requires TURNSTILE_SITE_KEY for the Next public env path.');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/m/${visualQaFixture.marshmallowConfiguredCaptchaPath}`);
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Configured Turnstile Mailbox', level: 1 })).toBeVisible();
    await expect(page.getByText('Turnstile verification')).toBeVisible();
    await expect(
      page.getByText('This page requires Turnstile, but captcha is not configured. Submission is unavailable.')
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
    await expectNoHorizontalOverflow(page, 'mobile marshmallow configured Turnstile path');
  });
});

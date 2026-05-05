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

async function tabUntilFocused(page: Page, locator: Locator, maxTabs = 10) {
  for (let index = 0; index < maxTabs; index += 1) {
    if (await locator.evaluate((element) => document.activeElement === element).catch(() => false)) {
      return;
    }

    await page.keyboard.press('Tab');
  }

  await expect(locator).toBeFocused();
}

const visualQaFixture = {
  displayName: 'Playwright Public Talent',
  homepagePath: 'browser-visual-homepage',
  marshmallowPath: 'browser-visual-marshmallow',
  marshmallowTitle: 'Ask The Talent',
  welcomeText: 'Drop a thoughtful question.',
};

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

async function mockPublicRuntimeApi(page: Page) {
  await page.route('**/api/v1/public/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === `/api/v1/public/homepage/${visualQaFixture.homepagePath}`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            talent: {
              displayName: visualQaFixture.displayName,
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
                    displayName: visualQaFixture.displayName,
                    bio: 'Public homepage visual QA fixture',
                  },
                  order: 0,
                  visible: true,
                },
              ],
            },
            theme: visualQaTheme,
            seo: {
              title: visualQaFixture.displayName,
              description: 'Public homepage visual QA fixture',
              ogImageUrl: null,
            },
            updatedAt: '2026-05-06T00:00:00.000Z',
          },
        }),
      });
      return;
    }

    if (url.pathname === `/api/v1/public/marshmallow/${visualQaFixture.marshmallowPath}/config`) {
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
            title: visualQaFixture.marshmallowTitle,
            welcomeText: visualQaFixture.welcomeText,
            placeholderText: 'Type your question here',
            allowAnonymous: true,
            captchaMode: 'never',
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

    if (url.pathname === `/api/v1/public/marshmallow/${visualQaFixture.marshmallowPath}/messages`) {
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

    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.goto(`/p/${visualQaFixture.homepagePath}`);

      const heroHeading = page.getByRole('heading', { name: visualQaFixture.displayName, level: 1 });
      await expect(heroHeading, `${breakpoint.name} hero heading`).toBeVisible();
      await expectReadableContrast(heroHeading, `${breakpoint.name} homepage hero`);
      await expectNoHorizontalOverflow(page, `${breakpoint.name} homepage`);

      await expect(
        page.getByRole('heading', { name: visualQaFixture.displayName, level: 2 }),
        `${breakpoint.name} profile card heading`,
      ).toBeVisible();
    }
  });

  test('public marshmallow keeps mobile form controls reachable by keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/m/${visualQaFixture.marshmallowPath}`);

    const title = page.getByRole('heading', { name: visualQaFixture.marshmallowTitle, level: 1 });
    const messageInput = page.getByLabel('Message');
    const anonymousCheckbox = page.getByLabel('Submit anonymously');
    const sendButton = page.getByRole('button', { name: 'Send message' });

    await expect(title).toBeVisible();
    await expect(messageInput).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile marshmallow');
    await expectReadableContrast(title, 'mobile marshmallow title');
    await expectReadableContrast(sendButton, 'mobile marshmallow send button');

    await tabUntilFocused(page, messageInput);
    await page.keyboard.type('Hello from browser QA');
    await page.keyboard.press('Tab');
    await expect(anonymousCheckbox).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(sendButton).toBeFocused();
  });
});

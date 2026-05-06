import { expect, test, type Page } from '@playwright/test';

const localeOverrideStorageKey = 'tcrn.web.locale.override';

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

async function useLocaleOverride(page: Page, locale: string) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: localeOverrideStorageKey, value: locale },
  );
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return Math.ceil(scrollWidth - window.innerWidth);
  });

  expect(overflow, `${label} horizontal overflow`).toBeLessThanOrEqual(1);
}

test.describe('login UI QA', () => {
  test('hydrates stored locale override without mismatch and keeps full hero copy visible', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await useLocaleOverride(page, 'zh_HANS');
    await page.goto('/login');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('button', { name: '切换语言: 简体中文' })).toBeVisible();
    await expect(page.getByText('欢迎登陆TCRN TMS')).toBeVisible();
    await expect(page.locator('.login-hero-description')).toHaveText('记录闪耀背后的每一滴汗水');
    await expect(page.locator('.login-hero-typewriter')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '登录' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'login desktop');

    expect(consoleErrors.join('\n')).not.toContain('Hydration failed');
    expect(consoleErrors.join('\n')).not.toContain("server rendered text didn't match the client");
    expect(pageErrors.join('\n')).not.toContain('Hydration failed');

    await expect(page).toHaveScreenshot('login-zh-hans-desktop.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('renders stable full hero copy on mobile with reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await useLocaleOverride(page, 'zh_HANS');

    await page.goto('/login');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('button', { name: '切换语言: 简体中文' })).toBeVisible();
    await expect(page.locator('.login-hero-description')).toHaveText('记录闪耀背后的每一滴汗水');
    await expect(page.locator('.login-hero-typewriter')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '登录' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'login mobile reduced motion');

    await expect(page).toHaveScreenshot('login-zh-hans-mobile-reduced-motion.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });
});

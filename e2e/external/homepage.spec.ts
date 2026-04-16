// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { test, expect, type Page } from '@playwright/test';

import { loadWebSmokeFixtureSync } from '../fixtures/web-smoke-fixture';

const fixture = loadWebSmokeFixtureSync();

async function openAskPage(page: Page) {
  await page.goto(`/m/${fixture.public.marshmallowPath}/ask`);
}

test.describe('External Homepage', () => {
  test('visit published talent homepage', async ({ page }) => {
    await page.goto(`/p/${fixture.public.homepagePath}`);

    await expect(
      page.getByRole('heading', { name: fixture.public.displayName }),
    ).toBeVisible();
    await expect(page.getByText('Powered by TCRN TMS')).toBeVisible();
  });

  test('unknown homepage path returns the app not-found surface', async ({ page }) => {
    const response = await page.goto(`/p/${fixture.public.missingHomepagePath}`);

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
  });

  test('published marshmallow feed renders the configured public copy', async ({ page }) => {
    await page.goto(`/m/${fixture.public.marshmallowPath}`);

    await expect(
      page.getByRole('heading', { name: fixture.public.marshmallowTitle }),
    ).toBeVisible();
    await expect(page.getByText(fixture.public.welcomeText)).toBeVisible();
  });

  test('submit anonymous message and then hit the configured rate limit', async ({ page }) => {
    await openAskPage(page);

    await page.locator('textarea').fill('This is the first public smoke message.');
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(fixture.public.thankYouText)).toBeVisible();

    await openAskPage(page);
    await page.locator('textarea').fill('This second message should hit the rate limit.');
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(fixture.public.rateLimitMessage)).toBeVisible();
  });
});

import { expect, test } from '@playwright/test';

import { loadWebSmokeFixtureSync } from '../fixtures/web-smoke-fixture';

test('public homepage resolves the published talent surface', async ({ page }) => {
  const fixture = loadWebSmokeFixtureSync();

  await page.goto(`/p/${fixture.public.homepagePath}`);

  await expect(page.getByText(fixture.public.displayName).first()).toBeVisible({
    timeout: 15_000,
  });
});

test('public marshmallow resolves the published public form surface', async ({ page }) => {
  const fixture = loadWebSmokeFixtureSync();

  await page.goto(`/m/${fixture.public.marshmallowPath}`);

  await expect(page.getByRole('heading', { name: fixture.public.marshmallowTitle })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(fixture.public.welcomeText)).toBeVisible();
  await expect(page.getByLabel('Message')).toBeVisible();
});

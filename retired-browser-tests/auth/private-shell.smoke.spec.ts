import { expect, test } from '@playwright/test';

import { loadWebSmokeFixtureSync } from '../fixtures/web-smoke-fixture';

test('unauthenticated tenant route redirects to login and lands in the private workspace after sign-in', async ({
  page,
}) => {
  const fixture = loadWebSmokeFixtureSync();
  const expectedNext = `/tenant/${fixture.tenantId}/organization-structure`;

  await page.goto(`/tenant/${fixture.tenantId}/organization-structure`);

  await expect(page).toHaveURL(/\/login\?next=/, {
    timeout: 15_000,
  });
  await expect
    .poll(() => {
      const current = new URL(page.url());
      return current.searchParams.get('next');
    })
    .toBe(expectedNext);

  await page.getByLabel('Tenant code').fill(fixture.tenantCode);
  await page.getByLabel('Username or email').fill(fixture.users.standard.username);
  await page.getByLabel('Password').fill(fixture.users.standard.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(new RegExp(`/tenant/${fixture.tenantId}/organization-structure$`), {
    timeout: 15_000,
  });
  await expect(page.getByText('Private Workspace')).toBeVisible();
  await expect(page.getByText('Organization Structure').first()).toBeVisible();
});

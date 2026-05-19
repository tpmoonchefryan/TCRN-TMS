import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { expect, type Locator, type Page } from '@playwright/test';

interface ResolvedAcceptanceFixture {
  fixture: {
    talent: {
      code: string;
      id: string;
    };
    tenant: {
      code: string;
      id: string;
      schemaName: string;
    };
    users: {
      admin: {
        id: string;
        username: string;
      };
    };
  };
  routes: {
    homepageManagement: string;
    publicHomepage: string;
  };
}

let cachedFixture: ResolvedAcceptanceFixture | null = null;

function loadRepoEnvFiles() {
  const repoRoot = process.cwd();

  for (const envFile of ['.env.local', '.env']) {
    const envPath = path.resolve(repoRoot, envFile);

    if (existsSync(envPath)) {
      process.loadEnvFile(envPath);
    }
  }
}

const DEFAULT_UAT_CORP_ACCEPTANCE_PASSWORD = 'EvidencePass123!';
const DEFAULT_PLAYWRIGHT_FIXTURE_PASSWORD = 'TestPassword123!';

function doesUrlMatchTarget(actualUrl: string | URL, targetPath: string) {
  const actual = new URL(actualUrl.toString());
  const target = new URL(targetPath, actual.origin);

  if (actual.pathname !== target.pathname) {
    return false;
  }

  for (const [key, value] of target.searchParams.entries()) {
    if (actual.searchParams.get(key) !== value) {
      return false;
    }
  }

  return true;
}

export function resolveAcceptanceFixture() {
  loadRepoEnvFiles();

  if (cachedFixture) {
    return cachedFixture;
  }

  const output = execFileSync(
    'pnpm',
    ['--filter', '@tcrn/database', 'exec', 'tsx', 'scripts/resolve-acceptance-fixtures.ts'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  cachedFixture = JSON.parse(output) as ResolvedAcceptanceFixture;
  return cachedFixture;
}

export function getAcceptancePassword(fixture = resolveAcceptanceFixture()) {
  loadRepoEnvFiles();

  const password = process.env.DEV_ACCEPTANCE_CORP_PASSWORD?.trim()
    || (fixture.fixture.tenant.code === 'UAT_CORP'
      ? DEFAULT_UAT_CORP_ACCEPTANCE_PASSWORD
      : DEFAULT_PLAYWRIGHT_FIXTURE_PASSWORD);

  if (!password) {
    throw new Error('DEV_ACCEPTANCE_CORP_PASSWORD is required for Public Presence AR-29 browser proof.');
  }

  return password;
}

export function buildPublicPresenceRoutes() {
  const fixture = resolveAcceptanceFixture();
  const tenantId = fixture.fixture.tenant.id;
  const talentId = fixture.fixture.talent.id;
  const studioBase = `/studio/public-presence/${tenantId}/${talentId}`;

  return {
    advancedIde: `${studioBase}/advanced?templateId=activeTalentHub&mode=page-source`,
    componentIde: `${studioBase}/components/new?componentType=SocialLinks`,
    componentStore: `${fixture.routes.homepageManagement}?surface=components`,
    homepageManagement: fixture.routes.homepageManagement,
    previewActive: `${studioBase}/preview`,
    previewDebut: `${studioBase}/preview?templateId=debutReveal`,
    publicPage: fixture.routes.publicHomepage,
    studioActive: studioBase,
    studioDebut: `${studioBase}?templateId=debutReveal`,
    templateCenter: `${fixture.routes.homepageManagement}?surface=templates`,
    templateIde: `${studioBase}/templates/new?templateId=activeTalentHub`,
  };
}

export async function signInToAcceptanceRoute(page: Page, targetPath: string) {
  const fixture = resolveAcceptanceFixture();
  const loginPath = `/login?next=${encodeURIComponent(targetPath)}`;

  await page.goto(loginPath);

  await Promise.race([
    page.waitForURL(/\/login(?:\?|$)/, { timeout: 8_000 }),
    page.waitForURL((url) => doesUrlMatchTarget(url, targetPath), { timeout: 8_000 }),
  ]).catch(() => undefined);

  const onLoginRoute = page.url().includes('/login');
  const loginHeading = page.getByRole('heading', { name: /^sign in$/i });

  if (!onLoginRoute && !(await loginHeading.isVisible().catch(() => false))) {
    return;
  }

  await page.getByLabel('Tenant code').fill(fixture.fixture.tenant.code);
  await page.getByLabel('Username or email').fill(fixture.fixture.users.admin.username);
  await page.getByLabel('Password').fill(getAcceptancePassword(fixture));
  await page.getByRole('button', { name: 'Sign in' }).click();

  const chooser = page.getByRole('dialog', { name: 'Choose a talent workspace' });

  if (await chooser.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await chooser.getByRole('button', { name: /Sakura/i }).click();
  }

  await expect
    .poll(() => doesUrlMatchTarget(page.url(), targetPath), { timeout: 20_000 })
    .toBe(true);
}

export async function waitForRouteReady(
  page: Page,
  readyLocator: Locator,
  routeLabel: string,
) {
  const start = Date.now();
  const errorLocator = page.getByText(
    /took too long to load|unavailable|Unable to load|Unable to refresh|Permission denied/i,
  ).first();

  const result = await Promise.race([
    readyLocator.first().waitFor({ state: 'visible', timeout: 8_000 }).then(() => ({
      kind: 'ready' as const,
    })),
    errorLocator.waitFor({ state: 'visible', timeout: 8_000 }).then(async () => ({
      kind: 'error' as const,
      text: (await errorLocator.textContent())?.trim() || routeLabel,
    })),
  ]);

  if (result.kind === 'error') {
    throw new Error(`${routeLabel} rendered an actionable error before the work surface was ready: ${result.text}`);
  }

  await expect(page.locator('body')).not.toContainText(/Checking talent availability|Refreshing fan preview/i);

  return Date.now() - start;
}

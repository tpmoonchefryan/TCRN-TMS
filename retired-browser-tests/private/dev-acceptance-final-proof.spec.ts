import { execFileSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

interface ResolvedAcceptanceFixture {
  fixture: {
    tenant: {
      code: string;
      id: string;
      schemaName: string;
    };
    talent: {
      id: string;
      code: string;
    };
    users: {
      admin: {
        id: string;
        username: string;
      };
      viewer: {
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

const corpPassword = process.env.DEV_ACCEPTANCE_CORP_PASSWORD?.trim() || '';
const acPassword = process.env.DEV_ACCEPTANCE_AC_PASSWORD?.trim() || '';
const rawLeakPattern = /\bPrisma\b|\bSQL\b|SYS_ERROR|stack trace|migration/i;
const acShellPattern = /Platform|平台/;

let resolvedAcceptanceFixture: ResolvedAcceptanceFixture | null = null;

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveAcceptanceFixture(): ResolvedAcceptanceFixture {
  if (resolvedAcceptanceFixture) {
    return resolvedAcceptanceFixture;
  }

  const output = execFileSync(
    'pnpm',
    ['--filter', '@tcrn/database', 'exec', 'tsx', 'scripts/resolve-acceptance-fixtures.ts'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  resolvedAcceptanceFixture = JSON.parse(output) as ResolvedAcceptanceFixture;
  return resolvedAcceptanceFixture;
}

async function expectNoRawLeak(page: Page) {
  await expect(page.locator('body')).not.toContainText(rawLeakPattern);
}

async function signIn(page: Page, options: {
  tenantCode: string;
  username: string;
  password: string;
}) {
  await page.getByLabel('Tenant code').fill(options.tenantCode);
  await page.getByLabel('Username or email').fill(options.username);
  await page.getByLabel('Password').fill(options.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

async function maybeChooseTalentWorkspace(page: Page) {
  const chooser = page.getByRole('dialog', { name: 'Choose a talent workspace' });

  if (await chooser.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await chooser.getByRole('button', { name: /Sakura/i }).click();
  }
}

async function expectRouteBodyToMatch(page: Page, expectations: RegExp[]) {
  await expect
    .poll(async () => {
      const bodyText = await page.locator('body').textContent();
      return expectations.find((pattern) => pattern.test(bodyText || ''))?.source || '';
    })
    .not.toBe('');
}

test.describe.configure({ mode: 'serial' });

test.describe('final Dev acceptance CLI browser proof', () => {
  test.skip(!corpPassword, 'DEV_ACCEPTANCE_CORP_PASSWORD is required for the final Dev homepage proof.');
  test.skip(!acPassword, 'DEV_ACCEPTANCE_AC_PASSWORD is required for the final Dev AC proof.');

  test('homepage management and standalone editor keep live preview usable on current UAT fixtures', async ({
    page,
  }) => {
    const fixture = resolveAcceptanceFixture();
    const homepageManagementPath = fixture.routes.homepageManagement;
    const editorPath = `/homepage-editor/${fixture.fixture.tenant.id}/${fixture.fixture.talent.id}`;

    await page.goto(homepageManagementPath);

    await expect(page).toHaveURL(/\/login\?next=/, {
      timeout: 15_000,
    });

    await signIn(page, {
      tenantCode: fixture.fixture.tenant.code,
      username: fixture.fixture.users.admin.username,
      password: corpPassword,
    });
    await maybeChooseTalentWorkspace(page);

    await expect(page).toHaveURL(new RegExp(`${escapeForRegex(homepageManagementPath)}$`), {
      timeout: 20_000,
    });
    await expect(page.getByRole('heading', { name: 'Homepage management' })).toBeVisible();
    await expectNoRawLeak(page);

    await page.goto(editorPath);

    await expect(page).toHaveURL(new RegExp(`${escapeForRegex(editorPath)}$`), {
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: 'Exit editor' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Talent unavailable|Homepage unavailable|Live preview unavailable/i);
    await expectNoRawLeak(page);

    await page.getByRole('button', { name: 'Preview' }).click();
    const previewDialog = page.getByRole('dialog', { name: 'Homepage preview' });
    await expect(previewDialog).toBeVisible();
    await expect(previewDialog.getByRole('button', { name: 'Desktop' })).toBeVisible();
    await expect(previewDialog.getByRole('button', { name: 'Tablet' })).toBeVisible();
    await expect(previewDialog.getByRole('button', { name: 'Mobile' })).toBeVisible();
    await previewDialog.getByRole('button', { name: 'Mobile' }).click();
    await expect(previewDialog.getByRole('button', { name: 'Mobile' })).toHaveAttribute('aria-pressed', 'true');
    await previewDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(previewDialog).toBeHidden();

    const livePreviewLink = page.getByRole('link', { name: 'Open live preview' });
    await expect(livePreviewLink).toHaveAttribute('target', '_blank');
    await expect(livePreviewLink).toHaveAttribute(
      'href',
      new RegExp(`^/homepage-editor/${escapeForRegex(fixture.fixture.tenant.id)}/${escapeForRegex(fixture.fixture.talent.id)}/preview\\?previewId=`),
    );

    const popupPromise = page.waitForEvent('popup');
    await livePreviewLink.click();
    const previewPage = await popupPromise;

    await previewPage.waitForLoadState('domcontentloaded');
    await expect(previewPage).toHaveURL(
      new RegExp(`/homepage-editor/${escapeForRegex(fixture.fixture.tenant.id)}/${escapeForRegex(fixture.fixture.talent.id)}/preview\\?previewId=`),
      { timeout: 20_000 },
    );
    await expect(previewPage.getByRole('heading', { name: 'Live homepage preview' })).toBeVisible();
    await expect(previewPage.getByText('Live preview unavailable')).toHaveCount(0);
    await expect(previewPage.locator('[data-homepage-live-preview-canvas]')).toBeVisible();
    await expect(previewPage.locator('[data-homepage-live-preview-canvas] h1').first()).toBeVisible();
    await expectNoRawLeak(previewPage);

    const backgroundTypeGroup = page.getByRole('group', { name: 'Background type' });
    await expect(backgroundTypeGroup).toBeVisible();
    await backgroundTypeGroup.getByRole('button', { name: 'Solid' }).click();
    await page.locator('input[name="backgroundValue"]').last().fill('#112233');
    await expect(previewPage.locator('[data-homepage-live-preview-canvas]')).toHaveCSS(
      'background-color',
      'rgb(17, 34, 51)',
    );
  });

  test('AC admin shell routes render expected content or explicit permission-denied states', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/, {
      timeout: 15_000,
    });

    await signIn(page, {
      tenantCode: 'AC',
      username: 'ac_admin',
      password: acPassword,
    });

    await expect(page).toHaveURL(/\/ac\/[^/]+(?:\/.*)?$/, {
      timeout: 20_000,
    });
    await expect(page.locator('body')).toContainText(acShellPattern);
    await expectNoRawLeak(page);

    const acBasePathMatch = new URL(page.url()).pathname.match(/^\/ac\/[^/]+/);
    expect(acBasePathMatch).not.toBeNull();

    const acBasePath = acBasePathMatch?.[0] || '';
    const routeExpectations: Array<{
      path: string;
      patterns: RegExp[];
    }> = [
      {
        path: `${acBasePath}/tenants`,
        patterns: [/Tenant Management/i, /租户管理/],
      },
      {
        path: `${acBasePath}/user-management`,
        patterns: [/User Management/i, /用户管理/],
      },
      {
        path: `${acBasePath}/interface-management`,
        patterns: [/Interface Management/i, /接口管理/, /Permission denied: integration\.adapter:read/i],
      },
      {
        path: `${acBasePath}/webhook-management`,
        patterns: [/Webhook Management/i, /Webhook 管理/, /Permission denied: integration\.webhook:read/i],
      },
      {
        path: `${acBasePath}/api-clients`,
        patterns: [/API Client Management/i, /API 客户端管理/, /Permission denied: integration\.consumer:read/i],
      },
      {
        path: `${acBasePath}/observability`,
        patterns: [/Observability/i, /可观测性/],
      },
      {
        path: `${acBasePath}/system-dictionary`,
        patterns: [/System Dictionary/i, /系统词典/],
      },
    ];

    for (const route of routeExpectations) {
      await page.goto(route.path);
      await expect(page).toHaveURL(new RegExp(`${escapeForRegex(route.path)}(?:\\?.*)?$`), {
        timeout: 20_000,
      });
      await expect(page.locator('body')).toContainText(acShellPattern);
      await expectRouteBodyToMatch(page, route.patterns);
      await expectNoRawLeak(page);
    }
  });
});

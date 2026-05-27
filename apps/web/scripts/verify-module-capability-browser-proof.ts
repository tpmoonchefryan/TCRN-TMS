import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium, type BrowserContext, type Page } from '@playwright/test';

const FULL_OPTIONAL_CAPABILITY_CODES = [
  'public_presence.homepage',
  'marshmallow.mailbox',
  'reports.mfr',
  'integration.webhooks',
] as const;

interface CliOptions {
  apiBaseUrl: string;
  webBaseUrl: string;
  evidenceDir: string;
  targetTenantCode: string;
}

interface SessionPayload {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  authenticatedAt: string;
  tenantId: string;
  tenantName: string;
  tenantTier: string;
  tenantCode: string;
  capabilities: {
    tenantId: string;
    scopeType: string;
    scopeId: string | null;
    enabledCapabilityCodes: string[];
    disabledReasons: Record<string, string>;
    registryVersion: string;
    resolvedAt: string;
  };
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    preferredLanguage: string;
    totpEnabled: boolean;
    forceReset: boolean;
    passwordExpiresAt: string | null;
  };
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    apiBaseUrl: 'http://localhost:4000',
    webBaseUrl: 'http://localhost:3000',
    evidenceDir:
      'vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/evidence/2026-05-27-goals-phase-0-12-execution/phase-1-module-capability-registry',
    targetTenantCode: 'TEST_P1_CAP_HTTP_STD_CONFLICT',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--api-base-url' && next) {
      options.apiBaseUrl = next.replace(/\/$/, '');
      index += 1;
    } else if (arg === '--web-base-url' && next) {
      options.webBaseUrl = next.replace(/\/$/, '');
      index += 1;
    } else if (arg === '--evidence-dir' && next) {
      options.evidenceDir = next;
      index += 1;
    } else if (arg === '--target-tenant-code' && next) {
      options.targetTenantCode = next;
      index += 1;
    }
  }

  return options;
}

function env(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

async function apiRequest<T>(
  baseUrl: string,
  route: string,
  options: { method?: string; token?: string; body?: unknown } = {}
): Promise<T> {
  const response = await fetch(`${baseUrl}${route}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = (await response.json()) as { success: boolean; data?: T; error?: unknown };

  if (!response.ok || !payload.success) {
    throw new Error(`API ${route} failed with ${response.status}: ${JSON.stringify(payload.error)}`);
  }

  return payload.data as T;
}

async function login(baseUrl: string, input: { tenantCode: string; login: string; password: string }) {
  return apiRequest<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    user: {
      id: string;
      username: string;
      email: string;
      displayName: string | null;
      avatarUrl: string | null;
      preferredLanguage: string;
      totpEnabled: boolean;
      forceReset: boolean;
      passwordExpiresAt: string | null;
      tenant: { id: string; code: string; name: string; tier: string };
    };
  }>(baseUrl, '/api/v1/auth/login', {
    method: 'POST',
    body: input,
  });
}

async function buildSession(
  apiBaseUrl: string,
  loginResult: Awaited<ReturnType<typeof login>>,
  tenantCode: string,
  overrideEnabledCapabilityCodes?: string[],
  overridePreferredLanguage?: string
): Promise<SessionPayload> {
  const effective = await apiRequest<SessionPayload['capabilities']>(
    apiBaseUrl,
    '/api/v1/module-capabilities/effective',
    { token: loginResult.accessToken }
  );
  const capabilities = overrideEnabledCapabilityCodes
    ? {
        ...effective,
        enabledCapabilityCodes: overrideEnabledCapabilityCodes,
      }
    : effective;

  return {
    accessToken: loginResult.accessToken,
    tokenType: loginResult.tokenType,
    expiresIn: loginResult.expiresIn,
    authenticatedAt: new Date().toISOString(),
    tenantId: loginResult.user.tenant.id,
    tenantName: loginResult.user.tenant.name,
    tenantTier: loginResult.user.tenant.tier,
    tenantCode,
    capabilities,
    user: {
      id: loginResult.user.id,
      username: loginResult.user.username,
      email: loginResult.user.email,
      displayName: loginResult.user.displayName,
      avatarUrl: loginResult.user.avatarUrl,
      preferredLanguage: overridePreferredLanguage ?? loginResult.user.preferredLanguage,
      totpEnabled: loginResult.user.totpEnabled,
      forceReset: loginResult.user.forceReset,
      passwordExpiresAt: loginResult.user.passwordExpiresAt,
    },
  };
}

async function newContext(session: SessionPayload, viewport: { width: number; height: number }) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport });

  await context.addInitScript((payload) => {
    window.sessionStorage.setItem('tcrn.web.session', JSON.stringify(payload));
  }, session);

  return { browser, context };
}

async function pageTextProof(page: Page) {
  return page.evaluate(() => {
    const bodyText = document.body.innerText;
    const checkboxLabels = Array.from(document.querySelectorAll('input[type="checkbox"]')).map(
      (input) => input.getAttribute('aria-label')
    );
    const navText = Array.from(document.querySelectorAll('nav')).map((nav) => nav.textContent ?? '');
    const alerts = Array.from(document.querySelectorAll('[role="alert"]')).map(
      (item) => item.textContent ?? ''
    );
    const statuses = Array.from(document.querySelectorAll('[role="status"]')).map(
      (item) => item.textContent ?? ''
    );
    const links = Array.from(document.querySelectorAll('a')).map((item) => ({
      text: item.textContent ?? '',
      href: item.getAttribute('href'),
    }));

    return {
      bodyIncludesCapabilities: bodyText.includes('Capabilities'),
      bodyIncludesJapaneseCapabilities: bodyText.includes('機能モジュール'),
      bodyIncludesEnabledFeatures: bodyText.includes('Enabled features'),
      bodyIncludesModuleNotEnabled: bodyText.includes('Module not enabled'),
      bodyIncludesRawHomepageCode: bodyText.includes('public_presence.homepage'),
      bodyIncludesBackToTenantWorkspace: bodyText.includes('Back to tenant workspace'),
      bodyIncludesBackToTalentOverview: bodyText.includes('Back to talent overview'),
      bodyIncludesPlusOne: bodyText.includes('+1'),
      bodyIncludesHomepageStudio: bodyText.includes('Homepage Studio'),
      bodyIncludesMarshmallowMailbox: bodyText.includes('Marshmallow Mailbox'),
      bodyIncludesMfrReports: bodyText.includes('MFR Reports'),
      bodyIncludesTenantWebhooks: bodyText.includes('Tenant Webhooks'),
      checkboxLabels,
      links,
      navText,
      alerts,
      statuses,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  });
}

async function waitForCapabilityEditor(page: Page, label = 'Capabilities') {
  await page.getByRole('heading', { name: label, exact: true }).waitFor({
    timeout: 15000,
  });
}

async function capabilityPanelBox(page: Page, label = 'Capabilities') {
  return page.evaluate((expectedLabel) => {
    const heading = Array.from(document.querySelectorAll('h1,h2,h3')).find(
      (item) => item.textContent?.trim() === expectedLabel
    );
    const container =
      heading?.closest('section') ??
      heading?.parentElement?.parentElement ??
      heading?.parentElement ??
      heading;
    const rect = container?.getBoundingClientRect();

    if (!rect) {
      return null;
    }

    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }, label);
}

function capabilityPanelLocator(page: Page, label = 'Capabilities') {
  return page
    .getByRole('heading', { name: label, exact: true })
    .locator('xpath=ancestor::div[contains(@class, "space-y-3")][1]');
}

async function elementBox(page: Page, role: 'alert' | 'button' | 'link', name?: string) {
  const locator = name ? page.getByRole(role, { name, exact: true }) : page.getByRole(role);
  return locator.first().boundingBox({ timeout: 5000 });
}

async function tenantRowBox(page: Page, tenantCode: string) {
  return page.getByText(tenantCode, { exact: true }).locator('xpath=ancestor::tr').boundingBox({
    timeout: 5000,
  });
}

async function tenantRowText(page: Page, tenantCode: string) {
  return page
    .getByText(tenantCode, { exact: true })
    .locator('xpath=ancestor::tr')
    .evaluate((row) => row.textContent ?? '');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  mkdirSync(options.evidenceDir, { recursive: true });

  const acLogin = await login(options.apiBaseUrl, {
    tenantCode: env('TCRN_AC_TENANT_CODE'),
    login: env('TCRN_AC_USERNAME'),
    password: env('TCRN_AC_PASSWORD'),
  });
  const standardLogin = await login(options.apiBaseUrl, {
    tenantCode: env('TCRN_STANDARD_TENANT_CODE'),
    login: env('TCRN_STANDARD_USERNAME'),
    password: env('TCRN_STANDARD_PASSWORD'),
  });
  const acSession = await buildSession(options.apiBaseUrl, acLogin, env('TCRN_AC_TENANT_CODE'));
  const acJapaneseSession = await buildSession(
    options.apiBaseUrl,
    acLogin,
    env('TCRN_AC_TENANT_CODE'),
    undefined,
    'ja'
  );
  const standardLimitedSession = await buildSession(
    options.apiBaseUrl,
    standardLogin,
    env('TCRN_STANDARD_TENANT_CODE'),
    ['core.organization', 'core.settings', 'core.user_access', 'observability.product_audit']
  );
  const talents = await apiRequest<Array<{ id: string; code: string; displayName: string }>>(
    options.apiBaseUrl,
    '/api/v1/talents?page=1&pageSize=20',
    { token: standardLogin.accessToken }
  );
  const proofTalent = talents[0];

  if (!proofTalent) {
    throw new Error('At least one standard tenant talent is required for direct-route proof');
  }

  const tenants = await apiRequest<Array<{ id: string; code: string }>>(
    options.apiBaseUrl,
    '/api/v1/tenants?page=1&pageSize=200',
    { token: acLogin.accessToken }
  );
  const targetTenant = tenants.find((tenant) => tenant.code === options.targetTenantCode);

  if (!targetTenant) {
    throw new Error(`Target tenant ${options.targetTenantCode} not found`);
  }

  const capabilityReadback = await apiRequest<{ version: number }>(
    options.apiBaseUrl,
    `/api/v1/tenants/${targetTenant.id}/capabilities`,
    { token: acLogin.accessToken }
  );

  const browserSetup = await apiRequest(options.apiBaseUrl, `/api/v1/tenants/${targetTenant.id}/capabilities`, {
    method: 'PUT',
    token: acLogin.accessToken,
    body: {
      enabledCapabilityCodes: FULL_OPTIONAL_CAPABILITY_CODES,
      version: capabilityReadback.version,
      note: 'Phase 1 browser proof setup',
    },
  });

  const records: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    targetTenantCode: options.targetTenantCode,
    targetTenantId: targetTenant.id,
    browserSetup,
  };

  const { browser: listBrowser, context: listContext } = await newContext(acSession, {
    width: 1440,
    height: 900,
  });
  const listPage = await listContext.newPage();

  await listPage.goto(
    `${options.webBaseUrl}/ac/${acSession.tenantId}/tenants?search=${encodeURIComponent(
      options.targetTenantCode
    )}`
  );
  await listPage.getByText(options.targetTenantCode, { exact: true }).waitFor({ timeout: 15000 });
  await listPage.getByText('+1', { exact: true }).waitFor({ timeout: 15000 });
  await listPage.waitForTimeout(500);
  await listPage.screenshot({
    path: path.join(options.evidenceDir, 'phase-1-ac-capability-list-summary.png'),
    fullPage: true,
  });
  records.acCapabilityListSummary = {
    ...(await pageTextProof(listPage)),
    targetTenantRowText: await tenantRowText(listPage, options.targetTenantCode),
    targetTenantRowBox: await tenantRowBox(listPage, options.targetTenantCode),
  };
  await listBrowser.close();

  for (const [name, viewport] of Object.entries({
    desktop: { width: 1440, height: 900 },
    mobile: { width: 390, height: 844 },
  })) {
    const { browser, context } = await newContext(acSession, viewport);
    const page = await context.newPage();

    await page.goto(`${options.webBaseUrl}/ac/${acSession.tenantId}/tenants/${targetTenant.id}`);
    await waitForCapabilityEditor(page);
    const panel = capabilityPanelLocator(page);
    await panel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await panel.screenshot({
      path: path.join(options.evidenceDir, `phase-1-ac-capability-editor-${name}.png`),
    });
    records[`acCapabilityEditor_${name}`] = {
      ...(await pageTextProof(page)),
      capabilityPanelText: await panel.textContent(),
      capabilityPanelBox: await capabilityPanelBox(page),
      capabilityCheckboxes: await page.locator('input[type="checkbox"]').evaluateAll((inputs) =>
        inputs.map((input) => ({
          ariaLabel: input.getAttribute('aria-label'),
          checked: (input as HTMLInputElement).checked,
          disabled: (input as HTMLInputElement).disabled,
          ariaDisabled: input.getAttribute('aria-disabled'),
        }))
      ),
    };
    await browser.close();
  }

  const { browser: japaneseBrowser, context: japaneseContext } = await newContext(
    acJapaneseSession,
    {
      width: 390,
      height: 844,
    }
  );
  const japanesePage = await japaneseContext.newPage();
  await japanesePage.goto(
    `${options.webBaseUrl}/ac/${acJapaneseSession.tenantId}/tenants/${targetTenant.id}`
  );
  await waitForCapabilityEditor(japanesePage, '機能モジュール');
  const japanesePanel = capabilityPanelLocator(japanesePage, '機能モジュール');
  await japanesePanel.scrollIntoViewIfNeeded();
  await japanesePage.waitForTimeout(500);
  await japanesePanel.screenshot({
    path: path.join(options.evidenceDir, 'phase-1-ac-capability-editor-ja-mobile.png'),
  });
  records.acCapabilityEditor_jaMobile = {
    ...(await pageTextProof(japanesePage)),
    capabilityPanelText: await japanesePanel.textContent(),
    capabilityPanelBox: await capabilityPanelBox(japanesePage, '機能モジュール'),
    capabilityCheckboxes: await japanesePage
      .locator('input[type="checkbox"]')
      .evaluateAll((inputs) =>
        inputs.map((input) => ({
          ariaLabel: input.getAttribute('aria-label'),
          checked: (input as HTMLInputElement).checked,
          disabled: (input as HTMLInputElement).disabled,
          ariaDisabled: input.getAttribute('aria-disabled'),
        }))
      ),
  };
  await japaneseBrowser.close();

  const { browser: conflictBrowser, context: conflictContext } = await newContext(acSession, {
    width: 1440,
    height: 900,
  });
  const conflictPage = await conflictContext.newPage();

  await conflictPage.goto(
    `${options.webBaseUrl}/ac/${acSession.tenantId}/tenants/${targetTenant.id}`
  );
  await waitForCapabilityEditor(conflictPage);

  const readback = await apiRequest<{ version: number }>(
    options.apiBaseUrl,
    `/api/v1/tenants/${targetTenant.id}/capabilities`,
    { token: acLogin.accessToken }
  );

  await apiRequest(options.apiBaseUrl, `/api/v1/tenants/${targetTenant.id}/capabilities`, {
    method: 'PUT',
    token: acLogin.accessToken,
    body: {
      enabledCapabilityCodes: ['public_presence.homepage'],
      version: readback.version,
      note: 'Phase 1 browser stale conflict setup',
    },
  });
  await conflictPage.getByRole('button', { name: 'Save changes' }).click();
  await conflictPage.getByRole('alert').waitFor({ timeout: 15000 });
  const conflictPanel = capabilityPanelLocator(conflictPage);
  await conflictPanel.scrollIntoViewIfNeeded();
  await conflictPage.waitForTimeout(500);
  await conflictPanel.screenshot({
    path: path.join(options.evidenceDir, 'phase-1-ac-capability-conflict-alert.png'),
  });
  records.acCapabilityConflict = {
    ...(await pageTextProof(conflictPage)),
    capabilityPanelText: await conflictPanel.textContent(),
    capabilityPanelBox: await capabilityPanelBox(conflictPage),
    alertBox: await elementBox(conflictPage, 'alert'),
    reloadButtonBox: await elementBox(conflictPage, 'button', 'Reload capabilities'),
  };
  await conflictPage.getByRole('button', { name: 'Reload capabilities' }).click();
  await conflictPage.getByText('Homepage Studio', { exact: true }).waitFor({ timeout: 15000 });
  await conflictPage.waitForTimeout(500);
  records.acCapabilityConflictReloaded = await pageTextProof(conflictPage);
  await conflictBrowser.close();

  for (const { name, route, viewport, safeReturnLabel } of [
    {
      name: 'tenantWebhook',
      route: `/tenant/${standardLimitedSession.tenantId}/webhook-management`,
      viewport: { width: 1440, height: 900 },
      safeReturnLabel: 'Back to tenant workspace',
    },
    {
      name: 'tenantInterface',
      route: `/tenant/${standardLimitedSession.tenantId}/interface-management`,
      viewport: { width: 390, height: 844 },
      safeReturnLabel: 'Back to tenant workspace',
    },
    {
      name: 'talentHomepageDesktop',
      route: `/tenant/${standardLimitedSession.tenantId}/talent/${proofTalent.id}/homepage`,
      viewport: { width: 1440, height: 900 },
      safeReturnLabel: 'Back to talent overview',
    },
    {
      name: 'talentHomepageMobile',
      route: `/tenant/${standardLimitedSession.tenantId}/talent/${proofTalent.id}/homepage`,
      viewport: { width: 390, height: 844 },
      safeReturnLabel: 'Back to talent overview',
    },
  ]) {
    const { browser, context } = await newContext(standardLimitedSession, {
      width: viewport.width,
      height: viewport.height,
    });
    const page = await context.newPage();

    await page.goto(`${options.webBaseUrl}${route}`);
    await page.getByText('Module not enabled').waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(options.evidenceDir, `phase-1-disabled-route-${name}.png`),
      fullPage: true,
    });
    records[`disabledRoute_${name}`] = {
      ...(await pageTextProof(page)),
      route,
      proofTalent,
      safeReturnLinkBox: await elementBox(page, 'link', safeReturnLabel),
    };
    await browser.close();
  }

  records.completedAt = new Date().toISOString();
  writeFileSync(
    path.join(options.evidenceDir, 'browser-ui-proof.json'),
    `${JSON.stringify(records, null, 2)}\n`,
    'utf8'
  );
  console.log(JSON.stringify(records, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

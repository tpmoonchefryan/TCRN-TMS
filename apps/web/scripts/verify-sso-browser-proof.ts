import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium, type Browser, type Page, type Route } from '@playwright/test';

interface CliOptions {
  baseUrl: string;
  outDir: string;
}

interface ElementBoxProof {
  x: number;
  y: number;
  width: number;
  height: number;
  visibleInViewport: boolean;
  parent: { x: number; y: number; width: number; height: number } | null;
}

interface BrowserCaseResult {
  id: string;
  url: string;
  viewport: { width: number; height: number };
  screenshot: string;
  dom: string;
  requiredText: Record<string, boolean>;
  forbiddenTextHits: string[];
  forbiddenApiCallHits: string[];
  apiCalls: string[];
  unhandledApiCalls: string[];
  focusedElement: { tagName: string; text: string; ariaLabel: string | null } | null;
  boxes: Record<string, ElementBoxProof | null>;
  passed: boolean;
}

const DEFAULT_OUT_DIR = 'sso-browser-proof';
const SESSION_STORAGE_KEY = 'tcrn.web.session';
const LOCALE_STORAGE_KEY = 'tcrn.web.locale.override';
const FORBIDDEN_TEXT = [
  'client_secret',
  'TEST_P3_SSO_SECRET',
  'access_token=',
  'id_token=',
  'SAMLResponse',
  'private_key',
  'Grafana',
  'Swagger Editor',
  'local password',
];

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    baseUrl: 'http://127.0.0.1:3000',
    outDir: DEFAULT_OUT_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--base-url' && next) {
      options.baseUrl = next;
      index += 1;
    } else if (arg === '--out-dir' && next) {
      options.outDir = next;
      index += 1;
    }
  }

  return options;
}

function apiOk(data: unknown) {
  return {
    status: 200,
    body: {
      success: true,
      data,
    },
  };
}

function apiError(status: number, code: string, message: string) {
  return {
    status,
    body: {
      success: false,
      error: {
        code,
        message,
      },
    },
  };
}

async function fulfillJson(route: Route, payload: { status: number; body: unknown }) {
  await route.fulfill({
    status: payload.status,
    contentType: 'application/json',
    body: JSON.stringify(payload.body),
  });
}

function buildSession(tier: 'standard' | 'ac' = 'standard', locale = 'en') {
  const tenantId = tier === 'ac' ? 'tenant-ac' : 'tenant-uat';
  const tenantCode = tier === 'ac' ? 'AC' : 'UAT_CORP';

  return {
    accessToken: tier === 'ac' ? 'ac-tcrn-access' : 'tenant-tcrn-access',
    tokenType: 'Bearer',
    expiresIn: 900,
    authenticatedAt: '2026-05-27T14:40:00.000Z',
    tenantId,
    tenantName: tier === 'ac' ? 'Account Center' : 'UAT Corporation',
    tenantTier: tier,
    tenantCode,
    capabilities: {
      tenantId,
      scopeType: 'tenant',
      scopeId: null,
      enabledCapabilityCodes: [
        'organization.structure',
        'security.management',
        'settings.dictionary',
        'integration.webhooks',
        'public_presence.homepage',
      ],
      disabledReasons: {},
      registryVersion: 'phase-3-browser-proof',
      resolvedAt: '2026-05-27T14:40:00.000Z',
    },
    user: {
      id: tier === 'ac' ? 'user-ac-admin' : 'user-tenant-admin',
      username: tier === 'ac' ? 'ac.admin' : 'corp.admin',
      email: tier === 'ac' ? 'ac.admin@uat.test' : 'corp.admin@uat.test',
      displayName: tier === 'ac' ? 'AC Admin' : 'Corp Admin',
      avatarUrl: null,
      preferredLanguage: locale,
      totpEnabled: false,
      forceReset: false,
      passwordExpiresAt: null,
    },
  };
}

function currentProfile(tier: 'standard' | 'ac' = 'standard', locale = 'en') {
  const session = buildSession(tier, locale);
  return {
    id: session.user.id,
    username: session.user.username,
    email: session.user.email,
    phone: null,
    displayName: session.user.displayName,
    avatarUrl: null,
    preferredLanguage: locale,
    totpEnabled: false,
    forceReset: false,
    lastLoginAt: '2026-05-27T13:30:00.000Z',
    passwordChangedAt: '2026-05-01T00:00:00.000Z',
    passwordExpiresAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function ssoProvider() {
  return {
    id: 'provider-test-p3-sso',
    code: 'test-p3-sso-mock',
    displayName: {
      en: 'Phase 3 Mock SSO',
      zh_HANS: 'Phase 3 模拟 SSO',
      zh_HANT: 'Phase 3 模擬 SSO',
      ja: 'Phase 3 Mock SSO',
      ko: 'Phase 3 Mock SSO',
      fr: 'Phase 3 Mock SSO',
    },
    providerType: 'oidc',
    ownerScope: 'tenant_product',
    enabled: true,
  };
}

function managedSsoProvider() {
  return {
    ...ssoProvider(),
    tenantId: 'tenant-uat',
    issuerUrl: 'https://idp.test.tcrn.local/p3',
    authorizationUrl: null,
    tokenUrl: null,
    userinfoUrl: null,
    jwksUrl: null,
    clientId: 'tcrn-browser-proof',
    clientSecretConfigured: true,
    redirectUri: 'http://localhost:4000/api/v1/auth/sso/callback/test-p3-sso-mock',
    scopes: ['openid', 'profile', 'email'],
    claimMappingPolicy: {
      subject: 'sub',
      email: 'email',
      displayName: 'name',
      emailVerified: 'email_verified',
    },
  };
}

function linkedSsoAccount() {
  return {
    id: 'link-test-p3-sso',
    providerId: 'provider-test-p3-sso',
    providerCode: 'test-p3-sso-mock',
    providerIssuer: 'mock:test-p3-sso-mock',
    email: 'test_p3_sso@idp.test',
    displayName: 'Phase 3 SSO Fixture',
    linkedAt: '2026-05-27T14:00:00.000Z',
    lastLoginAt: '2026-05-27T14:05:00.000Z',
    revokedAt: null,
  };
}

function tenantSettings() {
  return {
    scopeType: 'tenant',
    scopeId: null,
    settings: {
      defaultLanguage: 'zh_HANS',
      timezone: 'Asia/Shanghai',
      dateFormat: 'YYYY-MM-DD',
      currency: 'USD',
      customerImportEnabled: true,
      maxImportRows: 50000,
      totpRequiredForAll: false,
      allowMarshmallow: true,
      passwordPolicy: {
        minLength: 12,
        requireSpecial: true,
        maxAgeDays: 90,
      },
    },
    overrides: [],
    inheritedFrom: {},
    version: 1,
  };
}

function localizedText(en: string) {
  return {
    en,
    zh_HANS: en,
    zh_HANT: en,
    ja: en,
    ko: en,
    fr: en,
  };
}

function scopedSettings(scopeType: 'subsidiary' | 'talent', scopeId: string) {
  return {
    ...tenantSettings(),
    scopeType,
    scopeId,
    settings: {
      ...tenantSettings().settings,
      defaultLanguage: 'en',
      timezone: 'Asia/Tokyo',
    },
    inheritedFrom: {
      defaultLanguage: 'tenant',
      timezone: 'tenant',
    },
  };
}

function subsidiaryDetail() {
  return {
    id: 'sub-1',
    parentId: null,
    code: 'JP',
    path: 'JP',
    depth: 1,
    name: localizedText('Japan Subsidiary'),
    localizedName: 'Japan Subsidiary',
    description: localizedText('Lower-scope SSO denial fixture'),
    localizedDescription: 'Lower-scope SSO denial fixture',
    sortOrder: 10,
    isActive: true,
    childrenCount: 0,
    talentCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-27T14:20:00.000Z',
    version: 1,
  };
}

function talentDetail() {
  return {
    id: 'talent-1',
    subsidiaryId: 'sub-1',
    profileStoreId: null,
    profileStore: null,
    code: 'artist-a',
    path: 'JP/artist-a',
    name: localizedText('Artist A'),
    localizedName: 'Artist A',
    displayName: 'Artist A',
    description: localizedText('Lower-scope SSO denial fixture talent'),
    localizedDescription: 'Lower-scope SSO denial fixture talent',
    avatarUrl: null,
    homepagePath: 'artist-a',
    timezone: 'Asia/Tokyo',
    lifecycleStatus: 'draft',
    publishedAt: null,
    publishedBy: null,
    isActive: true,
    settings: scopedSettings('talent', 'talent-1').settings,
    stats: {
      customerCount: 0,
      homepageVersionCount: 1,
      marshmallowMessageCount: 0,
    },
    externalPagesDomain: {
      homepage: { isPublished: false },
      marshmallow: { isEnabled: false },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-27T14:20:00.000Z',
    version: 1,
  };
}

function homepageResponse() {
  return {
    id: 'homepage-1',
    talentId: 'talent-1',
    isPublished: false,
    publishedVersion: null,
    draftVersion: {
      id: 'homepage-version-1',
      versionNumber: 1,
      content: { version: '1', components: [] },
      theme: {},
      createdAt: '2026-05-27T14:20:00.000Z',
      publishedAt: null,
      publishedBy: null,
    },
    customDomain: null,
    customDomainVerified: false,
    seoTitle: null,
    seoDescription: null,
    ogImageUrl: null,
    analyticsId: null,
    homepagePath: 'artist-a',
    homepageUrl: 'https://public.example.test/artist-a',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-27T14:20:00.000Z',
    version: 1,
  };
}

function customDomainConfig() {
  return {
    customDomain: null,
    customDomainVerified: false,
    customDomainVerificationToken: null,
    customDomainSslMode: 'auto',
    homepageCustomPath: null,
    marshmallowCustomPath: null,
    domains: [],
    inheritedDomains: [],
    selectedInheritedDomainIds: [],
  };
}

function marshmallowConfig() {
  return {
    id: 'marshmallow-1',
    talentId: 'talent-1',
    isEnabled: false,
    title: null,
    welcomeText: null,
    placeholderText: null,
    thankYouText: null,
    allowAnonymous: true,
    captchaMode: 'auto',
    moderationEnabled: true,
    autoApprove: false,
    profanityFilterEnabled: true,
    externalBlocklistEnabled: true,
    maxMessageLength: 500,
    minMessageLength: 1,
    rateLimitPerIp: 5,
    rateLimitWindowHours: 24,
    reactionsEnabled: true,
    allowedReactions: ['heart'],
    theme: {},
    avatarUrl: null,
    termsContent: localizedText('Terms'),
    privacyContent: localizedText('Privacy'),
    stats: {
      totalMessages: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      unreadCount: 0,
    },
    turnstile: {
      environment: 'test',
      siteKeyConfigured: true,
      secretKeyConfigured: true,
      providerReady: true,
      runtimeBypass: false,
      ready: true,
      source: 'tenant',
    },
    marshmallowUrl: 'https://public.example.test/artist-a/marshmallow',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-27T14:20:00.000Z',
    version: 1,
  };
}

function talentPublishReadiness() {
  return {
    id: 'talent-1',
    lifecycleStatus: 'draft',
    targetState: 'published',
    recommendedAction: 'stay_draft',
    canEnterPublishedState: false,
    blockers: [
      {
        code: 'homepage_unpublished',
        message: 'Publish the homepage before enabling the public page.',
      },
    ],
    warnings: [],
    version: 1,
  };
}

function authSession() {
  return {
    accessToken: 'sso-tcrn-access',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: {
      id: 'user-tenant-admin',
      username: 'corp.admin',
      email: 'corp.admin@uat.test',
      displayName: 'Corp Admin',
      avatarUrl: null,
      preferredLanguage: 'en',
      totpEnabled: false,
      forceReset: false,
      passwordExpiresAt: null,
      tenant: {
        id: 'tenant-uat',
        code: 'UAT_CORP',
        name: 'UAT Corporation',
        tier: 'standard',
        schemaName: 'tenant_uat_corp',
      },
    },
  };
}

async function installApiMocks(page: Page, options: { tier?: 'standard' | 'ac'; linked?: boolean }) {
  const calls: string[] = [];
  const unhandled: string[] = [];
  const tier = options.tier ?? 'standard';
  const linked = options.linked ?? true;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}${url.search}`;
    calls.push(key);

    if (url.pathname === '/api/v1/auth/sso/providers') {
      const tenantCode = url.searchParams.get('tenantCode');
      await fulfillJson(route, apiOk(tenantCode === 'TEST_P3_SSO_TENANT' ? [ssoProvider()] : []));
      return;
    }

    if (url.pathname === '/api/v1/auth/sso/start') {
      await fulfillJson(
        route,
        apiOk({
          authorizationUrl:
            'http://127.0.0.1:3000/login/sso/callback?result=ssox_browser_success&next=/tenant/tenant-uat/profile/security',
          stateExpiresIn: 300,
          provider: ssoProvider(),
        })
      );
      return;
    }

    if (url.pathname === '/api/v1/auth/sso/exchange') {
      const payload = request.postDataJSON() as { result?: string } | null;
      await fulfillJson(
        route,
        payload?.result === 'ssox_browser_success'
          ? apiOk(authSession())
          : apiError(401, 'AUTH_SESSION_INVALID', 'SSO result is missing or expired.')
      );
      return;
    }

    if (url.pathname === '/api/v1/users/me') {
      await fulfillJson(route, apiOk(currentProfile(tier)));
      return;
    }

    if (url.pathname === '/api/v1/module-capabilities/effective') {
      await fulfillJson(route, apiOk(buildSession(tier).capabilities));
      return;
    }

    if (url.pathname === '/api/v1/users/me/sessions') {
      await fulfillJson(route, apiOk([]));
      return;
    }

    if (url.pathname === '/api/v1/auth/sso/account-links') {
      await fulfillJson(route, apiOk(linked ? [linkedSsoAccount()] : []));
      return;
    }

    if (url.pathname === '/api/v1/auth/sso/account-link-providers') {
      await fulfillJson(route, apiOk([ssoProvider()]));
      return;
    }

    if (url.pathname === '/api/v1/auth/sso/external-tools/readiness') {
      await fulfillJson(
        route,
        tier === 'ac'
          ? apiOk([
              {
                toolCode: 'swagger-editor',
                status: 'blocked',
                requiredByPhase: 'phase-3',
                providerId: null,
                failClosed: true,
                evidence: { reason: 'human SSO readiness required before deep link' },
                updatedAt: '2026-05-27T14:10:00.000Z',
              },
            ])
          : apiError(403, 'PERM_ACCESS_DENIED', 'Only AC platform operators can view readiness')
      );
      return;
    }

    if (url.pathname === '/api/v1/organization/settings') {
      await fulfillJson(route, apiOk(tenantSettings()));
      return;
    }

    if (url.pathname === '/api/v1/subsidiaries/sub-1') {
      await fulfillJson(route, apiOk(subsidiaryDetail()));
      return;
    }

    if (url.pathname === '/api/v1/subsidiaries/sub-1/settings') {
      await fulfillJson(route, apiOk(scopedSettings('subsidiary', 'sub-1')));
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-1') {
      await fulfillJson(route, apiOk(talentDetail()));
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-1/settings') {
      await fulfillJson(route, apiOk(scopedSettings('talent', 'talent-1')));
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-1/homepage') {
      await fulfillJson(route, apiOk(homepageResponse()));
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-1/custom-domain') {
      await fulfillJson(route, apiOk(customDomainConfig()));
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-1/marshmallow/config') {
      await fulfillJson(route, apiOk(marshmallowConfig()));
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-1/publish-readiness') {
      await fulfillJson(route, apiOk(talentPublishReadiness()));
      return;
    }

    if (url.pathname === '/api/v1/system-dictionary') {
      await fulfillJson(route, apiOk([]));
      return;
    }

    if (url.pathname === '/api/v1/auth/sso/admin/providers') {
      await fulfillJson(route, apiOk([managedSsoProvider()]));
      return;
    }

    if (url.pathname === '/api/v1/auth/sso/admin/providers/test-p3-sso-mock') {
      const payload = request.postDataJSON() as { clientId?: string; isEnabled?: boolean } | null;
      await fulfillJson(
        route,
        apiOk({
          ...managedSsoProvider(),
          clientId: payload?.clientId ?? 'tcrn-browser-proof',
          enabled: payload?.isEnabled ?? true,
        })
      );
      return;
    }

    unhandled.push(key);
    await fulfillJson(route, apiOk({}));
  });

  return { calls, unhandled };
}

async function seedSession(page: Page, tier: 'standard' | 'ac', locale = 'en') {
  await page.addInitScript(
    ({ sessionKey, localeKey, sessionValue, localeValue }) => {
      window.sessionStorage.setItem(sessionKey, JSON.stringify(sessionValue));
      window.localStorage.setItem(localeKey, localeValue);
    },
    {
      sessionKey: SESSION_STORAGE_KEY,
      localeKey: LOCALE_STORAGE_KEY,
      sessionValue: buildSession(tier, locale),
      localeValue: locale,
    }
  );
}

async function seedLocale(page: Page, locale = 'en') {
  await page.addInitScript(
    ({ localeKey, localeValue }) => {
      window.localStorage.setItem(localeKey, localeValue);
    },
    {
      localeKey: LOCALE_STORAGE_KEY,
      localeValue: locale,
    }
  );
}

async function captureCase(
  page: Page,
  input: {
    id: string;
    outDir: string;
    requiredText: string[];
    forbiddenText?: string[];
    forbiddenApiCallSubstrings?: string[];
    boxSelectors?: Record<string, string>;
    scrollToSelector?: string;
    apiCalls: string[];
    unhandledApiCalls: string[];
  }
): Promise<BrowserCaseResult> {
  const screenshot = path.join(input.outDir, `${input.id}.png`);
  const dom = path.join(input.outDir, `${input.id}-dom.json`);

  if (input.scrollToSelector) {
    await page.locator(input.scrollToSelector).first().scrollIntoViewIfNeeded();
  }

  await page.screenshot({ path: screenshot, fullPage: true });
  const text = await page.locator('body').innerText();
  const forbiddenText = [...FORBIDDEN_TEXT, ...(input.forbiddenText ?? [])];
  const forbiddenApiCallHits = input.apiCalls.filter((call) =>
    (input.forbiddenApiCallSubstrings ?? []).some((needle) => call.includes(needle))
  );
  const boxes: BrowserCaseResult['boxes'] = {};
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };

  for (const [key, selector] of Object.entries(input.boxSelectors ?? {})) {
    const locator = page.locator(selector).first();
    const box = await locator.boundingBox();
    boxes[key] = box
      ? {
          ...box,
          visibleInViewport:
            box.x >= 0 &&
            box.y >= 0 &&
            box.x + box.width <= viewport.width &&
            box.y + box.height <= viewport.height,
          parent: await locator.evaluate((element) => {
            const parent = element.parentElement;
            if (!parent) {
              return null;
            }
            const rect = parent.getBoundingClientRect();
            return {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            };
          }),
        }
      : null;
  }
  const focusedElement = await page.evaluate(() => {
    const active = document.activeElement;
    if (!active || active === document.body) {
      return null;
    }

    return {
      tagName: active.tagName,
      text: active.textContent?.trim() ?? '',
      ariaLabel: active.getAttribute('aria-label'),
    };
  });

  const payload = {
    id: input.id,
    url: page.url(),
    title: await page.title(),
    text,
    requiredText: Object.fromEntries(input.requiredText.map((needle) => [needle, text.includes(needle)])),
    forbiddenTextHits: forbiddenText.filter((needle) => text.includes(needle) || page.url().includes(needle)),
    forbiddenApiCallHits,
    apiCalls: input.apiCalls,
    unhandledApiCalls: input.unhandledApiCalls,
    focusedElement,
    boxes,
  };

  writeFileSync(dom, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return {
    id: input.id,
    url: payload.url,
    viewport,
    screenshot,
    dom,
    requiredText: payload.requiredText,
    forbiddenTextHits: payload.forbiddenTextHits,
    forbiddenApiCallHits: payload.forbiddenApiCallHits,
    apiCalls: input.apiCalls,
    unhandledApiCalls: input.unhandledApiCalls,
    focusedElement,
    boxes,
    passed:
      Object.values(payload.requiredText).every(Boolean) &&
      payload.forbiddenTextHits.length === 0 &&
      payload.forbiddenApiCallHits.length === 0 &&
      input.unhandledApiCalls.length === 0 &&
      Object.values(boxes).every((box) => box === null || box.visibleInViewport),
  };
}

async function newPage(browser: Browser, viewport: { width: number; height: number }) {
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(15000);
  return page;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  mkdirSync(options.outDir, { recursive: true });
  const browser = await chromium.launch();
  const results: BrowserCaseResult[] = [];

  try {
    {
      const page = await newPage(browser, { width: 1440, height: 900 });
      const mocks = await installApiMocks(page, { linked: false });
      await page.goto(`${options.baseUrl}/login`);
      await page.getByLabel(/tenant/i).fill('UAT_CORP');
      await page.waitForTimeout(650);
      await page.getByLabel(/username|email/i).waitFor();
      results.push(
        await captureCase(page, {
          id: 'login-no-sso-desktop',
          outDir: options.outDir,
          requiredText: ['Username or email', 'Password'],
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 390, height: 844 });
      const mocks = await installApiMocks(page, { linked: false });
      await page.goto(`${options.baseUrl}/login`);
      await page.getByLabel(/tenant/i).fill('TEST_P3_SSO_TENANT');
      await page.getByText('Phase 3 Mock SSO').waitFor();
      results.push(
        await captureCase(page, {
          id: 'login-sso-provider-mobile',
          outDir: options.outDir,
          requiredText: ['Single sign-on', 'Phase 3 Mock SSO', 'Username or email'],
          boxSelectors: {
            ssoProviderButton: 'text=Phase 3 Mock SSO',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 1440, height: 900 });
      await seedLocale(page, 'zh_HANS');
      const mocks = await installApiMocks(page, { linked: false });
      await page.goto(`${options.baseUrl}/login`);
      await page.getByRole('textbox').first().fill('TEST_P3_SSO_TENANT');
      await page.getByText('Phase 3 模拟 SSO').waitFor();
      results.push(
        await captureCase(page, {
          id: 'login-sso-provider-zh-desktop',
          outDir: options.outDir,
          requiredText: ['单点登录', 'Phase 3 模拟 SSO'],
          boxSelectors: {
            ssoProviderButton: 'text=Phase 3 模拟 SSO',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 1440, height: 900 });
      const mocks = await installApiMocks(page, { linked: true });
      await page.goto(`${options.baseUrl}/login/sso/callback`);
      await page.getByText('SSO result is missing or expired.').waitFor();
      results.push(
        await captureCase(page, {
          id: 'callback-error-desktop',
          outDir: options.outDir,
          requiredText: ['SSO failed', 'SSO result is missing or expired.', 'Return to sign-in'],
          boxSelectors: {
            returnToSignInButton: 'text=Return to sign-in',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 390, height: 844 });
      await seedLocale(page, 'zh_HANS');
      const mocks = await installApiMocks(page, { linked: true });
      await page.goto(`${options.baseUrl}/login/sso/callback`);
      await page.getByText('SSO 结果缺失或已过期。').waitFor();
      results.push(
        await captureCase(page, {
          id: 'callback-error-zh-mobile',
          outDir: options.outDir,
          requiredText: ['SSO 失败', 'SSO 结果缺失或已过期。', '返回登录'],
          boxSelectors: {
            returnToSignInButton: 'text=返回登录',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 1440, height: 900 });
      const mocks = await installApiMocks(page, { linked: true });
      await page.goto(
        `${options.baseUrl}/login/sso/callback?result=ssox_browser_success&next=/tenant/tenant-uat/profile/security`
      );
      await page.getByText('Single sign-on connections').waitFor();
      results.push(
        await captureCase(page, {
          id: 'callback-success-profile-redirect-desktop',
          outDir: options.outDir,
          requiredText: ['Single sign-on connections', 'Phase 3 SSO Fixture', 'Last SSO login'],
          scrollToSelector: 'text=Single sign-on connections',
          boxSelectors: {
            ssoConnectionsHeading: 'text=Single sign-on connections',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 390, height: 844 });
      await seedLocale(page, 'zh_HANS');
      const mocks = await installApiMocks(page, { linked: true });
      await page.goto(
        `${options.baseUrl}/login/sso/callback?result=ssox_browser_success&next=/tenant/tenant-uat/profile/security`
      );
      await page.getByText('单点登录连接').waitFor();
      results.push(
        await captureCase(page, {
          id: 'callback-success-profile-redirect-zh-mobile',
          outDir: options.outDir,
          requiredText: ['单点登录连接', 'Phase 3 SSO Fixture', '最近 SSO 登录'],
          scrollToSelector: 'text=单点登录连接',
          boxSelectors: {
            ssoConnectionsHeading: 'text=单点登录连接',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 390, height: 844 });
      await seedSession(page, 'standard', 'en');
      const mocks = await installApiMocks(page, { linked: false });
      await page.goto(`${options.baseUrl}/tenant/tenant-uat/profile/security`);
      await page.getByText('Single sign-on connections').waitFor();
      await page.getByText('Phase 3 Mock SSO').waitFor();
      results.push(
        await captureCase(page, {
          id: 'profile-sso-unlinked-mobile',
          outDir: options.outDir,
          requiredText: ['Single sign-on connections', 'Phase 3 Mock SSO', 'Link provider'],
          scrollToSelector: 'text=Link provider',
          boxSelectors: {
            linkProviderButton: 'text=Link provider',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 1440, height: 900 });
      await seedSession(page, 'standard', 'zh_HANS');
      const mocks = await installApiMocks(page, { linked: false });
      await page.goto(`${options.baseUrl}/tenant/tenant-uat/profile/security`);
      await page.getByText('单点登录连接').waitFor();
      await page.getByText('Phase 3 模拟 SSO').waitFor();
      results.push(
        await captureCase(page, {
          id: 'profile-sso-unlinked-zh-desktop',
          outDir: options.outDir,
          requiredText: ['单点登录连接', 'Phase 3 模拟 SSO', '链接提供方'],
          scrollToSelector: 'text=链接提供方',
          boxSelectors: {
            linkProviderButton: 'text=链接提供方',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 1440, height: 900 });
      await seedSession(page, 'standard', 'en');
      const mocks = await installApiMocks(page, { linked: true });
      await page.goto(`${options.baseUrl}/tenant/tenant-uat/settings`);
      await page.getByRole('button', { name: 'Settings' }).click();
      await page.getByRole('button', { name: 'Single Sign-On' }).click();
      await page.getByText('Configured (redacted)').waitFor();
      await page.getByRole('button', { name: 'Edit provider' }).click();
      await page.getByRole('button', { name: 'Check discovery' }).click();
      await page.getByText('Discovery fields are ready to save').waitFor();
      results.push(
        await captureCase(page, {
          id: 'tenant-sso-settings-desktop',
          outDir: options.outDir,
          requiredText: [
            'Single Sign-On',
            'Phase 3 Mock SSO',
            'Configured (redacted)',
            'tenant_product',
            'Edit tenant SSO provider',
            'Keep secret',
            'Replace secret',
            'Clear secret',
            'Save provider',
            'Discovery fields are ready to save',
          ],
          scrollToSelector: 'text=Save provider',
          boxSelectors: {
            checkDiscoveryButton: 'text=Check discovery',
            saveProviderButton: 'text=Save provider',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 390, height: 844 });
      await seedSession(page, 'standard', 'zh_HANS');
      const mocks = await installApiMocks(page, { linked: true });
      await page.goto(`${options.baseUrl}/tenant/tenant-uat/settings`);
      await page.getByRole('button', { name: /设置|Settings/ }).click();
      await page.getByRole('button', { name: /单点登录|Single Sign-On/ }).click();
      await page.getByText('已配置（已隐藏）').waitFor();
      await page.getByRole('button', { name: '编辑提供方' }).click();
      await page.getByRole('button', { name: '检查发现配置' }).click();
      await page.getByText('发现配置字段已可保存').waitFor();
      results.push(
        await captureCase(page, {
          id: 'tenant-sso-settings-zh-mobile',
          outDir: options.outDir,
          requiredText: [
            '单点登录',
            'Phase 3 模拟 SSO',
            '已配置（已隐藏）',
            'tenant_product',
            '编辑租户 SSO 提供方',
            '保留密钥',
            '替换密钥',
            '清除密钥',
            '保存提供方',
            '发现配置字段已可保存',
          ],
          scrollToSelector: 'text=保存提供方',
          boxSelectors: {
            checkDiscoveryButton: 'text=检查发现配置',
            saveProviderButton: 'text=保存提供方',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 1440, height: 900 });
      await seedSession(page, 'standard', 'en');
      const mocks = await installApiMocks(page, { linked: true });
      await page.goto(`${options.baseUrl}/tenant/tenant-uat/subsidiary/sub-1/settings?section=settings`);
      await page.locator('h1').filter({ hasText: 'Subsidiary Settings' }).waitFor();
      await page.getByText('Artist Lifecycle Flow').waitFor();
      results.push(
        await captureCase(page, {
          id: 'subsidiary-settings-no-sso-desktop',
          outDir: options.outDir,
          requiredText: ['Subsidiary Settings', 'Defaults', 'Artist Lifecycle Flow'],
          forbiddenText: ['Single Sign-On', 'Configured (redacted)', 'tenant_product'],
          forbiddenApiCallSubstrings: ['/api/v1/auth/sso/admin/providers'],
          boxSelectors: {
            settingsHeading: 'text=Subsidiary settings',
            lifecycleCategory: 'text=Artist Lifecycle Flow',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 390, height: 844 });
      await seedSession(page, 'standard', 'en');
      const mocks = await installApiMocks(page, { linked: true });
      await page.goto(`${options.baseUrl}/tenant/tenant-uat/talent/talent-1/settings?section=settings`);
      await page.locator('h1').filter({ hasText: 'Talent Settings' }).waitFor();
      await page.getByText('Current Homepage URL').waitFor();
      results.push(
        await captureCase(page, {
          id: 'talent-settings-no-sso-mobile',
          outDir: options.outDir,
          requiredText: ['Talent Settings', 'Defaults and routes', 'CURRENT HOMEPAGE URL'],
          forbiddenText: ['Single Sign-On', 'Configured (redacted)', 'tenant_product'],
          forbiddenApiCallSubstrings: ['/api/v1/auth/sso/admin/providers'],
          scrollToSelector: 'text=Current Homepage URL',
          boxSelectors: {
            homepageRouteField: 'text=Current Homepage URL',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 1440, height: 900 });
      await seedSession(page, 'ac', 'en');
      const mocks = await installApiMocks(page, { tier: 'ac', linked: true });
      await page.goto(`${options.baseUrl}/ac/tenant-ac/profile/security`);
      await page.getByText('External-tool SSO readiness').waitFor();
      await page.getByText('swagger-editor').waitFor();
      results.push(
        await captureCase(page, {
          id: 'ac-external-tool-sso-readiness-desktop',
          outDir: options.outDir,
          requiredText: ['External-tool SSO readiness', 'swagger-editor', 'blocked'],
          scrollToSelector: 'text=External-tool SSO readiness',
          boxSelectors: {
            readinessHeading: 'text=External-tool SSO readiness',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }

    {
      const page = await newPage(browser, { width: 390, height: 844 });
      await seedSession(page, 'ac', 'zh_HANS');
      const mocks = await installApiMocks(page, { tier: 'ac', linked: true });
      await page.goto(`${options.baseUrl}/ac/tenant-ac/profile/security`);
      await page.getByText('外部工具 SSO 就绪').waitFor();
      await page.getByText('swagger-editor').waitFor();
      results.push(
        await captureCase(page, {
          id: 'ac-external-tool-sso-readiness-zh-mobile',
          outDir: options.outDir,
          requiredText: ['外部工具 SSO 就绪', 'swagger-editor', 'blocked'],
          scrollToSelector: 'text=外部工具 SSO 就绪',
          boxSelectors: {
            readinessHeading: 'text=外部工具 SSO 就绪',
          },
          apiCalls: mocks.calls,
          unhandledApiCalls: mocks.unhandled,
        })
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const summary = {
    checkedAt: new Date().toISOString(),
    test_layer: 'browser_ui',
    data_mode: 'mock_idp_fixture',
    target_scope:
      'tenant_product_sso / profile_account_link / lower_scope_denial / ac_platform_sso',
    baseUrl: options.baseUrl,
    cases: results,
    passed: results.every((result) => result.passed),
  };

  const summaryPath = path.join(options.outDir, 'sso-browser-proof-manifest.json');
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));

  if (!summary.passed) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

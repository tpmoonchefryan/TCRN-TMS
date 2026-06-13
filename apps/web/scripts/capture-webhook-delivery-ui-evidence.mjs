// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    artifactDir: null,
    baseUrl: null,
    out: 'webhook-delivery-ui-evidence-manifest.json',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--artifact-dir' && next) {
      options.artifactDir = next;
      index += 1;
    } else if (arg === '--base-url' && next) {
      options.baseUrl = next.replace(/\/$/, '');
      index += 1;
    } else if (arg === '--out' && next) {
      options.out = next;
      index += 1;
    }
  }

  return options;
}

const options = parseArgs();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, '..');
const artifactDir = options.artifactDir ?? path.dirname(options.out);
export const tenantId = '33333333-3333-4333-8333-333333333333';
export const webhookId = '11111111-1111-4111-8111-111111111111';
const attemptId = '22222222-2222-4222-8222-222222222222';
const talentId = '77777777-7777-4777-8777-777777777777';
const subsidiaryId = '88888888-8888-4888-8888-888888888888';
const enabledCapabilityCodes = [
  'integration.webhooks',
  'observability.product_audit',
  'public_presence.homepage',
  'marshmallow.mailbox',
  'reports.mfr',
];
const effectiveCapabilities = {
  tenantId,
  scopeType: 'tenant',
  scopeId: null,
  enabledCapabilityCodes,
  disabledReasons: {},
  registryVersion: 'phase-7-browser-proof',
  resolvedAt: '2026-05-31T00:00:00.000Z',
};

function artifactPath(fileName) {
  mkdirSync(artifactDir, { recursive: true });
  return path.join(artifactDir, fileName);
}

function writeArtifact(fileName, payload) {
  const target = artifactPath(fileName);
  writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return target;
}

function envelope(data, meta) {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
}

export function buildSession(locale, tenantTier = 'standard') {
  return {
    accessToken: 'browser-proof-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    authenticatedAt: new Date().toISOString(),
    tenantId,
    tenantName: 'Phase 7 Tenant',
    tenantTier,
    tenantCode: 'P7',
    capabilities: effectiveCapabilities,
    user: {
      id: '44444444-4444-4444-8444-444444444444',
      username: 'phase7-ui-proof',
      email: 'phase7-ui-proof@example.test',
      displayName: 'Phase 7 UI Proof',
      avatarUrl: null,
      preferredLanguage: locale,
      totpEnabled: false,
      forceReset: false,
      passwordExpiresAt: null,
    },
  };
}

const localizedName = {
  en: 'Customer lifecycle',
  zh_HANS: '客户生命周期',
  zh_HANT: '客戶生命週期',
  ja: '顧客ライフサイクル',
  ko: '고객 라이프사이클',
  fr: 'Cycle client',
};

const webhookRecord = {
  id: webhookId,
  code: 'CUSTOMER_LIFECYCLE',
  name: localizedName,
  localizedName: 'Customer lifecycle',
  definitionKey: 'customer-lifecycle',
  monitoredTalentIds: ['77777777-7777-4777-8777-777777777777'],
  url: 'https://example.com/webhook',
  events: ['customer.created', 'customer.updated', 'customer.deactivated'],
  isActive: true,
  lastTriggeredAt: '2026-05-31T00:00:00.000Z',
  lastStatus: 202,
  consecutiveFailures: 0,
  createdAt: '2026-05-31T00:00:00.000Z',
  secret: '******',
  headers: { 'x-tcrn-event-source': 'customer' },
  retryPolicy: { maxRetries: 3, backoffMs: 1000 },
  disabledAt: null,
  updatedAt: '2026-05-31T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
  version: 3,
};

const eventCatalog = [
  {
    event: 'customer.created',
    eventCode: 'customer.created',
    name: 'Customer created',
    description: 'Customer reference payload without raw PII.',
    payloadVersion: 'v1',
    category: 'customer',
    producer: 'customer',
    piiClass: 'reference',
    subscriptionEligible: true,
  },
  {
    event: 'customer.updated',
    eventCode: 'customer.updated',
    name: 'Customer updated',
    description: 'Customer change summary payload.',
    payloadVersion: 'v1',
    category: 'customer',
    producer: 'customer',
    piiClass: 'reference',
    subscriptionEligible: true,
  },
  {
    event: 'customer.deactivated',
    eventCode: 'customer.deactivated',
    name: 'Customer deactivated',
    description: 'Customer deactivation reference payload.',
    payloadVersion: 'v1',
    category: 'customer',
    producer: 'customer',
    piiClass: 'reference',
    subscriptionEligible: true,
  },
];

const deliveryAttempt = {
  id: attemptId,
  outboxId: '55555555-5555-4555-8555-555555555555',
  webhookId,
  eventCode: 'customer.created',
  payloadVersion: 'v1',
  idempotencyKey: 'TEST_P7_WEBHOOK_IDEMPOTENCY',
  payloadHash: 'abcdef1234567890abcdef1234567890',
  attemptNumber: 1,
  status: 'dry_run',
  dispatchMode: 'disabled',
  endpointUrl: 'https://example.com/webhook',
  requestHeaders: { 'x-tcrn-signature': '******' },
  requestBodySummary: { eventCode: 'customer.created', redacted: true },
  responseStatus: null,
  responseBodySummary: {},
  errorCode: 'DRY_RUN_NO_OUTBOUND_HTTP',
  errorMessage: 'Dry run recorded without outbound HTTP dispatch',
  latencyMs: null,
  nextRetryAt: null,
  deliveredAt: null,
  replayReason: 'Browser proof operator reason',
  traceId: 'trace-webhook-delivery-browser-proof',
  createdAt: '2026-05-31T00:00:00.000Z',
  updatedAt: '2026-05-31T00:00:00.000Z',
};

const organizationTree = {
  tenantId,
  directTalents: [
    {
      id: talentId,
      code: 'P7_TALENT',
      name: 'Phase 7 Talent',
      displayName: 'Phase 7 Talent',
      avatarUrl: null,
      subsidiaryId: null,
      path: '/phase-7-talent',
      homepagePath: 'phase-7-talent',
      lifecycleStatus: 'published',
      publishedAt: '2026-05-31T00:00:00.000Z',
      isActive: true,
      lifecycleMaintenance: { canManage: true },
    },
  ],
  subsidiaries: [
    {
      id: subsidiaryId,
      code: 'P7_SUB',
      name: 'Phase 7 Subsidiary',
      displayName: 'Phase 7 Subsidiary',
      children: [],
      talents: [],
      path: '/phase-7-subsidiary',
      depth: 1,
      isActive: true,
    },
  ],
};

const defaultScopeSettings = {
  defaultLanguage: 'en',
  timezone: 'Asia/Shanghai',
  dateFormat: 'YYYY-MM-DD',
  currency: 'USD',
  customerImportEnabled: true,
  maxImportRows: 1000,
  totpRequiredForAll: false,
  allowMarshmallow: true,
  passwordPolicy: {
    minLength: 12,
    requireSpecial: true,
    maxAgeDays: 90,
  },
};

function scopeSettings(scopeType, scopeId = null) {
  return {
    scopeType,
    scopeId,
    settings: defaultScopeSettings,
    overrides: [],
    inheritedFrom: {},
    version: 1,
  };
}

const platformToolBundle = {
  definition: {
    code: 'svix_delivery_provider',
    family: 'webhook_delivery',
    displayKey: 'svix_delivery_provider',
    label: 'Svix-like Webhook Delivery Provider',
    localizedLabel: { en: 'Svix-like Webhook Delivery Provider', zh_HANS: 'Svix-like Webhook 投递服务商' },
    defaultState: 'disabled',
    ownerPhase: 'Phase 7',
    humanUi: true,
    deepLink: true,
    allowedLocalDevModes: ['disabled', 'stubbed', 'external_provided'],
    ssoRequirement: 'required',
    licensePosture: 'readiness_only',
    defaultConnection: 'none',
    sortOrder: 10,
    sourceOfTruthBoundary: 'Provider can execute delivery only; TCRN owns event authority.',
  },
  connection: {
    id: null,
    tenantId,
    toolCode: 'svix_delivery_provider',
    environment: 'local',
    deploymentMode: 'disabled',
    localDevMode: 'disabled',
    endpointUrl: null,
    internalServiceUrl: null,
    namespace: null,
    serviceName: null,
    enabled: false,
    readinessState: 'disabled',
    ssoReadinessState: 'blocked',
    healthStatus: 'not_configured',
    lastCheckedAt: null,
    configVersion: 0,
    version: 0,
  },
  configValues: [],
  ssoReadiness: { status: 'blocked', failClosed: true, evidence: { phase: '7' } },
  healthSnapshots: [],
  auditTrail: [],
};

const talentCustomDomainConfig = {
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

export async function installApiMocks(page) {
  await page.route('**/api/v1/module-capabilities/effective', (route) =>
    route.fulfill({
      json: envelope({
        tenantId,
        effective: effectiveCapabilities,
        registryVersion: effectiveCapabilities.registryVersion,
      }),
    })
  );
  await page.route('**/api/v1/profile-stores**', (route) =>
    route.fulfill({
      json: envelope({
        items: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            code: 'PHASE_7_PROFILE_STORE',
            name: { en: 'Phase 7 Profile Store', zh_HANS: 'Phase 7 档案库' },
            localizedName: 'Phase 7 Profile Store',
            description: null,
            isDefault: true,
            talentCount: 1,
            customerCount: 0,
            createdAt: '2026-05-31T00:00:00.000Z',
            updatedAt: '2026-05-31T00:00:00.000Z',
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }),
    })
  );
  await page.route('**/api/v1/organization/tree**', (route) =>
    route.fulfill({ json: envelope(organizationTree) })
  );
  await page.route('**/api/v1/organization/settings/artist-lifecycle-flow**', (route) =>
    route.fulfill({
      json: envelope({
        scopeType: 'tenant',
        scopeId: null,
        flow: {
          nodes: [],
          edges: [],
          version: 1,
        },
      }),
    })
  );
  await page.route('**/api/v1/organization/settings/turnstile**', (route) =>
    route.fulfill({
      json: envelope({
        siteKey: null,
        effectiveSiteKey: null,
        source: 'none',
        environment: 'development',
        siteKeyConfigured: false,
        secretKeyConfigured: false,
        providerReady: false,
        runtimeBypass: true,
        ready: false,
        secretKeyMasked: null,
      }),
    })
  );
  await page.route('**/api/v1/organization/settings**', (route) =>
    route.fulfill({ json: envelope(scopeSettings('tenant')) })
  );
  await page.route('**/api/v1/auth/sso/admin/providers**', (route) =>
    route.fulfill({ json: envelope([]) })
  );
  await page.route('**/api/v1/system-dictionary**', (route) =>
    route.fulfill({ json: envelope([]) })
  );
  await page.route('**/api/v1/email/sender-domains**', (route) =>
    route.fulfill({
      json: envelope({
        domains: [],
        defaultDomainId: null,
        fromName: null,
        replyTo: null,
      }),
    })
  );
  await page.route(new RegExp(`/api/v1/subsidiaries/${subsidiaryId}/settings/artist-lifecycle-flow(?:\\?.*)?$`), (route) =>
    route.fulfill({
      json: envelope({
        scopeType: 'subsidiary',
        scopeId: subsidiaryId,
        flow: { nodes: [], edges: [], version: 1 },
      }),
    })
  );
  await page.route(new RegExp(`/api/v1/subsidiaries/${subsidiaryId}/settings(?:\\?.*)?$`), (route) =>
    route.fulfill({ json: envelope(scopeSettings('subsidiary', subsidiaryId)) })
  );
  await page.route(new RegExp(`/api/v1/subsidiaries/${subsidiaryId}(?:\\?.*)?$`), (route) =>
    route.fulfill({
      json: envelope({
        id: subsidiaryId,
        parentId: null,
        code: 'P7_SUB',
        path: '/phase-7-subsidiary',
        depth: 1,
        name: { en: 'Phase 7 Subsidiary', zh_HANS: 'Phase 7 子公司' },
        localizedName: 'Phase 7 Subsidiary',
        description: { en: 'Phase 7 subsidiary settings absence proof.' },
        localizedDescription: 'Phase 7 subsidiary settings absence proof.',
        sortOrder: 10,
        isActive: true,
        childrenCount: 0,
        talentCount: 0,
        createdAt: '2026-05-31T00:00:00.000Z',
        updatedAt: '2026-05-31T00:00:00.000Z',
        version: 1,
      }),
    })
  );
  await page.route(new RegExp(`/api/v1/talents/${talentId}/settings/artist-lifecycle-flow(?:\\?.*)?$`), (route) =>
    route.fulfill({
      json: envelope({
        scopeType: 'talent',
        scopeId: talentId,
        flow: { nodes: [], edges: [], version: 1 },
      }),
    })
  );
  await page.route(new RegExp(`/api/v1/talents/${talentId}/settings(?:\\?.*)?$`), (route) =>
    route.fulfill({ json: envelope(scopeSettings('talent', talentId)) })
  );
  await page.route(new RegExp(`/api/v1/talents/${talentId}/homepage(?:\\?.*)?$`), (route) =>
    route.fulfill({
      json: envelope({
        talentId,
        homepagePath: 'phase-7-talent',
        isPublished: true,
        liveVersionId: null,
      }),
    })
  );
  await page.route(new RegExp(`/api/v1/talents/${talentId}/custom-domain(?:\\?.*)?$`), (route) =>
    route.fulfill({ json: envelope(talentCustomDomainConfig) })
  );
  await page.route(
    new RegExp(`/api/v1/talents/${talentId}/custom-domain/inherited-selections(?:\\?.*)?$`),
    (route) => route.fulfill({ json: envelope(talentCustomDomainConfig) })
  );
  await page.route(new RegExp(`/api/v1/talents/${talentId}/publish-readiness(?:\\?.*)?$`), (route) =>
    route.fulfill({
      json: envelope({
        id: talentId,
        lifecycleStatus: 'published',
        targetState: 'published',
        recommendedAction: 'none',
        canEnterPublishedState: true,
        blockers: [],
        warnings: [],
        version: 1,
      }),
    })
  );
  await page.route(new RegExp(`/api/v1/talents/${talentId}/marshmallow/config(?:\\?.*)?$`), (route) =>
    route.fulfill({
      json: envelope({
        talentId,
        isEnabled: false,
        inboxAddress: null,
        settings: {},
      }),
    })
  );
  await page.route(new RegExp(`/api/v1/talents/${talentId}(?:\\?.*)?$`), (route) =>
    route.fulfill({
      json: envelope({
        id: talentId,
        subsidiaryId: null,
        profileStoreId: null,
        profileStore: null,
        code: 'P7_TALENT',
        path: '/phase-7-talent',
        name: { en: 'Phase 7 Talent', zh_HANS: 'Phase 7 艺人' },
        localizedName: 'Phase 7 Talent',
        displayName: 'Phase 7 Talent',
        description: { en: 'Phase 7 talent settings absence proof.' },
        localizedDescription: 'Phase 7 talent settings absence proof.',
        avatarUrl: null,
        homepagePath: 'phase-7-talent',
        timezone: 'Asia/Shanghai',
        lifecycleStatus: 'published',
        publishedAt: '2026-05-31T00:00:00.000Z',
        publishedBy: null,
        isActive: true,
        settings: defaultScopeSettings,
        stats: { customerCount: 0, homepageVersionCount: 1, marshmallowMessageCount: 0 },
        externalPagesDomain: { homepage: { isPublished: true }, marshmallow: { isEnabled: false } },
        createdAt: '2026-05-31T00:00:00.000Z',
        updatedAt: '2026-05-31T00:00:00.000Z',
        version: 1,
      }),
    })
  );
  await page.route('**/api/v1/talents/custom-domain-bindings**', (route) =>
    route.fulfill({ json: envelope([]) })
  );
  await page.route('**/api/v1/integration/webhook-definitions', (route) =>
    route.fulfill({
      json: envelope([
        {
          key: 'customer-lifecycle',
          code: 'CUSTOMER_LIFECYCLE',
          name: localizedName,
          description: localizedName,
          events: webhookRecord.events,
          defaultHeaders: {},
          defaultRetryPolicy: { maxRetries: 3, backoffMs: 1000 },
        },
      ]),
    })
  );
  await page.route('**/api/v1/integration/webhooks/events', (route) =>
    route.fulfill({ json: envelope(eventCatalog) })
  );
  await page.route(
    new RegExp(`/api/v1/integration/webhooks/${webhookId}/delivery-attempts/[^/]+/replay(?:\\?.*)?$`),
    (route) =>
    route.fulfill({
      status: 202,
      json: envelope({
        accepted: true,
        duplicate: false,
        dryRun: true,
        dispatchMode: 'disabled',
        status: 'dry_run',
        webhookId,
        outboxId: deliveryAttempt.outboxId,
        attemptId,
        eventCode: 'customer.created',
        payloadVersion: 'v1',
        idempotencyKey: 'TEST_P7_WEBHOOK_REPLAY_IDEMPOTENCY',
        traceId: deliveryAttempt.traceId,
        redacted: true,
      }),
    })
  );
  await page.route(
    new RegExp(`/api/v1/integration/webhooks/${webhookId}/test-delivery(?:\\?.*)?$`),
    (route) =>
    route.fulfill({
      status: 202,
      json: envelope({
        accepted: true,
        duplicate: false,
        dryRun: true,
        dispatchMode: 'disabled',
        status: 'dry_run',
        webhookId,
        outboxId: deliveryAttempt.outboxId,
        attemptId,
        eventCode: 'customer.created',
        payloadVersion: 'v1',
        idempotencyKey: 'TEST_P7_WEBHOOK_IDEMPOTENCY_BROWSER',
        traceId: deliveryAttempt.traceId,
        redacted: true,
      }),
    })
  );
  await page.route(
    new RegExp(`/api/v1/integration/webhooks/${webhookId}/delivery-attempts(?:\\?.*)?$`),
    (route) =>
    route.fulfill({
      json: envelope({
        items: [deliveryAttempt],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
    })
  );
  await page.route(new RegExp(`/api/v1/integration/webhooks/${webhookId}(?:\\?.*)?$`), (route) =>
    route.fulfill({ json: envelope(webhookRecord) })
  );
  await page.route(new RegExp('/api/v1/integration/webhooks(?:\\?.*)?$'), (route) =>
    route.fulfill({ json: envelope([webhookRecord]) })
  );
  await page.route('**/api/v1/platform-tools/connections**', (route) =>
    route.fulfill({ json: envelope([platformToolBundle]) })
  );
  await page.route('**/api/v1/configuration-entity/**', (route) =>
    route.fulfill({ json: envelope([]) })
  );
  await page.route('**/api/v1/email/**', (route) => route.fulfill({ json: envelope({}) }));
}

function summarizeText(textContent) {
  return textContent
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 180);
}

const runtimeErrorPattern =
  /Runtime (?:Type)?Error|Unhandled Runtime Error|This page couldn.t load|This page couldn’t load|Call Stack|\b\d+\s+Issue\b|selectedInheritedDomainIdsDraft is not iterable/i;

async function waitForStablePage(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
}

async function collectPageState(page, id, viewport, locale) {
  const textContent = await page.locator('body').innerText();
  const buttons = await page
    .locator('button')
    .evaluateAll((elements) =>
      elements.map((element) => ({
        text: element.textContent?.trim() ?? '',
        disabled: element.hasAttribute('disabled'),
      }))
    );
  const links = await page
    .locator('a')
    .evaluateAll((elements) =>
      elements.map((element) => ({
        text: element.textContent?.trim() ?? '',
        href: element.getAttribute('href'),
      }))
    );
  const selectedFamily = await page
    .locator('select')
    .evaluateAll((elements) =>
      elements.map((element) => ({
        value: element.value,
        text: element.selectedOptions?.[0]?.textContent?.trim() ?? '',
      }))
    )
    .catch(() => []);
  const overflow = await page.evaluate(() => ({
    documentHasHorizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    bodyHasHorizontalOverflow: document.body.scrollWidth > document.body.clientWidth + 2,
  }));
  const dom = {
    url: page.url(),
    title: await page.title(),
    textLines: summarizeText(textContent),
    bodyHtmlSampleOmitted: true,
    viewport,
    locale,
  };
  const state = {
    url: page.url(),
    buttons,
    links,
    selectedFamily,
    overflow,
    hasDeliveryButton: buttons.some((button) => /Delivery|投递|投遞|配信/i.test(button.text)),
    hasWebhookRecord: textContent.includes('CUSTOMER_LIFECYCLE'),
    hasProviderConsoleCopy:
      /provider console|服务商控制台|供應商控制台|プロバイダーコンソール|제공자 콘솔|console fournisseur/i.test(
        textContent
      ),
    hasRuntimeErrorOverlay:
      runtimeErrorPattern.test(textContent) ||
      buttons.some((button) => runtimeErrorPattern.test(button.text)),
    hasRawSecretText: /super-secret|provider token|Svix app id|NATS stream/i.test(textContent),
  };
  const focusA11y = {
    url: page.url(),
    activeElement: await page.evaluate(() => document.activeElement?.tagName ?? null),
    headingCount: await page.locator('h1,h2,h3').count(),
    buttonCount: buttons.length,
    linkCount: links.length,
    hasHorizontalOverflow:
      overflow.documentHasHorizontalOverflow || overflow.bodyHasHorizontalOverflow,
  };

  return {
    textContent,
    domPath: writeArtifact(`${id}-dom.json`, dom),
    statePath: writeArtifact(`${id}-states.json`, state),
    focusA11yPath: writeArtifact(`${id}-focus-a11y.json`, focusA11y),
    state,
  };
}

async function captureBrowserEvidence() {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const artifacts = [];
  const checks = [];

  async function preparePage(locale, viewport, tenantTier = 'standard') {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.addInitScript(
      ({ session, localeOverride }) => {
        window.sessionStorage.setItem('tcrn.web.session', JSON.stringify(session));
        window.localStorage.setItem('tcrn.web.locale.override', localeOverride);
      },
      {
        session: buildSession(locale, tenantTier),
        localeOverride: locale,
      }
    );
    await installApiMocks(page);
    return { context, page };
  }

  async function capturePage({ id, route, locale, viewport }) {
    const tenantTier = route.startsWith('/ac/') ? 'ac' : 'standard';
    const { context, page } = await preparePage(locale, viewport, tenantTier);
    await page.goto(`${options.baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
    await waitForStablePage(page);
    const screenshot = artifactPath(`${id}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    const { textContent, domPath, statePath, focusA11yPath, state } = await collectPageState(
      page,
      id,
      viewport,
      locale
    );
    artifacts.push({ id, screenshot, dom: domPath, states: statePath, focusA11y: focusA11yPath });
    checks.push({
      id: `${id}_no_provider_console`,
      passed:
        !state.hasProviderConsoleCopy &&
        !textContent.includes('provider token') &&
        !textContent.includes('Svix app id') &&
        !textContent.includes('NATS stream') &&
        !(await page.locator('iframe').count()),
    });
    checks.push({
      id: `${id}_no_runtime_error_overlay`,
      passed: !state.hasRuntimeErrorOverlay,
    });
    checks.push({
      id: `${id}_no_horizontal_overflow`,
      passed: !state.overflow.documentHasHorizontalOverflow && !state.overflow.bodyHasHorizontalOverflow,
    });
    checks.push({
      id: `${id}_route_not_redirected`,
      passed: page.url().includes(route.split('?')[0]),
    });
    if (route.includes('/platform-tools')) {
      checks.push({
        id: `${id}_webhook_delivery_family_selected`,
        passed:
          page.url().includes('/platform-tools') &&
          state.selectedFamily.some((item) => item.value === 'webhook_delivery') &&
          textContent.includes('Webhook Delivery'),
      });
    }
    if (id.includes('settings-absence')) {
      checks.push({
        id: `${id}_webhook_delivery_absent_from_ordinary_settings`,
        passed:
          !/Webhook Delivery|Delivery Attempts|Svix-like Webhook Delivery Provider|webhook_delivery|provider console|服务商控制台|供應商控制台/i.test(
            textContent
          ) && page.url().includes(route.split('?')[0]),
      });
    }
    await context.close();
  }

  await capturePage({
    id: 'tenant-webhook-management-desktop',
    route: `/tenant/${tenantId}/webhook-management`,
    locale: 'en',
    viewport: { width: 1440, height: 900 },
  });
  await capturePage({
    id: 'tenant-webhook-management-mobile',
    route: `/tenant/${tenantId}/webhook-management`,
    locale: 'zh_HANS',
    viewport: { width: 390, height: 844 },
  });
  await capturePage({
    id: 'ac-webhook-management-desktop',
    route: `/ac/${tenantId}/webhook-management`,
    locale: 'en',
    viewport: { width: 1440, height: 900 },
  });
  await capturePage({
    id: 'ac-webhook-management-mobile',
    route: `/ac/${tenantId}/webhook-management`,
    locale: 'zh_HANS',
    viewport: { width: 390, height: 844 },
  });
  await capturePage({
    id: 'webhook-delivery-platform-tools-desktop',
    route: `/ac/${tenantId}/platform-tools?family=webhook_delivery`,
    locale: 'en',
    viewport: { width: 1440, height: 900 },
  });
  await capturePage({
    id: 'webhook-delivery-platform-tools-mobile',
    route: `/ac/${tenantId}/platform-tools?family=webhook_delivery`,
    locale: 'zh_HANS',
    viewport: { width: 390, height: 844 },
  });
  const settingsAbsenceCases = [
    {
      id: 'webhook-delivery-settings-absence-tenant-desktop',
      route: `/tenant/${tenantId}/settings?section=config-entities`,
      locale: 'en',
      viewport: { width: 1440, height: 900 },
    },
    {
      id: 'webhook-delivery-settings-absence-tenant-mobile',
      route: `/tenant/${tenantId}/settings?section=config-entities`,
      locale: 'zh_HANS',
      viewport: { width: 390, height: 844 },
    },
    {
      id: 'webhook-delivery-settings-absence-subsidiary-desktop',
      route: `/tenant/${tenantId}/subsidiary/${subsidiaryId}/settings?section=config-entities`,
      locale: 'en',
      viewport: { width: 1440, height: 900 },
    },
    {
      id: 'webhook-delivery-settings-absence-subsidiary-mobile',
      route: `/tenant/${tenantId}/subsidiary/${subsidiaryId}/settings?section=config-entities`,
      locale: 'zh_HANS',
      viewport: { width: 390, height: 844 },
    },
    {
      id: 'webhook-delivery-settings-absence-talent-desktop',
      route: `/tenant/${tenantId}/talent/${talentId}/settings?section=config-entities`,
      locale: 'en',
      viewport: { width: 1440, height: 900 },
    },
    {
      id: 'webhook-delivery-settings-absence-talent-mobile',
      route: `/tenant/${tenantId}/talent/${talentId}/settings?section=config-entities`,
      locale: 'zh_HANS',
      viewport: { width: 390, height: 844 },
    },
  ];

  for (const absenceCase of settingsAbsenceCases) {
    await capturePage(absenceCase);
  }
  writeArtifact('webhook-delivery-settings-absence.json', {
    checkedAt: new Date().toISOString(),
    test_layer: 'browser_ui',
    data_mode: 'mocked_api_browser_runtime',
    target_scope: 'ordinary_settings_absence',
    routes: settingsAbsenceCases.map((entry) => entry.route),
    requiredScopes: ['tenant', 'subsidiary', 'talent'],
    requiredViewports: ['desktop', 'mobile'],
    checks: checks.filter((check) => check.id.includes('settings-absence')),
    passed: checks
      .filter((check) => check.id.includes('settings-absence'))
      .every((check) => check.passed),
  });

  async function captureDrawer(id, locale, viewport) {
  const { context, page: drawerPage } = await preparePage(locale, viewport);
  await drawerPage.goto(`${options.baseUrl}/tenant/${tenantId}/webhook-management`, {
    waitUntil: 'domcontentloaded',
  });
  await waitForStablePage(drawerPage);
  await drawerPage.getByRole('button', { name: /Delivery/i }).click();
  const reasonField = drawerPage.getByLabel('Reason');
  const reasonValueBeforeFill = await reasonField.inputValue();
  const replayButton = drawerPage.getByRole('button', { name: /Replay dry-run/i }).first();
  const testButton = drawerPage.getByRole('button', { name: /Record test/i });
  const replayDisabledBeforeReason = await replayButton.isDisabled();
  const testDisabledBeforeReason = await testButton.isDisabled();
  await reasonField.fill('Browser proof operator reason');
  await replayButton.click();
  const replayConfirmationDialog = drawerPage
    .getByRole('dialog')
    .filter({ hasText: /Replay this delivery attempt as dry-run/i })
    .last();
  await replayConfirmationDialog.waitFor({ timeout: 5000 });
  const replayConfirmationObserved = await replayConfirmationDialog.isVisible();
  await replayConfirmationDialog.getByRole('button', { name: /^Cancel$/i }).click();
  await replayConfirmationDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
  await testButton.click();
  const confirmationDialog = drawerPage
    .getByRole('dialog')
    .filter({ hasText: /Record dry-run delivery test/i })
    .last();
  await confirmationDialog.waitFor({ timeout: 5000 });
  await confirmationDialog.getByRole('button', { name: /^Record test$/i }).click();
  await drawerPage.getByText(/Dry-run delivery attempt recorded/i).waitFor({ timeout: 5000 });
  await confirmationDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
  await drawerPage.waitForTimeout(250);
  const drawerScreenshot = artifactPath(`${id}.png`);
  await drawerPage.screenshot({ path: drawerScreenshot, fullPage: true });
  const drawerText = await drawerPage.locator('body').innerText();
  const normalizedDrawerText = drawerText.toLowerCase();
  const focusA11yPath = writeArtifact(`${id}-focus-a11y.json`, {
    activeElement: await drawerPage.evaluate(() => document.activeElement?.tagName ?? null),
    hasReasonInput: (await drawerPage.getByLabel('Reason').count()) > 0,
    hasReplayButton: (await drawerPage.getByRole('button', { name: /Replay dry-run/i }).count()) > 0,
    hasRawSecretText: drawerText.includes('super-secret') || drawerText.includes('provider token'),
    hasHorizontalOverflow: await drawerPage.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    ),
  });
  const drawerDomPath = writeArtifact(`${id}-states.json`, {
    textContent: drawerText,
    reasonValueBeforeFill,
    replayDisabledBeforeReason,
    testDisabledBeforeReason,
    replayConfirmationObserved,
    hasAttemptTimeline: normalizedDrawerText.includes('attempt timeline'),
    hasRequestSummary: normalizedDrawerText.includes('request summary'),
    hasResponseSummary: normalizedDrawerText.includes('response summary'),
    hasReplayReason: normalizedDrawerText.includes('replay reason'),
    hasProviderConsoleCopy:
      /provider console|服务商控制台|供應商控制台|プロバイダーコンソール|제공자 콘솔|console fournisseur/i.test(
        drawerText
      ),
    hasConfirmationDialogOpen: normalizedDrawerText.includes('confirm action'),
  });
  artifacts.push({
    id,
    screenshot: drawerScreenshot,
    states: drawerDomPath,
    focusA11y: focusA11yPath,
  });
  checks.push({
    id: `${id}_contract`,
    passed:
      normalizedDrawerText.includes('attempt timeline') &&
      normalizedDrawerText.includes('request summary') &&
      normalizedDrawerText.includes('response summary') &&
      normalizedDrawerText.includes('replay reason') &&
      reasonValueBeforeFill === '' &&
      replayDisabledBeforeReason &&
      testDisabledBeforeReason &&
      replayConfirmationObserved &&
      drawerText.includes('Browser proof operator reason') &&
      !normalizedDrawerText.includes('confirm action') &&
      !drawerText.includes('super-secret') &&
      !/provider console|服务商控制台|供應商控制台|プロバイダーコンソール|제공자 콘솔|console fournisseur/i.test(
        drawerText
      ),
  });
  await context.close();
  }

  await captureDrawer('webhook-delivery-attempt-drawer-desktop', 'en', {
    width: 1440,
    height: 900,
  });
  await captureDrawer('webhook-delivery-attempt-drawer-mobile', 'en', {
    width: 390,
    height: 844,
  });

  await browser.close();

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'browser_ui',
    data_mode: 'mocked_api_browser_runtime',
    target_scope: 'delivery_attempt',
    artifactDir,
    baseUrl: options.baseUrl,
    routes: [
      `/tenant/${tenantId}/webhook-management`,
      `/ac/${tenantId}/webhook-management`,
      `/ac/${tenantId}/platform-tools?family=webhook_delivery`,
      ...settingsAbsenceCases.map((entry) => entry.route),
    ],
    viewports: ['1440x900', '390x844'],
    locales: ['en', 'zh_HANS'],
    screenshots: artifacts.map((artifact) => artifact.screenshot),
    artifacts,
    checks,
    note: 'Browser proof uses the real Next route/component runtime with Playwright network fixtures for API responses.',
    passed: checks.every((check) => check.passed),
  };
}

function captureSourceEvidence() {
  const integrationScreenPath = path.join(
    webRoot,
    'src/domains/integration-management/screens/IntegrationManagementScreen.tsx'
  );
  const apiPath = path.join(
    webRoot,
    'src/domains/integration-management/api/integration-management.api.ts'
  );
  const platformToolsPath = path.join(
    webRoot,
    'src/domains/platform-tool-connections/screens/PlatformToolConnectionsScreen.tsx'
  );
  const platformToolsPagePath = path.join(webRoot, 'src/app/ac/[tenantId]/platform-tools/page.tsx');
  const integrationScreenText = readFileSync(integrationScreenPath, 'utf8');
  const apiText = readFileSync(apiPath, 'utf8');
  const platformToolsText = readFileSync(platformToolsPath, 'utf8');
  const platformToolsPageText = readFileSync(platformToolsPagePath, 'utf8');
  const checks = [
    {
      id: 'tenant_webhook_delivery_drawer',
      passed:
        integrationScreenText.includes('Delivery Attempts') &&
        integrationScreenText.includes('Attempt Timeline') &&
        integrationScreenText.includes('Dry-run Controls'),
    },
    {
      id: 'attempt_api_contract_bound',
      passed:
        apiText.includes('listWebhookDeliveryAttempts') &&
        apiText.includes('createWebhookTestDelivery') &&
        apiText.includes('replayWebhookDeliveryAttempt'),
    },
    {
      id: 'reason_required_in_ui',
      passed:
        integrationScreenText.includes('Enter a reason before creating a test delivery') &&
        integrationScreenText.includes('Record dry-run delivery test?'),
    },
    {
      id: 'redacted_attempt_copy',
      passed:
        integrationScreenText.includes('Only redacted summaries') &&
        integrationScreenText.includes('Request summary') &&
        integrationScreenText.includes('Response summary'),
    },
    {
      id: 'ac_platform_tool_family_deeplink',
      passed:
        platformToolsText.includes('webhook_delivery') &&
        platformToolsPageText.includes('webhook_delivery'),
    },
  ];

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'browser_ui',
    data_mode: 'source_scan',
    target_scope: 'delivery_attempt',
    artifactDir: options.artifactDir,
    files: [
      path.relative(webRoot, integrationScreenPath),
      path.relative(webRoot, apiPath),
      path.relative(webRoot, platformToolsPath),
      path.relative(webRoot, platformToolsPagePath),
    ],
    viewports: ['1440x900', '390x844'],
    routes: [
      '/tenant/<tenantId>/webhook-management',
      '/ac/<acTenantId>/webhook-management',
      '/ac/<acTenantId>/platform-tools?family=webhook_delivery',
    ],
    checks,
    screenshots: [],
    note:
      'Source-level fallback only; pass the --base-url option to generate browser screenshots.',
    passed: checks.every((check) => check.passed),
  };
}

async function main() {
  const payload = options.baseUrl ? await captureBrowserEvidence() : captureSourceEvidence();
  mkdirSync(path.dirname(options.out), { recursive: true });
  writeFileSync(options.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

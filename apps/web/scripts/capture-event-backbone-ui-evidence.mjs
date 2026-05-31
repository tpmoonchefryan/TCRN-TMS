import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    artifactDir: null,
    baseUrl: null,
    out: 'event-backbone-ui-evidence-manifest.json',
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
export const tenantId = '83333333-3333-4333-8333-333333333338';
export const subsidiaryId = '88888888-8888-4888-8888-888888888888';
export const talentId = '87777777-7777-4777-8777-777777777778';

const enabledCapabilityCodes = [
  'platform.tool_connection',
  'observability.product_audit',
  'public_presence.homepage',
  'organization.settings',
];
const effectiveCapabilities = {
  tenantId,
  scopeType: 'tenant',
  scopeId: null,
  enabledCapabilityCodes,
  disabledReasons: {},
  registryVersion: 'phase-8-event-backbone-browser-proof',
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
    accessToken: 'phase-8-event-backbone-browser-proof-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    authenticatedAt: new Date().toISOString(),
    tenantId,
    tenantName: 'Phase 8 Tenant',
    tenantTier,
    tenantCode: 'P8',
    capabilities: effectiveCapabilities,
    user: {
      id: '84444444-4444-4444-8444-444444444448',
      username: 'phase8-event-backbone-ui-proof',
      email: 'phase8-event-backbone@example.test',
      displayName: 'Phase 8 Event Backbone Proof',
      avatarUrl: null,
      preferredLanguage: locale,
      totpEnabled: false,
      forceReset: false,
      passwordExpiresAt: null,
    },
  };
}

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
    code: 'nats-jetstream',
    family: 'event_backbone',
    displayKey: 'platformTools.natsJetstream',
    label: 'NATS JetStream',
    localizedLabel: {
      en: 'NATS JetStream',
      zh_HANS: 'NATS JetStream',
      zh_HANT: 'NATS JetStream',
      ja: 'NATS JetStream',
      ko: 'NATS JetStream',
      fr: 'NATS JetStream',
    },
    defaultState: 'existing_infra_classification_disabled',
    ownerPhase: 'phase_8',
    humanUi: false,
    deepLink: false,
    allowedLocalDevModes: ['disabled', 'compose_opt_in', 'external_provided'],
    ssoRequirement: 'not_applicable',
    licensePosture: 'apache_2_evidence_retained',
    defaultConnection: 'none',
    sortOrder: 50,
    sourceOfTruthBoundary: 'NATS owns transport mechanics only; TCRN owns event authority.',
  },
  connection: {
    id: null,
    tenantId,
    toolCode: 'nats-jetstream',
    environment: 'local',
    deploymentMode: 'disabled',
    localDevMode: 'disabled',
    endpointUrl: null,
    internalServiceUrl: null,
    namespace: null,
    serviceName: null,
    enabled: false,
    readinessState: 'disabled',
    ssoReadinessState: 'not_applicable',
    healthStatus: 'disabled',
    lastCheckedAt: null,
    configVersion: 0,
    version: 0,
  },
  configValues: [],
  ssoReadiness: { status: 'not_applicable', failClosed: true, evidence: { phase: '8' } },
  healthSnapshots: [],
  auditTrail: [],
};

const eventBackboneSummary = {
  environment: 'local',
  bridgeMode: 'disabled',
  readinessState: 'disabled',
  sourceOfTruthBoundary:
    'TCRN owns event meaning, outbox, tenant isolation, idempotency, replay approval, and audit. NATS is transport only and disabled by default.',
  registry: {
    totalEvents: 110,
    families: ['technical_event', 'job', 'webhook_delivery', 'public_presence_projection'],
    restrictedEvents: 36,
  },
  streams: [
    {
      family: 'technical_event',
      streamName: 'stream_nats_jetstream_backbone_technical_event',
      status: 'not_created',
      rawPayloadAccess: false,
      pendingOutboxCount: 0,
      dlqCount: 0,
    },
    {
      family: 'job',
      streamName: 'stream_nats_jetstream_backbone_job',
      status: 'not_created',
      rawPayloadAccess: false,
      pendingOutboxCount: 0,
      dlqCount: 0,
    },
    {
      family: 'webhook_delivery',
      streamName: 'stream_nats_jetstream_backbone_webhook_delivery',
      status: 'not_created',
      rawPayloadAccess: false,
      pendingOutboxCount: 0,
      dlqCount: 0,
    },
    {
      family: 'public_presence_projection',
      streamName: 'stream_nats_jetstream_backbone_public_presence_projection',
      status: 'not_created',
      rawPayloadAccess: false,
      pendingOutboxCount: 0,
      dlqCount: 0,
    },
  ],
  consumers: [
    {
      owner: 'worker.email',
      queue: 'email',
      durableName: 'consumer_worker_email_job',
      classification: 'mirror_lifecycle_events',
      sideEffectPolicy: 'mirror lifecycle summary only',
      status: 'preserved',
    },
    {
      owner: 'worker.log',
      queue: 'log',
      durableName: 'consumer_worker_log_job',
      classification: 'preserve',
      sideEffectPolicy: 'no stream side effect in Phase 8',
      status: 'preserved',
    },
  ],
  bridgeModes: [
    { mode: 'disabled', available: true, requiresExplicitEnable: false },
    { mode: 'local_stub', available: true, requiresExplicitEnable: true },
    { mode: 'mirror_only', available: false, requiresExplicitEnable: true },
  ],
};

const organizationTree = {
  tenantId,
  directTalents: [
    {
      id: talentId,
      code: 'P8_TALENT',
      name: 'Phase 8 Talent',
      displayName: 'Phase 8 Talent',
      avatarUrl: null,
      subsidiaryId: null,
      path: '/phase-8-talent',
      homepagePath: 'phase-8-talent',
      lifecycleStatus: 'published',
      publishedAt: '2026-05-31T00:00:00.000Z',
      isActive: true,
      lifecycleMaintenance: { canManage: true },
    },
  ],
  subsidiaries: [
    {
      id: subsidiaryId,
      code: 'P8_SUB',
      name: 'Phase 8 Subsidiary',
      displayName: 'Phase 8 Subsidiary',
      children: [],
      talents: [],
      path: '/phase-8-subsidiary',
      depth: 1,
      isActive: true,
    },
  ],
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
  await page.route('**/api/v1/event-backbone/summary**', (route) =>
    route.fulfill({ json: envelope(eventBackboneSummary) })
  );
  await page.route('**/api/v1/platform-tools/connections**', (route) => {
    const url = route.request().url();
    const payload = url.includes('/connections/nats-jetstream')
      ? platformToolBundle
      : [platformToolBundle];

    return route.fulfill({ json: envelope(payload) });
  });
  await page.route('**/api/v1/organization/tree**', (route) =>
    route.fulfill({ json: envelope(organizationTree) })
  );
  await page.route('**/api/v1/profile-stores**', (route) =>
    route.fulfill({
      json: envelope({
        items: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }),
    })
  );
  await page.route('**/api/v1/system-dictionary**', (route) =>
    route.fulfill({ json: envelope([]) })
  );
  await page.route('**/api/v1/configuration-entity/**', (route) =>
    route.fulfill({
      json: envelope({
        items: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }),
    })
  );
  await page.route('**/api/v1/auth/sso/admin/providers**', (route) =>
    route.fulfill({ json: envelope([]) })
  );
  await page.route('**/api/v1/email/**', (route) => route.fulfill({ json: envelope({}) }));
  await page.route('**/api/v1/organization/settings/artist-lifecycle-flow**', (route) =>
    route.fulfill({ json: envelope({ scopeType: 'tenant', scopeId: null, flow: { nodes: [], edges: [], version: 1 } }) })
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
  await page.route(new RegExp(`/api/v1/subsidiaries/${subsidiaryId}/settings/artist-lifecycle-flow(?:\\?.*)?$`), (route) =>
    route.fulfill({ json: envelope({ scopeType: 'subsidiary', scopeId: subsidiaryId, flow: { nodes: [], edges: [], version: 1 } }) })
  );
  await page.route(new RegExp(`/api/v1/subsidiaries/${subsidiaryId}/settings(?:\\?.*)?$`), (route) =>
    route.fulfill({ json: envelope(scopeSettings('subsidiary', subsidiaryId)) })
  );
  await page.route(new RegExp(`/api/v1/subsidiaries/${subsidiaryId}(?:\\?.*)?$`), (route) =>
    route.fulfill({
      json: envelope({
        id: subsidiaryId,
        parentId: null,
        code: 'P8_SUB',
        path: '/phase-8-subsidiary',
        depth: 1,
        name: { en: 'Phase 8 Subsidiary' },
        localizedName: 'Phase 8 Subsidiary',
        description: { en: 'Phase 8 subsidiary settings absence proof.' },
        localizedDescription: 'Phase 8 subsidiary settings absence proof.',
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
    route.fulfill({ json: envelope({ scopeType: 'talent', scopeId: talentId, flow: { nodes: [], edges: [], version: 1 } }) })
  );
  await page.route(new RegExp(`/api/v1/talents/${talentId}/settings(?:\\?.*)?$`), (route) =>
    route.fulfill({ json: envelope(scopeSettings('talent', talentId)) })
  );
  await page.route(new RegExp(`/api/v1/talents/${talentId}/homepage(?:\\?.*)?$`), (route) =>
    route.fulfill({
      json: envelope({
        talentId,
        homepagePath: 'phase-8-talent',
        isPublished: true,
        liveVersionId: null,
      }),
    })
  );
  await page.route(new RegExp(`/api/v1/talents/${talentId}/custom-domain(?:\\?.*)?$`), (route) =>
    route.fulfill({ json: envelope(talentCustomDomainConfig) })
  );
  await page.route(new RegExp(`/api/v1/talents/${talentId}/custom-domain/inherited-selections(?:\\?.*)?$`), (route) =>
    route.fulfill({ json: envelope(talentCustomDomainConfig) })
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
    route.fulfill({ json: envelope({ talentId, isEnabled: false, inboxAddress: null, settings: {} }) })
  );
  await page.route(new RegExp(`/api/v1/talents/${talentId}(?:\\?.*)?$`), (route) =>
    route.fulfill({
      json: envelope({
        id: talentId,
        subsidiaryId: null,
        profileStoreId: null,
        profileStore: null,
        code: 'P8_TALENT',
        path: '/phase-8-talent',
        name: { en: 'Phase 8 Talent' },
        localizedName: 'Phase 8 Talent',
        displayName: 'Phase 8 Talent',
        description: { en: 'Phase 8 talent settings absence proof.' },
        localizedDescription: 'Phase 8 talent settings absence proof.',
        avatarUrl: null,
        homepagePath: 'phase-8-talent',
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
}

function summarizeText(textContent) {
  return textContent
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 180);
}

const runtimeErrorPattern =
  /Runtime (?:Type)?Error|Unhandled Runtime Error|This page couldn.t load|This page couldn’t load|Call Stack|\b\d+\s+Issue\b/i;

async function waitForStablePage(page, route) {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ timeout: 15000 });
  if (route.includes('/platform-tools')) {
    await page.locator('[data-event-backbone-summary="ac-readiness"]').waitFor({ timeout: 15000 });
  }
  await page.waitForTimeout(500);
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
    viewportWidth: document.documentElement.clientWidth,
    bodyClientWidth: document.body.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  const boundingBoxes = await page.evaluate(() => {
    const selectors = [
      '[data-event-backbone-summary="ac-readiness"]',
      '[data-overflow-check="event-backbone-stream-table"]',
      '[data-overflow-check="event-backbone-consumer-table"]',
    ];

    return selectors.map((selector) => {
      const element = document.querySelector(selector);
      const box = element?.getBoundingClientRect();
      const parent = element?.parentElement;
      const parentBox = parent?.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;

      return {
        selector,
        present: Boolean(element),
        clientWidth: element?.clientWidth ?? null,
        scrollWidth: element?.scrollWidth ?? null,
        parentClientWidth: parent?.clientWidth ?? null,
        parentScrollWidth: parent?.scrollWidth ?? null,
        parentBox: parentBox
          ? {
              x: parentBox.x,
              y: parentBox.y,
              width: parentBox.width,
              height: parentBox.height,
            }
          : null,
        hasHorizontalScroll: element ? element.scrollWidth > element.clientWidth + 2 : false,
        withinViewport: box ? box.left >= -2 && box.right <= viewportWidth + 2 : false,
        box: box
          ? {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
            }
          : null,
      };
    });
  });
  const dom = {
    url: page.url(),
    title: await page.title(),
    textLines: summarizeText(textContent),
    viewport,
    locale,
    boundingBoxes,
  };
  const state = {
    url: page.url(),
    selectedFamily,
    overflow,
    hasEventBackboneSummary:
      /TCRN owns event meaning|TCRN 拥有事件语义|TCRN 擁有事件語義|TCRN がイベント意味|TCRN이 이벤트 의미|TCRN possède le sens/i.test(
        textContent
      ),
    hasNatsTool: textContent.includes('NATS JetStream'),
    hasRawSecretText: /secret=|access_token|id_token|private_key|authorization_code|providerSecret/i.test(
      textContent
    ),
    hasRuntimeErrorOverlay:
      runtimeErrorPattern.test(textContent) ||
      buttons.some((button) => runtimeErrorPattern.test(button.text)),
  };
  const focusA11y = {
    url: page.url(),
    activeElement: await page.evaluate(() => document.activeElement?.tagName ?? null),
    headingCount: await page.locator('h1,h2,h3').count(),
    buttonCount: buttons.length,
    iframeCount: await page.locator('iframe').count(),
    hasHorizontalOverflow:
      overflow.documentHasHorizontalOverflow || overflow.bodyHasHorizontalOverflow,
  };

  return {
    textContent,
    domPath: writeArtifact(`${id}-dom.json`, dom),
    statePath: writeArtifact(`${id}-states.json`, state),
    focusA11yPath: writeArtifact(`${id}-focus-a11y.json`, focusA11y),
    boundingBoxes,
    state,
    focusA11y,
  };
}

async function captureEventBackboneDrawer(page, id, route, locale, artifacts, checks) {
  const inspectLabel = locale === 'zh_HANS' ? '查看' : 'Inspect';
  const inspectButton = page.locator(`button[aria-label="${inspectLabel}: NATS JetStream"]`).first();
  if ((await inspectButton.count()) === 0) {
    checks.push({
      id: `${id}_drawer_inspect_button_present`,
      passed: false,
    });
    return;
  }

  await inspectButton.evaluate((element) => {
    element.scrollIntoView({ block: 'center', inline: 'center' });
    element.click();
  });
  const dialog = page.getByRole('dialog').first();
  await dialog.waitFor({ timeout: 15000 });
  await page.waitForTimeout(250);

  const drawerText = await dialog.innerText();
  const drawerScreenshot = artifactPath(`${id}-event-backbone-drawer.png`);
  await dialog.screenshot({ path: drawerScreenshot });
  const drawerState = {
    route,
    locale,
    textLines: summarizeText(drawerText),
    hasLocalizedBoundary: /TCRN 拥有事件语义|TCRN owns event meaning|TCRN 擁有事件語義|TCRN がイベント意味|TCRN이 이벤트 의미|TCRN possède le sens/i.test(
      drawerText
    ),
    hasApiEnglishBoundary:
      /TCRN owns event meaning, outbox, tenant isolation, idempotency, replay approval, and audit/i.test(
        drawerText
      ),
    hasRawPayloadText: /payloadEnvelope|redactedPayload|requestBody|responseBody|secret=|access_token/i.test(
      drawerText
    ),
  };
  const drawerStatePath = writeArtifact(`${id}-event-backbone-drawer-state.json`, drawerState);
  artifacts.push({
    id: `${id}-event-backbone-drawer`,
    route,
    screenshot: drawerScreenshot,
    states: drawerStatePath,
  });
  checks.push({
    id: `${id}_drawer_boundary_localized`,
    passed: drawerState.hasLocalizedBoundary && !drawerState.hasApiEnglishBoundary,
  });
  checks.push({
    id: `${id}_drawer_no_raw_payload_or_secret`,
    passed: !drawerState.hasRawPayloadText,
  });
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
    await waitForStablePage(page, route);
    const screenshot = artifactPath(`${id}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    const { textContent, domPath, statePath, focusA11yPath, state, focusA11y, boundingBoxes } =
      await collectPageState(page, id, viewport, locale);
    artifacts.push({
      id,
      route,
      screenshot,
      dom: domPath,
      states: statePath,
      focusA11y: focusA11yPath,
    });

    const tableScreenshots = [];
    if (route.includes('/platform-tools') && viewport.width < 600) {
      for (const tableId of ['event-backbone-stream-table', 'event-backbone-consumer-table']) {
        const locator = page.locator(`[data-overflow-check="${tableId}"]`);
        if ((await locator.count()) === 0) {
          continue;
        }
        await locator.scrollIntoViewIfNeeded();
        const initialPath = artifactPath(`${id}-${tableId}.png`);
        await locator.screenshot({ path: initialPath });
        await locator.evaluate((element) => {
          element.scrollLeft = element.scrollWidth;
        });
        const scrolledPath = artifactPath(`${id}-${tableId}-scrolled.png`);
        await locator.screenshot({ path: scrolledPath });
        tableScreenshots.push({
          tableId,
          initial: initialPath,
          scrolled: scrolledPath,
        });
      }
      if (tableScreenshots.length > 0) {
        artifacts.push({
          id: `${id}-table-containment`,
          route,
          tableScreenshots,
        });
      }

      await captureEventBackboneDrawer(page, id, route, locale, artifacts, checks);
    }
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
    checks.push({
      id: `${id}_no_raw_secret_or_payload`,
      passed: !state.hasRawSecretText && focusA11y.iframeCount === 0,
    });

    if (route.includes('/platform-tools')) {
      checks.push({
        id: `${id}_event_backbone_family_selected`,
        passed:
          state.selectedFamily.some((item) => item.value === 'event_backbone') &&
          state.hasEventBackboneSummary &&
          state.hasNatsTool &&
          /No raw payload|不暴露原始载荷|不暴露原始載荷|生ペイロード|원시 페이로드|Aucun payload/i.test(
            textContent
          ),
      });
      checks.push({
        id: `${id}_bounding_boxes_present`,
        passed: boundingBoxes.every((entry) => entry.present && entry.box?.width > 0 && entry.box.height > 0),
      });
      checks.push({
        id: `${id}_table_containment`,
        passed: boundingBoxes
          .filter((entry) => entry.selector.includes('data-overflow-check'))
          .every(
            (entry) =>
              entry.present &&
              entry.withinViewport &&
              (entry.clientWidth ?? 0) <= state.overflow.viewportWidth + 2 &&
              (entry.parentClientWidth ?? 0) <= state.overflow.viewportWidth + 2 &&
              (entry.scrollWidth ?? 0) >= (entry.clientWidth ?? 0)
          ),
      });
    }

    if (id.includes('settings-absence')) {
      checks.push({
        id: `${id}_event_backbone_absent_from_ordinary_settings`,
        passed:
          !/Event Backbone|NATS JetStream|event_backbone|stream controls|consumer durable|DLQ/i.test(
            textContent
          ) && page.url().includes(route.split('?')[0]),
      });
    }

    await context.close();
  }

  await capturePage({
    id: 'event-backbone-platform-tools-desktop',
    route: `/ac/${tenantId}/platform-tools?family=event_backbone`,
    locale: 'en',
    viewport: { width: 1440, height: 900 },
  });
  await capturePage({
    id: 'event-backbone-platform-tools-mobile',
    route: `/ac/${tenantId}/platform-tools?family=event_backbone`,
    locale: 'zh_HANS',
    viewport: { width: 390, height: 844 },
  });

  const absenceCases = [
    {
      id: 'event-backbone-settings-absence-tenant-desktop',
      route: `/tenant/${tenantId}/settings`,
      locale: 'en',
      viewport: { width: 1440, height: 900 },
    },
    {
      id: 'event-backbone-settings-absence-tenant-mobile',
      route: `/tenant/${tenantId}/settings`,
      locale: 'zh_HANS',
      viewport: { width: 390, height: 844 },
    },
    {
      id: 'event-backbone-settings-absence-subsidiary-desktop',
      route: `/tenant/${tenantId}/subsidiary/${subsidiaryId}/settings`,
      locale: 'en',
      viewport: { width: 1440, height: 900 },
    },
    {
      id: 'event-backbone-settings-absence-subsidiary-mobile',
      route: `/tenant/${tenantId}/subsidiary/${subsidiaryId}/settings`,
      locale: 'zh_HANS',
      viewport: { width: 390, height: 844 },
    },
    {
      id: 'event-backbone-settings-absence-talent-desktop',
      route: `/tenant/${tenantId}/talent/${talentId}/settings`,
      locale: 'en',
      viewport: { width: 1440, height: 900 },
    },
    {
      id: 'event-backbone-settings-absence-talent-mobile',
      route: `/tenant/${tenantId}/talent/${talentId}/settings`,
      locale: 'zh_HANS',
      viewport: { width: 390, height: 844 },
    },
  ];

  for (const absenceCase of absenceCases) {
    await capturePage(absenceCase);
  }

  await browser.close();

  const payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'browser_ui',
    data_mode: 'mocked_api_browser_runtime',
    target_scope: 'event-backbone-adapter',
    routes: [
      `/ac/${tenantId}/platform-tools?family=event_backbone`,
      ...absenceCases.map((entry) => entry.route),
    ],
    artifacts,
    checks,
    passed: checks.every((check) => check.passed),
  };

  writeArtifact('event-backbone-settings-absence.json', {
    checkedAt: payload.checkedAt,
    test_layer: 'browser_ui',
    data_mode: 'mocked_api_browser_runtime',
    target_scope: 'tenant_absence',
    cases: absenceCases.map((entry) => entry.id),
    checks: checks.filter((check) => check.id.includes('settings-absence')),
    passed: checks
      .filter((check) => check.id.includes('settings-absence'))
      .every((check) => check.passed),
  });

  return payload;
}

function captureSourceEvidence() {
  const platformToolsScreenPath = path.join(
    webRoot,
    'src/domains/platform-tool-connections/screens/PlatformToolConnectionsScreen.tsx'
  );
  const platformToolsCopyPath = path.join(
    webRoot,
    'src/domains/platform-tool-connections/screens/platform-tool-connections.copy.ts'
  );
  const platformToolsPagePath = path.join(webRoot, 'src/app/ac/[tenantId]/platform-tools/page.tsx');
  const tenantSettingsPath = path.join(webRoot, 'src/app/tenant/[tenantId]/settings/page.tsx');
  const subsidiarySettingsPath = path.join(
    webRoot,
    'src/app/tenant/[tenantId]/subsidiary/[subsidiaryId]/settings/page.tsx'
  );
  const talentSettingsPath = path.join(
    webRoot,
    'src/app/tenant/[tenantId]/talent/[talentId]/settings/page.tsx'
  );
  const sourceTexts = {
    platformToolsScreen: readFileSync(platformToolsScreenPath, 'utf8'),
    platformToolsCopy: readFileSync(platformToolsCopyPath, 'utf8'),
    platformToolsPage: readFileSync(platformToolsPagePath, 'utf8'),
    tenantSettingsPage: readFileSync(tenantSettingsPath, 'utf8'),
    subsidiarySettingsPage: readFileSync(subsidiarySettingsPath, 'utf8'),
    talentSettingsPage: readFileSync(talentSettingsPath, 'utf8'),
  };
  const checks = [
    {
      id: 'event_backbone_query_route_supported',
      passed: sourceTexts.platformToolsPage.includes("rawFamily === 'event_backbone'"),
    },
    {
      id: 'event_backbone_ac_summary_markers',
      passed:
        sourceTexts.platformToolsScreen.includes('data-event-backbone-summary="ac-readiness"') &&
        sourceTexts.platformToolsScreen.includes('data-overflow-check="event-backbone-stream-table"') &&
        sourceTexts.platformToolsScreen.includes('data-overflow-check="event-backbone-consumer-table"'),
    },
    {
      id: 'event_backbone_no_raw_payload_copy',
      passed:
        sourceTexts.platformToolsScreen.includes('copy.eventBackbone.noRawPayload') &&
        sourceTexts.platformToolsCopy.includes('No raw payload, token, or PII surface.'),
    },
    {
      id: 'event_backbone_boundary_uses_localized_copy',
      passed:
        sourceTexts.platformToolsScreen.includes('selectedBoundary') &&
        sourceTexts.platformToolsScreen.includes('copy.eventBackbone.boundary') &&
        !sourceTexts.platformToolsScreen.includes('eventBackboneSummary.sourceOfTruthBoundary') &&
        !sourceTexts.platformToolsScreen.includes('{selected.definition.sourceOfTruthBoundary}') &&
        sourceTexts.platformToolsCopy.includes('TCRN owns event meaning'),
    },
    {
      id: 'ordinary_settings_route_absence',
      passed:
        !/event_backbone|Event Backbone|NATS JetStream/.test(sourceTexts.tenantSettingsPage) &&
        !/event_backbone|Event Backbone|NATS JetStream/.test(sourceTexts.subsidiarySettingsPage) &&
        !/event_backbone|Event Backbone|NATS JetStream/.test(sourceTexts.talentSettingsPage),
    },
  ];

  return {
    checkedAt: new Date().toISOString(),
    test_layer: 'source_scan',
    data_mode: 'source_scan',
    target_scope: 'event-backbone-adapter',
    routes: [
      '/ac/<acTenantId>/platform-tools?family=event_backbone',
      '/tenant/<tenantId>/settings',
      '/tenant/<tenantId>/subsidiary/<subsidiaryId>/settings',
      '/tenant/<tenantId>/talent/<talentId>/settings',
    ],
    files: [
      path.relative(webRoot, platformToolsScreenPath),
      path.relative(webRoot, platformToolsCopyPath),
      path.relative(webRoot, platformToolsPagePath),
      path.relative(webRoot, tenantSettingsPath),
      path.relative(webRoot, subsidiarySettingsPath),
      path.relative(webRoot, talentSettingsPath),
    ],
    checks,
    passed: checks.every((check) => check.passed),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const payload = options.baseUrl ? await captureBrowserEvidence() : captureSourceEvidence();

  mkdirSync(path.dirname(options.out), { recursive: true });
  writeFileSync(options.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

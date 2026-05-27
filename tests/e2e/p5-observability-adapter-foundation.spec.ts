import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page, type Route } from '@playwright/test';

declare global {
  interface Window {
    __p5OpenCalls?: string[];
  }
}

const evidenceDir =
  process.env.P5_EVIDENCE_DIR ||
  '/Users/ryanlan/Code/TCRN Platform/vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/evidence/2026-05-28-goals-phase-0-12-execution/phase-5-observability-adapter-foundation';

const sessionStorageKey = 'tcrn.web.session';
const localeStorageKey = 'tcrn.web.locale.override';

function evidencePath(fileName: string) {
  mkdirSync(evidenceDir, { recursive: true });
  return path.join(evidenceDir, fileName);
}

function writeEvidence(fileName: string, payload: unknown) {
  writeFileSync(evidencePath(fileName), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function success(route: Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
  });
}

function failure(route: Route, status: number, message: string, code = 'P5_EVIDENCE_ERROR') {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({
      success: false,
      error: {
        code,
        message,
      },
    }),
  });
}

function createSession(locale: 'en' | 'zh-Hans', tier: 'ac' | 'standard' = 'ac') {
  return {
    accessToken: 'p5-browser-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    authenticatedAt: '2026-05-28T00:00:00.000Z',
    tenantId: tier === 'ac' ? 'tenant-ac' : 'tenant-ordinary',
    tenantName: tier === 'ac' ? 'TCRN AC' : 'Ordinary Tenant',
    tenantTier: tier,
    tenantCode: tier === 'ac' ? 'ac' : 'ordinary',
    capabilities: null,
    user: {
      id: `${tier}-operator`,
      username: `${tier}_operator`,
      email: `${tier}@example.test`,
      displayName: tier === 'ac' ? 'AC Operator' : 'Tenant Operator',
      avatarUrl: null,
      preferredLanguage: locale,
      totpEnabled: false,
      forceReset: false,
      passwordExpiresAt: null,
    },
  };
}

async function seedSession(page: Page, locale: 'en' | 'zh-Hans', tier: 'ac' | 'standard' = 'ac') {
  await page.addInitScript(
    ({ key, localeKey, session, localeValue }) => {
      window.sessionStorage.setItem(key, JSON.stringify(session));
      window.localStorage.setItem(localeKey, localeValue);
      Object.defineProperty(window, '__p5OpenCalls', {
        value: [],
        writable: true,
      });
      window.open = (url) => {
        window.__p5OpenCalls = window.__p5OpenCalls ?? [];
        window.__p5OpenCalls.push(String(url));
        return null;
      };
    },
    {
      key: sessionStorageKey,
      localeKey: localeStorageKey,
      session: createSession(locale, tier),
      localeValue: locale,
    }
  );
}

function adapterSummary() {
  const rows = [
    ['otel_trace_exporter', 'OpenTelemetry Trace Exporter', 'traces', null, false, 'disabled', 'disabled', 'not_applicable'],
    ['otel_metrics_exporter', 'OpenTelemetry Metrics Exporter', 'metrics', null, false, 'missing_config', 'external_provided', 'not_applicable'],
    ['loki_log_backend', 'Loki Log Backend', 'logs', null, false, 'disabled', 'disabled', 'not_applicable'],
    ['tempo_trace_backend', 'Tempo Trace Backend', 'traces', null, false, 'disabled', 'disabled', 'not_applicable'],
    ['prometheus_metrics_backend', 'Prometheus Metrics Backend', 'metrics', null, false, 'disabled', 'disabled', 'not_applicable'],
    ['prometheus_alert_rules', 'Prometheus Alert Rule Readiness', 'alerts', null, false, 'repository_readback', 'repository_readback', 'not_applicable'],
    ['grafana_console', 'Grafana Console', 'dashboards', 'grafana', true, 'sso_required', 'external_provided', 'blocked'],
  ] as const;

  return rows.map(([code, label, signalFamily, platformToolCode, deepLink, readinessState, backendMode, ssoState], index) => ({
    definition: {
      code,
      label,
      localizedLabel: {
        en: label,
        zh_HANS: label,
        zh_HANT: label,
        ja: label,
        ko: label,
        fr: label,
      },
      signalFamily,
      platformToolCode,
      defaultEnabled: false,
      defaultReadinessState: 'disabled',
      ownerPhase: 'phase_5',
      humanUi: Boolean(deepLink),
      deepLink: Boolean(deepLink),
      safeQueryCapability: deepLink ? 'sso_gated_deep_link_template' : 'none',
      localDevModes: ['disabled', 'external_provided'],
      ssoRequirement: deepLink ? 'required' : 'not_applicable',
      licensePosture: 'recorded_before_ready',
      sourceOfTruthBoundary: 'TCRN remains the product audit source of truth.',
      defaultBackendState: 'disabled by default',
      sortOrder: (index + 1) * 10,
    },
    profile: {
      adapterCode: code,
      environment: 'local',
      enabled: false,
      backendMode,
      readinessState,
      healthStatus: code === 'grafana_console' ? 'healthy' : 'disabled',
      ssoState,
      platformToolConnectionId: code === 'grafana_console' ? 'connection-grafana' : null,
      platformToolCode,
      endpointConfigured: code === 'grafana_console',
      lastCheckedAt: null,
      configVersion: code === 'grafana_console' ? 1 : 0,
    },
    policy: {
      sourceOfTruthBoundary: 'TCRN remains the product audit source of truth.',
      rawQueryAllowedForOrdinaryTenants: false,
      maxQueryRangeHours: 24,
      maxResultLimit: 100,
    },
  }));
}

function platformToolBundles() {
  return [
    {
      definition: {
        code: 'grafana',
        family: 'observability_console',
        displayKey: 'platformTools.grafana',
        label: 'Grafana',
        localizedLabel: { en: 'Grafana', zh_HANS: 'Grafana' },
        defaultState: 'selected_candidate_disabled',
        ownerPhase: 'phase_5',
        humanUi: true,
        deepLink: true,
        allowedLocalDevModes: ['disabled', 'stubbed', 'compose_opt_in', 'external_provided'],
        ssoRequirement: 'required',
        licensePosture: 'agpl_or_enterprise_edition_posture_required_before_ready',
        defaultConnection: 'none',
        sortOrder: 20,
      },
      connection: {
        id: 'connection-grafana',
        tenantId: 'tenant-ac',
        toolCode: 'grafana',
        environment: 'local',
        deploymentMode: 'external_provided',
        localDevMode: 'external_provided',
        endpointUrl: 'https://grafana.example.test',
        internalServiceUrl: null,
        namespace: null,
        serviceName: null,
        enabled: true,
        readinessState: 'sso_required',
        ssoReadinessState: 'blocked',
        healthStatus: 'healthy',
        lastCheckedAt: null,
        configVersion: 1,
        version: 1,
      },
      configValues: [],
      ssoReadiness: {
        status: 'blocked',
        failClosed: true,
        evidence: {},
      },
      healthSnapshots: [],
      auditTrail: [],
    },
  ];
}

type DeepLinkState =
  | 'not_configured'
  | 'sso_required'
  | 'unhealthy'
  | 'unsafe_url'
  | 'accepted'
  | 'audit_failed';

async function installApiMocks(
  page: Page,
  state: {
    deepLinkState: DeepLinkState;
    summaryMode?: 'normal' | 'empty' | 'error' | 'loading';
    platformToolsMode?: 'normal' | 'empty' | 'error' | 'loading' | 'permission-denied';
    tenantLogsMode?: 'normal' | 'empty' | 'error' | 'loading';
  }
) {
  const apiCalls: Array<Record<string, unknown>> = [];
  let savedPlatformBundle = platformToolBundles()[0];
  const delayIfLoading = async (mode?: string) => {
    if (mode === 'loading') {
      await new Promise((resolve) => setTimeout(resolve, 1800));
    }
  };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const tenantHeader = request.headers()['x-tenant-id'];
    apiCalls.push({ method: request.method(), pathname, search: url.search, tenantHeader });

    if (pathname === '/api/v1/module-capabilities/effective') {
      return success(route, {
        tenantId: tenantHeader ?? 'tenant-ac',
        effective: {
          tenantId: tenantHeader ?? 'tenant-ac',
          scopeType: 'tenant',
          scopeId: null,
          enabledCapabilityCodes: ['observability.product_audit'],
          disabledReasons: {},
          registryVersion: 'p5-browser',
          resolvedAt: '2026-05-28T00:00:00.000Z',
        },
        registryVersion: 'p5-browser',
      });
    }

    if (pathname === '/api/v1/users/me') {
      return success(route, createSession('en').user);
    }

    if (pathname.startsWith('/api/v1/observability/adapters') && tenantHeader === 'tenant-ordinary') {
      return failure(route, 403, 'Observability adapter readiness is available to AC operators only', 'PERM_ACCESS_DENIED');
    }

    if (pathname === '/api/v1/observability/adapters/summary') {
      await delayIfLoading(state.summaryMode);
      if (state.summaryMode === 'error') {
        return failure(route, 503, 'Adapter summary unavailable', 'P5_ADAPTER_SUMMARY_UNAVAILABLE');
      }

      if (state.summaryMode === 'empty') {
        return success(route, []);
      }

      return success(route, adapterSummary());
    }

    if (pathname === '/api/v1/observability/adapters/grafana_console/deep-link') {
      return success(route, {
        adapterCode: 'grafana_console',
        environment: 'local',
        state: state.deepLinkState,
        url: state.deepLinkState === 'accepted' ? 'https://grafana.example.test' : null,
        opensInNewTab: state.deepLinkState === 'accepted',
      });
    }

    if (pathname === '/api/v1/platform-tools/connections') {
      await delayIfLoading(state.platformToolsMode);
      if (state.platformToolsMode === 'permission-denied') {
        return failure(route, 403, 'Permission denied: platform.tool_connection:read', 'PERM_ACCESS_DENIED');
      }
      if (state.platformToolsMode === 'error') {
        return failure(route, 503, 'Platform tools unavailable', 'P5_PLATFORM_TOOLS_UNAVAILABLE');
      }
      const family = url.searchParams.get('family');
      const rows =
        state.platformToolsMode === 'empty'
          ? []
          : family === 'observability_console'
            ? [savedPlatformBundle]
            : [];
      return success(route, rows);
    }

    if (pathname === '/api/v1/platform-tools/connections/grafana' && request.method() === 'GET') {
      return success(route, savedPlatformBundle);
    }

    if (pathname === '/api/v1/platform-tools/connections/grafana' && request.method() === 'PATCH') {
      const payload = JSON.parse(request.postData() ?? '{}') as {
        endpointUrl?: string | null;
        namespace?: string | null;
        serviceName?: string | null;
        enabled?: boolean;
      };

      savedPlatformBundle = {
        ...savedPlatformBundle,
        connection: {
          ...savedPlatformBundle.connection,
          endpointUrl: payload.endpointUrl ?? null,
          namespace: payload.namespace ?? null,
          serviceName: payload.serviceName ?? null,
          enabled: payload.enabled ?? savedPlatformBundle.connection.enabled,
          version: savedPlatformBundle.connection.version + 1,
          configVersion: savedPlatformBundle.connection.configVersion + 1,
        },
      };

      return success(route, savedPlatformBundle);
    }

    if (
      pathname === '/api/v1/platform-tools/connections/grafana/health-check' &&
      request.method() === 'POST'
    ) {
      return success(route, {
        toolCode: 'grafana',
        environment: url.searchParams.get('environment') ?? 'local',
        snapshot: {
          id: 'health-p5',
          status: 'healthy',
          latencyMs: 42,
          safeDetails: { source: 'p5_browser_matrix' },
          checkedAt: '2026-05-28T00:00:00.000Z',
          checkedBy: 'ac-operator',
        },
      });
    }

    if (pathname === '/api/v1/platform-tools/connections/grafana/deep-link') {
      return success(route, {
        toolCode: 'grafana',
        environment: url.searchParams.get('environment') ?? 'local',
        state: state.deepLinkState,
        url: state.deepLinkState === 'accepted' ? 'https://grafana.example.test' : null,
        opensInNewTab: state.deepLinkState === 'accepted',
      });
    }

    if (pathname === '/api/v1/logs/changes') {
      await delayIfLoading(state.tenantLogsMode);
      if (state.tenantLogsMode === 'error') {
        return failure(route, 503, 'Change logs unavailable', 'P5_CHANGE_LOGS_UNAVAILABLE');
      }
      return success(route, {
        items:
          state.tenantLogsMode === 'normal'
            ? [
                {
                  id: 'change-p5',
                  occurredAt: '2026-05-28T00:00:00.000Z',
                  operatorId: 'tenant-operator',
                  operatorName: 'Tenant Operator',
                  action: 'update',
                  objectType: 'talent',
                  objectId: 'talent-p5',
                  objectName: 'Tenant Canary',
                  diff: { status: { from: 'draft', to: 'published' } },
                  ipAddress: '203.0.113.10',
                  userAgent: 'p5-browser',
                  requestId: 'req-p5-change',
                },
              ]
            : [],
        total: state.tenantLogsMode === 'normal' ? 1 : 0,
        page: 1,
        pageSize: Number(url.searchParams.get('pageSize') ?? 20),
        totalPages: state.tenantLogsMode === 'normal' ? 1 : 0,
      });
    }

    if (pathname === '/api/v1/logs/events') {
      return success(route, {
        items: [],
        total: 0,
        page: 1,
        pageSize: Number(url.searchParams.get('pageSize') ?? 20),
        totalPages: 0,
      });
    }

    if (pathname === '/api/v1/logs/integrations') {
      return success(route, {
        items: [],
        total: 0,
        page: 1,
        pageSize: Number(url.searchParams.get('pageSize') ?? 20),
        totalPages: 0,
      });
    }

    if (pathname === '/api/v1/logs/search') {
      return success(route, {
        entries: [],
        stats: { tenantScoped: true, maxResultLimit: 100 },
      });
    }

    return failure(route, 404, `Unhandled API mock path ${pathname}`, 'P5_UNHANDLED_API_MOCK');
  });

  return apiCalls;
}

async function collectObservabilityDom(page: Page) {
  return page.evaluate(() => ({
    workspace: document.querySelector('[data-observability-workspace]')?.getAttribute('data-observability-workspace'),
    externalAbsent: document
      .querySelector('[data-external-observability-absent]')
      ?.getAttribute('data-external-observability-absent'),
    adapterCodes: Array.from(document.querySelectorAll('[data-observability-adapter-code]')).map(
      (node) => node.getAttribute('data-observability-adapter-code')
    ),
    platformToolCodes: Array.from(document.querySelectorAll('[data-tool-code]')).map((node) =>
      node.getAttribute('data-tool-code')
    ),
    iframeCount: document.querySelectorAll('iframe').length,
    bodyText: document.body.innerText,
    sourceOrder: (() => {
      const productTabs = document.querySelector('[role="tablist"]');
      const externalReadiness = document.querySelector('[data-observability-adapter-summary]');
      return {
        productTabsBeforeExternal:
          Boolean(productTabs && externalReadiness) &&
          Boolean(productTabs?.compareDocumentPosition(externalReadiness) & Node.DOCUMENT_POSITION_FOLLOWING),
      };
    })(),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    openCalls: window.__p5OpenCalls ?? [],
  }));
}

async function collectSurfaceState(page: Page) {
  return page.evaluate(() => ({
    bodyText: document.body.innerText,
    iframeCount: document.querySelectorAll('iframe').length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    adapterCodes: Array.from(document.querySelectorAll('[data-observability-adapter-code]')).map(
      (node) => node.getAttribute('data-observability-adapter-code')
    ),
    platformToolCodes: Array.from(document.querySelectorAll('[data-tool-code]')).map((node) =>
      node.getAttribute('data-tool-code')
    ),
    statusTexts: Array.from(document.querySelectorAll('[role="status"]')).map((node) =>
      node.textContent?.trim()
    ),
    activeElement: {
      tagName: document.activeElement?.tagName ?? null,
      text: document.activeElement?.textContent?.trim() ?? null,
      ariaLabel: document.activeElement?.getAttribute('aria-label') ?? null,
    },
    parentProof: {
      platformSurface: document
        .querySelector('[data-platform-tool-surface]')
        ?.getAttribute('data-platform-tool-surface') ?? null,
      adapterSummary: document
        .querySelector('[data-observability-adapter-summary]')
        ?.getAttribute('data-observability-adapter-summary') ?? null,
      secondaryRegion: document
        .querySelector('[data-observability-secondary-region]')
        ?.getAttribute('data-observability-secondary-region') ?? null,
    },
  }));
}

test('P5 AC platform tool observability family is directly reachable and mobile-safe', async ({ page }) => {
  await seedSession(page, 'en', 'ac');
  const apiCalls = await installApiMocks(page, { deepLinkState: 'sso_required' });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/ac/tenant-ac/platform-tools?family=observability');
  await expect(page.getByRole('heading', { name: 'Platform Tool Connections' })).toBeVisible();
  await expect(page.locator('[data-tool-code="grafana"]').first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Observability' })).toBeVisible();

  await page.screenshot({ path: evidencePath('observability-platform-tools-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('article[data-tool-code="grafana"]')).toBeVisible();
  await page.screenshot({ path: evidencePath('observability-platform-tools-mobile.png'), fullPage: true });

  const dom = await collectObservabilityDom(page);
  const adapterCatalogCodes = adapterSummary().map((item) => item.definition.code);
  writeEvidence('observability-platform-tools-dom.json', dom);
  writeEvidence('observability-platform-tools-states.json', {
    apiCalls,
    platformToolCodes: dom.platformToolCodes,
    platformToolCatalogDomDerived: dom.platformToolCodes.includes('grafana'),
    adapterCatalogProofLocation: 'ac-observability-summary-dom.json',
    familyFilterUsed: apiCalls.some(
      (call) => call.pathname === '/api/v1/platform-tools/connections' && call.search === '?environment=local&family=observability_console'
    ),
    noIframe: dom.iframeCount === 0,
    noHorizontalOverflow: !dom.horizontalOverflow,
  });
  await page.getByRole('button', { name: 'Refresh' }).focus();
  writeEvidence('observability-platform-tools-focus-a11y.json', {
    focusedText: await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ''),
    focusedTag: await page.evaluate(() => document.activeElement?.tagName ?? ''),
    platformToolCodes: dom.platformToolCodes,
    noIframe: dom.iframeCount === 0,
    noHorizontalOverflow: !dom.horizontalOverflow,
    adapterCatalogCodes,
    passed:
      !dom.horizontalOverflow &&
      dom.iframeCount === 0 &&
      dom.platformToolCodes.includes('grafana') &&
      adapterCatalogCodes.length === 7,
  });

  expect(dom.platformToolCodes).toContain('grafana');
  expect(dom.iframeCount).toBe(0);
  expect(dom.horizontalOverflow).toBe(false);
});

test('P5 AC observability summary is secondary to product logs and deep links fail closed before SSO', async ({ page }) => {
  await seedSession(page, 'en', 'ac');
  const state: { deepLinkState: DeepLinkState } = { deepLinkState: 'sso_required' };
  const apiCalls = await installApiMocks(page, state);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/ac/tenant-ac/observability');
  await expect(page.getByRole('heading', { name: 'External observability readiness' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Change Logs' })).toBeVisible();
  await expect(page.getByText('Grafana Console')).toBeVisible();
  const sourceOrderBeforeDeepLink = await collectObservabilityDom(page);
  expect(sourceOrderBeforeDeepLink.sourceOrder.productTabsBeforeExternal).toBe(true);

  await page.screenshot({ path: evidencePath('ac-observability-summary-desktop.png'), fullPage: true });
  await page
    .getByLabel('Open external observability handoff: Grafana Console')
    .click();
  await expect(page.getByText('Deep link unavailable: sso required')).toBeVisible();
  await page.screenshot({ path: evidencePath('observability-deeplink-denied.png'), fullPage: true });

  state.deepLinkState = 'accepted';
  await page.getByLabel('Open external observability handoff: Grafana Console').click();
  await expect.poll(async () => (await collectObservabilityDom(page)).openCalls.length).toBe(1);
  await page.screenshot({ path: evidencePath('observability-deeplink-accepted.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('Grafana Console')).toBeVisible();
  await page.screenshot({ path: evidencePath('ac-observability-summary-mobile.png'), fullPage: true });

  const dom = await collectObservabilityDom(page);
  writeEvidence('ac-observability-summary-dom.json', dom);
  writeEvidence('ac-observability-summary-states.json', {
    apiCalls,
    adapterCodes: dom.adapterCodes,
    sourceOrder: dom.sourceOrder,
    deepLinkFailClosedStateSeen: true,
    acceptedOpenCalls: dom.openCalls,
    noIframe: dom.iframeCount === 0,
    noHorizontalOverflow: !dom.horizontalOverflow,
  });
  await page.getByRole('button', { name: /Open external observability handoff: Grafana Console/ }).focus();
  writeEvidence('ac-observability-summary-focus-a11y.json', {
    focusedLabel: await page.evaluate(
      () => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? ''
    ),
    sourceOrder: dom.sourceOrder,
    noIframe: dom.iframeCount === 0,
    noHorizontalOverflow: !dom.horizontalOverflow,
    passed:
      dom.sourceOrder.productTabsBeforeExternal &&
      dom.iframeCount === 0 &&
      !dom.horizontalOverflow,
  });
  writeEvidence('observability-deeplink-screenshots.json', {
    denied: 'observability-deeplink-denied.png',
    accepted: 'observability-deeplink-accepted.png',
  });
  writeEvidence('observability-deeplink-states.json', {
    failClosedState: 'sso_required',
    acceptedState: 'accepted',
    acceptedOpenCalls: dom.openCalls,
    noIframe: dom.iframeCount === 0,
    passed: dom.openCalls.length === 1 && dom.iframeCount === 0,
  });

  expect(dom.adapterCodes).toEqual([
    'otel_trace_exporter',
    'otel_metrics_exporter',
    'loki_log_backend',
    'tempo_trace_backend',
    'prometheus_metrics_backend',
    'prometheus_alert_rules',
    'grafana_console',
  ]);
  expect(dom.openCalls).toEqual(['https://grafana.example.test']);
  expect(dom.iframeCount).toBe(0);
  expect(dom.horizontalOverflow).toBe(false);
  expect(dom.sourceOrder.productTabsBeforeExternal).toBe(true);
});

test('P5 ordinary tenant observability has no external adapter surface or direct API access', async ({ page }) => {
  await seedSession(page, 'zh-Hans', 'standard');
  const apiCalls = await installApiMocks(page, { deepLinkState: 'sso_required' });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tenant/tenant-ordinary/observability');
  await expect(page.getByRole('heading', { name: '可观测性' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '变更日志' })).toBeVisible();
  await expect(page.getByText('外部可观测性就绪状态')).toHaveCount(0);
  await expect(page.getByText('Grafana Console')).toHaveCount(0);

  await page.screenshot({ path: evidencePath('tenant-observability-absence-desktop.png'), fullPage: true });

  const directApi = await page.evaluate(async () => {
    const response = await fetch('/api/v1/observability/adapters/summary?environment=local', {
      headers: {
        authorization: 'Bearer p5-browser-token',
        'x-tenant-id': 'tenant-ordinary',
      },
    });
    return {
      status: response.status,
      body: await response.json(),
    };
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: evidencePath('tenant-observability-absence-mobile.png'), fullPage: true });
  const dom = await collectObservabilityDom(page);

  writeEvidence('tenant-observability-absence.json', {
    apiCalls,
    directApi,
    dom,
    noExternalAdapterCards: dom.adapterCodes.length === 0,
    noIframe: dom.iframeCount === 0,
    noHorizontalOverflow: !dom.horizontalOverflow,
  });
  writeEvidence('tenant-observability-states.json', {
    workspace: dom.workspace,
    externalAbsent: dom.externalAbsent,
    directApiStatus: directApi.status,
    noHorizontalOverflow: !dom.horizontalOverflow,
  });
  writeEvidence('tenant-observability-screenshots.json', {
    desktop: 'tenant-observability-absence-desktop.png',
    mobile: 'tenant-observability-absence-mobile.png',
    noExternalAdapterCards: dom.adapterCodes.length === 0,
    directApiDenied: directApi.status === 403,
  });

  expect(dom.externalAbsent).toBe('true');
  expect(dom.adapterCodes).toEqual([]);
  expect(directApi.status).toBe(403);
  expect(dom.iframeCount).toBe(0);
});

test('P5 UI state matrix covers AC, Platform Tools, tenant, and deep-link states', async ({
  browser,
}) => {
  const results: Array<Record<string, unknown>> = [];

  async function record(page: Page, input: { id: string; surface: string; expected: boolean }) {
    const screenshot = `observability-state-${input.id}.png`;
    const surfaceState = await collectSurfaceState(page);
    await page.screenshot({ path: evidencePath(screenshot), fullPage: true });
    results.push({
      id: input.id,
      surface: input.surface,
      screenshot,
      ...surfaceState,
      passed:
        input.expected &&
        surfaceState.iframeCount === 0 &&
        surfaceState.horizontalOverflow === false,
    });
  }

  const acScenarios: Array<{
    id: string;
    summaryMode?: 'empty' | 'error' | 'loading';
    deepLinkState: DeepLinkState;
    expectedText?: string | RegExp;
    captureBeforeSettle?: boolean;
  }> = [
    {
      id: 'ac-summary-loading',
      summaryMode: 'loading',
      deepLinkState: 'sso_required',
      expectedText: 'Loading adapter readiness',
      captureBeforeSettle: true,
    },
    {
      id: 'ac-summary-error-retry',
      summaryMode: 'error',
      deepLinkState: 'sso_required',
      expectedText: 'Adapter summary unavailable',
    },
    {
      id: 'ac-summary-empty',
      summaryMode: 'empty',
      deepLinkState: 'sso_required',
      expectedText: 'No adapters returned',
    },
    {
      id: 'ac-summary-normal',
      deepLinkState: 'sso_required',
      expectedText: 'Grafana Console',
    },
    {
      id: 'ac-deep-link-unsafe',
      deepLinkState: 'unsafe_url',
      expectedText: /Deep link unavailable: unsafe url/,
    },
    {
      id: 'ac-deep-link-unhealthy',
      deepLinkState: 'unhealthy',
      expectedText: /Deep link unavailable: unhealthy/,
    },
    {
      id: 'ac-deep-link-audit-failed',
      deepLinkState: 'audit_failed',
      expectedText: /Deep link unavailable: audit failed/,
    },
  ];

  for (const scenario of acScenarios) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await seedSession(page, 'en', 'ac');
    const apiCalls = await installApiMocks(page, {
      deepLinkState: scenario.deepLinkState,
      summaryMode: scenario.summaryMode ?? 'normal',
      tenantLogsMode: 'normal',
    });

    await page.goto('/ac/tenant-ac/observability', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('tab', { name: 'Change Logs' })).toBeVisible();

    if (scenario.captureBeforeSettle) {
      await expect(page.getByText(scenario.expectedText ?? '')).toBeVisible();
    } else if (scenario.summaryMode) {
      await expect(page.getByText(scenario.expectedText ?? '').first()).toBeVisible();
    } else if (scenario.id.startsWith('ac-deep-link')) {
      await expect(page.getByText('Grafana Console')).toBeVisible();
      await page.getByLabel('Open external observability handoff: Grafana Console').click();
      await expect(page.getByText(scenario.expectedText ?? '').first()).toBeVisible();
    } else {
      await expect(page.getByText(scenario.expectedText ?? '').first()).toBeVisible();
    }

    const dom = await collectObservabilityDom(page);
    await record(page, {
      id: scenario.id,
      surface: 'ac-observability',
      expected:
        dom.sourceOrder.productTabsBeforeExternal &&
        (scenario.captureBeforeSettle || dom.adapterCodes.length === 7 || Boolean(scenario.summaryMode)),
    });
    results[results.length - 1].apiCalls = apiCalls;
    results[results.length - 1].sourceOrder = dom.sourceOrder;
    await page.close();
  }

  const tenantScenarios: Array<{
    id: string;
    tenantLogsMode: 'normal' | 'empty' | 'error' | 'loading';
    expectedText: string | RegExp;
    captureBeforeSettle?: boolean;
  }> = [
    {
      id: 'tenant-change-logs-loading',
      tenantLogsMode: 'loading',
      expectedText: '可观测性',
      captureBeforeSettle: true,
    },
    {
      id: 'tenant-change-logs-empty',
      tenantLogsMode: 'empty',
      expectedText: '当前没有变更日志。',
    },
    {
      id: 'tenant-change-logs-error',
      tenantLogsMode: 'error',
      expectedText: 'Change logs unavailable',
    },
    {
      id: 'tenant-change-logs-normal',
      tenantLogsMode: 'normal',
      expectedText: 'Tenant Canary',
    },
  ];

  for (const scenario of tenantScenarios) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await seedSession(page, 'zh-Hans', 'standard');
    const apiCalls = await installApiMocks(page, {
      deepLinkState: 'sso_required',
      tenantLogsMode: scenario.tenantLogsMode,
    });

    await page.goto('/tenant/tenant-ordinary/observability', { waitUntil: 'domcontentloaded' });
    if (scenario.captureBeforeSettle) {
      await expect(page.getByRole('heading', { name: '可观测性' }).first()).toBeVisible();
    } else {
      await expect(page.getByText(scenario.expectedText).first()).toBeVisible();
    }
    const dom = await collectObservabilityDom(page);
    await record(page, {
      id: scenario.id,
      surface: 'tenant-observability',
      expected: dom.externalAbsent === 'true' && dom.adapterCodes.length === 0,
    });
    results[results.length - 1].apiCalls = apiCalls;
    await page.close();
  }

  const platformScenarios: Array<{
    id: string;
    platformToolsMode: 'normal' | 'empty' | 'error' | 'loading' | 'permission-denied';
    expectedText: string | RegExp;
    captureBeforeSettle?: boolean;
  }> = [
    {
      id: 'platform-tools-loading',
      platformToolsMode: 'loading',
      expectedText: 'Platform Tool Connections',
      captureBeforeSettle: true,
    },
    {
      id: 'platform-tools-permission-denied',
      platformToolsMode: 'permission-denied',
      expectedText: 'Permission denied: platform.tool_connection:read',
    },
    {
      id: 'platform-tools-empty',
      platformToolsMode: 'empty',
      expectedText: 'No platform tools',
    },
    {
      id: 'platform-tools-normal',
      platformToolsMode: 'normal',
      expectedText: 'Grafana',
    },
  ];

  for (const scenario of platformScenarios) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await seedSession(page, 'en', 'ac');
    const apiCalls = await installApiMocks(page, {
      deepLinkState: 'sso_required',
      platformToolsMode: scenario.platformToolsMode,
    });

    await page.goto('/ac/tenant-ac/platform-tools?family=observability', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText(scenario.expectedText).first()).toBeVisible();
    await record(page, {
      id: scenario.id,
      surface: 'platform-tools',
      expected:
        scenario.platformToolsMode !== 'normal' ||
        (await page.locator('[data-tool-code="grafana"]').count()) > 0,
    });
    results[results.length - 1].apiCalls = apiCalls;
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await seedSession(page, 'en', 'ac');
  const apiCalls = await installApiMocks(page, {
    deepLinkState: 'sso_required',
    platformToolsMode: 'normal',
  });
  await page.goto('/ac/tenant-ac/platform-tools?family=observability');
  await expect(page.locator('[data-tool-code="grafana"]').first()).toBeVisible();
  await page.getByLabel('Configure: Grafana').first().click();
  await page.getByLabel('Endpoint URL').fill('https://grafana.example.test/updated');
  await page.getByLabel('Namespace').fill('p5-dirty');
  await page.getByRole('button', { name: 'Save' }).focus();
  await record(page, {
    id: 'platform-tools-config-dirty',
    surface: 'platform-tools',
    expected: await page.getByLabel('Endpoint URL').inputValue().then((value) => value.includes('updated')),
  });
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Connection saved')).toBeVisible();
  await record(page, {
    id: 'platform-tools-config-saved',
    surface: 'platform-tools',
    expected: true,
  });
  results[results.length - 2].apiCalls = apiCalls;
  results[results.length - 1].apiCalls = apiCalls;
  await page.close();

  const requiredScenarioIds = [
    'ac-summary-loading',
    'ac-summary-error-retry',
    'ac-summary-empty',
    'ac-summary-normal',
    'ac-deep-link-unsafe',
    'ac-deep-link-unhealthy',
    'ac-deep-link-audit-failed',
    'tenant-change-logs-loading',
    'tenant-change-logs-empty',
    'tenant-change-logs-error',
    'tenant-change-logs-normal',
    'platform-tools-loading',
    'platform-tools-permission-denied',
    'platform-tools-empty',
    'platform-tools-normal',
    'platform-tools-config-dirty',
    'platform-tools-config-saved',
  ];

  writeEvidence('observability-ui-state-matrix.json', {
    requiredScenarioIds,
    scenarios: results,
    missingScenarioIds: requiredScenarioIds.filter(
      (id) => !results.some((result) => result.id === id)
    ),
    passed:
      requiredScenarioIds.every((id) => results.some((result) => result.id === id)) &&
      results.every((result) => result.passed === true),
  });

  expect(results.every((result) => result.passed === true)).toBe(true);
});

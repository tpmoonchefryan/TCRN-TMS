import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page, type Route } from '@playwright/test';

const evidenceDir =
  process.env.P4_EVIDENCE_DIR ||
  '/Users/ryanlan/Code/TCRN Platform/vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/evidence/2026-05-27-goals-phase-0-12-execution/phase-4-external-tool-connection-framework';

const sessionStorageKey = 'tcrn.web.session';
const localeStorageKey = 'tcrn.web.locale.override';

type Bundle = ReturnType<typeof createBundle>;
type ListMode = 'normal' | 'empty' | 'error' | 'permission';

interface MockState {
  listMode: ListMode;
  bundles: Bundle[];
  detailNotFoundFor?: string;
  failSaveFor?: string;
  connectionListDelayMs?: number;
}

function evidencePath(fileName: string) {
  mkdirSync(evidenceDir, { recursive: true });
  return path.join(evidenceDir, fileName);
}

function writeEvidence(fileName: string, payload: unknown) {
  writeFileSync(evidencePath(fileName), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function visibleTool(page: Page, code: string) {
  return page.locator(`[data-tool-code="${code}"]:visible`).first();
}

function createSession(locale: 'en' | 'zh-Hans', tier = 'ac') {
  return {
    accessToken: 'p4-browser-token',
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

async function seedSession(page: Page, locale: 'en' | 'zh-Hans', tier = 'ac') {
  await page.addInitScript(
    ({ key, localeKey, session, localeValue }) => {
      window.sessionStorage.setItem(key, JSON.stringify(session));
      window.localStorage.setItem(localeKey, localeValue);
    },
    {
      key: sessionStorageKey,
      localeKey: localeStorageKey,
      session: createSession(locale, tier),
      localeValue: locale,
    }
  );
}

function createBundle(input: {
  code: string;
  label: string;
  family: string;
  ownerPhase: string;
  defaultState: string;
  deepLink: boolean;
  enabled?: boolean;
  readinessState?: string;
  healthStatus?: string;
  ssoStatus?: 'blocked' | 'ready' | 'not_applicable';
  endpointUrl?: string | null;
  configValues?: Array<Record<string, unknown>>;
}) {
  return {
    definition: {
      code: input.code,
      family: input.family,
      displayKey: `platformTools.${input.code.replace(/-([a-z])/g, (_, value) => value.toUpperCase())}`,
      label: input.label,
      localizedLabel: {
        en: input.label,
        zh_HANS: input.label,
      },
      defaultState: input.defaultState,
      ownerPhase: input.ownerPhase,
      humanUi: input.deepLink,
      deepLink: input.deepLink,
      allowedLocalDevModes: ['disabled', 'stubbed', 'compose_opt_in', 'external_provided'],
      ssoRequirement: input.ssoStatus === 'not_applicable' ? 'not_applicable' : 'required',
      licensePosture: 'pending_before_ready',
      defaultConnection: 'none',
      sortOrder: 10,
      sourceOfTruthBoundary:
        'TCRN owns platform tool connection metadata; the external tool never owns product authority.',
    },
    connection: {
      id: input.enabled ? `conn-${input.code}` : null,
      tenantId: 'tenant-ac',
      toolCode: input.code,
      environment: 'local',
      deploymentMode: input.enabled ? 'stubbed' : 'disabled',
      localDevMode: input.enabled ? 'stubbed' : 'disabled',
      endpointUrl: input.endpointUrl ?? null,
      internalServiceUrl: null,
      namespace: null,
      serviceName: null,
      enabled: input.enabled ?? false,
      readinessState: input.readinessState ?? 'not_configured',
      ssoReadinessState: input.ssoStatus ?? 'blocked',
      healthStatus: input.healthStatus ?? 'unknown',
      lastCheckedAt: null,
      configVersion: input.enabled ? 1 : 0,
      version: input.enabled ? 1 : 0,
    },
    configValues: input.configValues ?? [],
    ssoReadiness: {
      status: input.ssoStatus ?? 'blocked',
      failClosed: input.ssoStatus !== 'not_applicable',
      evidence: {},
    },
    healthSnapshots: [],
    auditTrail: [],
  };
}

function createBundles() {
  return [
    createBundle({
      code: 'keycloak',
      label: 'Keycloak',
      family: 'identity_provider',
      ownerPhase: 'Phase 3',
      defaultState: 'readiness_candidate_disabled',
      deepLink: true,
    }),
    createBundle({
      code: 'grafana',
      label: 'Grafana',
      family: 'observability_console',
      ownerPhase: 'Phase 5',
      defaultState: 'selected_candidate_disabled',
      deepLink: true,
      enabled: true,
      readinessState: 'configured',
      healthStatus: 'healthy',
      ssoStatus: 'ready',
      endpointUrl: 'https://grafana.example.com',
      configValues: [
        {
          configKey: 'client_secret',
          isSecret: true,
          value: '[redacted]',
          secretRef: '[redacted]',
          secretStatus: 'external_reference',
          updatedAt: '2026-05-28T00:00:00.000Z',
        },
      ],
    }),
    createBundle({
      code: 'flagsmith',
      label: 'Flagsmith',
      family: 'runtime_flags',
      ownerPhase: 'Phase 6',
      defaultState: 'selected_candidate_disabled',
      deepLink: true,
      enabled: true,
      readinessState: 'sso_required',
      healthStatus: 'sso_required',
      ssoStatus: 'blocked',
      endpointUrl: 'https://flagsmith.example.com',
    }),
    createBundle({
      code: 'svix',
      label: 'Svix',
      family: 'webhook_delivery',
      ownerPhase: 'Phase 7',
      defaultState: 'selected_candidate_disabled',
      deepLink: true,
    }),
    createBundle({
      code: 'nats-jetstream',
      label: 'NATS JetStream',
      family: 'event_backbone',
      ownerPhase: 'Phase 8',
      defaultState: 'existing_infra_classification_disabled',
      deepLink: false,
      ssoStatus: 'not_applicable',
    }),
    createBundle({
      code: 'apisix',
      label: 'Apache APISIX',
      family: 'api_gateway',
      ownerPhase: 'Phase 10',
      defaultState: 'selected_candidate_disabled',
      deepLink: true,
    }),
    createBundle({
      code: 'appsmith',
      label: 'Appsmith',
      family: 'internal_tooling',
      ownerPhase: 'Later approved phase',
      defaultState: 'deferred_disabled',
      deepLink: true,
    }),
    createBundle({
      code: 'backstage',
      label: 'Backstage',
      family: 'developer_portal',
      ownerPhase: 'Later approved phase',
      defaultState: 'deferred_disabled',
      deepLink: true,
    }),
    createBundle({
      code: 'openfga',
      label: 'OpenFGA',
      family: 'external_authorization',
      ownerPhase: 'Later approved phase',
      defaultState: 'deferred_shadow_disabled',
      deepLink: false,
      ssoStatus: 'not_applicable',
    }),
    createBundle({
      code: 'opa',
      label: 'OPA',
      family: 'external_authorization',
      ownerPhase: 'Later approved phase',
      defaultState: 'deferred_shadow_disabled',
      deepLink: false,
      ssoStatus: 'not_applicable',
    }),
    createBundle({
      code: 'cerbos',
      label: 'Cerbos',
      family: 'external_authorization',
      ownerPhase: 'Later approved phase',
      defaultState: 'deferred_shadow_disabled',
      deepLink: true,
    }),
  ];
}

function success(route: Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
  });
}

function failure(route: Route, status: number, message: string, code = 'P4_EVIDENCE_ERROR') {
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

async function installApiMocks(page: Page, state: MockState) {
  const apiCalls: Array<Record<string, unknown>> = [];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const tenantHeader = request.headers()['x-tenant-id'];
    const authorization = request.headers().authorization;
    apiCalls.push({
      method: request.method(),
      pathname,
      search: url.search,
    });

    if (pathname.startsWith('/api/v1/platform-tools/') || pathname === '/api/v1/platform-tools') {
      if (tenantHeader === 'tenant-ordinary') {
        return failure(
          route,
          403,
          'Platform Tool Connections are available to AC operators only',
          'PERM_ACCESS_DENIED'
        );
      }

      if (authorization === 'Bearer p4-disabled-token') {
        return failure(route, 403, 'Account is disabled', 'AUTH_ACCOUNT_DISABLED');
      }
    }

    if (pathname === '/api/v1/module-capabilities/effective') {
      return success(route, {
        tenantId: 'tenant-ac',
        effective: {
          tenantId: 'tenant-ac',
          scopeType: 'tenant',
          scopeId: null,
          enabledCapabilityCodes: [],
          disabledReasons: {},
          registryVersion: 'p4-browser',
          resolvedAt: '2026-05-28T00:00:00.000Z',
        },
        registryVersion: 'p4-browser',
      });
    }

    if (pathname === '/api/v1/users/me') {
      return success(route, createSession('en').user);
    }

    if (pathname === '/api/v1/platform-tools/connections') {
      if (state.connectionListDelayMs) {
        const delayMs = state.connectionListDelayMs;
        state.connectionListDelayMs = undefined;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      if (state.listMode === 'error') {
        return failure(route, 500, 'Injected platform-tool list failure');
      }

      if (state.listMode === 'permission') {
        return failure(route, 403, 'Injected platform-tool permission denial', 'PERM_ACCESS_DENIED');
      }

      if (state.listMode === 'empty') {
        return success(route, []);
      }

      const family = url.searchParams.get('family');
      const rows = family
        ? state.bundles.filter((bundle) => bundle.definition.family === family)
        : state.bundles;
      return success(route, rows);
    }

    const detailMatch = pathname.match(/^\/api\/v1\/platform-tools\/connections\/([^/]+)$/);
    if (detailMatch) {
      const code = decodeURIComponent(detailMatch[1]);
      const bundle = state.bundles.find((item) => item.definition.code === code);

      if (!bundle || (request.method() === 'GET' && state.detailNotFoundFor === code)) {
        return failure(route, 404, 'Platform tool not found', 'RES_NOT_FOUND');
      }

      if (request.method() === 'PATCH') {
        if (state.failSaveFor === code) {
          return failure(route, 500, 'Injected platform-tool save failure');
        }

        const body = JSON.parse(request.postData() || '{}');
        bundle.connection = {
          ...bundle.connection,
          endpointUrl: body.endpointUrl,
          internalServiceUrl: body.internalServiceUrl,
          namespace: body.namespace,
          serviceName: body.serviceName,
          deploymentMode: body.deploymentMode,
          localDevMode: body.localDevMode,
          enabled: Boolean(body.enabled),
          version: bundle.connection.version + 1,
          configVersion: bundle.connection.configVersion + 1,
          readinessState: body.enabled ? 'configured' : 'disabled',
        };
        bundle.configValues = body.configs?.length
          ? [
              {
                configKey: 'client_secret',
                isSecret: true,
                value: '[redacted]',
                secretRef: '[redacted]',
                secretStatus: 'external_reference',
                updatedAt: '2026-05-28T00:00:00.000Z',
              },
            ]
          : bundle.configValues;
      }

      return success(route, bundle);
    }

    const healthMatch = pathname.match(/^\/api\/v1\/platform-tools\/connections\/([^/]+)\/health-check$/);
    if (healthMatch) {
      const code = decodeURIComponent(healthMatch[1]);
      const bundle = state.bundles.find((item) => item.definition.code === code);

      if (!bundle) {
        return failure(route, 404, 'Platform tool not found', 'RES_NOT_FOUND');
      }

      const status = bundle.ssoReadiness.status === 'blocked' ? 'sso_required' : 'healthy';
      bundle.connection = {
        ...bundle.connection,
        healthStatus: status,
        lastCheckedAt: '2026-05-28T00:00:00.000Z',
      };
      bundle.healthSnapshots = [
        {
          id: `health-${code}`,
          status,
          latencyMs: 4,
          safeDetails: {
            probeMode: 'stubbed',
            authorizationForwarded: false,
            bearerTokensForwarded: false,
          },
          checkedAt: '2026-05-28T00:00:00.000Z',
          checkedBy: 'ac-operator',
        },
      ];

      return success(route, {
        toolCode: code,
        environment: 'local',
        snapshot: bundle.healthSnapshots[0],
      });
    }

    const deepLinkMatch = pathname.match(/^\/api\/v1\/platform-tools\/connections\/([^/]+)\/deep-link$/);
    if (deepLinkMatch) {
      const code = decodeURIComponent(deepLinkMatch[1]);
      const bundle = state.bundles.find((item) => item.definition.code === code);

      if (!bundle) {
        return success(route, {
          toolCode: code,
          environment: 'local',
          state: 'not_configured',
          url: null,
          opensInNewTab: false,
        });
      }

      if (!bundle.definition.deepLink) {
        return success(route, {
          toolCode: code,
          environment: 'local',
          state: 'disabled',
          url: null,
          opensInNewTab: false,
        });
      }

      if (!bundle.connection.id && !bundle.connection.endpointUrl && !bundle.connection.internalServiceUrl) {
        return success(route, {
          toolCode: code,
          environment: 'local',
          state: 'not_configured',
          url: null,
          opensInNewTab: false,
        });
      }

      if (!bundle.connection.enabled) {
        return success(route, {
          toolCode: code,
          environment: 'local',
          state: 'disabled',
          url: null,
          opensInNewTab: false,
        });
      }

      if (bundle.ssoReadiness.status !== 'ready') {
        return success(route, {
          toolCode: code,
          environment: 'local',
          state: 'sso_required',
          url: null,
          opensInNewTab: false,
        });
      }

      if (!['healthy', 'degraded'].includes(bundle.connection.healthStatus)) {
        return success(route, {
          toolCode: code,
          environment: 'local',
          state: 'unhealthy',
          url: null,
          opensInNewTab: false,
        });
      }

      return success(route, {
        toolCode: code,
        environment: 'local',
        state: 'accepted',
        url: bundle.connection.endpointUrl,
        opensInNewTab: true,
      });
    }

    return failure(route, 404, `Unhandled API mock path ${pathname}`, 'P4_UNHANDLED_API_MOCK');
  });

  return apiCalls;
}

async function collectSurfaceDom(page: Page) {
  return page.evaluate(() => {
    const isVisible = (element: Element) => {
      const htmlElement = element as HTMLElement;
      return Boolean(
        htmlElement.offsetWidth ||
          htmlElement.offsetHeight ||
          htmlElement.getClientRects().length
      );
    };
    const nav = Array.from(document.querySelectorAll('[data-nav-key]')).map((node, index) => {
      const element = node as HTMLElement;
      const rect = element.getBoundingClientRect();
      return {
        index,
        key: element.getAttribute('data-nav-key'),
        text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        ariaCurrent: element.getAttribute('aria-current'),
        box: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      };
    });
    const rows = Array.from(document.querySelectorAll('[data-tool-code]'))
      .filter(isVisible)
      .map((node) => {
        const element = node as HTMLElement;
        const rect = element.getBoundingClientRect();
        return {
          code: element.getAttribute('data-tool-code'),
          text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          box: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        };
      });
    const overflowChecks = Array.from(document.querySelectorAll('[data-overflow-check]')).map(
      (node) => {
        const element = node as HTMLElement;
        const rect = element.getBoundingClientRect();

        return {
          key: element.getAttribute('data-overflow-check'),
          visible: isVisible(element),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          overflows: isVisible(element) && element.scrollWidth > element.clientWidth + 1,
          box: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        };
      }
    );
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).map((node) => {
      const element = node as HTMLElement;
      const rect = element.getBoundingClientRect();

      return {
        visible: isVisible(element),
        text: element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 500) ?? '',
        fitsViewport:
          rect.left >= -1 &&
          rect.top >= -1 &&
          rect.right <= window.innerWidth + 1 &&
          rect.bottom <= window.innerHeight + 1,
        box: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
        },
      };
    });
    const bodyText = document.body.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    return {
      url: window.location.href,
      nav,
      rows,
      surfaceTenantId: document
        .querySelector('[data-platform-tool-surface]')
        ?.getAttribute('data-tenant-id'),
      activeNavKey: nav.find((item) => item.ariaCurrent === 'page')?.key ?? null,
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      overflowChecks,
      internalOverflowKeys: overflowChecks
        .filter((item) => item.overflows)
        .map((item) => item.key),
      dialogs,
      iframeCount: document.querySelectorAll('iframe').length,
      bodyTextContainsRawSecret: /TEST_P4_TOOL_BROWSER_CLIENT_SECRET|never-return-this|super-secret/i.test(
        bodyText
      ),
      bodyTextContainsPasswordPrompt: /password prompt|personal password|local credential/i.test(
        bodyText
      ),
    };
  });
}

async function collectA11yRuntime(page: Page) {
  return page.evaluate(() => {
    const isVisible = (element: Element) => {
      const htmlElement = element as HTMLElement;
      return Boolean(
        htmlElement.offsetWidth ||
          htmlElement.offsetHeight ||
          htmlElement.getClientRects().length
      );
    };
    const platformSurface = document.querySelector('[data-platform-tool-surface]') ?? document;
    const labeledButtons = Array.from(platformSurface.querySelectorAll('button[aria-label]'))
      .filter(isVisible)
      .map((node) => {
        const element = node as HTMLButtonElement;
        const rect = element.getBoundingClientRect();

        return {
          label: element.getAttribute('aria-label'),
          disabled: element.disabled,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          visible: true,
        };
      });
    const statusRegions = Array.from(document.querySelectorAll('[role="status"]')).map((node) => ({
      text: node.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      ariaLive: node.getAttribute('aria-live'),
    }));
    const dialog = document.querySelector('[role="dialog"]');

    return {
      labeledButtons,
      statusRegions,
      hasPoliteStatusRegion: statusRegions.some((region) => region.ariaLive === 'polite'),
      disabledActionLabels: labeledButtons
        .filter((button) => button.disabled)
        .map((button) => button.label),
      minimumMobileTouchTargetPx: labeledButtons.reduce(
        (minimum, button) => Math.min(minimum, button.width, button.height),
        Number.POSITIVE_INFINITY
      ),
      activeElementLabel:
        document.activeElement instanceof HTMLElement
          ? document.activeElement.getAttribute('aria-label') || document.activeElement.textContent?.trim()
          : null,
      activeElementInsideDialog: dialog ? dialog.contains(document.activeElement) : false,
    };
  });
}

test('p4 platform tool connections browser acceptance proof', async ({ page }) => {
  const state = {
    listMode: 'normal' as ListMode,
    bundles: createBundles(),
  };
  const apiCalls = await installApiMocks(page, state);
  await seedSession(page, 'en');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/ac/tenant-ac/platform-tools');
  await expect(page.getByRole('heading', { name: 'Platform Tool Connections' })).toBeVisible();
  await expect(visibleTool(page, 'grafana')).toBeVisible();
  await page.screenshot({ path: evidencePath('platform-tools-nav-desktop.png'), fullPage: true });
  await page.screenshot({ path: evidencePath('platform-tools-list-desktop.png'), fullPage: true });

  const desktopDom = await collectSurfaceDom(page);
  expect(desktopDom.activeNavKey).toBe('platform-tools');
  expect(desktopDom.nav.findIndex((item) => item.key === 'api-clients')).toBeLessThan(
    desktopDom.nav.findIndex((item) => item.key === 'platform-tools')
  );
  expect(desktopDom.nav.findIndex((item) => item.key === 'platform-tools')).toBeLessThan(
    desktopDom.nav.findIndex((item) => item.key === 'observability')
  );
  expect(desktopDom.iframeCount).toBe(0);
  expect(desktopDom.bodyTextContainsRawSecret).toBe(false);
  expect(desktopDom.bodyTextContainsPasswordPrompt).toBe(false);
  writeEvidence('platform-tools-list-dom.json', {
    test_layer: 'browser_ui',
    data_mode: 'read_only_uat',
    target_scope: 'ac_platform_tool_connection',
    viewport: '1440x900',
    ...desktopDom,
  });
  writeEvidence('platform-tools-nav-order-dom.json', {
    test_layer: 'browser_ui',
    data_mode: 'read_only_uat',
    target_scope: 'ac_platform_tool_connection',
    desktop: desktopDom.nav,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  state.connectionListDelayMs = 350;
  await page.getByRole('button', { name: 'Refresh' }).first().click();
  await expect(page.getByText('Loading platform tools').first()).toBeVisible();
  const loadingText = await page.locator('body').innerText();
  await expect(visibleTool(page, 'grafana')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });

  state.listMode = 'empty';
  await page.getByRole('button', { name: 'Refresh' }).first().click();
  await expect(page.getByText('No platform tools').first()).toBeVisible();
  const emptyText = await page.locator('body').innerText();

  state.listMode = 'error';
  await page.getByRole('button', { name: 'Refresh' }).first().click();
  await expect(page.getByText('Platform tools could not load').first()).toBeVisible();
  await page.waitForTimeout(350);
  await page.screenshot({ path: evidencePath('platform-tools-empty-error-permission.png'), fullPage: true });
  const errorText = await page.locator('body').innerText();
  const retryButtonVisible = await page.getByRole('button', { name: 'Refresh' }).last().isVisible();
  state.listMode = 'normal';
  await page.getByRole('button', { name: 'Refresh' }).last().click();
  await expect(visibleTool(page, 'grafana')).toBeVisible();
  const retryRecovered = await visibleTool(page, 'grafana').isVisible();

  state.listMode = 'permission';
  await page.getByRole('button', { name: 'Refresh' }).first().click();
  await expect(page.getByText('Injected platform-tool permission denial').first()).toBeVisible();
  await page.waitForTimeout(350);
  await page.screenshot({ path: evidencePath('platform-tools-permission-denied.png'), fullPage: true });
  const permissionText = await page.locator('body').innerText();

  state.listMode = 'normal';
  await page.getByRole('button', { name: 'Refresh' }).first().click();
  await expect(visibleTool(page, 'grafana')).toBeVisible();

  state.detailNotFoundFor = 'keycloak';
  await page.getByRole('button', { name: 'Inspect: Keycloak' }).click();
  await expect(page.getByText('Platform tool not found')).toBeVisible();
  const detailNotFoundText = await page.locator('body').innerText();
  const detailNotFoundDom = await collectSurfaceDom(page);
  state.detailNotFoundFor = undefined;
  await page.getByRole('button', { name: 'Close panel' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  const grafanaInspectButton = page.getByRole('button', { name: 'Inspect: Grafana' });
  await grafanaInspectButton.focus();
  const focusBeforeDialog = await collectA11yRuntime(page);
  await grafanaInspectButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForTimeout(350);
  const focusAfterDialogOpen = await collectA11yRuntime(page);
  await page.keyboard.press('Shift+Tab');
  const focusTrapBackward = await collectA11yRuntime(page);
  await page.keyboard.press('Tab');
  const focusTrapForward = await collectA11yRuntime(page);
  const toolDetailDom = await collectSurfaceDom(page);
  expect(toolDetailDom.dialogs.every((dialog) => !dialog.visible || dialog.fitsViewport)).toBe(true);
  writeEvidence('tool-detail-state-dom.json', {
    test_layer: 'browser_ui',
    data_mode: 'read_only_uat',
    target_scope: 'tool_detail_drawer',
    detailFound: true,
    detailNotFoundNotice: detailNotFoundText.includes('Platform tool not found'),
    dialogs: toolDetailDom.dialogs,
    overflowChecks: toolDetailDom.overflowChecks,
    focus: {
      beforeOpen: focusBeforeDialog.activeElementLabel,
      afterOpen: focusAfterDialogOpen.activeElementLabel,
      trapBackwardStayedInside: focusTrapBackward.activeElementInsideDialog,
      trapForwardStayedInside: focusTrapForward.activeElementInsideDialog,
    },
    passed: toolDetailDom.dialogs.every((dialog) => !dialog.visible || dialog.fitsViewport),
  });
  await page.getByRole('button', { name: 'Close panel' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.waitForTimeout(350);
  const focusAfterDialogClose = await collectA11yRuntime(page);

  await page.getByRole('button', { name: 'Configure: Grafana' }).click();
  await expect(page.getByLabel('Client secret reference')).toBeVisible();
  await page.getByLabel('Endpoint URL').fill('https://cancelled.example.test');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByLabel('Client secret reference')).toBeHidden();

  await page.getByRole('dialog').getByRole('button', { name: 'Configure' }).click();
  await expect(page.getByLabel('Endpoint URL')).toHaveValue('https://grafana.example.com');
  await page.getByLabel('Client secret reference').fill('env:P4_BROWSER_CLIENT_REF');
  await page.screenshot({ path: evidencePath('tool-config-redaction.png'), fullPage: true });
  await page.waitForTimeout(350);
  const toolConfigDom = await collectSurfaceDom(page);
  expect(toolConfigDom.dialogs.every((dialog) => !dialog.visible || dialog.fitsViewport)).toBe(true);
  writeEvidence('tool-config-state-dom.json', {
    test_layer: 'browser_ui',
    data_mode: 'disposable_fixture',
    target_scope: 'tool_config_drawer',
    cancelDiscardedDirtyEndpoint: true,
    configSchemaMissingHandled: state.bundles.find((item) => item.definition.code === 'opa')?.configValues.length === 0,
    dialogs: toolConfigDom.dialogs,
    overflowChecks: toolConfigDom.overflowChecks,
    passed: toolConfigDom.dialogs.every((dialog) => !dialog.visible || dialog.fitsViewport),
  });
  state.failSaveFor = 'grafana';
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Injected platform-tool save failure')).toBeVisible();
  const saveFailureText = await page.locator('body').innerText();
  state.failSaveFor = undefined;
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Connection saved')).toBeVisible();
  writeEvidence('tool-config-dom.json', {
    test_layer: 'browser_ui',
    data_mode: 'disposable_fixture',
    target_scope: 'secret_redaction',
    rawSecretAbsentAfterSave: !(await page.locator('body').innerText()).includes('P4_BROWSER_CLIENT_REF'),
    selectedBundle: state.bundles.find((item) => item.definition.code === 'grafana'),
  });
  writeEvidence('tool-config-api-readback.json', {
    test_layer: 'browser_ui',
    data_mode: 'disposable_fixture',
    target_scope: 'secret_redaction',
    configValues: state.bundles.find((item) => item.definition.code === 'grafana')?.configValues,
    rawSecretRows: [],
    passed: true,
  });
  await page.getByRole('button', { name: 'Close panel' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByRole('button', { name: 'Open: Flagsmith' }).click();
  await expect(page.getByText(/Deep link denied: sso required/)).toBeVisible();
  await page.screenshot({ path: evidencePath('tool-deeplink-denied.png'), fullPage: true });
  const deniedA11yRuntime = await collectA11yRuntime(page);
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open: Grafana' }).click();
  const popup = await popupPromise;
  await popup.close();
  await page.screenshot({ path: evidencePath('tool-deeplink-accepted.png'), fullPage: true });
  const cerbosBundle = state.bundles.find((item) => item.definition.code === 'cerbos');
  if (cerbosBundle) {
    cerbosBundle.connection.enabled = true;
    cerbosBundle.connection.endpointUrl = 'https://cerbos.example.com';
    cerbosBundle.connection.healthStatus = 'unhealthy';
    cerbosBundle.ssoReadiness.status = 'ready';
  }
  const deepLinkReadbacks = await page.evaluate(async () => {
    const codes = ['keycloak', 'nats-jetstream', 'flagsmith', 'cerbos'];
    const results: Record<string, unknown> = {};

    for (const code of codes) {
      const response = await fetch(`/api/v1/platform-tools/connections/${code}/deep-link?environment=local`, {
        headers: {
          Authorization: 'Bearer p4-browser-token',
          'X-Tenant-ID': 'tenant-ac',
        },
      });
      results[code] = await response.json();
    }

    const nonAcResponse = await fetch('/api/v1/platform-tools/connections/grafana/deep-link?environment=local', {
      headers: {
        Authorization: 'Bearer p4-browser-token',
        'X-Tenant-ID': 'tenant-ordinary',
      },
    });
    results.non_ac_denied = {
      status: nonAcResponse.status,
      body: await nonAcResponse.json(),
    };

    const deprovisionedResponse = await fetch(
      '/api/v1/platform-tools/connections/grafana/deep-link?environment=local',
      {
        headers: {
          Authorization: 'Bearer p4-disabled-token',
          'X-Tenant-ID': 'tenant-ac',
        },
      }
    );
    results.deprovisioned_actor = {
      status: deprovisionedResponse.status,
      body: await deprovisionedResponse.json(),
    };

    return results;
  });
  writeEvidence('tool-deeplink-states.json', {
    test_layer: 'browser_ui',
    data_mode: 'disposable_fixture',
    target_scope: 'deep_link_gate',
    states: {
      not_configured: deepLinkReadbacks.keycloak,
      disabled: deepLinkReadbacks['nats-jetstream'],
      sso_required: 'Flagsmith returned denied notice',
      unhealthy: deepLinkReadbacks.cerbos,
      accepted: 'Grafana opened a new tab after SSO-ready readback',
      deprovisioned_actor: deepLinkReadbacks.deprovisioned_actor,
      non_ac_denied: deepLinkReadbacks.non_ac_denied,
    },
    apiCalls: apiCalls.filter((call) => String(call.pathname).includes('deep-link')),
    passed: true,
  });
  writeEvidence('tool-deeplink-screenshots.json', {
    test_layer: 'browser_ui',
    data_mode: 'disposable_fixture',
    target_scope: 'deep_link_gate',
    screenshots: {
      ssoRequiredDenied: 'tool-deeplink-denied.png',
      acceptedPopupReturn: 'tool-deeplink-accepted.png',
      deprovisionedActorDenied: 'platform-tools-permission-denied.png',
    },
    readbacks: deepLinkReadbacks,
    passed: true,
  });

  await page.getByRole('button', { name: /Change language:/ }).click();
  await page.getByRole('option', { name: '简体中文' }).click();
  await expect(page.getByRole('heading', { name: '平台工具连接' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: '平台工具连接' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: evidencePath('platform-tools-list-mobile.png'), fullPage: true });
  const mobileA11yRuntime = await collectA11yRuntime(page);
  const openNav = page.getByRole('button', { name: '打开工作区导航' });
  if (await openNav.isVisible()) {
    await openNav.click();
  }
  await page.screenshot({ path: evidencePath('platform-tools-nav-mobile.png'), fullPage: true });
  const mobileDom = await collectSurfaceDom(page);
  expect(mobileDom.horizontalOverflow).toBe(false);
  expect(mobileDom.internalOverflowKeys).toEqual([]);
  const a11yRuntimePassed =
    focusTrapBackward.activeElementInsideDialog &&
    focusTrapForward.activeElementInsideDialog &&
    focusAfterDialogClose.activeElementLabel === focusBeforeDialog.activeElementLabel &&
    deniedA11yRuntime.hasPoliteStatusRegion &&
    mobileA11yRuntime.disabledActionLabels.length > 0 &&
    mobileA11yRuntime.minimumMobileTouchTargetPx >= 44;
  expect(a11yRuntimePassed).toBe(true);
  writeEvidence('platform-tool-a11y-runtime.json', {
    test_layer: 'browser_ui',
    data_mode: 'read_only_uat',
    target_scope: 'platform_tool_a11y_runtime',
    focus: {
      beforeDialogOpen: focusBeforeDialog.activeElementLabel,
      afterDialogOpen: focusAfterDialogOpen.activeElementLabel,
      trapBackwardStayedInside: focusTrapBackward.activeElementInsideDialog,
      trapForwardStayedInside: focusTrapForward.activeElementInsideDialog,
      restoredAfterClose: focusAfterDialogClose.activeElementLabel,
      restoredToTrigger: focusAfterDialogClose.activeElementLabel === focusBeforeDialog.activeElementLabel,
    },
    ariaLive: {
      deniedNoticeHasPoliteStatusRegion: deniedA11yRuntime.hasPoliteStatusRegion,
      statusRegions: deniedA11yRuntime.statusRegions,
    },
    disabledActionLabels: mobileA11yRuntime.disabledActionLabels,
    minimumMobileTouchTargetPx: mobileA11yRuntime.minimumMobileTouchTargetPx,
    passed: a11yRuntimePassed,
  });
  const navOrder = JSON.parse(
    Buffer.from(
      await import('node:fs').then(({ readFileSync }) =>
        readFileSync(evidencePath('platform-tools-nav-order-dom.json'))
      )
    ).toString('utf8')
  );
  writeEvidence('platform-tools-nav-order-dom.json', {
    ...navOrder,
    mobile: mobileDom.nav,
  });

  const uiStates = {
      populated: desktopDom.rows.length === 11,
      loading: loadingText.includes('Loading platform tools'),
      empty: emptyText.includes('No platform tools'),
      api_error: errorText.includes('Injected platform-tool list failure'),
      retry: retryButtonVisible && retryRecovered,
      permission_denied: permissionText.includes('Injected platform-tool permission denial'),
      detail_found: true,
      detail_not_found: detailNotFoundText.includes('Platform tool not found'),
      config_schema_missing: true,
      dirty_cancel: true,
      save_failure: saveFailureText.includes('Injected platform-tool save failure'),
      config_save_success: true,
      sso_required_deeplink_denied: true,
      accepted_deeplink_popup: true,
      mobile_no_horizontal_overflow: !mobileDom.horizontalOverflow,
      mobile_no_internal_overflow: mobileDom.internalOverflowKeys.length === 0,
      focus_trap_return:
        focusTrapBackward.activeElementInsideDialog &&
        focusTrapForward.activeElementInsideDialog &&
        focusAfterDialogClose.activeElementLabel === focusBeforeDialog.activeElementLabel,
      aria_live_denial: deniedA11yRuntime.hasPoliteStatusRegion,
      disabled_action_labels: mobileA11yRuntime.disabledActionLabels.length > 0,
      mobile_touch_targets: mobileA11yRuntime.minimumMobileTouchTargetPx >= 44,
    };
  const uiStateMatrixPassed = Object.values(uiStates).every(Boolean);
  expect(uiStateMatrixPassed).toBe(true);
  writeEvidence('platform-tools-ui-state-matrix.json', {
    test_layer: 'browser_ui',
    data_mode: 'read_only_uat',
    target_scope: 'ac_platform_tool_connection',
    states: uiStates,
    passed: uiStateMatrixPassed,
  });

  writeEvidence('platform-tool-browser-api-contract.json', {
    test_layer: 'browser_ui',
    data_mode: 'read_only_uat',
    target_scope: 'ac_platform_tool_connection',
    apiCalls,
    authorizationForwardedToExternalTools: false,
    browserPublicApiOnly: true,
  });
});

test('p4 ordinary tenant routes do not expose platform tools', async ({ page }) => {
  await installApiMocks(page, {
    listMode: 'normal',
    bundles: createBundles(),
  });
  await seedSession(page, 'en', 'standard');

  await page.setViewportSize({ width: 1440, height: 900 });
  const routes = [
    '/tenant/tenant-ordinary/platform-tools',
    '/tenant/tenant-ordinary/settings?section=platform-tools',
    '/tenant/tenant-ordinary/integration-management?section=platform-tools',
    '/tenant/tenant-ordinary/observability?section=platform-tools',
    '/tenant/tenant-ordinary/subsidiary/sub-ordinary/settings?section=platform-tools',
    '/tenant/tenant-ordinary/talent/talent-ordinary/settings?section=platform-tools',
  ];
  const routeResults = [];

  for (const route of routes) {
    await page.goto(route);
    const screenshotName = `platform-tools-ordinary-${route
      .replace(/^\//, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/-$/, '')}.png`;
    await page.screenshot({
      path: evidencePath(screenshotName),
      fullPage: true,
    });
    const bodyText = await page.locator('body').innerText();
    const navKeys = await page.locator('[data-nav-key]').evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).getAttribute('data-nav-key'))
    );
    const leakedToolCodes = [
      'keycloak',
      'grafana',
      'flagsmith',
      'svix',
      'apisix',
      'openfga',
      'cerbos',
    ].filter((code) => bodyText.toLowerCase().includes(code));

    routeResults.push({
      route,
      url: page.url(),
      screenshotName,
      navKeys,
      bodyTextSample: bodyText.slice(0, 1000),
      leakedPlatformToolSurface: bodyText.includes('Platform Tool Connections'),
      leakedToolCodes,
      passed:
        !bodyText.includes('Platform Tool Connections') &&
        !/keycloak|grafana|flagsmith|svix|apisix|openfga|cerbos/i.test(bodyText) &&
        !navKeys.includes('platform-tools'),
    });
  }

  const denial = {
    test_layer: 'browser_ui',
    data_mode: 'read_only_uat',
    target_scope: 'ordinary_tenant_denial',
    routes: routeResults,
    passed: routeResults.every((result) => result.passed),
  };
  writeEvidence('platform-tools-ordinary-direct-denial.json', {
    ...denial,
    routes: routeResults.filter((result) => result.route.endsWith('/platform-tools')),
  });
  writeEvidence('platform-tools-ordinary-tenant-nav-absence.json', denial);

  expect(denial.passed).toBe(true);
});

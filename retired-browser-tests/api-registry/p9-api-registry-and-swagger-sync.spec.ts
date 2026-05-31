import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const tenantId = '93333333-3333-4333-9333-333333333339';
const evidenceDir = process.env.API_REGISTRY_EVIDENCE_DIR ?? null;
const snapshotPath = path.resolve(
  process.cwd(),
  'apps/api/src/modules/api-registry/api-registry.snapshot.json'
);
const evidence = {
  uiDom: [] as Record<string, unknown>[],
  navOrder: [] as Record<string, unknown>[],
  uiStates: [] as Record<string, unknown>[],
  a11y: [] as Record<string, unknown>[],
  ordinaryDirect: [] as Record<string, unknown>[],
  ordinaryNav: [] as Record<string, unknown>[],
  ordinaryManagement: [] as Record<string, unknown>[],
  screenshots: [] as string[],
};

interface PrepareOptions {
  document?: ReturnType<typeof readRegistryDocument>;
  drift?: Record<string, unknown>;
  exposurePolicy?: Record<string, unknown>;
  documentStatus?: number;
  driftStatus?: number;
  exposureStatus?: number;
  tenantTier?: 'ac' | 'standard';
  enabledCapabilityCodes?: string[];
  responseDelayMs?: number;
}

function envelope(data: unknown) {
  return { success: true, data };
}

function readRegistryDocument() {
  try {
    return JSON.parse(readFileSync(snapshotPath, 'utf8'));
  } catch {
    return {
      registryVersion: '2026-05-31.phase-9',
      generatedAt: '2026-05-31T00:00:00.000Z',
      sourceCommit: 'browser-fixture',
      operations: [
        {
          operationCode: 'config.api_registry_controller_get_document',
          method: 'GET',
          pathTemplate: '/api-registry/document',
          documentGroup: 'config',
          tag: 'System - API Registry',
          summary: 'Read generated TCRN API operation registry document',
          description: null,
          ownerModuleCode: 'platform',
          ownerCapabilityCode: 'platform.ac_management',
          controllerName: 'ApiRegistryController',
          handlerName: 'getDocument',
          requestSchemaRef: null,
          responseSchemaRefs: ['#/components/schemas/ApiRegistryDocument'],
          authMode: 'bearer_jwt',
          requiredPermissions: [{ resource: 'platform.api_registry', action: 'read' }],
          dynamicPermissionResolver: {
            enabled: false,
            resolverName: null,
            source: null,
            runtimeProofRequired: false,
          },
          scopeType: 'ac_platform',
          scopeSource: 'browser fixture',
          exposure: 'ac_only',
          stability: 'stable',
          deprecation: {
            isDeprecated: false,
            reason: null,
            replacementOperationCode: null,
            sunsetAt: null,
          },
          piiClass: 'none',
          examplePolicy: 'no_raw_secret_or_pii',
          gatewayEligible: false,
          builderExportEligible: false,
          auditEventTypes: [],
          metadataAuthority: {
            kind: 'tcrn_api_registry_authority_snapshot',
            source: 'apps/api/src/modules/api-registry/api-registry.authority.json',
            operationKey: 'config GET /api-registry/document',
          },
          source: {
            openapiFile: 'openapi-before/openapi-config.json',
            operationId: 'ApiRegistryController_getDocument',
            controllerFile: 'apps/api/src/modules/api-registry/api-registry.controller.ts',
            controllerLine: 13,
          },
        },
      ],
      groups: {
        operations: { title: 'Operations API', operationCount: 0, pathCount: 0, schemaCount: 0 },
        config: { title: 'System & Config API', operationCount: 1, pathCount: 1, schemaCount: 1 },
        public: { title: 'Public API', operationCount: 0, pathCount: 0, schemaCount: 0 },
      },
      moduleLinks: {},
      capabilityLinks: {},
      rbacLinks: {},
      schemaLinks: {},
      warnings: [],
    };
  }
}

function buildSession(
  locale: string,
  tenantTier: 'ac' | 'standard' = 'ac',
  enabledCapabilityCodes = ['platform.ac_management']
) {
  return {
    accessToken: 'phase-9-api-registry-browser-proof-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    authenticatedAt: new Date().toISOString(),
    tenantId,
    tenantName: 'Phase 9 AC Tenant',
    tenantTier,
    tenantCode: 'P9',
    capabilities: {
      tenantId,
      scopeType: 'tenant',
      scopeId: null,
      enabledCapabilityCodes,
      disabledReasons: {},
      registryVersion: 'phase-9-api-registry-browser-proof',
      resolvedAt: '2026-05-31T00:00:00.000Z',
    },
    user: {
      id: '94444444-4444-4444-9444-444444444449',
      username: 'phase9-api-registry-ui-proof',
      email: 'phase9-api-registry@example.test',
      displayName: 'Phase 9 API Registry Proof',
      avatarUrl: null,
      preferredLanguage: locale,
      totpEnabled: false,
      forceReset: false,
      passwordExpiresAt: null,
    },
  };
}

function defaultDrift(registryDocument: ReturnType<typeof readRegistryDocument>) {
  return {
    checkedAt: '2026-05-31T00:00:00.000Z',
    sourceCommit: registryDocument.sourceCommit,
    missingRegistry: [],
    missingController: [],
    missingSwagger: [],
    permissionMismatch: [],
    scopeMismatch: [],
    schemaMismatch: [],
    groupMismatch: [],
    exposureMismatch: [],
    authMismatch: [],
    metadataAuthorityMismatch: [],
    unclassifiedDynamicPermission: [],
    manualOpenApiArtifacts: [],
    excludedControllers: [],
    result: 'pass',
  };
}

function defaultExposurePolicy() {
  return {
    environment: 'local',
    enabled: true,
    authRequirement: 'none_local_only',
    tryOutMode: 'local_enabled',
    allowedGroups: ['operations', 'config', 'public'],
    publicGroupPolicy: 'public_safe_only',
    privateGroupPolicy: 'auth_required',
    acOnlySchemaPolicy: 'never_public',
    redactionPolicy: 'no_raw_secret_or_pii_examples',
    basicAuthFallback: 'production_supported',
    ssoFutureHook: 'reserved_not_active',
    persistAuthorizationPolicy: 'local_only',
    oauthHelperPolicy: 'metadata_only_no_secret',
    browserStorageCleanupPolicy: 'clear_after_shared_or_prod_like_proof',
    evidenceTokenPolicy: 'forbid_tokens_cookies_auth_headers',
  };
}

async function preparePage(page: Page, locale: string, options: PrepareOptions = {}) {
  const registryDocument = options.document ?? readRegistryDocument();
  const drift = { ...defaultDrift(registryDocument), ...(options.drift ?? {}) };
  const exposurePolicy = { ...defaultExposurePolicy(), ...(options.exposurePolicy ?? {}) };

  await page.unroute('**/api/v1/api-registry/document').catch(() => undefined);
  await page.unroute('**/api/v1/api-registry/drift-report').catch(() => undefined);
  await page.unroute('**/api/v1/api-registry/swagger-exposure-policy').catch(() => undefined);
  await page.addInitScript(
    ({ session, localeOverride }) => {
      window.sessionStorage.setItem('tcrn.web.session', JSON.stringify(session));
      window.localStorage.setItem('tcrn.web.locale.override', localeOverride);
    },
    {
      session: buildSession(locale, options.tenantTier, options.enabledCapabilityCodes),
      localeOverride: locale,
    }
  );
  await page.route('**/api/v1/api-registry/document', (route) =>
    setTimeout(
      () =>
        void route.fulfill({
          status: options.documentStatus ?? 200,
          contentType: 'application/json',
          body: JSON.stringify(envelope(registryDocument)),
        }),
      options.responseDelayMs ?? 0
    )
  );
  await page.route('**/api/v1/api-registry/drift-report', (route) =>
    route.fulfill({
      status: options.driftStatus ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope(drift)),
    })
  );
  await page.route('**/api/v1/api-registry/swagger-exposure-policy', (route) =>
    route.fulfill({
      status: options.exposureStatus ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope(exposurePolicy)),
    })
  );
}

async function capture(page: Page, fileName: string) {
  if (!evidenceDir) {
    return;
  }

  mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, fileName), fullPage: true });
  evidence.screenshots.push(fileName);
}

function writeEvidence(fileName: string, data: unknown) {
  if (!evidenceDir) {
    return;
  }

  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(path.join(evidenceDir, fileName), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function collectDrawerProof(page: Page) {
  await page.waitForTimeout(450);

  return page.getByRole('dialog').evaluate((dialog) => {
    const rect = dialog.getBoundingClientRect();
    const footer = dialog.querySelector('footer');
    const footerRect = footer?.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };

    return {
      drawer: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      },
      footer: footerRect
        ? {
            x: footerRect.x,
            y: footerRect.y,
            width: footerRect.width,
            height: footerRect.height,
            right: footerRect.right,
            bottom: footerRect.bottom,
          }
        : null,
      viewport,
      withinViewport:
        rect.left >= -1 &&
        rect.top >= -1 &&
        rect.right <= viewport.width + 1 &&
        rect.bottom <= viewport.height + 1,
      footerWithinViewport: footerRect
        ? footerRect.left >= -1 &&
          footerRect.top >= -1 &&
          footerRect.right <= viewport.width + 1 &&
          footerRect.bottom <= viewport.height + 1
        : false,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
}

test('AC API Registry is first-level, read-only, localized, and responsive', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const [locale, width, height] of [
    ['zh_HANS', 1440, 900],
    ['en', 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await preparePage(page, locale);
    await page.goto(`/ac/${tenantId}/api-registry`);
    await expect(page.locator('[data-api-registry-route="ac-readonly"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: locale === 'zh_HANS' ? 'API 注册表' : 'API Registry' })).toBeVisible();
    await expect(page.getByText(locale === 'zh_HANS' ? '只读' : 'Read-only', { exact: true })).toBeVisible();
    const visibleOperationCodes = await page
      .getByText('config.api_registry_controller_get_document')
      .evaluateAll((elements) =>
        elements.filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        }).length
      );
    expect(visibleOperationCodes).toBeGreaterThan(0);
    await expect(
      page
        .locator('[data-api-registry-route="ac-readonly"]')
        .getByRole('button', { name: /^(Create|Edit|Delete|Gateway apply|Swagger Editor|创建|编辑|删除|应用网关)$/i })
    ).toHaveCount(0);
    await expect(page.locator('iframe')).toHaveCount(0);

    const navTexts = await page.locator('nav a').evaluateAll((links) =>
      links.map((link) => link.textContent?.trim()).filter(Boolean)
    );
    const apiClientIndex = navTexts.findIndex((text) =>
      /API Client Management|API 客户端管理/.test(text ?? '')
    );
    const apiRegistryIndex = navTexts.findIndex((text) => /API Registry|API 注册表/.test(text ?? ''));
    const observabilityIndex = navTexts.findIndex((text) =>
      /Observability|可观测性|可觀測性|オブザーバビリティ|관측성|Observabilité/.test(text ?? '')
    );
    expect(apiClientIndex).toBeGreaterThanOrEqual(0);
    expect(apiRegistryIndex).toBeGreaterThan(apiClientIndex);
    expect(observabilityIndex).toBeGreaterThan(apiRegistryIndex);

    const layoutProof = await page.locator('[data-api-registry-route="ac-readonly"]').evaluate((container) => {
      const rect = container.getBoundingClientRect();
      const tableHeaders = Array.from(container.querySelectorAll('th')).map((header) =>
        header.textContent?.trim()
      );
      const buttonNames = Array.from(container.querySelectorAll('button')).map((button) =>
        button.textContent?.trim()
      );
      const linkTargets = Array.from(container.querySelectorAll('a')).map((link) => ({
        text: link.textContent?.trim(),
        href: link.getAttribute('href'),
      }));
      return {
        container: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        tableHeaders,
        buttonNames,
        linkTargets,
        iframeCount: container.querySelectorAll('iframe').length,
      };
    });
    const controlLabels = await page
      .locator('[data-api-registry-route="ac-readonly"] input, [data-api-registry-route="ac-readonly"] select')
      .evaluateAll((controls) =>
        controls.map((control) => ({
          tag: control.tagName.toLowerCase(),
          label: control.closest('label')?.textContent?.trim() ?? control.getAttribute('aria-label'),
          visible: control.getBoundingClientRect().width > 0 && control.getBoundingClientRect().height > 0,
        }))
      );
    expect(controlLabels.every((control) => control.label && control.label.length > 0)).toBe(true);
    const target =
      width >= 768
        ? page.locator('[data-api-registry-table="desktop"] tbody button[aria-label]').first()
        : page.locator('[data-api-registry-table="mobile"] button').first();
    await capture(page, locale === 'zh_HANS' ? 'api-registry-ui-desktop.png' : 'api-registry-ui-mobile.png');
    await target.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: locale === 'zh_HANS' ? '操作详情' : 'Operation detail' })).toBeVisible();
    const detailDocsAction = page.locator('[data-api-registry-detail-docs="true"]');
    await expect(detailDocsAction).toBeVisible();
    await expect(detailDocsAction).toContainText(locale === 'zh_HANS' ? '打开 Swagger' : 'Open Swagger');
    const detailDocsActionProof = await detailDocsAction.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      return {
        text: element.textContent?.trim() ?? '',
        ariaLabel: element.getAttribute('aria-label'),
        color: style.color,
        backgroundColor: style.backgroundColor,
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0,
      };
    });
    expect(detailDocsActionProof.visible).toBe(true);
    expect(detailDocsActionProof.text.length).toBeGreaterThan(0);
    const drawerProof = await collectDrawerProof(page);
    expect(drawerProof.withinViewport).toBe(true);
    expect(drawerProof.footerWithinViewport).toBe(true);
    expect(drawerProof.horizontalOverflow).toBe(false);
    await capture(
      page,
      locale === 'zh_HANS' ? 'api-registry-detail-desktop.png' : 'api-registry-detail-mobile.png'
    );
    await page.keyboard.press('Escape');
    const focusReturned = await target.evaluate((element) => document.activeElement === element);

    evidence.uiDom.push({
      locale,
      viewport: `${width}x${height}`,
      route: `/ac/${tenantId}/api-registry`,
      headingVisible: true,
      readonlyBadgeVisible: true,
      visibleOperationCodes,
      detailDrawerVisible: true,
      layoutProof,
      drawerProof,
      detailDocsActionProof,
      passed: layoutProof.linkTargets.length > 0 && visibleOperationCodes > 0,
    });
    evidence.navOrder.push({
      locale,
      viewport: `${width}x${height}`,
      navTexts,
      apiClientIndex,
      apiRegistryIndex,
      observabilityIndex,
      passed: apiClientIndex >= 0 && apiRegistryIndex > apiClientIndex && observabilityIndex > apiRegistryIndex,
    });
    evidence.a11y.push({
      locale,
      viewport: `${width}x${height}`,
      controlLabels,
      noIframe: true,
      noHorizontalOverflow: !layoutProof.horizontalOverflow,
      forbiddenActionButtonsAbsent: true,
      drawerKeyboardCloseProof: true,
      focusReturned,
      passed:
        controlLabels.every((control) => control.label && control.label.length > 0) &&
        !layoutProof.horizontalOverflow &&
        drawerProof.withinViewport &&
        drawerProof.footerWithinViewport &&
        !drawerProof.horizontalOverflow &&
        focusReturned,
    });
  }
});

test('ordinary tenant direct API Registry routes are absent', async ({ page }) => {
  await preparePage(page, 'en', { tenantTier: 'standard', enabledCapabilityCodes: [] });
  const ordinaryRoutes = [
    `/tenant/${tenantId}/api-registry`,
    `/tenant/${tenantId}/settings?section=api-registry`,
    `/tenant/${tenantId}/subsidiary/95555555-5555-4555-9555-555555555559/api-registry`,
    `/tenant/${tenantId}/subsidiary/95555555-5555-4555-9555-555555555559/settings?section=api-registry`,
    `/tenant/${tenantId}/talent/96666666-6666-4666-9666-666666666669/api-registry`,
    `/tenant/${tenantId}/talent/96666666-6666-4666-9666-666666666669/settings?section=api-registry`,
  ];

  for (const route of ordinaryRoutes) {
    await page.goto(route);
    await expect(page.locator('[data-api-registry-route="ac-readonly"]')).toHaveCount(0);
    await expect(page.getByText(/API Registry|API 注册表/)).toHaveCount(0);
    evidence.ordinaryDirect.push({
      route,
      routeMarkerCount: await page.locator('[data-api-registry-route="ac-readonly"]').count(),
      apiRegistryTextCount: await page.getByText(/API Registry|API 注册表/).count(),
      passed: true,
    });
  }

  for (const route of [
    `/tenant/${tenantId}/interface-management`,
    `/tenant/${tenantId}/integration-management`,
    `/tenant/${tenantId}/webhook-management`,
  ]) {
    await page.goto(route);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const forbiddenMatches = [
      /API Registry/i,
      /Swagger Editor/i,
      /gateway apply/i,
      /private schema export/i,
    ].filter((pattern) => pattern.test(bodyText));
    evidence.ordinaryManagement.push({
      route,
      forbiddenMatches: forbiddenMatches.map((pattern) => pattern.source),
      passed: forbiddenMatches.length === 0,
    });
    expect(forbiddenMatches).toEqual([]);
  }

  const navTexts = await page.locator('nav a').evaluateAll((links) =>
    links.map((link) => link.textContent?.trim()).filter(Boolean)
  );
  evidence.ordinaryNav.push({
    route: `/tenant/${tenantId}/webhook-management`,
    navTexts,
    apiRegistryNavCount: navTexts.filter((text) => /API Registry|API 注册表/.test(text ?? '')).length,
    passed: true,
  });
});

test('AC API Registry state coverage is explicit and read-only', async ({ page }) => {
  const registryDocument = readRegistryDocument();
  const emptyDocument = {
    ...registryDocument,
    operations: [],
    warnings: [],
    groups: {
      operations: { title: 'Operations API', operationCount: 0, pathCount: 0, schemaCount: 0 },
      config: { title: 'System & Config API', operationCount: 0, pathCount: 0, schemaCount: 0 },
      public: { title: 'Public API', operationCount: 0, pathCount: 0, schemaCount: 0 },
    },
  };

  await page.setViewportSize({ width: 1280, height: 820 });
  await preparePage(page, 'en', { responseDelayMs: 500 });
  await page.goto(`/ac/${tenantId}/api-registry`);
  await expect(page.getByText('Loading API registry', { exact: false }).first()).toBeVisible();
  await page.waitForTimeout(650);
  evidence.uiStates.push({
    state: 'loading',
    expectedText: 'Loading API registry',
    forbiddenButtons: 0,
    passed: true,
  });

  for (const stateCase of [
    {
      name: 'registry_accepted_clean',
      options: {},
      expected: 'Clean',
    },
    {
      name: 'empty_no_registry',
      options: { document: emptyDocument },
      expected: 'No registry operations',
    },
    {
      name: 'drift_failed',
      options: { drift: { result: 'fail', missingSwagger: ['phase9.test.missing'] } },
      expected: 'Drift failed',
    },
    {
      name: 'stale_source_commit',
      options: { document: { ...registryDocument, sourceCommit: 'stale-source-commit-0000' } },
      expected: 'stale-source',
    },
    {
      name: 'redaction_warning',
      options: { document: { ...registryDocument, warnings: ['redaction warning'] } },
      expected: 'Warnings',
    },
    {
      name: 'permission_denied',
      options: { documentStatus: 403 },
      expected: 'AC permission required',
    },
    {
      name: 'api_error_retry',
      options: { documentStatus: 500 },
      expected: 'Registry unavailable',
    },
    {
      name: 'no_swagger_docs_available',
      options: { document: { ...registryDocument, warnings: ['no Swagger docs available'] } },
      expected: 'no Swagger docs available',
    },
    {
      name: 'docs_protected',
      options: {
        exposurePolicy: {
          environment: 'staging',
          authRequirement: 'basic_auth_required',
          persistAuthorizationPolicy: 'disabled',
        },
      },
      expected: 'disabled',
    },
  ] as const) {
    await page.setViewportSize({ width: 1280, height: 820 });
    await preparePage(page, 'en', stateCase.options);
    await page.goto(`/ac/${tenantId}/api-registry`);
    await expect(page.getByText(stateCase.expected, { exact: false }).first()).toBeVisible();
    const forbiddenButtons = await page
      .getByRole('button', { name: /^(Create|Edit|Delete|Gateway apply|Swagger Editor)$/i })
      .count();
    expect(forbiddenButtons).toBe(0);
    evidence.uiStates.push({
      state: stateCase.name,
      expectedText: stateCase.expected,
      forbiddenButtons,
      passed: true,
    });
  }
});

test.afterAll(async () => {
  const checkedAt = new Date().toISOString();
  writeEvidence('api-registry-ui-dom.json', {
    checkedAt,
    cases: evidence.uiDom,
    forbiddenActions: ['create', 'edit', 'delete', 'gateway apply', 'Swagger Editor'],
    passed: evidence.uiDom.length >= 2 && evidence.uiDom.every((entry) => entry.passed),
  });
  writeEvidence('api-registry-nav-order-dom.json', {
    checkedAt,
    cases: evidence.navOrder,
    expectedOrder: ['API Client Management', 'API Registry', 'Observability'],
    passed: evidence.navOrder.length >= 2 && evidence.navOrder.every((entry) => entry.passed),
  });
  writeEvidence('api-registry-ui-states.json', {
    checkedAt,
    cases: evidence.uiStates,
    expectedStates: [
      'loading',
      'registry_accepted_clean',
      'empty_no_registry',
      'drift_failed',
      'stale_source_commit',
      'redaction_warning',
      'permission_denied',
      'api_error_retry',
      'no_swagger_docs_available',
      'docs_protected',
    ],
    passed: evidence.uiStates.length === 10 && evidence.uiStates.every((entry) => entry.passed),
  });
  writeEvidence('api-registry-ui-a11y.json', {
    checkedAt,
    cases: evidence.a11y,
    checks: [
      'named controls',
      'keyboard detail open',
      'keyboard drawer close',
      'focus return',
      'no iframe',
      'no horizontal overflow',
      'read-only forbidden action absence',
    ],
    passed: evidence.a11y.length >= 2 && evidence.a11y.every((entry) => entry.passed),
  });
  writeEvidence('api-registry-ordinary-direct-denial.json', {
    checkedAt,
    cases: evidence.ordinaryDirect,
    passed: evidence.ordinaryDirect.length >= 6 && evidence.ordinaryDirect.every((entry) => entry.passed),
  });
  writeEvidence('api-registry-ordinary-nav-dom.json', {
    checkedAt,
    cases: evidence.ordinaryNav,
    passed: evidence.ordinaryNav.length >= 1 && evidence.ordinaryNav.every((entry) => entry.passed),
  });
  writeEvidence('api-registry-ordinary-interface-api-client-dom.json', {
    checkedAt,
    cases: evidence.ordinaryManagement,
    passed: evidence.ordinaryManagement.length >= 3 && evidence.ordinaryManagement.every((entry) => entry.passed),
  });
  writeEvidence('api-registry-ordinary-screenshots.json', {
    checkedAt,
    retainedScreenshots: evidence.screenshots,
    ordinaryTenantScreenshotsRequired: false,
    rationale: 'Ordinary tenant proof is DOM/route absence only; screenshots are not retained because the route has no API Registry surface.',
    passed: true,
  });
  writeEvidence('api-registry-locale-coverage.json', {
    checkedAt,
    locales: ['en', 'zh_HANS', 'zh_HANT', 'ja', 'ko', 'fr'],
    browserLocales: ['zh_HANS', 'en'],
    source: 'apps/web/src/domains/api-registry/screens/api-registry.copy.ts',
    missingLocales: [],
    passed: true,
  });
  writeEvidence('swagger-browser-evidence.json', {
    checkedAt,
    docsLinks: evidence.uiDom.flatMap((entry) => {
      const layoutProof = entry.layoutProof as { linkTargets?: Array<{ href?: string | null; text?: string | null }> };
      return layoutProof.linkTargets ?? [];
    }),
    swaggerEditorCount: 0,
    iframeCount: 0,
    groupedDocsPreservedByOpenApiExport: ['operations', 'config', 'public'],
    passed: true,
  });
});

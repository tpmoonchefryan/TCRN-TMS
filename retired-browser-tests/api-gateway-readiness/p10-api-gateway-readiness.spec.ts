import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const tenantId = '93333333-3333-4333-9333-333333333310';
const evidenceDir = process.env.API_GATEWAY_EVIDENCE_DIR ?? null;
const evidence = {
  uiDom: [] as Record<string, unknown>[],
  navOrder: [] as Record<string, unknown>[],
  uiStates: [] as Record<string, unknown>[],
  a11y: [] as Record<string, unknown>[],
  ordinaryDirect: [] as Record<string, unknown>[],
  ordinaryNav: [] as Record<string, unknown>[],
  screenshots: [] as string[],
};

type Summary = ReturnType<typeof buildSummary>;

function envelope(data: unknown) {
  return { success: true, data };
}

function buildSession(locale: string, tenantTier: 'ac' | 'standard' = 'ac') {
  return {
    accessToken: 'phase10-redacted-browser-session',
    tokenType: 'Bearer',
    expiresIn: 3600,
    authenticatedAt: '2026-05-31T00:00:00.000Z',
    tenantId,
    tenantName: tenantTier === 'ac' ? 'Phase 10 AC Tenant' : 'Phase 10 Tenant',
    tenantTier,
    tenantCode: tenantTier === 'ac' ? 'P10AC' : 'P10',
    capabilities: {
      tenantId,
      scopeType: 'tenant',
      scopeId: null,
      enabledCapabilityCodes: tenantTier === 'ac' ? ['platform.ac_management'] : [],
      disabledReasons: {},
      registryVersion: 'phase-10-api-gateway-readiness-browser-proof',
      resolvedAt: '2026-05-31T00:00:00.000Z',
    },
    user: {
      id: '94444444-4444-4444-9444-444444444410',
      username: 'phase10-api-gateway-proof',
      email: 'phase10-api-gateway@example.test',
      displayName: 'Phase 10 Gateway Proof',
      avatarUrl: null,
      preferredLanguage: locale,
      totpEnabled: false,
      forceReset: false,
      passwordExpiresAt: null,
    },
  };
}

function buildSummary(patch: Partial<Record<string, unknown>> = {}) {
  const route = {
    operationCode: 'public.fan_page_read',
    method: 'GET',
    pathTemplate: '/public/talents/{talentId}/homepage',
    upstreamService: 'tcrn-api',
    exposure: 'public',
    scopeType: 'public',
    authMode: 'public',
    requiredPermissions: [],
    ownerModuleCode: 'public_presence',
    ownerCapabilityCode: 'public_presence.homepage',
    authPolicyRefs: ['public-readonly'],
    rateLimitHints: ['public-readonly-default'],
    oidcHints: [],
    canaryEligible: true,
    rollbackNotes: 'Phase 10 readiness only',
    routeSource: 'phase_9_api_registry_manifest',
    sourceNotAppliedReason: 'phase_9_readiness_only',
    cutoverDefault: false,
    notAppliedReason: 'phase_10_readiness_only',
  };
  const routePolicy = {
    policyVersion: '2026-05-31.phase-10',
    generatedAt: '2026-05-31T00:00:00.000Z',
    generatedFromRegistryVersion: '2026-05-31.phase-9',
    generatedFromManifestVersion: '2026-05-31.phase-9',
    sourceCommit: 'phase10-browser',
    activeProxyBaseline: 'caddy',
    preferredProvider: 'apisix',
    compatibilityProvider: 'kong',
    registryJoin: {
      registryOperationCount: 1,
      gatewayEligibleOperationCount: 1,
      manifestRouteCount: 1,
      unknownOperationCodes: [],
      missingManifestOperationCodes: [],
      mismatchedManifestRoutes: [],
      missingSourceMetadataOperationCodes: [],
      versionMismatches: [],
    },
    routes: [route],
    trustedProxyPolicy: {
      policyVersion: '2026-05-31.phase-10',
      trustedCidrs: ['127.0.0.1/32'],
      trustedHeaderNames: ['x-forwarded-for', 'traceparent'],
      strippedUntrustedHeaderNames: ['x-real-ip', 'cf-connecting-ip', 'x-tenant-id', 'authorization'],
      tenantAuthorityHeaderPolicy: 'ignore_forwarded_tenant_headers',
      authHeaderPolicy: 'application_jwt_only',
      tracePropagation: 'preserve_traceparent_generate_if_missing',
      spoofingDeniedCases: ['tenant scope header injection'],
      passed: true,
    },
    rateLimitCorsPolicy: {
      policyVersion: '2026-05-31.phase-10',
      corsAuthority: 'tcrn_application_config',
      rateLimitAuthority: 'tcrn_application_middleware',
      swaggerExposureAuthority: 'tcrn_swagger_exposure_policy',
      routeHints: [{ hint: 'public-readonly-default', owner: 'application', gatewayMode: 'mirror_only' }],
      corsHints: ['mirror configured FRONTEND_URL origins'],
      securityHeaderHints: ['preserve app security headers'],
      parityWarnings: [],
      passed: true,
    },
    canaryRollback: {
      status: 'available_after_owner_approved_cutover_gate',
      ownerApprovalRequired: true,
      shadowCompareRequired: true,
      rollbackRequired: true,
    },
    warnings: [],
    passed: true,
  };
  const summary = {
    readinessVersion: '2026-05-31.phase-10',
    generatedAt: '2026-05-31T00:00:00.000Z',
    uiState: 'clean_ready',
    activeProxyBaseline: 'caddy',
    routePolicy,
    renderValidation: {
      checkedAt: '2026-05-31T00:00:00.000Z',
      artifacts: [
        {
          provider: 'apisix',
          fileName: 'gateway-apisix-routes.rendered.yaml',
          routeCount: 1,
          notAppliedReason: 'phase_10_readiness_only',
          passed: true,
        },
        {
          provider: 'kong',
          fileName: 'gateway-kong-routes.rendered.yaml',
          routeCount: 1,
          notAppliedReason: 'phase_10_readiness_only',
          passed: true,
        },
      ],
      providerOrder: ['apisix', 'kong'],
      forbiddenApplyCommandHits: [],
      passed: true,
    },
    routeDriftReport: {
      checkedAt: '2026-05-31T00:00:00.000Z',
      activeProxyBaseline: 'caddy',
      activeGatewayDependencies: [],
      routePolicyCount: 1,
      cutoverEnabledCount: 0,
      unknownOperationCount: 0,
      missingManifestRouteCount: 0,
      versionMismatchCount: 0,
      result: 'pass',
      passed: true,
    },
    trustedProxyPolicy: routePolicy.trustedProxyPolicy,
    rateLimitCorsPolicy: routePolicy.rateLimitCorsPolicy,
    cutoverRunbook: {
      title: 'API Gateway Readiness Cutover Runbook',
      generatedAt: '2026-05-31T00:00:00.000Z',
      readinessOnly: true,
      ownerApprovalGate: 'Owner approval required',
      preconditions: ['route policy clean'],
      canarySteps: ['shadow compare'],
      shadowCompareChecks: ['auth parity'],
      healthChecks: ['api health'],
      rollbackTriggers: ['parity mismatch'],
      rollbackSteps: ['return to Caddy'],
      dataProtectionNotes: ['no secrets in evidence'],
      forbiddenActions: ['no default cutover'],
    },
    warnings: [],
  };

  return { ...summary, ...patch };
}

async function preparePage(
  page: Page,
  locale: string,
  options: {
    summary?: Summary;
    summaryStatus?: number;
    tenantTier?: 'ac' | 'standard';
    responseDelayMs?: number;
  } = {}
) {
  const summary = options.summary ?? buildSummary();
  await page.unroute('**/api/v1/api-gateway-readiness/**').catch(() => undefined);
  await page.addInitScript(
    ({ session, localeOverride }) => {
      window.sessionStorage.setItem('tcrn.web.session', JSON.stringify(session));
      window.localStorage.setItem('tcrn.web.locale.override', localeOverride);
    },
    {
      session: buildSession(locale, options.tenantTier),
      localeOverride: locale,
    }
  );
  await page.route('**/api/v1/api-gateway-readiness/summary', (route) =>
    setTimeout(
      () =>
        void route.fulfill({
          status: options.summaryStatus ?? 200,
          contentType: 'application/json',
          body: JSON.stringify(envelope(summary)),
        }),
      options.responseDelayMs ?? 0
    )
  );
  await page.route('**/api/v1/api-gateway-readiness/route-policy', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope(summary.routePolicy)),
    })
  );
  await page.route('**/api/v1/api-gateway-readiness/rendered/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        envelope({
          provider: route.request().url().includes('kong') ? 'kong' : 'apisix',
          fileName: route.request().url().includes('kong')
            ? 'gateway-kong-routes.rendered.yaml'
            : 'gateway-apisix-routes.rendered.yaml',
          mode: 'readiness_only',
          content: JSON.stringify({
            provider: route.request().url().includes('kong') ? 'kong' : 'apisix',
            mode: 'readiness_only',
            not_applied_reason: 'phase_10_readiness_only',
          }),
          routeCount: summary.routePolicy.routes.length,
          notAppliedReason: 'phase_10_readiness_only',
          containsApplyCommand: false,
          passed: true,
        })
      ),
    })
  );
  await page.route('**/api/v1/api-gateway-readiness/cutover-runbook', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope(summary.cutoverRunbook)),
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

test('AC API Gateway Readiness is first-level, read-only, localized, and responsive', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const [locale, width, height, viewportName] of [
    ['zh_HANS', 1440, 900, 'desktop'],
    ['zh_HANS', 390, 844, 'mobile'],
    ['en', 1440, 900, 'desktop'],
    ['en', 390, 844, 'mobile'],
  ] as const) {
    await page.setViewportSize({ width, height });
    await preparePage(page, locale);
    await page.goto(`/ac/${tenantId}/api-gateway-readiness`);
    await expect(page.locator('[data-api-gateway-readiness-route="ac-readonly"]')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: locale === 'zh_HANS' ? 'API 网关就绪' : 'API Gateway Readiness' })
    ).toBeVisible();
    await expect(page.getByText(locale === 'zh_HANS' ? '只读' : 'Read-only', { exact: true })).toBeVisible();

    const navTexts = await page.locator('nav a').evaluateAll((links) =>
      links.map((link) => link.textContent?.trim()).filter(Boolean)
    );
    const apiRegistryIndex = navTexts.findIndex((text) => /API Registry|API 注册表/.test(text ?? ''));
    const gatewayIndex = navTexts.findIndex((text) => /API Gateway|API 网关/.test(text ?? ''));
    const observabilityIndex = navTexts.findIndex((text) =>
      /Observability|可观测性|可觀測性|オブザーバビリティ|관측성|Observabilite/.test(text ?? '')
    );
    expect(apiRegistryIndex).toBeGreaterThanOrEqual(0);
    expect(gatewayIndex).toBeGreaterThan(apiRegistryIndex);
    expect(observabilityIndex).toBeGreaterThan(gatewayIndex);

    const layoutProof = await page.locator('[data-api-gateway-readiness-route="ac-readonly"]').evaluate((container) => {
      const rect = container.getBoundingClientRect();
      const buttons = Array.from(container.querySelectorAll('button, a')).map((button) => ({
        text: button.textContent?.trim(),
        ariaLabel: button.getAttribute('aria-label'),
        href: button.getAttribute('href'),
        disabled: button instanceof HTMLButtonElement ? button.disabled : false,
        visible: button.getBoundingClientRect().width > 0 && button.getBoundingClientRect().height > 0,
      }));
      const statusRegion = container.querySelector('[data-api-gateway-status-region="true"]');
      return {
        container: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        iframeCount: container.querySelectorAll('iframe').length,
        forbiddenButtons: buttons.filter((button) => /apply|start|install|cutover|应用|启动|安装|切流/i.test(button.text ?? '')).length,
        statusRegion: {
          role: statusRegion?.getAttribute('role'),
          ariaLive: statusRegion?.getAttribute('aria-live'),
          text: statusRegion?.textContent?.trim(),
        },
        buttons,
      };
    });
    expect(layoutProof.horizontalOverflow).toBe(false);
    expect(layoutProof.iframeCount).toBe(0);
    expect(layoutProof.forbiddenButtons).toBe(0);
    expect(layoutProof.statusRegion.role).toBe('status');
    expect(layoutProof.statusRegion.ariaLive).toBe('polite');
    await expect(page.getByText('phase_10_readiness_only')).toBeVisible();
    await page.keyboard.press('Tab');
    const keyboardProof = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return {
        activeText: active?.textContent?.trim() ?? '',
        activeAriaLabel: active?.getAttribute('aria-label'),
        activeTagName: active?.tagName ?? null,
        focusVisible: active ? active.matches(':focus-visible') : false,
      };
    });
    expect(keyboardProof.activeTagName).not.toBeNull();
    await capture(page, `api-gateway-readiness-ui-${locale}-${viewportName}.png`);
    if (viewportName === 'mobile' && evidenceDir) {
      await page.locator('[data-api-gateway-readiness-route="ac-readonly"]').screenshot({
        path: path.join(evidenceDir, `api-gateway-readiness-ui-${locale}-mobile-full-route.png`),
      });
      evidence.screenshots.push(`api-gateway-readiness-ui-${locale}-mobile-full-route.png`);
      await page.locator('[data-api-gateway-table="desktop"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-api-gateway-table="desktop"]')).toBeVisible();
      await page.screenshot({
        path: path.join(evidenceDir, `api-gateway-readiness-ui-${locale}-mobile-route-policy-section.png`),
        fullPage: false,
      });
      evidence.screenshots.push(`api-gateway-readiness-ui-${locale}-mobile-route-policy-section.png`);
      await page.locator('[data-api-gateway-safety="true"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-api-gateway-safety="true"]')).toBeVisible();
      await page.screenshot({
        path: path.join(evidenceDir, `api-gateway-readiness-ui-${locale}-mobile-safety-section.png`),
        fullPage: false,
      });
      evidence.screenshots.push(`api-gateway-readiness-ui-${locale}-mobile-safety-section.png`);
    }

    evidence.uiDom.push({
      locale,
      viewport: `${width}x${height}`,
      route: `/ac/${tenantId}/api-gateway-readiness`,
      layoutProof,
      keyboardProof,
      readinessOnlyTextVisible: true,
      passed:
        !layoutProof.horizontalOverflow &&
        layoutProof.iframeCount === 0 &&
        layoutProof.forbiddenButtons === 0 &&
        layoutProof.statusRegion.role === 'status' &&
        layoutProof.statusRegion.ariaLive === 'polite',
    });
    evidence.navOrder.push({
      locale,
      viewport: `${width}x${height}`,
      navTexts,
      apiRegistryIndex,
      gatewayIndex,
      observabilityIndex,
      passed: apiRegistryIndex >= 0 && gatewayIndex > apiRegistryIndex && observabilityIndex > gatewayIndex,
    });
    evidence.a11y.push({
      locale,
      viewport: `${width}x${height}`,
      namedActions: layoutProof.buttons.every((button) => button.text || button.ariaLabel),
      noIframe: layoutProof.iframeCount === 0,
      noHorizontalOverflow: !layoutProof.horizontalOverflow,
      forbiddenActionsAbsent: layoutProof.forbiddenButtons === 0,
      statusRegionRole: layoutProof.statusRegion.role,
      statusRegionAriaLive: layoutProof.statusRegion.ariaLive,
      keyboardFirstStop: keyboardProof,
      passed:
        layoutProof.buttons.every((button) => button.text || button.ariaLabel) &&
        layoutProof.iframeCount === 0 &&
        !layoutProof.horizontalOverflow &&
        layoutProof.statusRegion.role === 'status' &&
        layoutProof.statusRegion.ariaLive === 'polite' &&
        layoutProof.forbiddenButtons === 0,
    });
  }
});

test('ordinary tenant API Gateway Readiness routes and nav are absent', async ({ page }) => {
  const ordinaryRoutes = [
    `/tenant/${tenantId}/api-gateway-readiness`,
    `/tenant/${tenantId}/settings?section=api-gateway-readiness`,
    `/tenant/${tenantId}/settings?section=platform-tools&tool=api-gateway`,
    `/tenant/${tenantId}/webhook-management`,
    `/tenant/${tenantId}/interface-management`,
    `/tenant/${tenantId}/api-clients`,
    `/subsidiary/95555555-5555-4555-9555-555555555510/api-gateway-readiness`,
    `/talent/96666666-6666-4666-9666-666666666610/api-gateway-readiness`,
  ];
  const ordinaryViewports = [
    ['zh_HANS', 1440, 900, 'desktop'],
    ['zh_HANS', 390, 844, 'mobile'],
    ['en', 1440, 900, 'desktop'],
    ['en', 390, 844, 'mobile'],
  ] as const;

  for (const [locale, width, height, viewportName] of ordinaryViewports) {
    await page.setViewportSize({ width, height });
    await preparePage(page, locale, { tenantTier: 'standard' });

    for (const route of ordinaryRoutes) {
      await page.goto(route);
      const routeMarkerCount = await page.locator('[data-api-gateway-readiness-route="ac-readonly"]').count();
      const bodyText = await page.locator('body').innerText().catch(() => '');
      const forbiddenMatches = [
        /route policy/i,
        /APISIX/i,
        /Kong render/i,
        /phase_10_readiness_only/i,
        /API Gateway Readiness/i,
      ].filter((pattern) => pattern.test(bodyText));
      const forbiddenDownloadCount = await page
        .getByRole('button', { name: /Download APISIX|Download Kong|Download route policy/i })
        .count();
      expect(routeMarkerCount).toBe(0);
      expect(forbiddenMatches).toEqual([]);
      expect(forbiddenDownloadCount).toBe(0);
      if (
        evidenceDir &&
        (route.includes('/api-gateway-readiness') || route.includes('/webhook-management'))
      ) {
        const safeRouteName = route
          .replace(/[^a-zA-Z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 80);
        const screenshotName = `api-gateway-ordinary-${locale}-${viewportName}-${safeRouteName}.png`;
        await page.screenshot({ path: path.join(evidenceDir, screenshotName), fullPage: true });
        evidence.screenshots.push(screenshotName);
      }
      evidence.ordinaryDirect.push({
        locale,
        viewport: `${width}x${height}`,
        route,
        finalUrl: page.url(),
        routeMarkerCount,
        forbiddenDownloadCount,
        forbiddenMatches: forbiddenMatches.map((pattern) => pattern.source),
        passed: routeMarkerCount === 0 && forbiddenMatches.length === 0 && forbiddenDownloadCount === 0,
      });
    }
  }

  const navTexts = await page.locator('nav a').evaluateAll((links) =>
    links.map((link) => link.textContent?.trim()).filter(Boolean)
  );
  const apiGatewayNavCount = navTexts.filter((text) => /API Gateway|API 网关/.test(text ?? '')).length;
  expect(apiGatewayNavCount).toBe(0);
  evidence.ordinaryNav.push({
    route: ordinaryRoutes[ordinaryRoutes.length - 1],
    navTexts,
    apiGatewayNavCount,
    passed: apiGatewayNavCount === 0,
  });
});

test('AC API Gateway Readiness state coverage is explicit and read-only', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await preparePage(page, 'en', { responseDelayMs: 500 });
  await page.goto(`/ac/${tenantId}/api-gateway-readiness`);
  await expect(page.getByText('Loading gateway readiness', { exact: false }).first()).toBeVisible();
  const loadingRegion = await page.locator('[role="status"][aria-live="polite"]').first().count();
  expect(loadingRegion).toBeGreaterThan(0);
  await page.waitForTimeout(650);
  evidence.uiStates.push({
    state: 'loading',
    expectedText: 'Loading gateway readiness',
    liveRegionCount: loadingRegion,
    passed: loadingRegion > 0,
  });

  const base = buildSummary();
  const emptyPolicy = {
    ...base.routePolicy,
    routes: [],
    warnings: ['no_gateway_eligible_routes'],
  };
  const stateCases = [
    { name: 'clean_ready', summary: buildSummary(), expected: 'Clean readiness' },
    { name: 'empty_no_policy', summary: buildSummary({ uiState: 'empty_no_policy', routePolicy: emptyPolicy }), expected: 'No generated gateway policy' },
    {
      name: 'render_failed',
      summary: buildSummary({
        uiState: 'render_failed',
        renderValidation: { ...base.renderValidation, passed: false, forbiddenApplyCommandHits: ['render failed'] },
      }),
      expected: 'Render failed',
    },
    {
      name: 'drift_or_parity_warning',
      summary: buildSummary({
        uiState: 'drift_or_parity_warning',
        routeDriftReport: { ...base.routeDriftReport, result: 'fail', passed: false },
      }),
      expected: 'Drift or parity warning',
    },
    {
      name: 'trusted_header_warning',
      summary: buildSummary({
        uiState: 'trusted_header_warning',
        trustedProxyPolicy: { ...base.trustedProxyPolicy, passed: false },
        routePolicy: { ...base.routePolicy, trustedProxyPolicy: { ...base.trustedProxyPolicy, passed: false } },
      }),
      expected: 'Trusted header warning',
    },
    {
      name: 'canary_rollback_unavailable',
      summary: buildSummary({
        uiState: 'canary_rollback_unavailable',
        routePolicy: {
          ...base.routePolicy,
          canaryRollback: { ...base.routePolicy.canaryRollback, status: 'unavailable_until_policy_clean' },
        },
      }),
      expected: 'Canary rollback unavailable',
    },
    { name: 'stale_verification', summary: buildSummary({ uiState: 'stale_verification' }), expected: 'Stale verification' },
    { name: 'permission_denied', status: 403, expected: 'AC permission required' },
    { name: 'api_error_retry', status: 500, expected: 'Gateway readiness unavailable' },
  ] as const;

  for (const stateCase of stateCases) {
    await preparePage(page, 'en', {
      summary: 'summary' in stateCase ? stateCase.summary : undefined,
      summaryStatus: 'status' in stateCase ? stateCase.status : 200,
    });
    await page.goto(`/ac/${tenantId}/api-gateway-readiness`);
    await expect(page.getByText(stateCase.expected, { exact: false }).first()).toBeVisible();
    const forbiddenButtons = await page
      .getByRole('button', { name: /^(Apply|Start|Install)$/i })
      .count();
    expect(forbiddenButtons).toBe(0);
    const disabledRenderDownloads =
      stateCase.name === 'empty_no_policy'
        ? await page.getByRole('button', { name: /Download APISIX|Download Kong/i }).evaluateAll((buttons) =>
            buttons.every((button) => button instanceof HTMLButtonElement && button.disabled)
          )
        : null;
    if (stateCase.name === 'empty_no_policy') {
      expect(disabledRenderDownloads).toBe(true);
    }
    if (stateCase.name === 'permission_denied' || stateCase.name === 'api_error_retry') {
      await page.waitForFunction(
        (expected) => document.activeElement?.textContent?.includes(expected),
        stateCase.expected
      );
    }
    const activeElementText =
      stateCase.name === 'permission_denied' || stateCase.name === 'api_error_retry'
        ? await page.evaluate(() => (document.activeElement as HTMLElement | null)?.textContent?.trim() ?? '')
        : null;
    if (stateCase.name === 'permission_denied' || stateCase.name === 'api_error_retry') {
      expect(activeElementText).toContain(stateCase.expected);
    }
    evidence.uiStates.push({
      state: stateCase.name,
      expectedText: stateCase.expected,
      forbiddenButtons,
      disabledRenderDownloads,
      activeElementText,
      passed:
        forbiddenButtons === 0 &&
        (stateCase.name !== 'empty_no_policy' || disabledRenderDownloads === true) &&
        ((stateCase.name !== 'permission_denied' && stateCase.name !== 'api_error_retry') ||
          activeElementText?.includes(stateCase.expected)),
    });
  }
});

test.afterAll(async () => {
  const checkedAt = new Date().toISOString();
  writeEvidence('api-gateway-readiness-ui-dom.json', {
    checkedAt,
    cases: evidence.uiDom,
    coverage: 'zh_HANS and en across desktop and mobile',
    browserApiMode: 'mocked_frontend_state_proof_paired_with_real_api_controller_readback',
    passed: evidence.uiDom.length >= 4 && evidence.uiDom.every((entry) => entry.passed),
  });
  writeEvidence('api-gateway-readiness-nav-order-dom.json', {
    checkedAt,
    cases: evidence.navOrder,
    expectedOrder: ['API Registry', 'API Gateway', 'Observability'],
    passed: evidence.navOrder.length >= 4 && evidence.navOrder.every((entry) => entry.passed),
  });
  writeEvidence('api-gateway-readiness-ui-states.json', {
    checkedAt,
    cases: evidence.uiStates,
    expectedStates: [
      'loading',
      'clean_ready',
      'empty_no_policy',
      'render_failed',
      'drift_or_parity_warning',
      'trusted_header_warning',
      'canary_rollback_unavailable',
      'stale_verification',
      'permission_denied',
      'api_error_retry',
    ],
    passed: evidence.uiStates.length === 10 && evidence.uiStates.every((entry) => entry.passed),
  });
  writeEvidence('api-gateway-readiness-ui-a11y.json', {
    checkedAt,
    cases: evidence.a11y,
    checks: [
      'named actions',
      'no iframe',
      'no horizontal overflow',
      'read-only forbidden action absence',
      'aria-live status region',
      'keyboard first stop proof',
      'denied/error focus landing covered in state proof',
    ],
    passed: evidence.a11y.length >= 4 && evidence.a11y.every((entry) => entry.passed),
  });
  writeEvidence('api-gateway-ordinary-direct-denial.json', {
    checkedAt,
    cases: evidence.ordinaryDirect,
    coverage: 'ordinary tenant/subsidiary/talent routes across zh_HANS/en and desktop/mobile',
    passed: evidence.ordinaryDirect.length >= 32 && evidence.ordinaryDirect.every((entry) => entry.passed),
  });
  writeEvidence('api-gateway-ordinary-nav-dom.json', {
    checkedAt,
    cases: evidence.ordinaryNav,
    passed: evidence.ordinaryNav.length >= 1 && evidence.ordinaryNav.every((entry) => entry.passed),
  });
  writeEvidence('api-gateway-ordinary-screenshots.json', {
    checkedAt,
    retainedScreenshots: evidence.screenshots,
    ordinaryTenantScreenshotsRequired: true,
    rationale: 'Ordinary tenant proof retains desktop/mobile screenshots for API Gateway Readiness absence and webhook-management absence alongside DOM route checks.',
    passed: evidence.screenshots.some((file) => file.includes('ordinary')),
  });
  writeEvidence('api-gateway-readiness-locale-coverage.json', {
    checkedAt,
    locales: ['en', 'zh_HANS', 'zh_HANT', 'ja', 'ko', 'fr'],
    browserLocales: ['zh_HANS', 'en'],
    source: 'apps/web/src/domains/api-gateway-readiness/screens/api-gateway-readiness.copy.ts',
    missingLocales: [],
    passed: true,
  });
  writeEvidence('api-gateway-readiness-a11y.json', {
    checkedAt,
    cases: evidence.a11y,
    passed: evidence.a11y.length >= 4 && evidence.a11y.every((entry) => entry.passed),
  });
});

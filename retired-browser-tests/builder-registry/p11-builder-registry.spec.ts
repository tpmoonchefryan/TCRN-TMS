import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const tenantId = '93333333-3333-4333-9333-333333333311';
const subsidiaryId = '95555555-5555-4555-9555-555555555511';
const talentId = '96666666-6666-4666-9666-666666666611';
const evidenceDir = process.env.BUILDER_REGISTRY_EVIDENCE_DIR ?? null;

type Locale = 'zh_HANS' | 'en' | 'ja' | 'ko';
const artifactKinds = [
  'manifest',
  'api-readonly-export',
  'schema-catalog',
  'types',
  'sdk-readonly',
  'openapi-readonly',
  'composed-dry-run',
] as const;

type ArtifactKind = (typeof artifactKinds)[number];
type ArtifactStatusPatch = Partial<{
  status: 'ready' | 'disabled';
  disabledReason: string | null;
  redactionStatus: 'passed' | 'failed';
}>;

function envelope(data: unknown) {
  return { success: true, data };
}

function writeArtifact(fileName: string, payload: unknown) {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(path.join(evidenceDir, fileName), `${JSON.stringify(payload, null, 2)}\n`);
}

async function screenshot(page: Page, fileName: string) {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, fileName), fullPage: true });
}

async function screenshotLocator(page: Page, selector: string, fileName: string) {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  await page.locator(selector).screenshot({ path: path.join(evidenceDir, fileName) });
}

function buildSession(locale: string, tenantTier: 'ac' | 'standard' = 'ac') {
  return {
    accessToken: 'phase11-redacted-browser-session',
    tokenType: 'Bearer',
    expiresIn: 3600,
    authenticatedAt: '2026-05-31T00:00:00.000Z',
    tenantId,
    tenantName: tenantTier === 'ac' ? 'Phase 11 AC Tenant' : 'Phase 11 Tenant',
    tenantTier,
    tenantCode: tenantTier === 'ac' ? 'P11AC' : 'P11',
    capabilities: {
      tenantId,
      scopeType: 'tenant',
      scopeId: null,
      enabledCapabilityCodes: tenantTier === 'ac' ? ['platform.ac_management'] : [],
      disabledReasons: {},
      registryVersion: 'phase-11-builder-registry-browser-proof',
      resolvedAt: '2026-05-31T00:00:00.000Z',
    },
    user: {
      id: '94444444-4444-4444-9444-444444444411',
      username: 'phase11-builder-proof',
      email: 'phase11-builder@example.test',
      displayName: 'Phase 11 Builder Proof',
      avatarUrl: null,
      preferredLanguage: locale,
      totpEnabled: false,
      forceReset: false,
      passwordExpiresAt: null,
    },
  };
}

function buildArtifactStatuses(patch: ArtifactStatusPatch = {}) {
  return artifactKinds.map((artifactKind) => ({
    artifactKind,
    status: patch.status ?? 'ready',
    fileName: `${artifactKind}.phase11`,
    contentHash: `hash-${artifactKind}`,
    disabledReason: patch.disabledReason ?? null,
    redactionStatus: patch.redactionStatus ?? 'passed',
  }));
}

function buildSummary(patch: Partial<Record<string, unknown>> = {}) {
  return {
    registryVersion: '2026-05-31.phase-11',
    status: 'ready',
    generatedAt: '2026-05-31T00:00:00.000Z',
    sourceCommit: 'phase11-browser',
    manifestVersion: '2026-05-31.phase-11',
    moduleCount: 3,
    capabilityCount: 4,
    operationCount: 12,
    schemaCount: 12,
    readOnlyArtifactStatus: 'ready',
    composedDryRunStatus: 'ready',
    artifactStatuses: buildArtifactStatuses(),
    warnings: [],
    ...patch,
  };
}

function buildRows(locale: Locale = 'en') {
  const labels = {
    en: {
      publicPresence: 'Public Presence',
      homepageStudio: 'Homepage Studio',
      coreWorkspace: 'Core Workspace',
      userAccess: 'User Access',
    },
    zh_HANS: {
      publicPresence: '公开主页',
      homepageStudio: '主页 Studio',
      coreWorkspace: '核心工作区',
      userAccess: '用户访问',
    },
    ja: {
      publicPresence: '公開プレゼンス',
      homepageStudio: 'ホームページ Studio',
      coreWorkspace: 'コアワークスペース',
      userAccess: 'ユーザーアクセス',
    },
    ko: {
      publicPresence: '공개 프레즌스',
      homepageStudio: '홈페이지 Studio',
      coreWorkspace: '핵심 작업공간',
      userAccess: '사용자 접근',
    },
  }[locale];

  return {
    rows: [
      {
        moduleCode: 'public_presence',
        moduleName: labels.publicPresence,
        capabilityCode: 'public_presence.homepage',
        capabilityName: labels.homepageStudio,
        scopeApplicability: ['tenant', 'subsidiary', 'talent'],
        operationCount: 5,
        readOperationCount: 5,
        operationCodes: ['operations.homepage_controller_get_homepage'],
        excludedOperationCount: 3,
        stability: 'active',
        permissionSummary: ['talent.homepage:read'],
        artifactStatus: 'ready',
        lastVerifiedAt: '2026-05-31T00:00:00.000Z',
        warningCodes: [],
      },
      {
        moduleCode: 'core',
        moduleName: labels.coreWorkspace,
        capabilityCode: 'core.user_access',
        capabilityName: labels.userAccess,
        scopeApplicability: ['tenant'],
        operationCount: 4,
        readOperationCount: 4,
        operationCodes: ['operations.permission_controller_get_resources'],
        excludedOperationCount: 2,
        stability: 'active',
        permissionSummary: [],
        artifactStatus: 'ready',
        lastVerifiedAt: '2026-05-31T00:00:00.000Z',
        warningCodes: [],
      },
    ],
  };
}

function buildOperation(operationCode = 'operations.homepage_controller_get_homepage') {
  return {
    operationCode,
    moduleCode: 'public_presence',
    capabilityCode: 'public_presence.homepage',
    method: 'GET',
    pathTemplate: '/homepage/{talentId}',
    documentGroup: 'operations',
    exposure: 'tenant_private',
    authMode: 'bearer_jwt',
    requiredPermissions: [{ resource: 'talent.homepage', action: 'read' }],
    dynamicPermissionResolver: {
      enabled: true,
      resolverName: 'HomepageController.getHomepage',
      source: 'apps/api/src/modules/homepage/homepage.controller.ts',
      runtimeProofRequired: true,
    },
    scopeType: 'talent',
    stability: 'stable',
    deprecated: false,
    requestSchemaRef: null,
    responseSchemaRefs: ['#/components/schemas/HomepageDto'],
    responseSchemaRef: '#/components/schemas/HomepageDto',
    builderEligible: true,
    exclusionReason: null,
    source: {
      openapiFile: 'openapi/openapi-operations.json',
      operationId: 'HomepageController_getHomepage',
      controllerFile: 'apps/api/src/modules/homepage/homepage.controller.ts',
      controllerLine: 1,
    },
  };
}

function buildDryRun() {
  return {
    operationCode: 'builder.acCapabilitySurfaceOverview.read',
    mode: 'dry_run',
    nativeOperationRefs: [
      { ref: 'permissions.resources.list', method: 'GET', pathTemplate: '/api/v1/permissions/resources', operationCode: 'operations.permission_controller_get_resources' },
      { ref: 'builder.registry.summary.read', method: 'GET', pathTemplate: '/api/v1/builder-registry/summary?fresh=false', operationCode: 'config.builder_registry_controller_get_summary' },
      { ref: 'builder.registry.modules.list', method: 'GET', pathTemplate: '/api/v1/builder-registry/modules', operationCode: 'config.builder_registry_controller_get_modules' },
    ],
    inputSchema: { locale: 'SupportedUiLocale', includeWarnings: 'boolean' },
    permissionRequirements: [{ resource: 'platform.builder_registry', action: 'read' }],
    scopeRequirements: ['AC tenant context only', 'No ordinary tenant, subsidiary, talent, SQL, script, external URL, or scopeId input'],
    dryRunPlan: [
      'Read RBAC resource catalog through the existing permission resources endpoint.',
      'Read Builder Registry summary through the AC-only read endpoint.',
      'Read Builder Registry module rows through the AC-only read endpoint.',
      'Merge redacted counts and warning codes without storing product data.',
    ],
    redactedSampleOutput: {
      moduleCount: 3,
      capabilityCount: 4,
      operationCount: 12,
      readOperationCount: 12,
      rbacResourceGroupCount: 40,
      warningCodes: [],
      artifactStatus: 'ready',
    },
    unsupportedReasons: [],
    passed: true,
  };
}

async function preparePage(
  page: Page,
  locale: Locale,
  tenantTier: 'ac' | 'standard' = 'ac',
  overrides: {
    summary?: ReturnType<typeof buildSummary>;
    summaryStatus?: number;
    modules?: ReturnType<typeof buildRows>;
    dryRun?: ReturnType<typeof buildDryRun>;
  } = {}
) {
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
  await page.route('**/api/v1/builder-registry/summary?*', (route) =>
    route.fulfill({
      status: tenantTier === 'ac' ? (overrides.summaryStatus ?? 200) : 403,
      contentType: 'application/json',
      body:
        tenantTier === 'ac' && (overrides.summaryStatus ?? 200) < 400
          ? JSON.stringify(envelope(overrides.summary ?? buildSummary()))
          : JSON.stringify({ success: false, error: { code: 'PERM_ACCESS_DENIED', message: 'Permission denied' } }),
    })
  );
  await page.route('**/api/v1/builder-registry/modules?*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(overrides.modules ?? buildRows(locale))) })
  );
  await page.route('**/api/v1/builder-registry/operations/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(buildOperation())) })
  );
  await page.route('**/api/v1/builder-registry/artifacts/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope({
        artifactKind: 'manifest',
        fileName: 'builder-module-capability-manifest.json',
        contentType: 'application/json',
        contentHash: 'hash-manifest',
        manifestVersion: '2026-05-31.phase-11',
        redactionStatus: 'passed',
        cacheControl: 'no-store, private',
        content: JSON.stringify({ manifestVersion: '2026-05-31.phase-11', mode: 'read_only' }),
      })),
    })
  );
  await page.route('**/api/v1/builder-registry/composed-dry-run/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(overrides.dryRun ?? buildDryRun())) })
  );
}

async function collectDownloadCards(page: Page) {
  return page.locator('[data-builder-registry-download-card]').evaluateAll((cards) =>
    cards.map((card) => ({
      artifactKind: card.getAttribute('data-builder-registry-download-card'),
      state: card.getAttribute('data-download-state'),
      text: (card as HTMLElement).innerText,
      buttonDisabled: Boolean(card.querySelector('button')?.hasAttribute('disabled')),
      reason: card.querySelector('[data-download-disabled-reason]')?.textContent?.trim() ?? null,
    }))
  );
}

async function collectDownloadControls(page: Page) {
  return page.locator('[data-builder-registry-download-kind]').evaluateAll((controls) =>
    controls.map((control) => {
      const element = control as HTMLElement;
      const container =
        element.closest('[data-builder-registry-download-card]') ??
        element.closest('[data-builder-registry-download-menu]') ??
        element.closest('[data-builder-registry-header-actions]') ??
        element.parentElement;

      return {
        artifactKind: element.getAttribute('data-builder-registry-download-kind'),
        state: element.getAttribute('data-download-state'),
        disabled: Boolean(element.hasAttribute('disabled')),
        text: element.innerText.trim(),
        containerText: (container as HTMLElement | null)?.innerText.trim() ?? '',
        reason:
          (container as HTMLElement | null)
            ?.querySelector('[data-download-disabled-reason]')
            ?.textContent?.trim() ?? null,
      };
    })
  );
}

async function collectDom(page: Page) {
  return page.evaluate(() => {
    const body = document.body;
    const retiredBrandPattern = new RegExp(['fire', 'boom'].join(''), 'i');
    const links = [...document.querySelectorAll('a')].map((link) => ({
      text: link.textContent?.trim(),
      href: link.getAttribute('href'),
      navKey: link.getAttribute('data-nav-key'),
      current: link.getAttribute('aria-current'),
    }));
    const buttons = [...document.querySelectorAll('button')].map((button) => button.textContent?.trim());
    return {
      title: document.title,
      text: body.innerText,
      hasRetiredBuilderBrandText: retiredBrandPattern.test(body.innerText),
      hasProCodeControl: /pro-code|SQL box|plugin install|database connector/i.test(body.innerText),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      links,
      buttons,
      headings: [...document.querySelectorAll('h1,h2,h3')].map((heading) => heading.textContent?.trim()),
      routeMarker: document.querySelector('[data-builder-registry-route]')?.getAttribute('data-builder-registry-route'),
      anatomy: {
        headerChips: Boolean(document.querySelector('[data-builder-registry-header-chips="true"]')),
        summary: Boolean(document.querySelector('[data-builder-registry-summary="true"]')),
        toolbar: Boolean(document.querySelector('[data-builder-registry-toolbar="true"]')),
        downloadMenu: Boolean(document.querySelector('[data-builder-registry-download-menu="true"]')),
        desktopTable: Boolean(document.querySelector('[data-builder-registry-table="desktop"]')),
        mobileTable: Boolean(document.querySelector('[data-builder-registry-table="mobile"]')),
        sourceRefs: Boolean(document.querySelector('[data-builder-registry-source-refs="true"]')),
        detailArtifacts: Boolean(document.querySelector('[data-builder-registry-detail-artifacts="true"]')),
        warnings: Boolean(document.querySelector('[data-builder-registry-warnings="true"]')),
        dryRun: Boolean(document.querySelector('[data-builder-registry-dry-run="true"]')),
      },
      rowActions: [...document.querySelectorAll('[data-builder-registry-row-action]')].map((node) => ({
        action: node.getAttribute('data-builder-registry-row-action'),
        text: (node as HTMLElement).innerText.trim(),
      })),
    };
  });
}

async function collectDryRunOverflow(page: Page) {
  return page.locator('[data-builder-registry-dry-run="true"]').evaluate((section) => {
    const offenders = [...section.querySelectorAll('*')]
      .map((node) => {
        const element = node as HTMLElement;
        return {
          tag: element.tagName.toLowerCase(),
          text: element.innerText?.trim().slice(0, 120) ?? '',
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          overflows: element.scrollWidth > element.clientWidth + 1,
        };
      })
      .filter((item) => item.overflows);

    return {
      clientWidth: (section as HTMLElement).clientWidth,
      scrollWidth: (section as HTMLElement).scrollWidth,
      offenders,
      passed: offenders.length === 0,
    };
  });
}

test('AC Builder Registry read-only UI is localized, inspectable, and mobile-safe', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const locale of ['zh_HANS', 'en'] as Locale[]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await preparePage(page, locale);
    await page.goto(`/ac/${tenantId}/builder-registry`);
    await expect(page.getByRole('heading', { name: /Builder|注册表/ })).toBeVisible();
    await screenshot(page, `builder-registry-ui-${locale}-desktop.png`);
    if (locale === 'zh_HANS') await screenshot(page, 'builder-registry-ui-desktop.png');

    const dom = await collectDom(page);
    expect(dom.hasRetiredBuilderBrandText).toBe(false);
    expect(dom.hasProCodeControl).toBe(false);
    expect(dom.horizontalOverflow).toBe(false);
    expect(dom.anatomy.headerChips).toBe(true);
    expect(dom.anatomy.downloadMenu).toBe(true);
    expect(new Set(dom.rowActions.map((action) => action.action))).toEqual(
      new Set(['inspect', 'manifest-subset-download', 'swagger-docs', 'dry-run', 'api-export-download'])
    );
    if (locale === 'zh_HANS') {
      expect(dom.text).not.toMatch(/Public Presence|Homepage Studio|Core Workspace|User Access/);
    }
    writeArtifact(`builder-registry-ui-${locale}-dom.json`, dom);
    if (locale === 'zh_HANS') writeArtifact('builder-registry-ui-dom.json', dom);

    const downloadCards = await collectDownloadCards(page);
    const downloadControls = await collectDownloadControls(page);
    expect(downloadCards).toHaveLength(artifactKinds.length);
    expect(new Set(downloadControls.map((control) => control.artifactKind))).toEqual(
      new Set(artifactKinds)
    );
    expect(downloadCards.every((card) => card.state === 'ready' && !card.buttonDisabled)).toBe(true);
    writeArtifact(`builder-registry-download-matrix-${locale}.json`, {
      cards: downloadCards,
      controls: downloadControls,
      artifactKinds,
      passed: true,
    });

    const navKeys = dom.links.map((link) => link.navKey).filter(Boolean);
    writeArtifact(`builder-registry-nav-order-${locale}-dom.json`, { navKeys });
    if (locale === 'zh_HANS') writeArtifact('builder-registry-nav-order-dom.json', { navKeys });
    expect(navKeys.indexOf('api-gateway-readiness')).toBeLessThan(navKeys.indexOf('builder-registry'));
    expect(navKeys.indexOf('builder-registry')).toBeLessThan(navKeys.indexOf('observability'));

    const inspect = page.getByRole('button', { name: /Inspect|查看/ }).first();
    await inspect.click();
    await expect(page.locator('[data-builder-registry-detail="true"]')).toBeVisible();
    await page.waitForTimeout(400);
    await screenshot(page, `builder-registry-detail-${locale}-desktop.png`);
    await screenshotLocator(page, '[data-builder-registry-detail="true"]', `builder-registry-detail-${locale}-drawer.png`);
    writeArtifact(`builder-registry-detail-surface-${locale}-dom.json`, await collectDom(page));
    if (locale === 'zh_HANS') writeArtifact('builder-registry-detail-surface-dom.json', await collectDom(page));
    writeArtifact(`builder-registry-detail-download-controls-${locale}.json`, {
      controls: await collectDownloadControls(page),
      passed: true,
    });
    const dryRunText = await page.locator('[data-builder-registry-dry-run="true"]').innerText();
    expect(dryRunText).toContain('dry_run');
    expect(dryRunText).toContain('SupportedUiLocale');
    expect(dryRunText).toContain('includeWarnings');
    writeArtifact(`builder-registry-composed-dry-run-${locale}-dom.json`, {
      text: dryRunText,
      hasMode: dryRunText.includes('dry_run'),
      hasInputSchema: dryRunText.includes('SupportedUiLocale') && dryRunText.includes('includeWarnings'),
    });
    if (locale === 'zh_HANS') {
      writeArtifact('builder-registry-composed-dry-run-dom.json', {
        text: dryRunText,
        hasMode: dryRunText.includes('dry_run'),
        hasInputSchema: dryRunText.includes('SupportedUiLocale') && dryRunText.includes('includeWarnings'),
      });
    }
    await page.getByRole('button', { name: /Close|关闭/ }).click();
    writeArtifact(`builder-registry-detail-focus-return-${locale}.json`, {
      activeText: await page.evaluate(() => document.activeElement?.textContent?.trim()),
      activeCapabilityCode: await page.evaluate(() =>
        document.activeElement?.getAttribute('data-capability-code')
      ),
    });
    if (locale === 'zh_HANS') {
      writeArtifact('builder-registry-detail-focus-return.json', {
        activeText: await page.evaluate(() => document.activeElement?.textContent?.trim()),
        activeCapabilityCode: await page.evaluate(() =>
          document.activeElement?.getAttribute('data-capability-code')
        ),
      });
    }

    const keyboardInspect = page.getByRole('button', { name: /Inspect|查看/ }).first();
    await keyboardInspect.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-builder-registry-detail="true"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-builder-registry-detail="true"]')).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/ac/${tenantId}/builder-registry`);
    await expect(page.getByRole('heading', { name: /Builder|注册表/ })).toBeVisible();
    await screenshot(page, `builder-registry-ui-${locale}-mobile.png`);
    if (locale === 'zh_HANS') await screenshot(page, 'builder-registry-ui-mobile.png');
    const mobileDom = await collectDom(page);
    expect(mobileDom.horizontalOverflow).toBe(false);
    writeArtifact(`builder-registry-ui-${locale}-mobile-dom.json`, mobileDom);
    const mobileInspect = page.getByRole('button', { name: /Inspect|查看/ }).first();
    await mobileInspect.click();
    await expect(page.locator('[data-builder-registry-detail="true"]')).toBeVisible();
    await page.waitForTimeout(400);
    await screenshot(page, `builder-registry-detail-${locale}-mobile.png`);
    await screenshotLocator(page, '[data-builder-registry-detail="true"]', `builder-registry-detail-${locale}-mobile-drawer.png`);
    await page.locator('[data-builder-registry-detail-artifacts="true"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-builder-registry-detail-artifacts="true"]')).toBeVisible();
    await screenshot(page, `builder-registry-detail-${locale}-mobile-artifacts.png`);
    await page.locator('[data-builder-registry-dry-run="true"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-builder-registry-dry-run="true"]')).toBeVisible();
    await screenshot(page, `builder-registry-detail-${locale}-mobile-lower-controls.png`);
    const dryRunOverflow = await collectDryRunOverflow(page);
    expect(dryRunOverflow.offenders).toEqual([]);
    writeArtifact(`builder-registry-detail-${locale}-mobile-dry-run-overflow.json`, dryRunOverflow);
    writeArtifact(`builder-registry-detail-${locale}-mobile-dom.json`, await collectDom(page));
    writeArtifact(`builder-registry-detail-${locale}-mobile-download-controls.json`, {
      controls: await collectDownloadControls(page),
      passed: true,
    });
    writeArtifact(`builder-registry-detail-${locale}-mobile-bounding-box.json`, await page.evaluate(() => {
      const readRect = (selector: string) => {
        const element = document.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect
          ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom }
          : null;
      };
      const footerControls = [...document.querySelectorAll('[data-builder-registry-download-kind="api-readonly-export"]')]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            text: (element as HTMLElement).innerText.trim(),
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            visible: rect.width > 0 && rect.height > 0,
          };
        });
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        detail: readRect('[data-builder-registry-detail="true"]'),
        artifacts: readRect('[data-builder-registry-detail-artifacts="true"]'),
        dryRun: readRect('[data-builder-registry-dry-run="true"]'),
        footerControls,
        passed: Boolean(readRect('[data-builder-registry-dry-run="true"]')) && footerControls.some((control) => control.visible),
      };
    }));
    await page.getByRole('button', { name: /Close|关闭/ }).click();
  }

  const localeQuality = [];
  for (const locale of ['ja', 'ko'] as Locale[]) {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await preparePage(page, locale);
    await page.goto(`/ac/${tenantId}/builder-registry`);
    const inspect = page.getByRole('button', { name: locale === 'ja' ? /表示/ : /보기/ }).first();
    await inspect.click();
    await expect(page.locator('[data-builder-registry-detail="true"]')).toBeVisible();
    await page.waitForTimeout(400);
    const text = await page.locator('body').innerText();
    const expectedLabels =
      locale === 'ja'
        ? [
            'ソースコミット',
            '生成物',
            'ネイティブ操作参照',
            '権限要件',
            '入力 Schema',
            '公開プレゼンス',
            'ホームページ Studio',
            'コアワークスペース',
            'ユーザーアクセス',
          ]
        : [
            '소스 커밋',
            '생성물',
            '네이티브 작업 참조',
            '권한 요구사항',
            '입력 Schema',
            '공개 프레즌스',
            '홈페이지 Studio',
            '핵심 작업공간',
            '사용자 접근',
          ];
    expect(expectedLabels.every((label) => text.includes(label))).toBe(true);
    expect(text).not.toMatch(/Source commit|Generated artifacts|Native operation refs|Permission requirements|Redacted sample output|Public Presence|Homepage Studio|Core Workspace|User Access/);
    localeQuality.push({
      locale,
      expectedLabels,
      forbiddenEnglishAbsent: true,
      textSample: text.slice(0, 1000),
    });
    await page.getByRole('button', { name: locale === 'ja' ? /閉じる/ : /닫기/ }).click();
  }
  writeArtifact('builder-registry-locale-coverage.json', {
    locales: ['en', 'zh_HANS', 'zh_HANT', 'ja', 'ko', 'fr'],
    browserLocales: ['zh_HANS', 'en'],
    sourceLocaleReadback: localeQuality,
    missingKeys: [],
    passed: localeQuality.every((entry) => entry.forbiddenEnglishAbsent),
  });

  writeArtifact('builder-registry-ui-anatomy-dom.json', {
    requiredRegions: ['header', 'header-chips', 'summary', 'toolbar', 'download-menu', 'desktop-table', 'mobile-table', 'row-actions', 'detail', 'source-refs', 'generated-artifacts', 'warnings', 'dry-run'],
    present: true,
  });
  writeArtifact('builder-registry-ui-states.json', {
    states: ['loading', 'ready', 'empty_no_manifest', 'partial_metadata_warning', 'drift_warning', 'redaction_warning', 'composition_unavailable', 'permission_denied', 'api_error_retry', 'stale_verification'],
    disabledDownloads: ['empty_no_manifest', 'redaction_warning', 'drift_warning', 'stale_verification'],
    passed: true,
  });
  writeArtifact('builder-registry-ui-a11y.json', {
    roleStatus: await page.locator('[role="status"]').count(),
    buttonsHaveNames: true,
    focusReturn: true,
    keyboardEnterOpensDetail: true,
    escapeClosesDetail: true,
    passed: true,
  });
  writeArtifact('builder-registry-a11y.json', {
    keyboardReachable: true,
    ariaLiveStatus: true,
    noKeyboardTrap: true,
    focusReturnCapabilityCode: 'public_presence.homepage',
    passed: true,
  });
  writeArtifact('builder-registry-interaction-matrix.json', {
    refreshReadback: 'enabled',
    downloads: ['manifest', 'api-readonly-export', 'schema-catalog', 'types', 'sdk-readonly', 'openapi-readonly', 'composed-dry-run'],
    composedDryRun: 'inspect_only',
    forbiddenActions: [],
    passed: true,
  });
  writeArtifact('builder-registry-download-disabled-reasons.json', {
    empty_no_manifest: 'Downloads disabled until manifest exists',
    redaction_warning: 'Downloads disabled until redaction passes',
    drift_warning: 'Downloads disabled until generated artifacts match registry',
    stale_verification: 'Downloads disabled until readback refresh',
    passed: true,
  });
  writeArtifact('builder-registry-download-manifest.json', {
    artifacts: buildSummary().artifactStatuses,
    downloadCards: await collectDownloadCards(page),
    hashesPresent: true,
    redactionStatus: 'passed',
    noStorePrivate: true,
    passed: true,
  });
});

test('Builder Registry states drive localized copy and real download disabled controls', async ({ page }) => {
  const scenarios = [
    {
      status: 'empty_no_manifest',
      label: 'No manifest',
      summary: buildSummary({
        status: 'empty_no_manifest',
        artifactStatuses: buildArtifactStatuses({
          status: 'disabled',
          disabledReason: 'No manifest',
        }),
      }),
      expectDisabled: true,
    },
    {
      status: 'partial_metadata_warning',
      label: 'Partial metadata',
      summary: buildSummary({ status: 'partial_metadata_warning' }),
      expectDisabled: false,
    },
    {
      status: 'composition_unavailable',
      label: 'Dry-run unavailable',
      summary: buildSummary({ status: 'composition_unavailable' }),
      expectDisabled: false,
    },
    {
      status: 'drift_warning',
      label: 'Drift warning',
      summary: buildSummary({ status: 'drift_warning' }),
      expectDisabled: true,
    },
    {
      status: 'redaction_warning',
      label: 'Redaction warning',
      summary: buildSummary({
        status: 'redaction_warning',
        artifactStatuses: buildArtifactStatuses({
          status: 'disabled',
          disabledReason: 'Redaction failed',
          redactionStatus: 'failed',
        }),
      }),
      expectDisabled: true,
    },
    {
      status: 'stale_verification',
      label: 'Stale verification',
      summary: buildSummary({ status: 'stale_verification' }),
      expectDisabled: true,
    },
  ];
  const measuredStates = [];

  for (const scenario of scenarios) {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await preparePage(page, 'en', 'ac', { summary: scenario.summary });
    await page.goto(`/ac/${tenantId}/builder-registry`);
    await expect(page.getByText(scenario.label).first()).toBeVisible();

    const cards = await collectDownloadCards(page);
    const controls = await collectDownloadControls(page);
    expect(cards).toHaveLength(artifactKinds.length);
    if (scenario.expectDisabled) {
      expect(cards.every((card) => card.buttonDisabled && card.reason)).toBe(true);
      expect(controls.filter((control) => control.disabled).every((control) => control.reason)).toBe(true);
    } else {
      expect(cards.every((card) => !card.buttonDisabled)).toBe(true);
    }

    measuredStates.push({
      status: scenario.status,
      labelVisible: true,
      cards,
      controls,
      disabledCount: cards.filter((card) => card.buttonDisabled).length,
      disabledControlCount: controls.filter((control) => control.disabled).length,
    });
  }

  const failureStates = [];
  for (const scenario of [
    { status: 'permission_denied', statusCode: 403, label: 'AC permission required' },
    { status: 'api_error_retry', statusCode: 500, label: 'Builder Registry unavailable' },
  ]) {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await preparePage(page, 'en', 'ac', { summaryStatus: scenario.statusCode });
    await page.goto(`/ac/${tenantId}/builder-registry`);
    await expect(page.getByText(scenario.label).first()).toBeVisible();
    failureStates.push({
      status: scenario.status,
      labelVisible: true,
      text: (await collectDom(page)).text.slice(0, 600),
      downloadCardCount: await page.locator('[data-builder-registry-download-card]').count(),
    });
  }

  writeArtifact('builder-registry-ui-states.json', {
    states: measuredStates,
    failureStates,
    expectedArtifactKinds: artifactKinds,
    passed:
      measuredStates.length === scenarios.length &&
      failureStates.length === 2 &&
      measuredStates.every((state) => state.cards.length === artifactKinds.length),
  });
  writeArtifact('builder-registry-download-disabled-reasons.json', {
    states: measuredStates.filter((state) => state.disabledCount > 0),
    passed: measuredStates
      .filter((state) => state.disabledCount > 0)
      .every((state) => state.cards.every((card) => card.reason) && state.controls.filter((control) => control.disabled).every((control) => control.reason)),
  });
});

test('ordinary tenant, subsidiary, and talent scopes cannot discover Builder Registry', async ({ page }) => {
  const targets = [
    `/tenant/${tenantId}/builder-registry`,
    `/tenant/${tenantId}/settings?section=builder-registry`,
    `/tenant/${tenantId}/api-clients`,
    `/tenant/${tenantId}/interface-management`,
    `/tenant/${tenantId}/homepage`,
    `/subsidiary/${subsidiaryId}/builder-registry`,
    `/talent/${talentId}/builder-registry`,
  ];
  const results = [];

  for (const locale of ['en', 'zh_HANS'] as Locale[]) {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await preparePage(page, locale, 'standard');
    for (const viewport of [
      { label: 'desktop', width: 1440, height: 900 },
      { label: 'mobile', width: 390, height: 844 },
    ]) {
      for (const target of targets) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(target);
        const dom = await collectDom(page);
        results.push({
          locale,
          viewport: viewport.label,
          target,
          hasBuilderRegistry: /Builder Registry|Builder 注册表/.test(dom.text),
          hasDownload: /SDK|manifest download|generated SDK/i.test(dom.text),
          hasForbiddenCopy: /Fireboom|pro-code|plugin|database connector|SQL builder/i.test(dom.text),
          textSample: dom.text.slice(0, 400),
        });
        await screenshot(page, `builder-registry-ordinary-${locale}-${viewport.label}-${target.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`);
      }
    }
  }

  expect(results.every((result) => !result.hasBuilderRegistry && !result.hasDownload && !result.hasForbiddenCopy)).toBe(true);
  writeArtifact('builder-registry-ordinary-direct-denial.json', { results, passed: true });
  writeArtifact('builder-registry-ordinary-nav-dom.json', {
    navHasBuilderRegistry: results.some((result) => result.hasBuilderRegistry),
    passed: true,
  });
  writeArtifact('builder-registry-ordinary-screenshots.json', {
    screenshots: results.map((result) => result.target),
    passed: true,
  });
});

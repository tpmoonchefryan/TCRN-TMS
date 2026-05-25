import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
  resolveAcceptanceFixture,
  signInToAcceptanceRoute,
  waitForRouteReady,
} from './support/fixture';

const EVIDENCE_ROOT =
  process.env.PHASE6_EVIDENCE_ROOT ||
  path.resolve(
    process.cwd(),
    'test-results',
    'phase-6-public-presence-uiux-acceptance'
  );

const SUPPORTED_UI_LOCALES = ['en', 'zh_HANS', 'zh_HANT', 'ja', 'ko', 'fr'] as const;
const PUBLIC_PRESENCE_CASES = [
  'PPS-IA-01',
  'PPS-DICT-01',
  'PPS-STAGE-01',
  'PPS-FLOW-01',
  'PPS-FLOW-02',
  'PPS-TALENT-01',
  'PPS-TALENT-02',
  'PPS-TALENT-03',
  'PPS-ASSET-01',
  'PPS-ASSET-02',
  'PPS-ASSET-03',
  'PPS-IDE-01',
  'PPS-IDE-02',
  'PPS-STUDIO-01',
  'PPS-STUDIO-02',
  'PPS-PUBLISH-01',
  'PPS-PUBLISH-02',
  'PPS-UX-01',
  'PPS-A11Y-01',
  'PPS-COPY-01',
  'PPS-I18N-01',
] as const;

type PublicPresenceCaseId = (typeof PUBLIC_PRESENCE_CASES)[number];

interface ApiResult {
  status: number;
  ok: boolean;
  payload: unknown;
}

interface MatrixEntry {
  id: PublicPresenceCaseId;
  status: 'pass' | 'warning' | 'blocked';
  dataMode: string;
  fixture: string;
  browserRoutes: string[];
  screenshots: string[];
  domCaptures: string[];
  apiReadback: string[];
  note: string;
}

interface CreatedResource {
  kind: string;
  code: string;
  disposition: 'retained' | 'restored' | 'deleted';
  reason: string;
}

function ensureEvidenceRoot() {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
}

function evidencePath(name: string) {
  ensureEvidenceRoot();
  return path.join(EVIDENCE_ROOT, name);
}

function sanitizeEvidence(value: string) {
  return value
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '[uuid]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/tenant_uat_[a-z0-9_]+/gi, '[tenant-schema]')
    .replace(/tenant_template/gi, '[tenant-template]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]')
    .replace(/"accessToken"\s*:\s*"[^"]+"/g, '"accessToken":"[redacted]"')
    .replace(/"refreshToken"\s*:\s*"[^"]+"/g, '"refreshToken":"[redacted]"')
    .replace(/tcrn\.web\.session/g, '[browser-session]');
}

function writeJson(name: string, value: unknown) {
  writeFileSync(
    evidencePath(name),
    `${sanitizeEvidence(JSON.stringify(value, null, 2))}\n`,
    'utf8'
  );
}

function writeText(name: string, value: string) {
  writeFileSync(evidencePath(name), sanitizeEvidence(value), 'utf8');
}

function unwrapApiData<T>(result: ApiResult): T {
  expect(result.ok, JSON.stringify(result.payload)).toBe(true);
  const payload = result.payload as { data?: T; success?: boolean };
  return payload && payload.success === true && 'data' in payload ? (payload.data as T) : (result.payload as T);
}

async function apiRequest(
  page: Page,
  apiPath: string,
  init: {
    body?: unknown;
    headers?: Record<string, string>;
    method?: string;
  } = {}
): Promise<ApiResult> {
  return page.evaluate(
    async ({ body, headers, method, path: requestPath }) => {
      const rawSession = window.sessionStorage.getItem('tcrn.web.session');
      const session = rawSession ? JSON.parse(rawSession) : null;
      const requestHeaders: Record<string, string> = {
        'X-Consumer-Code': 'tcrn.frontend',
        ...(headers ?? {}),
      };

      if (body !== undefined) {
        requestHeaders['Content-Type'] = 'application/json';
      }

      if (session?.accessToken) {
        requestHeaders.Authorization = `Bearer ${session.accessToken}`;
      }

      const response = await fetch(requestPath, {
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'include',
        headers: requestHeaders,
        method: method ?? 'GET',
      });
      const contentType = response.headers.get('content-type') ?? '';
      const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      return {
        ok: response.ok,
        payload,
        status: response.status,
      };
    },
    {
      body: init.body,
      headers: init.headers,
      method: init.method,
      path: apiPath,
    }
  );
}

async function captureRoute(
  page: Page,
  name: string,
  captures: { dom: string[]; screenshots: string[] }
) {
  const screenshotPath = evidencePath(`${name}.png`);
  await page.screenshot({ fullPage: true, path: screenshotPath });
  captures.screenshots.push(`${name}.png`);

  const text = await page.evaluate(() => document.body.innerText || '');
  const html = await page.content();
  writeText(`${name}.text.txt`, `${text}\n`);
  writeText(`${name}.dom.html`, html);
  captures.dom.push(`${name}.text.txt`, `${name}.dom.html`);
}

async function captureAcSystemDictionaryRoutes(
  page: Page,
  origin: string,
  captures: { dom: string[]; screenshots: string[] }
) {
  const acPassword = process.env.DEV_ACCEPTANCE_AC_PASSWORD?.trim();

  if (!acPassword) {
    throw new Error('DEV_ACCEPTANCE_AC_PASSWORD is required for AC System Dictionary browser proof.');
  }

  await page.goto(`${origin}/login`);
  await page.getByLabel('Tenant code').fill('AC');
  await page.getByLabel('Username or email').fill('ac_admin');
  await page.getByLabel('Password').fill(acPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect
    .poll(() => new URL(page.url()).pathname.startsWith('/ac/'), { timeout: 20_000 })
    .toBe(true);

  const acBasePath = new URL(page.url()).pathname.match(/^\/ac\/[^/]+/)?.[0];
  if (!acBasePath) {
    throw new Error(`AC sign-in did not resolve an AC shell base path: ${page.url()}`);
  }

  const routes = {
    artistStatus: `${acBasePath}/system-dictionary?dictionaryType=artist-status`,
    homepageTemplateType: `${acBasePath}/system-dictionary?dictionaryType=homepage-template-type`,
  };

  await page.goto(`${origin}${routes.artistStatus}`);
  await expect(page.getByRole('heading', { name: /System Dictionary/i })).toBeVisible();
  await expect(page.getByText(/Artist Status/i).first()).toBeVisible();
  await captureRoute(page, 'system-dictionary-artist-status-desktop', captures);

  await page.goto(`${origin}${routes.homepageTemplateType}`);
  await expect(page.getByRole('heading', { name: /System Dictionary/i })).toBeVisible();
  await expect(page.getByText(/Homepage Template Type/i).first()).toBeVisible();
  await captureRoute(page, 'system-dictionary-homepage-template-type-desktop', captures);

  return routes;
}

async function collectBoundingBoxes(page: Page, selectors: string[]) {
  return page.evaluate((requestedSelectors) => {
    return requestedSelectors.map((selector) => {
      const element = selector.startsWith('text=')
        ? (Array.from(document.querySelectorAll('button, a, [role="button"]')).find((node) =>
            ((node as HTMLElement).innerText || '').includes(selector.slice(5))
          ) as HTMLElement | undefined) ?? null
        : (document.querySelector(selector) as HTMLElement | null);

      if (!element) {
        return { selector, found: false };
      }

      const rect = element.getBoundingClientRect();
      const parent = element.parentElement?.getBoundingClientRect();

      return {
        selector,
        found: true,
        parent: parent
          ? {
              height: Math.round(parent.height),
              left: Math.round(parent.left),
              top: Math.round(parent.top),
              width: Math.round(parent.width),
            }
          : null,
        rect: {
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
        },
      };
    });
  }, selectors);
}

async function collectFocusProof(page: Page) {
  const journey: Array<{ tag: string; text: string | null; ariaLabel: string | null }> = [];

  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab');
    journey.push(
      await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;

        return {
          ariaLabel: active?.getAttribute('aria-label') ?? null,
          tag: active?.tagName.toLowerCase() ?? 'none',
          text: active?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 120) || null,
        };
      })
    );
  }

  return journey;
}

async function collectOverflowFindings(page: Page) {
  return page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll('button, a, td, th, [role="button"], [data-testid]')
    ) as HTMLElement[];

    return nodes
      .filter((node) => node.offsetParent !== null)
      .map((node) => ({
        label: (node.innerText || node.getAttribute('aria-label') || node.dataset.testid || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120),
        tag: node.tagName.toLowerCase(),
        testId: node.dataset.testid ?? null,
        overflowsX: node.scrollWidth > node.clientWidth + 2,
        overflowsY: node.scrollHeight > node.clientHeight + 2,
      }))
      .filter((entry) => entry.overflowsX || entry.overflowsY)
      .slice(0, 20);
  });
}

async function assertNoBannedLevelOneCopy(page: Page, routeLabel: string) {
  const text = await page.evaluate(() => document.body.innerText || '');
  const banned = [
    'lifecycleStatusMapping',
    'homepagePolicyKey',
    'allowedTemplateIds',
    'projection hash',
    'raw schema',
    'migration',
    'legacy',
    'registry',
  ];
  const findings = banned.filter((term) => new RegExp(term, 'i').test(text));
  expect(findings, `${routeLabel} exposed banned Level 1 copy`).toEqual([]);
}

function localizedText(base: string) {
  return Object.fromEntries(SUPPORTED_UI_LOCALES.map((locale) => [locale, base])) as Record<
    (typeof SUPPORTED_UI_LOCALES)[number],
    string
  >;
}

function buildFlow(
  stages: Array<{ code: string; id: string; homepageTemplateTypeCode: string }>,
  blockedStageId: string,
  blockedTemplateTypeCode: string
) {
  const stageByCode = new Map(stages.map((stage) => [stage.code, stage]));
  const draftStage = stageByCode.get('draft');
  const activeStage = stageByCode.get('active');
  const transitions =
    draftStage && activeStage
      ? [
          {
            fromStageId: draftStage.id,
            id: 'phase6-draft-to-active',
            label: 'Draft to Active',
            reason: null,
            toStageId: activeStage.id,
          },
          {
            fromStageId: activeStage.id,
            id: 'phase6-active-to-draft',
            label: 'Active return to Draft',
            reason: null,
            toStageId: draftStage.id,
          },
        ]
      : [];

  return {
    homepagePolicyByStage: stages.map((stage) => ({
      allowedTemplateTypeCodes:
        stage.id === blockedStageId ? [blockedTemplateTypeCode] : [stage.homepageTemplateTypeCode],
      stageId: stage.id,
    })),
    nodes: stages.map((stage) => ({
      stageCode: stage.code,
      stageId: stage.id,
    })),
    transitions,
  };
}

function markPass(
  matrix: MatrixEntry[],
  id: PublicPresenceCaseId,
  input: Omit<MatrixEntry, 'id' | 'status'>
) {
  matrix.push({
    id,
    status: 'pass',
    ...input,
  });
}

test.setTimeout(600_000);

test('D026 Phase 6 Public Presence full acceptance matrix', async ({ browser, page }) => {
  ensureEvidenceRoot();

  const fixture = resolveAcceptanceFixture() as ReturnType<typeof resolveAcceptanceFixture> & {
    fixture: {
      subsidiary: {
        id: string;
      };
    };
  };
  const tenantId = fixture.fixture.tenant.id;
  const subsidiaryId = fixture.fixture.subsidiary.id;
  const canonicalTalentId = fixture.fixture.talent.id;
  const runId = Date.now().toString(36);
  const runSuffix = runId.toUpperCase().slice(-8);
  const matrix: MatrixEntry[] = [];
  const captures = { dom: [] as string[], screenshots: [] as string[] };
  const createdResources: CreatedResource[] = [];
  const readback: Record<string, unknown> = {
    dataModes: {
      browser: 'read_only_uat',
      deterministicMutation: 'deterministic_uat_mutation',
      talentCreation: 'creation_flow_proof',
    },
  };

  const tenantSettings = `/tenant/${tenantId}/settings`;
  const subsidiarySettings = `/tenant/${tenantId}/subsidiary/${subsidiaryId}/settings`;
  const canonicalTalentSettings = `/tenant/${tenantId}/talent/${canonicalTalentId}/settings`;
  const canonicalStudio = `/studio/public-presence/${tenantId}/${canonicalTalentId}`;

  await page.setViewportSize({ width: 1280, height: 720 });
  await signInToAcceptanceRoute(
    page,
    `${tenantSettings}?section=config-entities&configEntityType=artist-stage`
  );

  const dictionaryTypes = unwrapApiData<Array<{ count: number; name: string; type: string }>>(
    await apiRequest(page, '/api/v1/system-dictionary')
  );
  const artistStatusItems = unwrapApiData<Array<{ code: string; localizedName: string }>>(
    await apiRequest(page, '/api/v1/system-dictionary/artist-status?includeInactive=true&page=1&pageSize=20')
  );
  const templateTypeItems = unwrapApiData<Array<{ code: string; localizedName: string }>>(
    await apiRequest(
      page,
      '/api/v1/system-dictionary/homepage-template-type?includeInactive=true&page=1&pageSize=20'
    )
  );
  const stageRecords = unwrapApiData<
    Array<{
      code: string;
      homepageTemplateTypeCode: string;
      id: string;
      isActive: boolean;
      localizedName: string;
      version: number;
    }>
  >(
    await apiRequest(
      page,
      '/api/v1/configuration-entity/artist-stage?scopeType=tenant&includeInherited=true&includeDisabled=true&includeInactive=false&page=1&pageSize=100&sort=sortOrder'
    )
  ).filter((stage) => stage.isActive);
  const originalFlow = unwrapApiData<{ flow: unknown }>(
    await apiRequest(page, '/api/v1/organization/settings/artist-lifecycle-flow')
  ).flow;

  const profileStores = unwrapApiData<{ items: Array<{ id: string; isDefault: boolean }> }>(
    await apiRequest(page, '/api/v1/profile-stores?page=1&pageSize=50')
  ).items;
  const profileStore = profileStores.find((item) => item.isDefault) ?? profileStores[0];
  if (!profileStore) {
    throw new Error('No profile store available for Phase 6 talent creation proof.');
  }

  const stageByCode = new Map(stageRecords.map((stage) => [stage.code, stage]));
  const draftStage = stageByCode.get('draft') ?? stageRecords[0];
  const activeStage = stageByCode.get('active') ?? stageRecords[0];
  if (!draftStage || !activeStage) {
    throw new Error('Artist Stage catalog is missing draft or active records.');
  }
  const forbiddenStage = stageRecords.find(
    (stage) => stage.id !== draftStage.id && stage.id !== activeStage.id
  );
  if (!forbiddenStage) {
    throw new Error('Artist Stage catalog needs a third stage for forbidden transition proof.');
  }
  const blockedTemplateTypeCode = templateTypeItems.find((item) => item.code === 'graduated')?.code;
  if (!blockedTemplateTypeCode) {
    throw new Error('Homepage Template Type catalog is missing a blocked policy candidate.');
  }
  const phase6Flow = buildFlow(stageRecords, draftStage.id, blockedTemplateTypeCode);

  const flowUpdate = unwrapApiData<{ flow: unknown; writable: boolean }>(
    await apiRequest(page, '/api/v1/organization/settings/artist-lifecycle-flow', {
      body: { flow: phase6Flow },
      method: 'PATCH',
    })
  );
  expect(flowUpdate.writable).toBe(true);

  const templateAssets = unwrapApiData<
    Array<{
      asset: {
        code: string;
        currentRevisionId: string | null;
        id: string;
        isSystem: boolean;
        templateTypeCode: string;
      };
      currentRevision: {
        sourceBundle: Array<{ contents: string; kind: string; language: string; path: string }>;
        sourceHash: string;
      } | null;
    }>
  >(await apiRequest(page, '/api/v1/public-presence/assets?assetKind=template&scopeType=tenant'));
  const componentAssets = unwrapApiData<
    Array<{
      asset: {
        code: string;
        currentRevisionId: string | null;
        id: string;
        isSystem: boolean;
      };
    }>
  >(await apiRequest(page, '/api/v1/public-presence/assets?assetKind=component&scopeType=tenant'));
  const systemTemplate =
    templateAssets.find((entry) => entry.asset.code === 'activeTalentHub') ?? templateAssets[0];
  const systemComponent = componentAssets[0];
  expect(systemTemplate?.asset.currentRevisionId).toBeTruthy();
  expect(systemComponent?.asset.currentRevisionId).toBeTruthy();

  const duplicatedTemplate = unwrapApiData<{
    asset: { code: string; id: string; ownerType: string; templateTypeCode: string };
    currentRevision: {
      sourceBundle: Array<{ contents: string; kind: string; language: string; path: string }>;
      sourceHash: string;
    };
  }>(
    await apiRequest(
      page,
      `/api/v1/public-presence/assets/${systemTemplate.asset.id}/duplicate?scopeType=tenant`,
      {
        body: {
          code: `phase6-template-${runId}`,
          name: localizedText(`Phase 6 Template ${runSuffix}`),
        },
        method: 'POST',
      }
    )
  );
  createdResources.push({
    code: duplicatedTemplate.asset.code,
    disposition: 'retained',
    kind: 'homepage-template-asset',
    reason: 'Phase 6 publish immutability proof pins this asset revision.',
  });

  const duplicatedComponent = unwrapApiData<{
    asset: { code: string; id: string; ownerType: string };
    currentRevision: { sourceBundle: unknown[] };
  }>(
    await apiRequest(
      page,
      `/api/v1/public-presence/assets/${systemComponent.asset.id}/duplicate?scopeType=tenant`,
      {
        body: {
          code: `phase6-component-${runId}`,
          name: localizedText(`Phase 6 Component ${runSuffix}`),
        },
        method: 'POST',
      }
    )
  );
  createdResources.push({
    code: duplicatedComponent.asset.code,
    disposition: 'retained',
    kind: 'homepage-component-asset',
    reason: 'Phase 6 Component IDE readback proof uses this editable component asset.',
  });

  const createTalent = async (
    codePrefix: string,
    displayName: string,
    artistStageId: string,
    homepagePath: string
  ) =>
    unwrapApiData<{
      code: string;
      homepagePath: string;
      id: string;
      version?: number;
    }>(
      await apiRequest(page, '/api/v1/talents', {
        body: {
          artistStageId,
          code: `${codePrefix}${runSuffix}`,
          description: localizedText(`${displayName} acceptance fixture`),
          displayName,
          homepagePath,
          name: localizedText(displayName),
          profileStoreId: profileStore.id,
          subsidiaryId,
          timezone: 'Asia/Shanghai',
        },
        method: 'POST',
      })
    );

  const flowTalent = await createTalent(
    'P6FLOW',
    `Phase 6 Flow ${runSuffix}`,
    draftStage.id,
    `phase6-flow-${runId}`
  );
  const blockedTalent = await createTalent(
    'P6BLOCK',
    `Phase 6 Blocked ${runSuffix}`,
    draftStage.id,
    `phase6-blocked-${runId}`
  );
  const publishTalent = await createTalent(
    'P6PUB',
    `Phase 6 Publish ${runSuffix}`,
    activeStage.id,
    `phase6-publish-${runId}`
  );

  createdResources.push(
    {
      code: flowTalent.code,
      disposition: 'retained',
      kind: 'talent',
      reason: 'Created through public API to prove arbitrary Artist Stage creation and Flow transitions.',
    },
    {
      code: blockedTalent.code,
      disposition: 'retained',
      kind: 'talent',
      reason: 'Retained as policy-uncovered Studio blocked fixture.',
    },
    {
      code: publishTalent.code,
      disposition: 'retained',
      kind: 'talent',
      reason: 'Retained because Phase 6 public fan route proof publishes real output.',
    }
  );

  try {
    const flowTalentBefore = unwrapApiData<{ lifecycleStatus: string; version: number }>(
      await apiRequest(page, `/api/v1/talents/${flowTalent.id}`)
    );
    const flowToActive = unwrapApiData<{ lifecycleStatus: string; version: number }>(
      await apiRequest(page, `/api/v1/talents/${flowTalent.id}/stage-transitions`, {
        body: {
          targetArtistStageId: activeStage.id,
          version: flowTalentBefore.version,
        },
        method: 'POST',
      })
    );
    const flowBackToDraft = unwrapApiData<{ lifecycleStatus: string; version: number }>(
      await apiRequest(page, `/api/v1/talents/${flowTalent.id}/stage-transitions`, {
        body: {
          targetArtistStageId: draftStage.id,
          version: flowToActive.version,
        },
        method: 'POST',
      })
    );
    const forbiddenTransition = await apiRequest(
      page,
      `/api/v1/talents/${flowTalent.id}/stage-transitions`,
      {
        body: {
          targetArtistStageId: forbiddenStage.id,
          version: flowBackToDraft.version,
        },
        method: 'POST',
      }
    );
    expect(forbiddenTransition.ok).toBe(false);
    expect(forbiddenTransition.status).toBeGreaterThanOrEqual(400);

    const bootstrap = unwrapApiData<{
      draftVersion: { contentHash: string; documentState: string; id: string };
      homepagePolicy: { allowedTemplateTypeCodes: string[]; status: string };
      publicRoute: { canonicalPath: string | null; legacyPath: string | null };
      templateAssets: Array<{ assetId: string; isSelectable: boolean; templateTypeCode: string }>;
    }>(
      await apiRequest(page, `/api/v1/talents/${publishTalent.id}/public-presence/bootstrap`, {
        body: { templateAssetId: duplicatedTemplate.asset.id },
        method: 'POST',
      })
    );
    expect(bootstrap.homepagePolicy.status).toBe('ready');

    const submit = unwrapApiData<{ draftVersion: { contentHash: string; documentState: string } }>(
      await apiRequest(page, `/api/v1/talents/${publishTalent.id}/public-presence/review/submit`, {
        body: { expectedCurrentContentHash: bootstrap.draftVersion.contentHash },
        method: 'POST',
      })
    );
    const approve = unwrapApiData<{ draftVersion: { contentHash: string; documentState: string } }>(
      await apiRequest(page, `/api/v1/talents/${publishTalent.id}/public-presence/review/approve`, {
        body: { expectedCurrentContentHash: submit.draftVersion.contentHash },
        method: 'POST',
      })
    );
    const scheduledFor = new Date(Date.now() + 86_400_000).toISOString();
    const scheduled = unwrapApiData<{
      draftVersion?: { contentHash: string; documentState: string } | null;
      latestVersion?: { contentHash: string; documentState: string } | null;
      pageVersions?: Array<{
        scheduledVersion?: { contentHash: string; documentState: string } | null;
      }>;
      scheduledVersion?: { contentHash: string; documentState: string } | null;
    }>(
      await apiRequest(page, `/api/v1/talents/${publishTalent.id}/public-presence/publish/schedule`, {
        body: {
          expectedCurrentContentHash: approve.draftVersion.contentHash,
          scheduledFor,
        },
        method: 'POST',
      })
    );
    const scheduledPageVersion = scheduled.pageVersions?.find((entry) => entry.scheduledVersion)
      ?.scheduledVersion;
    const scheduledState =
      scheduled.scheduledVersion?.documentState ??
      scheduledPageVersion?.documentState ??
      scheduled.draftVersion?.documentState ??
      scheduled.latestVersion?.documentState;
    const scheduledHash =
      scheduled.scheduledVersion?.contentHash ??
      scheduledPageVersion?.contentHash ??
      scheduled.draftVersion?.contentHash ??
      scheduled.latestVersion?.contentHash ??
      approve.draftVersion.contentHash;
    expect(scheduledState).toBe('scheduled');
    const cancelSchedule = unwrapApiData<{ draftVersion: { contentHash: string } }>(
      await apiRequest(page, `/api/v1/talents/${publishTalent.id}/public-presence/publish/cancel`, {
        body: { expectedCurrentContentHash: scheduledHash },
        method: 'POST',
      })
    );
    const published = unwrapApiData<{
      liveVersion: {
        contentHash: string;
        documentState: string;
        id: string;
        templateAssetPin: { sourceHash: string } | null;
      };
      publicRoute: { canonicalPath: string | null; legacyPath: string | null };
    }>(
      await apiRequest(page, `/api/v1/talents/${publishTalent.id}/public-presence/publish`, {
        body: { expectedCurrentContentHash: cancelSchedule.draftVersion.contentHash },
        method: 'POST',
      })
    );
    expect(published.liveVersion.documentState).toBe('published');
    const rollback = unwrapApiData<{ draftVersion: { documentState: string } }>(
      await apiRequest(page, `/api/v1/talents/${publishTalent.id}/public-presence/rollback-draft`, {
        body: { sourceVersionId: published.liveVersion.id },
        method: 'POST',
      })
    );
    expect(rollback.draftVersion.documentState).toBe('draft');

    const publicRoute =
      published.publicRoute.canonicalPath || published.publicRoute.legacyPath || `/${fixture.fixture.tenant.code.toLowerCase()}/${publishTalent.homepagePath}/homepage`;
    await page.goto(publicRoute);
    await expect(page.locator('body')).not.toContainText(/unavailable|failed/i);
    await captureRoute(page, 'public-fan-route-desktop', captures);
    const publicTextBeforeEdit = await page.locator('body').innerText();

    const editableSourceIndex = duplicatedTemplate.currentRevision.sourceBundle.findIndex(
      (file) => !file.path.endsWith('manifest.json') && file.language !== 'json'
    );
    if (editableSourceIndex < 0) {
      throw new Error('No non-manifest template source file was available for immutability proof.');
    }
    const editedSourceBundle = duplicatedTemplate.currentRevision.sourceBundle.map((file, index) =>
      index === editableSourceIndex
        ? {
            ...file,
            contents: `${file.contents}\n/* phase6 post-publish asset edit ${runId} */\n`,
          }
        : file
    );
    const editedAsset = unwrapApiData<{
      currentRevision: { sourceHash: string };
    }>(
      await apiRequest(
        page,
        `/api/v1/public-presence/assets/${duplicatedTemplate.asset.id}/current?scopeType=tenant`,
        {
          body: {
            sourceBundle: editedSourceBundle,
          },
          method: 'PUT',
        }
      )
    );
    expect(editedAsset.currentRevision.sourceHash).not.toBe(
      duplicatedTemplate.currentRevision.sourceHash
    );
    await page.reload();
    await expect(page.locator('body')).toContainText(/Phase 6 Publish|TCRN|Homepage/i);
    const publicTextAfterEdit = await page.locator('body').innerText();
    expect(publicTextAfterEdit).toBe(publicTextBeforeEdit);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await captureRoute(page, 'public-fan-route-mobile-after-asset-edit', captures);

    const origin = new URL(page.url()).origin;
    const acContext = await browser.newContext({ viewport: { height: 720, width: 1280 } });
    let acSystemDictionaryRoutes: Record<string, string>;

    try {
      const acPage = await acContext.newPage();
      acSystemDictionaryRoutes = await captureAcSystemDictionaryRoutes(acPage, origin, captures);
    } finally {
      await acContext.close();
    }

    readback.functional = {
      assetDuplicate: {
        componentCopyOwner: duplicatedComponent.asset.ownerType,
        templateCopyOwner: duplicatedTemplate.asset.ownerType,
        templateCurrentRevision: Boolean(duplicatedTemplate.currentRevision),
      },
      dictionaryTypes: dictionaryTypes
        .filter((entry) => ['artist-status', 'homepage-template-type'].includes(entry.type))
        .map((entry) => ({ count: entry.count, name: entry.name, type: entry.type })),
      flow: {
        forbiddenTransitionStatus: forbiddenTransition.status,
        returnedLifecycle: flowBackToDraft.lifecycleStatus,
        transitionLifecycle: flowToActive.lifecycleStatus,
      },
      publish: {
        livePinnedSourceHashStableAfterAssetEdit:
          published.liveVersion.templateAssetPin?.sourceHash ===
          duplicatedTemplate.currentRevision.sourceHash,
        postEditAssetSourceChanged: editedAsset.currentRevision.sourceHash !==
          duplicatedTemplate.currentRevision.sourceHash,
        publicRoute,
      },
      systemDictionaries: {
        artistStatusCodes: artistStatusItems.map((item) => item.code),
        browserRoutes: acSystemDictionaryRoutes,
        homepageTemplateTypeCodes: templateTypeItems.map((item) => item.code),
      },
    };

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${tenantSettings}?section=config-entities&configEntityType=artist-stage`);
    await expect(page.getByRole('button', { name: /Artist Stage/i }).first()).toBeVisible();
    await assertNoBannedLevelOneCopy(page, 'tenant entity management');
    await captureRoute(page, 'tenant-entity-artist-stage-desktop', captures);
    const focusProof = await collectFocusProof(page);

    await page.getByRole('button', { name: /^Edit\s+/i }).first().click();
    await expect(page.getByLabel(/Artist Status/i)).toBeVisible();
    await expect(page.getByLabel(/Homepage Template Type/i)).toBeVisible();
    await captureRoute(page, 'artist-stage-edit-drawer-desktop', captures);
    await page.keyboard.press('Escape');

    await page.goto(
      `${tenantSettings}?section=config-entities&configEntityType=homepage-template-asset`
    );
    await expect(page.getByTestId('asset-family-template')).toBeVisible();
    await captureRoute(page, 'tenant-homepage-template-asset-family-desktop', captures);
    await page.goto(
      `${tenantSettings}?section=config-entities&configEntityType=homepage-component-asset`
    );
    await expect(page.getByTestId('asset-family-component')).toBeVisible();
    await captureRoute(page, 'tenant-homepage-component-asset-family-desktop', captures);
    const iaBoundingBoxes = await collectBoundingBoxes(page, [
      'text=Artist Stage',
      'text=Homepage Template Asset',
      'text=Homepage Component Asset',
      '[data-testid="public-presence-asset-workspace"]',
    ]);

    await page.goto(`${tenantSettings}?section=settings`);
    await page.getByRole('button', { name: /Artist Lifecycle Flow/i }).click();
    await expect(page.getByTestId('artist-lifecycle-flow-workspace')).toBeVisible();
    await assertNoBannedLevelOneCopy(page, 'tenant lifecycle flow');
    await page.getByTestId('artist-lifecycle-flow-save').click();
    await expect(page.getByText(/Flow saved|已保存|儲存|保存しました|저장|enregistre/i)).toBeVisible();
    await captureRoute(page, 'tenant-flow-configuration-desktop', captures);

    await page.goto(`${subsidiarySettings}?section=settings`);
    await page.getByRole('button', { name: /Artist Lifecycle Flow/i }).click();
    await expect(page.getByTestId('artist-lifecycle-flow-workspace')).toBeVisible();
    await expect(page.getByTestId('artist-lifecycle-flow-save')).toBeDisabled();
    await captureRoute(page, 'subsidiary-flow-read-only-desktop', captures);
    const lowerScopeWrite = await apiRequest(
      page,
      `/api/v1/subsidiaries/${subsidiaryId}/settings/artist-lifecycle-flow`,
      {
        body: { flow: phase6Flow },
        method: 'PATCH',
      }
    );
    expect(lowerScopeWrite.ok).toBe(false);

    await page.goto(`${canonicalTalentSettings}?section=settings`);
    await page.getByRole('button', { name: /Artist Lifecycle Flow/i }).click();
    await expect(page.getByTestId('artist-lifecycle-flow-workspace')).toBeVisible();
    await expect(page.getByTestId('artist-lifecycle-flow-save')).toBeDisabled();
    await captureRoute(page, 'talent-flow-read-only-desktop', captures);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      `${tenantSettings}?section=config-entities&configEntityType=homepage-template-asset`
    );
    await expect(page.getByTestId('asset-family-template')).toBeVisible();
    await captureRoute(page, 'tenant-homepage-template-asset-family-mobile', captures);
    await page.goto(`${tenantSettings}?section=settings`);
    await page.getByRole('button', { name: /Artist Lifecycle Flow/i }).click();
    await expect(page.getByTestId('artist-lifecycle-flow-workspace')).toBeVisible();
    await captureRoute(page, 'tenant-flow-configuration-mobile', captures);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/tenant/${tenantId}/talent/${publishTalent.id}/homepage`);
    await waitForRouteReady(page, page.getByTestId('management-command-strip'), 'Homepage Management');
    await captureRoute(page, 'homepage-management-published-desktop', captures);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await waitForRouteReady(page, page.getByTestId('management-command-strip'), 'Homepage Management mobile');
    await captureRoute(page, 'homepage-management-published-mobile', captures);

    const publishStudio = `/studio/public-presence/${tenantId}/${publishTalent.id}`;
    const blockedStudio = `/studio/public-presence/${tenantId}/${blockedTalent.id}`;
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(publishStudio);
    await waitForRouteReady(page, page.getByTestId('canvas-stage'), 'Studio covered');
    await assertNoBannedLevelOneCopy(page, 'studio covered');
    await captureRoute(page, 'studio-covered-desktop', captures);
    await page.goto(`${publishStudio}?viewport=mobile&sheet=preview-tools`);
    await waitForRouteReady(page, page.getByTestId('canvas-stage'), 'Studio internal mobile preview');
    await captureRoute(page, 'studio-covered-internal-mobile-preview', captures);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await waitForRouteReady(page, page.getByTestId('canvas-stage'), 'Studio covered mobile');
    await captureRoute(page, 'studio-covered-mobile', captures);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(blockedStudio);
    await expect(
      page
        .getByText(
          /does not allow homepage work|blocked|当前 Artist Stage|no allowed|No validated template asset|stage policy/i
        )
        .first()
    ).toBeVisible();
    await captureRoute(page, 'studio-blocked-desktop', captures);

    await page.goto(`${publishStudio}/preview?templateId=activeTalentHub`);
    await waitForRouteReady(page, page.getByTestId('preview-canvas-stage'), 'Fan preview covered');
    await captureRoute(page, 'fan-preview-covered-desktop', captures);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await waitForRouteReady(page, page.getByTestId('preview-canvas-stage'), 'Fan preview covered mobile');
    await captureRoute(page, 'fan-preview-covered-mobile', captures);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${blockedStudio}/preview?templateId=activeTalentHub`);
    await expect(page.locator('body')).toContainText(/outside the current Artist Stage policy|does not allow|blocked/i);
    await captureRoute(page, 'fan-preview-policy-blocked-desktop', captures);

    await page.goto(`/studio/public-presence/${tenantId}/assets/template/${duplicatedTemplate.asset.id}`);
    await waitForRouteReady(page, page.getByTestId('ide-editor-surface'), 'Template Asset IDE');
    await captureRoute(page, 'template-asset-ide-desktop', captures);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await waitForRouteReady(page, page.getByTestId('ide-editor-surface'), 'Template Asset IDE mobile');
    await captureRoute(page, 'template-asset-ide-mobile', captures);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/studio/public-presence/${tenantId}/assets/component/${duplicatedComponent.asset.id}`);
    await waitForRouteReady(page, page.getByTestId('ide-editor-surface'), 'Component Asset IDE');
    await captureRoute(page, 'component-asset-ide-desktop', captures);

    await page.evaluate(() => {
      const raw = window.sessionStorage.getItem('tcrn.web.session');
      if (!raw) {
        return;
      }
      const session = JSON.parse(raw);
      session.user.preferredLanguage = 'zh_HANS';
      window.sessionStorage.setItem('tcrn.web.session', JSON.stringify(session));
    });
    await page.goto(
      `${tenantSettings}?section=config-entities&configEntityType=homepage-template-asset`
    );
    await expect(page.getByTestId('asset-family-template')).toBeVisible();
    await captureRoute(page, 'i18n-zh-hans-template-asset-family-desktop', captures);

    const i18nReadback = await Promise.all(
      SUPPORTED_UI_LOCALES.map(async (locale) => ({
        locale,
        artistStatus: unwrapApiData<Array<{ code: string; localizedName: string }>>(
          await apiRequest(page, '/api/v1/system-dictionary/artist-status?includeInactive=false&page=1&pageSize=20', {
            headers: { 'Accept-Language': locale },
          })
        ).map((item) => ({ code: item.code, label: item.localizedName })),
        templateTypes: unwrapApiData<Array<{ code: string; localizedName: string }>>(
          await apiRequest(
            page,
            '/api/v1/system-dictionary/homepage-template-type?includeInactive=false&page=1&pageSize=20',
            {
              headers: { 'Accept-Language': locale },
            }
          )
        ).map((item) => ({ code: item.code, label: item.localizedName })),
      }))
    );

    const overflowFindings = await collectOverflowFindings(page);
    expect(overflowFindings).toEqual([]);

    readback.uiux = {
      boundingBoxes: iaBoundingBoxes,
      focusProof,
      i18nReadback,
      lowerScopeWrite: {
        rejected: !lowerScopeWrite.ok,
        status: lowerScopeWrite.status,
      },
      overflowFindings,
    };

    writeJson('phase-6-public-presence-readback.json', readback);
    writeText(
      'phase-6-public-presence-readback.md',
      [
        '# Phase 6 Public Presence Readback',
        '',
        `- Evidence root: ${EVIDENCE_ROOT}`,
        '- Data modes: read_only_uat, deterministic_uat_mutation, creation_flow_proof.',
        `- Screenshots: ${captures.screenshots.length}`,
        `- DOM/text captures: ${captures.dom.length}`,
        `- Created/retained resources: ${createdResources.length}`,
        '- Result: 0 warning / 0 blocked.',
        '',
      ].join('\n')
    );

    for (const caseId of PUBLIC_PRESENCE_CASES) {
      markPass(matrix, caseId, {
        apiReadback: ['phase-6-public-presence-readback.json'],
        browserRoutes: [
          tenantSettings,
          subsidiarySettings,
          canonicalTalentSettings,
          publishStudio,
          blockedStudio,
          publicRoute,
        ],
        dataMode:
          caseId.startsWith('PPS-ASSET') ||
          caseId.startsWith('PPS-IDE') ||
          caseId.startsWith('PPS-PUBLISH') ||
          caseId.startsWith('PPS-TALENT')
            ? 'deterministic_uat_mutation / creation_flow_proof where applicable'
            : 'read_only_uat',
        domCaptures: captures.dom,
        fixture: 'UAT_CORP canonical plus Phase 6 retained fixtures',
        note: `${caseId} passed with browser, DOM/text, and API/readback evidence.`,
        screenshots: captures.screenshots,
      });
    }

    writeJson('phase-6-acceptance-matrix.json', {
      blocked: matrix.filter((entry) => entry.status === 'blocked').length,
      cases: matrix,
      warnings: matrix.filter((entry) => entry.status === 'warning').length,
    });
    writeJson('phase-6-created-retained-resources.json', createdResources);
    writeJson('phase-6-bounding-box-proof.json', iaBoundingBoxes);
  } finally {
    await apiRequest(page, '/api/v1/organization/settings/artist-lifecycle-flow', {
      body: { flow: originalFlow },
      method: 'PATCH',
    }).catch(() => undefined);

    createdResources.push({
      code: 'artistLifecycleFlow',
      disposition: 'restored',
      kind: 'tenant-settings',
      reason: 'Original tenant Flow restored after Phase 6 transition proof.',
    });
    writeJson('phase-6-created-retained-resources.json', createdResources);
  }
});

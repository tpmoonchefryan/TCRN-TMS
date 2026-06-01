import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const evidenceDir = process.env.PUBLIC_PRESENCE_REBASELINE_EVIDENCE_DIR ?? null;
const tenantId = process.env.PUBLIC_PRESENCE_REBASELINE_TENANT_ID ?? 'tenant-p12';
const talentId = process.env.PUBLIC_PRESENCE_REBASELINE_TALENT_ID ?? 'talent-p12';
const locale = 'zh_HANS';

function envelope(data: unknown, meta?: unknown) {
  return meta ? { success: true, data, meta } : { success: true, data };
}

function writeArtifact(fileName: string, payload: unknown) {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(path.join(evidenceDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function screenshot(page: Page, fileName: string) {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, fileName), fullPage: true });
}

async function writeDom(page: Page, fileName: string) {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  const text = await page.locator('body').innerText();
  writeFileSync(path.join(evidenceDir, fileName), text, 'utf8');
}

function localized(en: string, zhHans: string, fr = en) {
  return {
    en,
    zh_HANS: zhHans,
    zh_HANT: zhHans,
    ja: en,
    ko: en,
    fr,
  };
}

function buildSession() {
  return {
    accessToken: 'phase12-studio-consumption-browser-proof',
    tokenType: 'Bearer',
    expiresIn: 3600,
    authenticatedAt: '2026-06-01T00:00:00.000Z',
    tenantId,
    tenantName: 'P12 Tenant',
    tenantTier: 'standard',
    tenantCode: 'P12_TENANT',
    capabilities: {
      tenantId,
      scopeType: 'tenant',
      scopeId: null,
      enabledCapabilityCodes: ['core.settings', 'public_presence.homepage'],
      disabledReasons: {},
      registryVersion: 'phase-12-public-presence-rebaseline',
      resolvedAt: '2026-06-01T00:00:00.000Z',
    },
    user: {
      id: 'phase12-user',
      username: 'phase12_operator',
      email: 'phase12-public-presence@example.test',
      displayName: 'Phase 12 Operator',
      avatarUrl: null,
      preferredLanguage: locale,
      totpEnabled: false,
      forceReset: false,
      passwordExpiresAt: null,
    },
  };
}

function buildTalentDetail() {
  return {
    avatarUrl: null,
    code: 'aki-rosenthal',
    createdAt: '2026-06-01T00:00:00.000Z',
    description: localized('P12 proof talent', 'P12 证明艺人'),
    displayName: 'Aki Rosenthal',
    externalPagesDomain: {
      customDomain: null,
      customDomainVerified: false,
      effectiveDomain: null,
      effectiveSource: 'none',
    },
    homepagePath: 'aki-home',
    id: talentId,
    isActive: true,
    lifecycleStatus: 'published',
    localizedDescription: 'P12 证明艺人',
    localizedName: 'Aki Rosenthal',
    name: localized('Aki Rosenthal', 'Aki Rosenthal'),
    path: '/Aki Rosenthal',
    profileStore: null,
    profileStoreId: null,
    publishedAt: '2026-06-01T00:00:00.000Z',
    publishedBy: 'phase12-user',
    settings: {},
    stats: {
      customerCount: 0,
      homepageVersionCount: 1,
      publicPresenceDraftCount: 1,
    },
    subsidiaryId: null,
    timezone: 'Asia/Tokyo',
    updatedAt: '2026-06-01T00:00:00.000Z',
    version: 1,
  };
}

function buildTemplateAsset({
  assetId,
  blockedReasonCode,
  isSelectable,
  name,
  templateId,
  templateTypeCode,
}: {
  assetId: string;
  blockedReasonCode: string | null;
  isSelectable: boolean;
  name: string;
  templateId: 'activeTalentHub' | 'debutReveal';
  templateTypeCode: 'operating' | 'pending-reveal';
}) {
  return {
    assetCode: `${templateId}-p12`,
    assetDescription: localized(`${name} description`, `${name} 描述`),
    assetId,
    assetName: localized(name, name),
    blockedReasonCode,
    canEdit: false,
    currentRevisionId: `${assetId}-revision-1`,
    currentRevisionNumber: 1,
    currentRevisionSourceHash: `sha256-${assetId}`,
    currentRevisionStatus: 'active',
    currentRevisionValidationState: 'ready',
    defaultSectionOrder: ['firstEncounter', 'officialChannels', 'fanActions'],
    isSelectable,
    isSystem: templateId === 'activeTalentHub',
    label: name,
    optionalSections: ['fanActions'],
    ownerType: 'tenant',
    recommendedSections: ['fanActions'],
    requiredSections: ['firstEncounter'],
    templateId,
    templateTypeCode,
    useCase: 'P12 governed public homepage proof.',
  };
}

function buildPreview(title = 'Aki Rosenthal') {
  return {
    actions: [],
    appearance: {
      theme: {
        animation: { enableEntrance: true, enableHover: true, intensity: 'low' },
        background: { type: 'color', value: '#FAFBFC' },
        card: { background: '#FFFFFF', borderRadius: 'large', shadow: 'small' },
        colors: {
          accent: '#E0A0C0',
          background: '#FAFBFC',
          primary: '#7B9EE0',
          text: '#333333',
          textSecondary: '#888888',
        },
        decorations: { type: 'none' },
        preset: 'soft',
        typography: { fontFamily: 'noto-sans', headingWeight: 'medium' },
        visualStyle: 'flat',
      },
    },
    contentHash: 'preview-content-hash',
    createdAt: '2026-06-01T00:00:00.000Z',
    documentVersionId: 'draft-version-1',
    fallbackDecisions: [],
    media: [],
    metadata: {
      canonicalPath: `/${tenantId}/aki/homepage`,
      description: 'Official fan hub',
      locale: null,
      ogImage: null,
      ogImageAlt: null,
      title,
    },
    portalId: 'portal-1',
    projectionHash: 'projection-hash-1',
    projectionId: 'projection-1',
    projectionSchemaVersion: '1.0',
    projectionVersion: 1,
    rebuiltAt: '2026-06-01T00:00:00.000Z',
    registryVersion: '1.0.0',
    resolvedRevealPhase: 'always',
    route: {
      cacheKeys: [],
      canonicalPath: `/${tenantId}/aki/homepage`,
      domainHostname: null,
      legacyPath: null,
      talentCode: 'aki',
      tenantCode: tenantId,
    },
    safetyPolicyVersion: '1.0.0',
    sections: [
      {
        avatar: null,
        description: 'Official fan hub',
        fallbackBehavior: 'safePlaceholder',
        id: 'hero',
        kind: 'firstEncounter',
        primaryAction: null,
        sectionType: 'hero',
        timezone: null,
        title,
        validationIssueIds: [],
        visibility: 'visible',
      },
    ],
    validationSnapshotId: 'snapshot-1',
  };
}

function buildWorkspace({
  draft = true,
  policyBlocked = false,
}: { draft?: boolean; policyBlocked?: boolean } = {}) {
  const activeTemplate = buildTemplateAsset({
    assetId: 'asset-active-hub',
    blockedReasonCode: null,
    isSelectable: !policyBlocked,
    name: 'Active Talent Hub',
    templateId: 'activeTalentHub',
    templateTypeCode: 'operating',
  });
  const debutTemplate = buildTemplateAsset({
    assetId: 'asset-debut-reveal',
    blockedReasonCode: 'notAllowedInCurrentStage',
    isSelectable: false,
    name: 'Debut Reveal',
    templateId: 'debutReveal',
    templateTypeCode: 'pending-reveal',
  });
  const draftVersion = draft
    ? {
        contentHash: 'hash-1',
        contentHashAlgorithm: 'sha256',
        createdAt: '2026-06-01T00:00:00.000Z',
        document: {
          metadata: {
            canonicalPath: `/${tenantId}/aki/homepage`,
            title: 'Aki Rosenthal',
          },
          personaKit: {
            accentTone: 'rose',
            campaignLabel: 'P12 launch',
            tagline: 'Official fan hub',
          },
          schemaVersion: '1.0',
          sections: [
            {
              fields: {
                displayName: { provenance: 'publicPresence', value: 'Aki Rosenthal' },
                headline: { provenance: 'publicPresence', value: 'Official fan hub' },
                primaryCtaLabel: { provenance: 'publicPresence', value: 'Watch now' },
                primaryCtaUrl: { provenance: 'publicPresence', value: 'https://example.test' },
              },
              id: 'first-encounter-1',
              kind: 'firstEncounter',
              title: 'First Encounter',
            },
          ],
          templateId: 'activeTalentHub',
        },
        documentSchemaVersion: '1.0',
        documentState: 'draft',
        id: 'draft-version-1',
        lastValidationSnapshotId: 'snapshot-1',
        publishedAt: null,
        scheduledFor: null,
        templateAssetPin: {
          assetId: activeTemplate.assetId,
          assetRevisionId: activeTemplate.currentRevisionId,
          assetRevisionNumber: activeTemplate.currentRevisionNumber,
          sourceHash: activeTemplate.currentRevisionSourceHash,
          templateId: activeTemplate.templateId,
          templateTypeCode: activeTemplate.templateTypeCode,
        },
        templateId: 'activeTalentHub',
        updatedAt: '2026-06-01T00:00:00.000Z',
        validationSnapshot: {
          acknowledgementIds: [],
          blockerIds: [],
          componentRegistryVersion: '1.0.0',
          documentSchemaVersion: '1.0',
          fallbackDecisions: [],
          issueCounts: { blocker: 0, fatal: 0, info: 0, warning: 0 },
          issues: [],
          projectionHash: 'projection-hash-1',
          safetyPolicyVersion: '1.0.0',
          schemaVersion: '1.0',
          snapshotId: 'snapshot-1',
          templateId: 'activeTalentHub',
          templateRegistryVersion: '1.0.0',
          validationMode: 'draft',
        },
        versionNumber: 1,
      }
    : null;

  return {
    componentDefinitions: [],
    currentArtistStage: {
      artistStatusCode: policyBlocked ? 'draft' : 'published',
      code: policyBlocked ? 'graduated' : 'live',
      homepageTemplateTypeCode: policyBlocked ? 'pending-reveal' : 'operating',
      id: policyBlocked ? 'stage-graduated' : 'stage-live',
      name: localized(policyBlocked ? 'Graduated' : 'Live', policyBlocked ? '毕业' : '运营中'),
    },
    draftVersion,
    effectiveLifecycleStatus: policyBlocked ? 'draft' : 'published',
    homepagePolicy: policyBlocked
      ? {
          allowedTemplateTypeCodes: [],
          blockedReasons: [{ code: 'homepagePolicyMissing', messageKey: 'missing' }],
          status: 'blocked',
        }
      : {
          allowedTemplateTypeCodes: ['operating'],
          blockedReasons: [],
          status: 'ready',
        },
    liveTemplateId: null,
    liveVersion: null,
    pageVersions: [
      {
        latestVersion: draftVersion,
        liveVersion: null,
        revealAutoSwitchAt: null,
        scheduledVersion: null,
        templateId: 'activeTalentHub',
      },
    ],
    portal: draft
      ? {
          createdAt: '2026-06-01T00:00:00.000Z',
          draftVersionId: 'draft-version-1',
          id: 'portal-1',
          lastValidatedAt: '2026-06-01T00:00:00.000Z',
          latestValidationState: 'validEditable',
          latestVersionNumber: 1,
          liveVersionId: null,
          talentId,
          updatedAt: '2026-06-01T00:00:00.000Z',
          version: 1,
        }
      : null,
    publicRoute: {
      canonicalPath: `/${tenantId}/aki/homepage`,
      domainHostname: null,
      legacyPath: 'aki-home',
      talentCode: 'aki',
      tenantCode: tenantId,
    },
    releaseReadiness: { blockingDependencyCount: 0, dependencies: [] },
    selectedTemplateAssetId: draft ? activeTemplate.assetId : null,
    selectedTemplateId: 'activeTalentHub',
    stageSections: [
      {
        allowedComponents: [],
        collectionOperations: [],
        editabilityState: 'validEditable',
        fallbackBehavior: 'safePlaceholder',
        fieldDefinitions: [
          {
            fieldKey: 'displayName',
            provenance: ['publicPresence'],
            required: 'always',
            sourceOnly: false,
            valueType: 'string',
            visualEditable: true,
          },
          {
            fieldKey: 'headline',
            provenance: ['publicPresence'],
            required: 'optional',
            sourceOnly: false,
            valueType: 'string',
            visualEditable: true,
          },
        ],
        kind: 'firstEncounter',
        phaseVisibility: ['always'],
        purpose: 'Own the first viewport contract.',
        sourcePolicy: 'registryOwned',
      },
    ],
    templateAssets: policyBlocked ? [debutTemplate] : [activeTemplate, debutTemplate],
    templates: [
      {
        defaultSectionOrder: ['firstEncounter', 'officialChannels', 'fanActions'],
        label: 'Active Talent Hub',
        optionalSections: ['fanActions'],
        recommendedSections: ['fanActions'],
        requiredSections: ['firstEncounter'],
        templateId: 'activeTalentHub',
        useCase: 'Always-on official public presence.',
      },
    ],
    workflowEvents: [],
  };
}

async function preparePage(
  page: Page,
  {
    initialWorkspace,
    previewTitle = 'Aki Rosenthal',
  }: { initialWorkspace: Record<string, unknown>; previewTitle?: string }
) {
  let workspace = initialWorkspace;
  let currentPreviewTitle = previewTitle;
  const apiRequests: Array<{ method: string; path: string; postData: unknown }> = [];

  await page.addInitScript(
    ({ session, localeOverride }) => {
      window.sessionStorage.setItem('tcrn.web.session', JSON.stringify(session));
      window.localStorage.setItem('tcrn.web.locale.override', localeOverride);
    },
    { session: buildSession(), localeOverride: locale }
  );

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const postData = request.postDataJSON?.() ?? null;
    apiRequests.push({ method: request.method(), path: url.pathname, postData });

    if (url.pathname === '/api/v1/module-capabilities/effective') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          envelope({
            effective: buildSession().capabilities,
            registryVersion: 'phase-12-public-presence-rebaseline',
            tenantId,
          })
        ),
      });
      return;
    }

    if (url.pathname === `/api/v1/talents/${talentId}`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(buildTalentDetail())),
      });
      return;
    }

    if (url.pathname === `/api/v1/talents/${talentId}/public-presence/preview`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(buildPreview(currentPreviewTitle))),
      });
      return;
    }

    if (
      url.pathname === `/api/v1/talents/${talentId}/public-presence/bootstrap` &&
      request.method() === 'POST'
    ) {
      workspace = buildWorkspace({ draft: true, policyBlocked: false });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(workspace)),
      });
      return;
    }

    if (url.pathname === `/api/v1/talents/${talentId}/public-presence`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(workspace)),
      });
      return;
    }

    if (
      url.pathname === `/api/v1/talents/${talentId}/public-presence/draft` &&
      request.method() === 'PATCH'
    ) {
      const nextTitle =
        typeof postData === 'object' &&
        postData &&
        'document' in postData &&
        typeof postData.document === 'object' &&
        postData.document &&
        'sections' in postData.document &&
        Array.isArray(postData.document.sections)
          ? postData.document.sections[0]?.fields?.displayName?.value
          : null;
      currentPreviewTitle = typeof nextTitle === 'string' ? nextTitle : currentPreviewTitle;
      workspace = buildWorkspace({ draft: true, policyBlocked: false });
      const draftVersion = workspace.draftVersion as {
        document: {
          metadata: { title: string };
          sections: Array<{ fields?: Record<string, { value: string }> }>;
        };
      } | null;
      if (draftVersion) {
        draftVersion.document.metadata.title = currentPreviewTitle;
        if (draftVersion.document.sections[0]?.fields?.displayName) {
          draftVersion.document.sections[0].fields.displayName.value = currentPreviewTitle;
        }
        (draftVersion as { contentHash: string }).contentHash = `hash-${currentPreviewTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}`;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(workspace)),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { message: `Unhandled ${url.pathname}` } }),
    });
  });

  return {
    getApiRequests: () => apiRequests,
  };
}

async function collectStudioBounds(page: Page) {
  return page.evaluate(() => {
    const rectOf = (element: Element | null) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        height: Math.round(rect.height),
        width: Math.round(rect.width),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
      };
    };
    const canvas = document.querySelector('[data-testid="canvas-stage"]');
    const topbar = document.querySelector('[data-testid="studio-topbar"]');
    const leftRail = document.querySelector('[data-testid="left-rail"]');
    return {
      bodyForbiddenText: {
        advanced: document.body.innerText.includes('Advanced'),
        componentStore: document.body.innerText.includes('Component Store'),
        saveSource: document.body.innerText.includes('Save source'),
        sourceSchema: document.body.innerText.includes('Source schema'),
        templateCenter: document.body.innerText.includes('Template Center'),
      },
      canvasBounds: rectOf(canvas),
      canvasText: canvas?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      leftRailBounds: rectOf(leftRail),
      topbarBounds: rectOf(topbar),
      viewport: {
        height: window.innerHeight,
        width: window.innerWidth,
      },
    };
  });
}

test.describe('P12 Studio consumption and retired authoring paths', () => {
  test('policy-covered Studio filters templates and keeps edits bounded to the visual canvas', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 980 });
    const { getApiRequests } = await preparePage(page, {
      initialWorkspace: buildWorkspace({ draft: false, policyBlocked: false }),
    });

    await page.goto(`/studio/public-presence/${tenantId}/${talentId}`);
    await expect(page.getByText(/Choose a starting layout|选择起始布局/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Active Talent Hub/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Debut Reveal/ })).toHaveCount(0);
    await expect(page.getByText('Debut Reveal').first()).toBeVisible();
    await page.getByRole('button', { name: /Active Talent Hub/ }).click();

    await expect(page.getByTestId('canvas-stage')).toBeVisible();
    const bootstrapRequest = getApiRequests().find((request) =>
      request.path.endsWith('/public-presence/bootstrap')
    );
    expect(bootstrapRequest?.postData).toMatchObject({ templateAssetId: 'asset-active-hub' });

    const initialBounds = await collectStudioBounds(page);
    expect(initialBounds.canvasBounds?.width ?? 0).toBeGreaterThan(900);

    await page.getByTestId('left-rail').locator('button').first().click();
    await page.getByTestId('stage-row-firstEncounter').first().click();
    const field = page.getByTestId('stage-section-panel').locator('input, textarea').first();
    await field.fill('Aki Rosenthal P12 bounded edit');
    await expect(field).toHaveValue('Aki Rosenthal P12 bounded edit');
    await page.getByRole('button', { name: /Save draft|保存草稿/ }).first().click();
    await expect(page.getByTestId('canvas-stage')).toContainText('Aki Rosenthal P12 bounded edit');

    const finalBounds = await collectStudioBounds(page);
    expect(finalBounds.bodyForbiddenText).toEqual({
      advanced: false,
      componentStore: false,
      saveSource: false,
      sourceSchema: false,
      templateCenter: false,
    });

    await screenshot(page, 'p12-studio-covered-desktop-zh_Hans.png');
    await writeDom(page, 'p12-studio-covered-desktop-zh_Hans.dom.txt');
    writeArtifact('p12-studio-covered-desktop-zh_Hans.bounds.json', {
      ...finalBounds,
      bootstrapRequest,
      templateFilter: {
        hiddenAssetAbsent: !finalBounds.canvasText?.includes('Hidden Experimental Template'),
        selectableTemplateAssetIds: ['asset-active-hub'],
        unselectableVisibleAssetIds: ['asset-debut-reveal'],
      },
    });
    writeArtifact('p12-studio-bounded-edit-readback.json', {
      canvasContainsEdit:
        finalBounds.canvasText?.includes('Aki Rosenthal P12 bounded edit') ?? false,
      fieldValue: await field.inputValue(),
      forbiddenAuthoringText: finalBounds.bodyForbiddenText,
    });
  });

  test('policy-uncovered Studio blocks new drafts and publish actions with safe guidance', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 980 });
    await preparePage(page, {
      initialWorkspace: buildWorkspace({ draft: false, policyBlocked: true }),
    });

    await page.goto(`/studio/public-presence/${tenantId}/${talentId}`);
    await expect(
      page.getByText(/Homepage work is waiting on stage policy|主页工作正在等待阶段策略开放/)
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Active Talent Hub|Debut Reveal/ })).toHaveCount(
      0
    );
    await expect(page.getByRole('button', { name: /Publish now|立即发布/ })).toHaveCount(0);
    await expect(page.getByText('Debut Reveal').first()).toBeVisible();

    await screenshot(page, 'p12-studio-blocked-desktop-zh_Hans.png');
    await writeDom(page, 'p12-studio-blocked-desktop-zh_Hans.dom.txt');
    writeArtifact('p12-studio-blocked-focus.json', {
      blockedGuidanceVisible: await page
        .getByText(/Homepage work is waiting on stage policy|主页工作正在等待阶段策略开放/)
        .isVisible(),
      startButtonsVisible: await page
        .getByRole('button', { name: /Active Talent Hub|Debut Reveal/ })
        .count(),
      publishButtonsVisible: await page.getByRole('button', { name: /Publish now|立即发布/ }).count(),
    });
  });

  test('mobile Studio keeps the canvas available without exposing retired authoring tools', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await preparePage(page, {
      initialWorkspace: buildWorkspace({ draft: true, policyBlocked: false }),
    });

    await page.goto(`/studio/public-presence/${tenantId}/${talentId}`);
    await expect(page.getByTestId('canvas-stage')).toBeVisible();
    await expect(page.getByTestId('studio-mobile-manage-button')).toBeVisible();
    await expect(page.getByRole('button', { name: /Preview tools|预览工具/ })).toBeVisible();
    const bounds = await collectStudioBounds(page);
    expect(bounds.bodyForbiddenText).toEqual({
      advanced: false,
      componentStore: false,
      saveSource: false,
      sourceSchema: false,
      templateCenter: false,
    });

    await screenshot(page, 'p12-studio-mobile-zh_Hans.png');
    writeArtifact('p12-studio-mobile-zh_Hans.bounds.json', bounds);
  });

  test('retired ordinary authoring routes do not expose runtime authoring surfaces', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 820 });
    await preparePage(page, {
      initialWorkspace: buildWorkspace({ draft: true, policyBlocked: false }),
    });

    const probes = [];
    for (const suffix of ['advanced', 'templates/new', 'components/new']) {
      const response = await page.goto(`/studio/public-presence/${tenantId}/${talentId}/${suffix}`);
      const bodyText = await page.locator('body').innerText();
      const status = response?.status() ?? null;
      const finalUrl = page.url();
      const exposesAuthoringSurface =
        (await page.getByTestId('canvas-stage').count()) > 0 ||
        /Template Center|Component Store|Save source|Source schema|Advanced editor/i.test(bodyText);

      expect(exposesAuthoringSurface).toBe(false);
      expect(
        status === 404 ||
          status === 308 ||
          status === 307 ||
          finalUrl.includes(`/tenant/${tenantId}/talent/${talentId}/homepage`)
      ).toBe(true);

      probes.push({
        bodySample: bodyText.slice(0, 240),
        exposesAuthoringSurface,
        finalUrl,
        status,
        suffix,
      });
    }

    writeArtifact('p12-studio-retired-routes.json', {
      probes,
      verdict: probes.every((probe) => !probe.exposesAuthoringSurface)
        ? 'non_authoring_or_not_found'
        : 'failed',
    });
  });
});

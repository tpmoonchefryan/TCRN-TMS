import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const evidenceDir = process.env.PUBLIC_PRESENCE_REBASELINE_EVIDENCE_DIR ?? null;
const tenantId = process.env.PUBLIC_PRESENCE_REBASELINE_TENANT_ID ?? 'tenant-p12';
const talentId = process.env.PUBLIC_PRESENCE_REBASELINE_TALENT_ID ?? 'talent-p12';
const tenantCode = 'P12_TENANT';
const talentCode = 'aki';
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

function localized(en: string, zhHans = en, fr = en) {
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
    accessToken: 'phase12-publish-browser-proof',
    tokenType: 'Bearer',
    expiresIn: 3600,
    authenticatedAt: '2026-06-01T00:00:00.000Z',
    tenantId,
    tenantName: 'P12 Tenant',
    tenantTier: 'standard',
    tenantCode,
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
    description: localized('P12 publish proof talent'),
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
    localizedDescription: 'P12 publish proof talent',
    localizedName: 'Aki Rosenthal',
    name: localized('Aki Rosenthal'),
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
  revisionId = 'asset-active-hub-revision-1',
  revisionNumber = 1,
  sourceHash = 'sha256-asset-active-hub-v1',
}: {
  revisionId?: string;
  revisionNumber?: number;
  sourceHash?: string;
} = {}) {
  return {
    assetCode: 'activeTalentHub-p12',
    assetDescription: localized('Active Talent Hub template for P12 publish proof.'),
    assetId: 'asset-active-hub',
    assetName: localized('Active Talent Hub'),
    blockedReasonCode: null,
    canEdit: true,
    currentRevisionId: revisionId,
    currentRevisionNumber: revisionNumber,
    currentRevisionSourceHash: sourceHash,
    currentRevisionStatus: 'active',
    currentRevisionValidationState: 'ready',
    defaultSectionOrder: ['firstEncounter', 'officialChannels', 'fanActions'],
    isSelectable: true,
    isSystem: false,
    label: 'Active Talent Hub',
    optionalSections: ['fanActions'],
    ownerType: 'tenant',
    recommendedSections: ['fanActions'],
    requiredSections: ['firstEncounter'],
    templateId: 'activeTalentHub',
    templateTypeCode: 'operating',
    useCase: 'P12 governed public homepage proof.',
  };
}

function buildDocument(title: string) {
  return {
    metadata: {
      canonicalPath: `/${tenantCode}/${talentCode}/homepage`,
      title,
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
          displayName: { provenance: 'publicPresence', value: title },
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
  };
}

function buildValidationSnapshot(projectionHash = 'projection-hash-published-v1') {
  return {
    acknowledgementIds: [],
    blockerIds: [],
    componentRegistryVersion: '1.0.0',
    documentSchemaVersion: '1.0',
    fallbackDecisions: [],
    issueCounts: { blocker: 0, fatal: 0, info: 0, warning: 0 },
    issues: [],
    projectionHash,
    safetyPolicyVersion: '1.0.0',
    schemaVersion: '1.0',
    snapshotId: 'snapshot-published-v1',
    templateId: 'activeTalentHub',
    templateRegistryVersion: '1.0.0',
    validationMode: 'publish',
  };
}

function buildVersion({
  documentState = 'draft',
  published = false,
  title = 'Aki Rosenthal Publish Pin',
}: {
  documentState?: string;
  published?: boolean;
  title?: string;
} = {}) {
  return {
    contentHash: published ? 'homepage-document-digest-v1' : 'homepage-document-digest-draft',
    contentHashAlgorithm: 'sha256',
    createdAt: '2026-06-01T00:00:00.000Z',
    document: buildDocument(title),
    documentSchemaVersion: '1.0',
    documentState,
    id: 'document-version-published-v1',
    lastValidationSnapshotId: 'snapshot-published-v1',
    publishedAt: published ? '2026-06-01T00:12:00.000Z' : null,
    scheduledFor: null,
    templateAssetPin: {
      assetId: 'asset-active-hub',
      assetRevisionId: 'asset-active-hub-revision-1',
      assetRevisionNumber: 1,
      sourceHash: 'sha256-asset-active-hub-v1',
      snapshot: {
        manifest: {
          assetKind: 'template',
          templateId: 'activeTalentHub',
          templateTypeCode: 'operating',
        },
        sourceSummary: {
          fileCount: 3,
          hasManifest: true,
          hasRenderableEntry: true,
        },
      },
      templateId: 'activeTalentHub',
      templateTypeCode: 'operating',
    },
    templateId: 'activeTalentHub',
    updatedAt: published ? '2026-06-01T00:12:00.000Z' : '2026-06-01T00:00:00.000Z',
    validationSnapshot: buildValidationSnapshot(),
    versionNumber: 1,
  };
}

function buildWorkspace({
  published = false,
  title = 'Aki Rosenthal Publish Pin',
}: {
  published?: boolean;
  title?: string;
} = {}) {
  const version = buildVersion({
    documentState: published ? 'published' : 'draft',
    published,
    title,
  });

  return {
    componentDefinitions: [],
    currentArtistStage: {
      artistStatusCode: 'published',
      code: 'live',
      homepageTemplateTypeCode: 'operating',
      id: 'stage-live',
      name: localized('Live'),
    },
    draftVersion: version,
    effectiveLifecycleStatus: 'published',
    homepagePolicy: {
      allowedTemplateTypeCodes: ['operating'],
      blockedReasons: [],
      status: 'ready',
    },
    liveTemplateId: published ? 'activeTalentHub' : null,
    liveVersion: published ? version : null,
    pageVersions: [
      {
        latestVersion: version,
        liveVersion: published ? version : null,
        revealAutoSwitchAt: null,
        scheduledVersion: null,
        templateId: 'activeTalentHub',
      },
    ],
    portal: {
      createdAt: '2026-06-01T00:00:00.000Z',
      draftVersionId: version.id,
      id: 'portal-1',
      lastValidatedAt: '2026-06-01T00:00:00.000Z',
      latestValidationState: 'validEditable',
      latestVersionNumber: 1,
      liveVersionId: published ? version.id : null,
      talentId,
      updatedAt: published ? '2026-06-01T00:12:00.000Z' : '2026-06-01T00:00:00.000Z',
      version: 1,
    },
    publicRoute: {
      canonicalPath: `/${tenantCode}/${talentCode}/homepage`,
      domainHostname: null,
      legacyPath: 'aki-home',
      talentCode,
      tenantCode,
    },
    releaseReadiness: { blockingDependencyCount: 0, dependencies: [] },
    selectedTemplateAssetId: 'asset-active-hub',
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
        ],
        kind: 'firstEncounter',
        phaseVisibility: ['always'],
        purpose: 'Own the first viewport contract.',
        sourcePolicy: 'registryOwned',
      },
    ],
    templateAssets: [buildTemplateAsset()],
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
    workflowEvents: published
      ? [
          {
            actorId: 'phase12-user',
            createdAt: '2026-06-01T00:12:00.000Z',
            eventType: 'published',
            fromDocumentState: 'draft',
            id: 'workflow-event-published',
            toDocumentState: 'published',
          },
        ]
      : [],
  };
}

function buildPublicProjection(title = 'Aki Rosenthal Publish Pin') {
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
    media: [],
    metadata: {
      canonicalPath: `/${tenantCode}/${talentCode}/homepage`,
      description: 'Official fan hub',
      locale: null,
      ogImage: null,
      ogImageAlt: null,
      title,
    },
    projectionSchemaVersion: '1.0',
    resolvedRevealPhase: 'always',
    route: {
      canonicalPath: `/${tenantCode}/${talentCode}/homepage`,
      domainHostname: null,
      legacyPath: 'aki-home',
      talentCode,
      tenantCode,
    },
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
        visibility: 'visible',
      },
    ],
  };
}

function publicPayloadForbiddenFlags(payload: unknown) {
  const text = JSON.stringify(payload);
  return {
    adminMetadataAbsent:
      !/"(portalId|documentVersionId|templateAssetPin|registryVersion|safetyPolicyVersion)"/.test(
        text
      ),
    hiddenRevealDataAbsent: !/hiddenRevealPayload|unpublishedPublicPayload/.test(text),
    internalContentDigestAbsent: !/contentHash|projectionHash/.test(text),
    rawAssetSourceFilesAbsent: !/sourceBundle|source_bundle|rawSourceBundle/.test(text),
    validationInternalsAbsent:
      !/validationIssueIds|validationSnapshotId|validationSnapshot|issueCounts/.test(text),
  };
}

async function preparePage(page: Page) {
  let workspace = buildWorkspace();
  let publicProjection: ReturnType<typeof buildPublicProjection> | null = null;
  let currentAssetRevision = {
    revisionId: 'asset-active-hub-revision-1',
    revisionNumber: 1,
    sourceHash: 'sha256-asset-active-hub-v1',
  };
  const apiRequests: Array<{ method: string; path: string; postData: unknown }> = [];
  const assetEdits: Array<{
    newRevisionId: string;
    newRevisionNumber: number;
    newSourceHash: string;
    previousRevisionId: string;
  }> = [];

  await page.addInitScript(
    ({ session, localeOverride }) => {
      window.sessionStorage.setItem('tcrn.web.session', JSON.stringify(session));
      if (!window.localStorage.getItem('tcrn.web.locale.override')) {
        window.localStorage.setItem('tcrn.web.locale.override', localeOverride);
      }
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
        body: JSON.stringify(envelope(buildPublicProjection('Aki Rosenthal Publish Pin'))),
      });
      return;
    }

    if (
      url.pathname === `/api/v1/talents/${talentId}/public-presence/publish` &&
      request.method() === 'POST'
    ) {
      workspace = buildWorkspace({ published: true });
      publicProjection = buildPublicProjection();
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
      url.pathname === '/api/v1/public-presence/assets/asset-active-hub/current' &&
      request.method() === 'PUT'
    ) {
      const previousRevisionId = currentAssetRevision.revisionId;
      currentAssetRevision = {
        revisionId: 'asset-active-hub-revision-2',
        revisionNumber: 2,
        sourceHash: 'sha256-asset-active-hub-v2',
      };
      assetEdits.push({
        newRevisionId: currentAssetRevision.revisionId,
        newRevisionNumber: currentAssetRevision.revisionNumber,
        newSourceHash: currentAssetRevision.sourceHash,
        previousRevisionId,
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          envelope({
            assetId: 'asset-active-hub',
            currentRevision: {
              id: currentAssetRevision.revisionId,
              revisionNumber: currentAssetRevision.revisionNumber,
              sourceHash: currentAssetRevision.sourceHash,
              status: 'draft',
              validationState: 'ready',
            },
            sourceSummary: {
              fileCount: 3,
              hasManifest: true,
              hasRenderableEntry: true,
            },
          })
        ),
      });
      return;
    }

    if (
      url.pathname === `/api/v1/public/homepage/${tenantCode}/${talentCode}` ||
      url.pathname === '/api/v1/public/homepage/aki-home'
    ) {
      if (!publicProjection) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Homepage not found or not published' },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(publicProjection)),
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
    getAssetEdits: () => assetEdits,
    getCurrentAssetRevision: () => currentAssetRevision,
    getPublicProjection: () => publicProjection,
  };
}

test.describe('P12 publish, public projection, and immutability', () => {
  test('publishes a pinned template-backed homepage and keeps live public output immutable', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 980 });
    const state = await preparePage(page);

    await page.goto(`/studio/public-presence/${tenantId}/${talentId}`);
    await expect(page.getByTestId('canvas-stage')).toBeVisible();
    await page.getByTestId('left-rail').locator('button').nth(2).click();
    await expect(page.getByRole('button', { name: /Publish now|立即发布/ })).toBeVisible();
    await page.getByRole('button', { name: /Publish now|立即发布/ }).click();
    await expect(page.getByText(/Public page published|公开页面已发布/)).toBeVisible();

    const publishRequest = state
      .getApiRequests()
      .find((request) => request.path.endsWith('/public-presence/publish'));
    expect(publishRequest?.postData).toMatchObject({
      expectedCurrentContentHash: 'homepage-document-digest-draft',
      templateId: 'activeTalentHub',
    });

    writeArtifact('p12-publish-pin-readback.json', {
      generatedAt: '2026-06-01T00:12:00.000Z',
      testLayer: 'browser',
      dataMode: 'mock_static',
      targetScope: {
        tenantCode,
        tenantId,
        schema: 'tenant_p12',
        subsidiaryCode: null,
        talentCode,
      },
      caseIds: ['P12-S7', 'PPS-PUBLISH-01'],
      pass: true,
      warnings: 0,
      blocked: 0,
      records: [
        {
          documentVersionId: 'document-version-published-v1',
          documentState: 'published',
          consumedTemplateAssetId: 'asset-active-hub',
          consumedRevisionId: 'asset-active-hub-revision-1',
          consumedRevisionNumber: 1,
          consumedRevisionSourceHash: 'sha256-asset-active-hub-v1',
          consumedRevisionSnapshotSummary: {
            fileCount: 3,
            hasManifest: true,
            hasRenderableEntry: true,
            templateTypeCode: 'operating',
          },
          validationSnapshotId: 'snapshot-published-v1',
          validationProjectionHash: 'projection-hash-published-v1',
          publicRoute: `/p/${tenantCode}/${talentCode}/homepage`,
        },
      ],
      createdResources: [],
      mutatedResources: ['document-version-published-v1'],
      cleanupProof: null,
      redaction: {
        containsSecrets: false,
        containsRawSource: false,
        containsPersonalData: false,
      },
    });

    await page.goto(`/p/${tenantCode}/${talentCode}/homepage`);
    await expect(page.getByText('Aki Rosenthal Publish Pin').first()).toBeVisible();
    const desktopText = await page.locator('body').innerText();
    await screenshot(page, 'p12-public-fan-route-desktop-zh_Hans.png');
    const bodyContainsAdminChrome = /Studio|Entity Management|Review & Publish|Template Center/.test(
      desktopText
    );
    expect(bodyContainsAdminChrome).toBe(false);

    const publicProjection = state.getPublicProjection();
    expect(publicProjection).not.toBeNull();
    const forbiddenFlags = publicPayloadForbiddenFlags(publicProjection);
    expect(Object.values(forbiddenFlags).every(Boolean)).toBe(true);

    writeArtifact('p12-public-projection-readback.json', {
      generatedAt: '2026-06-01T00:13:00.000Z',
      testLayer: 'browser',
      dataMode: 'mock_static',
      targetScope: {
        tenantCode,
        tenantId,
        schema: 'tenant_p12',
        subsidiaryCode: null,
        talentCode,
      },
      caseIds: ['P12-S7', 'PPS-PUBLISH-01'],
      pass: true,
      warnings: 0,
      blocked: 0,
      records: [
        {
          publicRoute: `/p/${tenantCode}/${talentCode}/homepage`,
          status: 200,
          renderedTemplateIdentity: 'activeTalentHub',
          renderedTitle: 'Aki Rosenthal Publish Pin',
          publicPayloadTopLevelKeys: publicProjection ? Object.keys(publicProjection).sort() : [],
          publicPayloadForbiddenFieldAbsence: forbiddenFlags,
          bodyContainsPublishedTitle: desktopText.includes('Aki Rosenthal Publish Pin'),
          bodyContainsAdminChrome,
        },
      ],
      createdResources: [],
      mutatedResources: [],
      cleanupProof: null,
      redaction: {
        containsSecrets: false,
        containsRawSource: false,
        containsPersonalData: false,
      },
    });

    await page.evaluate(() => {
      window.localStorage.setItem('tcrn.web.locale.override', 'en_US');
    });
    await page.goto(`/p/${tenantCode}/${talentCode}/homepage`);
    await expect(page.getByText('Aki Rosenthal Publish Pin').first()).toBeVisible();
    await expect(page.getByText('Official Fan Page').first()).toBeVisible();
    await screenshot(page, 'p12-public-fan-route-desktop-en_US.png');

    const assetEditResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/public-presence/assets/asset-active-hub/current', {
        body: JSON.stringify({
          changeReason: 'P12 post-publish immutable asset edit',
          sourceSummary: {
            fileCount: 3,
            hasManifest: true,
            hasRenderableEntry: true,
          },
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      });
      return response.status;
    });
    expect(assetEditResponse).toBe(200);
    expect(state.getCurrentAssetRevision()).toMatchObject({
      revisionId: 'asset-active-hub-revision-2',
      revisionNumber: 2,
      sourceHash: 'sha256-asset-active-hub-v2',
    });

    await page.evaluate(() => {
      window.localStorage.setItem('tcrn.web.locale.override', 'zh_HANS');
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/p/${tenantCode}/${talentCode}/homepage`);
    await expect(page.getByText('Aki Rosenthal Publish Pin').first()).toBeVisible();
    await expect(page.getByText('Post Publish Asset Edit').first()).toHaveCount(0);
    const mobileText = await page.locator('body').innerText();
    await screenshot(page, 'p12-public-fan-route-mobile-zh_Hans.png');

    writeArtifact('p12-post-publish-immutability-readback.json', {
      generatedAt: '2026-06-01T00:14:00.000Z',
      testLayer: 'browser',
      dataMode: 'mock_static',
      targetScope: {
        tenantCode,
        tenantId,
        schema: 'tenant_p12',
        subsidiaryCode: null,
        talentCode,
      },
      caseIds: ['P12-S7', 'PPS-PUBLISH-02'],
      pass: true,
      warnings: 0,
      blocked: 0,
      records: [
        {
          publishedDocumentVersionId: 'document-version-published-v1',
          pinnedRevisionId: 'asset-active-hub-revision-1',
          pinnedRevisionSourceHash: 'sha256-asset-active-hub-v1',
          laterAssetRevisionId: state.getCurrentAssetRevision().revisionId,
          laterAssetRevisionSourceHash: state.getCurrentAssetRevision().sourceHash,
          publicRoute: `/p/${tenantCode}/${talentCode}/homepage`,
          liveOutputStillUsesPinnedTitle: mobileText.includes('Aki Rosenthal Publish Pin'),
          liveOutputContainsLaterAssetMarker: mobileText.includes('Post Publish Asset Edit'),
          assetEditRequests: state.getAssetEdits(),
        },
      ],
      createdResources: [],
      mutatedResources: ['asset-active-hub-revision-2'],
      cleanupProof: null,
      redaction: {
        containsSecrets: false,
        containsRawSource: false,
        containsPersonalData: false,
      },
    });
  });
});

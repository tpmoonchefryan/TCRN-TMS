import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildBlankPublicPresenceAssetSourceBundle,
  buildPublicPresenceTemplateAssetManifest,
  createPublicPresenceValidationArtifact,
  createLocalizedText,
  getPublicPresenceTemplateSeedText,
  type PublicPresenceDocument,
  type PublicPresenceAssetListEntry,
  type RequestContext,
} from '@tcrn/shared';

import type {
  PublicPresenceDocumentVersionRecord,
  PublicPresencePortalRecord,
  PublicPresenceValidationSnapshotRecord,
} from '../domain/public-presence-foundation.policy';
import { HomepageAdminRepository } from '../infrastructure/homepage-admin.repository';
import { PublicPresenceFoundationRepository } from '../infrastructure/public-presence-foundation.repository';
import { buildPublicPresenceSeedRuntimeAuthorityForTests } from '../testing/public-presence-seed-runtime-authority';
import { PublicPresenceAssetService } from './public-presence-asset.service';
import { PublicPresenceFoundationService } from './public-presence-foundation.service';
import { PublicPresenceStudioService } from './public-presence-studio.service';

const ARTIST_STAGE_ID = '11111111-1111-4111-8111-111111111111';
const TALENT_OWNER_ID = '22222222-2222-4222-8222-222222222222';
const TEMPLATE_FIXTURES = {
  activeTalentHub: {
    assetId: '33333333-3333-4333-8333-333333333331',
    revisionId: '33333333-3333-4333-8333-333333333332',
  },
  debutReveal: {
    assetId: '44444444-4444-4444-8444-444444444441',
    revisionId: '44444444-4444-4444-8444-444444444442',
  },
} as const;

const draftDocument: PublicPresenceDocument = {
  metadata: {
    title: 'Aki Rosenthal',
  },
  personaKit: {
    accentTone: 'rose',
    campaignLabel: 'Active Talent Hub',
    tagline: 'Official public presence',
  },
  schemaVersion: '1.0',
  sections: [
    {
      fields: {
        displayName: {
          provenance: 'publicPresence',
          value: 'Aki Rosenthal',
        },
        headline: {
          provenance: 'publicPresence',
          value: 'Official public presence',
        },
      },
      id: 'first-encounter-1',
      kind: 'firstEncounter',
      phaseVisibility: 'always',
      title: 'First Encounter',
    },
    {
      components: [],
      id: 'official-channels-1',
      kind: 'officialChannels',
      phaseVisibility: 'always',
      title: 'Official Channels',
    },
  ],
  templateId: 'activeTalentHub',
};

const validationArtifact = createPublicPresenceValidationArtifact(draftDocument, {
  mode: 'draft',
  runtimeAuthority: buildPublicPresenceSeedRuntimeAuthorityForTests('activeTalentHub'),
});

function createPortalRecord(): PublicPresencePortalRecord {
  return {
    createdAt: new Date('2026-05-15T12:00:00.000Z'),
    draftVersionId: 'draft-version-1',
    id: 'portal-1',
    lastValidatedAt: new Date('2026-05-15T12:05:00.000Z'),
    latestValidationState: 'validEditable',
    latestVersionNumber: 1,
    liveVersionId: null,
    talentId: 'talent-1',
    updatedAt: new Date('2026-05-15T12:05:00.000Z'),
    version: 1,
  };
}

function createVersionRecord(): PublicPresenceDocumentVersionRecord {
  return {
    contentHash: 'hash-1',
    contentHashAlgorithm: 'sha256',
    createdAt: new Date('2026-05-15T12:00:00.000Z'),
    createdBy: 'user-1',
    document: draftDocument as unknown as Record<string, unknown>,
    documentSchemaVersion: '1.0',
    documentState: 'draft',
    id: 'draft-version-1',
    lastValidationSnapshotId: 'snapshot-1',
    portalId: 'portal-1',
    publishedAt: null,
    publishedBy: null,
    scheduledFor: null,
    templateAssetPin: null,
    templateId: 'activeTalentHub',
    updatedAt: new Date('2026-05-15T12:05:00.000Z'),
    versionNumber: 1,
  };
}

function createDebutRevealVersionRecord(
  documentState: string = 'draft'
): PublicPresenceDocumentVersionRecord {
  const debutDocument: PublicPresenceDocument = {
    metadata: {
      title: 'Sakura Kaze',
    },
    personaKit: {
      accentTone: 'rose',
      campaignLabel: 'Debut Reveal',
      tagline: 'Countdown updates, reveal moments, and launch links for fans.',
    },
    schemaVersion: '1.0',
    sections: [
      {
        fields: {
          displayName: {
            provenance: 'publicPresence',
            value: 'Sakura Kaze',
          },
        },
        id: 'first-encounter-1',
        kind: 'firstEncounter',
        phaseVisibility: 'always',
      },
      {
        fields: {
          phase: {
            provenance: 'publicPresence',
            value: 'countdown',
          },
          revealAtUtc: {
            provenance: 'publicPresence',
            value: '2030-05-15T10:00:00.000Z',
          },
        },
        id: 'countdown-1',
        kind: 'countdownReveal',
        phaseVisibility: 'countdown',
      },
    ],
    templateId: 'debutReveal',
  };

  return {
    ...createVersionRecord(),
    document: debutDocument as unknown as Record<string, unknown>,
    documentState,
    id: 'debut-version-1',
    templateId: 'debutReveal',
  };
}

function createSnapshotRecord(): PublicPresenceValidationSnapshotRecord {
  return {
    acknowledgementIds: [],
    blockerCount: validationArtifact.snapshot.issueCounts.blocker,
    blockerIds: validationArtifact.snapshot.blockerIds,
    blocksAiPatch: false,
    blocksPublish: false,
    blocksVisualEdit: false,
    createdAt: new Date('2026-05-15T12:05:00.000Z'),
    createdBy: 'user-1',
    fatalCount: validationArtifact.snapshot.issueCounts.fatal,
    id: 'snapshot-1',
    infoCount: validationArtifact.snapshot.issueCounts.info,
    issueCounts: validationArtifact.snapshot.issueCounts,
    portalId: 'portal-1',
    projectionHash: validationArtifact.snapshot.projectionHash,
    registryVersion: validationArtifact.snapshot.templateRegistryVersion,
    safetyPolicyVersion: validationArtifact.snapshot.safetyPolicyVersion,
    snapshot: validationArtifact.snapshot as unknown as Record<string, unknown>,
    validationMode: validationArtifact.snapshot.validationMode,
    validationState: 'validEditable',
    versionId: 'draft-version-1',
    warningCount: validationArtifact.snapshot.issueCounts.warning,
  };
}

function createTemplateAssetEntry(
  templateId: 'activeTalentHub' | 'debutReveal'
): PublicPresenceAssetListEntry {
  const label = templateId === 'debutReveal' ? 'Debut Reveal' : 'Active Talent Hub';
  const assetId = TEMPLATE_FIXTURES[templateId].assetId;
  const revisionId = TEMPLATE_FIXTURES[templateId].revisionId;
  const text = getPublicPresenceTemplateSeedText(templateId);
  const manifest = buildPublicPresenceTemplateAssetManifest(templateId, {
    assetCode: `${templateId}-code`,
    assetId,
    assetRevisionId: revisionId,
    description: text.description,
    name: text.name,
    ownerId: TALENT_OWNER_ID,
    ownerType: 'talent',
  });

  return {
    asset: {
      assetKind: 'template',
      code: `${templateId}-code`,
      componentType: null,
      createdAt: '2026-05-15T12:00:00.000Z',
      currentRevisionId: revisionId,
      description: createLocalizedText({ en: `${label} description` }),
      id: assetId,
      isSystem: templateId === 'activeTalentHub',
      name: createLocalizedText({ en: label }),
      ownerId: TALENT_OWNER_ID,
      ownerType: 'talent',
	      status: 'active',
	      templateId,
	      templateTypeCode: manifest.templateTypeCode,
	      updatedAt: '2026-05-15T12:05:00.000Z',
      version: 1,
    },
    canEdit: true,
    currentRevision: {
      artifactStatus: 'active',
      assetId,
      createdAt: '2026-05-15T12:00:00.000Z',
      createdBy: 'user-1',
      id: revisionId,
      lastValidatedAt: '2026-05-15T12:05:00.000Z',
      manifest,
      revisionNumber: 1,
      runtimeContractVersion: '1.0.0',
      sourceBundle: buildBlankPublicPresenceAssetSourceBundle({
        assetCode: `${templateId}-code`,
        assetKind: 'template',
        manifest,
        name: text.name,
        templateId,
      }),
      sourceHash: 'a'.repeat(64),
      submittedAt: '2026-05-15T12:05:00.000Z',
      validationState: 'ready',
      validationSummary: {
        issueCount: 0,
        passCount: 1,
        warnCount: 0,
      },
    },
    isInherited: false,
    scope: {
      scopeId: 'talent-1',
      scopeType: 'talent',
    },
  };
}

describe('PublicPresenceStudioService', () => {
  let homepageAdminRepository: HomepageAdminRepository;
  let publicPresenceFoundationRepository: PublicPresenceFoundationRepository;
  let publicPresenceAssetService: PublicPresenceAssetService;
  let publicPresenceFoundationService: PublicPresenceFoundationService;
  let service: PublicPresenceStudioService;

  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'operator',
  };

  beforeEach(() => {
    homepageAdminRepository = {
      findTalentById: vi.fn(),
      listArtistStages: vi.fn().mockResolvedValue([
        {
          code: 'live',
          description: createLocalizedText({ en: 'Live stage' }),
          artistStatusCode: 'published',
          id: ARTIST_STAGE_ID,
          isActive: true,
          isSystem: true,
          name: createLocalizedText({ en: 'Live' }),
          sortOrder: 1,
        },
      ]),
      readArtistLifecycleFlow: vi.fn().mockResolvedValue({
        homepagePolicyByStage: [
          {
            allowedTemplateTypeCodes: ['operating', 'pending-reveal'],
            stageId: ARTIST_STAGE_ID,
          },
        ],
        nodes: [
          {
            stageCode: 'live',
            stageId: ARTIST_STAGE_ID,
          },
        ],
        transitions: [],
      }),
      findTenantCodeBySchema: vi.fn().mockResolvedValue(null),
    } as unknown as HomepageAdminRepository;

    publicPresenceFoundationRepository = {
      findDocumentVersionById: vi.fn(),
      findDraftVersion: vi.fn(),
      findLatestVersionByTemplate: vi.fn().mockResolvedValue(null),
      findLatestVersionsByPortal: vi.fn().mockResolvedValue([createVersionRecord()]),
      findPortalByTalentId: vi.fn(),
      findValidationSnapshotById: vi.fn(),
      findWorkflowEventsByPortalId: vi.fn().mockResolvedValue([]),
    } as unknown as PublicPresenceFoundationRepository;

    publicPresenceFoundationService = {
      saveDraft: vi.fn(),
    } as unknown as PublicPresenceFoundationService;

    publicPresenceAssetService = {
      listAssets: vi
        .fn()
        .mockResolvedValue([
          createTemplateAssetEntry('activeTalentHub'),
          createTemplateAssetEntry('debutReveal'),
        ]),
    } as unknown as PublicPresenceAssetService;

    service = new PublicPresenceStudioService(
      homepageAdminRepository,
      publicPresenceFoundationRepository,
      publicPresenceAssetService,
      publicPresenceFoundationService
    );
  });

  it('returns workspace metadata backed by Public Presence records', async () => {
    vi.mocked(homepageAdminRepository.findTalentById).mockResolvedValue({
      code: 'aki-rosenthal',
      customDomain: null,
      customDomainVerified: false,
      displayName: 'Aki Rosenthal',
      homepagePath: 'aki-home',
      id: 'talent-1',
      artistStageId: ARTIST_STAGE_ID,
      lifecycleStatus: 'published',
      timezone: 'Asia/Tokyo',
    } as never);
    vi.mocked(publicPresenceFoundationRepository.findPortalByTalentId).mockResolvedValue(
      createPortalRecord()
    );
    vi.mocked(publicPresenceFoundationRepository.findDraftVersion).mockResolvedValue(
      createVersionRecord()
    );
    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue(null);
    vi.mocked(publicPresenceFoundationRepository.findValidationSnapshotById).mockResolvedValue(
      createSnapshotRecord()
    );

    const result = await service.getWorkspace('talent-1', 'tenant_test');

    expect(result.portal?.id).toBe('portal-1');
    expect(result.publicRoute).toMatchObject({
      canonicalPath: '/tenant_test/aki-rosenthal/homepage',
      legacyPath: 'aki-home',
      talentCode: 'aki-rosenthal',
      tenantCode: 'tenant_test',
    });
    expect(result.draftVersion?.document.templateId).toBe('activeTalentHub');
    expect(result.draftVersion?.validationSnapshot?.issueCounts.fatal).toBe(0);
    expect(result.releaseReadiness).toEqual({
      blockingDependencyCount: 0,
      dependencies: [],
    });
    expect(result.templates.map((template) => template.templateId)).toEqual(
      expect.arrayContaining(['activeTalentHub', 'debutReveal'])
    );
    expect(result.stageSections.map((section) => section.kind)).toEqual(
      expect.arrayContaining(['firstEncounter', 'fanActions', 'agencyNotes'])
    );
    expect(result.workflowEvents).toEqual([]);
  });

  it('bootstraps a starter draft when no workspace exists yet', async () => {
    vi.mocked(homepageAdminRepository.findTalentById).mockResolvedValue({
      code: 'aki-rosenthal',
      customDomain: null,
      customDomainVerified: false,
      displayName: 'Aki Rosenthal',
      homepagePath: 'aki-home',
      id: 'talent-1',
      artistStageId: ARTIST_STAGE_ID,
      lifecycleStatus: 'published',
      timezone: 'Asia/Tokyo',
    } as never);
    vi.mocked(publicPresenceFoundationRepository.findPortalByTalentId)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createPortalRecord());
    vi.mocked(publicPresenceFoundationRepository.findDraftVersion).mockResolvedValue(
      createVersionRecord()
    );
    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue(null);
    vi.mocked(publicPresenceFoundationRepository.findValidationSnapshotById).mockResolvedValue(
      createSnapshotRecord()
    );

    const result = await service.bootstrapDraft('talent-1', 'activeTalentHub', context);

    expect(publicPresenceFoundationService.saveDraft).toHaveBeenCalledWith(
      'talent-1',
      expect.objectContaining({
        schemaVersion: '1.0',
        templateId: 'activeTalentHub',
      }),
      context,
      expect.objectContaining({
        expectedCurrentContentHash: null,
        templateAssetPin: expect.objectContaining({
          assetId: TEMPLATE_FIXTURES.activeTalentHub.assetId,
        }),
      })
    );
    expect(result.publicRoute).toMatchObject({
      canonicalPath: '/tenant_test/aki-rosenthal/homepage',
      legacyPath: 'aki-home',
      talentCode: 'aki-rosenthal',
      tenantCode: 'tenant_test',
    });
    expect(result.draftVersion?.document.templateId).toBe('activeTalentHub');
  });

  it('builds creator-readable debut defaults instead of raw talent-code copy', async () => {
    vi.mocked(homepageAdminRepository.findTalentById).mockResolvedValue({
      code: 'talent_sakura',
      customDomain: null,
      customDomainVerified: false,
      displayName: 'Sakura Kaze',
      homepagePath: 'sakura-home',
      id: 'talent-1',
      artistStageId: ARTIST_STAGE_ID,
      lifecycleStatus: 'published',
      timezone: 'Asia/Tokyo',
    } as never);
    vi.mocked(publicPresenceFoundationRepository.findPortalByTalentId)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createPortalRecord());
    vi.mocked(publicPresenceFoundationRepository.findDraftVersion).mockResolvedValue(
      createVersionRecord()
    );
    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue(null);
    vi.mocked(publicPresenceFoundationRepository.findValidationSnapshotById).mockResolvedValue(
      createSnapshotRecord()
    );

    await service.bootstrapDraft('talent-1', 'debutReveal', context);

    expect(publicPresenceFoundationService.saveDraft).toHaveBeenCalledWith(
      'talent-1',
      expect.objectContaining({
        metadata: expect.objectContaining({
          title: 'Sakura Kaze',
        }),
        personaKit: expect.objectContaining({
          tagline: 'Countdown updates, reveal moments, and launch links for fans.',
        }),
        sections: expect.arrayContaining([
          expect.objectContaining({
            kind: 'firstEncounter',
            fields: expect.objectContaining({
              displayName: expect.objectContaining({ value: 'Sakura Kaze' }),
              headline: expect.objectContaining({
                value: 'Countdown updates, reveal moments, and launch links for fans.',
              }),
            }),
          }),
          expect.objectContaining({
            kind: 'countdownReveal',
            fields: expect.objectContaining({
              phase: expect.objectContaining({ value: 'countdown' }),
              revealAtUtc: expect.objectContaining({ value: '2030-05-15T10:00:00.000Z' }),
              teaserName: expect.objectContaining({ value: 'Sakura Kaze' }),
              timezone: expect.objectContaining({ value: 'Asia/Tokyo' }),
            }),
          }),
        ]),
        templateId: 'debutReveal',
      }),
      context,
      expect.objectContaining({
        expectedCurrentContentHash: null,
        templateAssetPin: expect.objectContaining({
          assetId: TEMPLATE_FIXTURES.debutReveal.assetId,
        }),
      })
    );
  });

  it('surfaces the Debut auto-switch dependency before release when the Active Hub target is not approved yet', async () => {
    vi.mocked(homepageAdminRepository.findTalentById).mockResolvedValue({
      code: 'sakura-kaze',
      customDomain: null,
      customDomainVerified: false,
      displayName: 'Sakura Kaze',
      homepagePath: 'sakura-home',
      id: 'talent-1',
      artistStageId: ARTIST_STAGE_ID,
      lifecycleStatus: 'published',
      timezone: 'Asia/Tokyo',
    } as never);
    vi.mocked(publicPresenceFoundationRepository.findPortalByTalentId).mockResolvedValue(
      createPortalRecord()
    );
    vi.mocked(publicPresenceFoundationRepository.findLatestVersionsByPortal).mockResolvedValue([
      createDebutRevealVersionRecord(),
      createVersionRecord(),
    ]);
    vi.mocked(publicPresenceFoundationRepository.findValidationSnapshotById).mockResolvedValue(
      null
    );
    vi.mocked(publicPresenceFoundationRepository.findLatestVersionByTemplate).mockImplementation(
      async (_tenantSchema, _portalId, templateId, states) => {
        if (templateId !== 'activeTalentHub') {
          return null;
        }

        if (states?.includes('approved')) {
          return null;
        }

        return createVersionRecord();
      }
    );

    const result = await service.getWorkspace('talent-1', 'tenant_test', 'debutReveal');

    expect(result.draftVersion?.templateId).toBe('debutReveal');
    expect(result.releaseReadiness.blockingDependencyCount).toBe(1);
    expect(result.releaseReadiness.dependencies).toEqual([
      expect.objectContaining({
        blocksPublish: true,
        nextAction: 'openActiveTalentHubDraft',
        status: 'blocked',
        targetTemplateId: 'activeTalentHub',
        targetVersionState: 'draft',
        templateId: 'debutReveal',
      }),
    ]);
  });
});

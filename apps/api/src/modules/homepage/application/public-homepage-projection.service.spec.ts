import { BadRequestException } from '@nestjs/common';
import {
  buildBlankPublicPresenceAssetSourceBundle,
  buildPublicPresenceTemplateAssetManifest,
  createPublicPresenceValidationArtifact,
  DEFAULT_THEME,
  getPublicPresenceTemplateSeedText,
  type PublicPresenceAssetRevisionPin,
  type PublicPresenceDocument,
} from '@tcrn/shared';
import { describe, expect, it, vi } from 'vitest';

import type {
  PublicHomepageData,
  PublicHomepageTalentRecord,
} from '../domain/public-homepage-read.policy';
import { HomepageAdminRepository } from '../infrastructure/homepage-admin.repository';
import { PublicHomepageReadRepository } from '../infrastructure/public-homepage-read.repository';
import { PublicPresenceFoundationRepository } from '../infrastructure/public-presence-foundation.repository';
import { buildPublicPresenceSeedRuntimeAuthorityForTests } from '../testing/public-presence-seed-runtime-authority';
import { PublicHomepageService } from './public-homepage.service';
import { PublicHomepageProjectionService } from './public-homepage-projection.service';
import { PublicPresenceStudioService } from './public-presence-studio.service';

const baseHomepageData: PublicHomepageData = {
  talent: {
    displayName: 'Tokino Sora',
    avatarUrl: 'https://cdn.example.com/sora.png',
    timezone: 'Asia/Tokyo',
  },
  content: {
    version: '1.0.0',
    components: [],
  },
  theme: DEFAULT_THEME,
  seo: {
    title: 'Tokino Sora',
    description: 'Official public homepage',
    ogImageUrl: null,
  },
  updatedAt: '2026-05-15T10:00:00.000Z',
};

const publishedTalent: PublicHomepageTalentRecord = {
  id: 'talent-1',
  code: 'sora',
  displayName: 'Tokino Sora',
  avatarUrl: 'https://cdn.example.com/sora.png',
  homepagePath: 'tokino-sora',
  timezone: 'Asia/Tokyo',
};

const liveDocument: PublicPresenceDocument = {
  schemaVersion: '1.0',
  templateId: 'debutReveal',
  metadata: {
    title: 'Sora reveal',
    description: 'Reveal-safe metadata',
    ogImageUrl: 'https://cdn.example.com/reveal-og.png',
  },
  sections: [
    {
      id: 'first-1',
      kind: 'firstEncounter',
      fields: {
        displayName: { provenance: 'publicPresence', value: 'Tokino Sora' },
        teaserName: { provenance: 'publicPresence', value: 'Project S' },
        revealName: { provenance: 'publicPresence', value: 'Tokino Sora' },
        headline: { provenance: 'publicPresence', value: 'A new stage begins.' },
      },
      phaseVisibility: 'always',
    },
    {
      id: 'countdown-1',
      kind: 'countdownReveal',
      fields: {
        phase: { provenance: 'publicPresence', value: 'teaser' },
        revealAtUtc: { provenance: 'publicPresence', value: '2099-05-15T10:00:00.000Z' },
        timezone: { provenance: 'publicPresence', value: 'Asia/Tokyo' },
        teaserName: { provenance: 'publicPresence', value: 'Project S' },
        revealName: { provenance: 'publicPresence', value: 'Tokino Sora' },
      },
      phaseVisibility: 'teaser',
    },
  ],
};

function createTemplateAssetPin(
  templateId: 'activeTalentHub' | 'debutReveal'
): PublicPresenceAssetRevisionPin {
  const assetId =
    templateId === 'activeTalentHub'
      ? '66666666-6666-4666-8666-666666666662'
      : '66666666-6666-4666-8666-666666666664';
  const assetRevisionId =
    templateId === 'activeTalentHub'
      ? '66666666-6666-4666-8666-666666666663'
      : '66666666-6666-4666-8666-666666666665';
  const text = getPublicPresenceTemplateSeedText(templateId);
  const manifest = buildPublicPresenceTemplateAssetManifest(templateId, {
    assetCode: `${templateId}-code`,
    assetId,
    assetRevisionId,
    description: text.description,
    name: text.name,
    ownerId: 'talent-1',
    ownerType: 'talent',
  });

  return {
    assetId,
    assetRevisionId,
    snapshot: {
      assetId,
      assetRevisionId,
      manifest,
      revisionNumber: 1,
      sourceBundle: buildBlankPublicPresenceAssetSourceBundle({
        assetCode: `${templateId}-code`,
        assetKind: 'template',
        manifest,
        name: text.name,
        templateId,
      }),
      sourceHash: 'a'.repeat(64),
    },
    sourceHash: 'a'.repeat(64),
  };
}

function createValidationSnapshotRecord(
  document: PublicPresenceDocument,
  validationMode: 'draft' | 'publish' = 'publish',
  id: string = 'snapshot-1'
) {
  const artifact = createPublicPresenceValidationArtifact(document, {
    mode: validationMode,
    runtimeAuthority: buildPublicPresenceSeedRuntimeAuthorityForTests(document.templateId),
  });

  return {
    acknowledgementIds: artifact.snapshot.acknowledgementIds,
    blockerCount: artifact.snapshot.issueCounts.blocker,
    blockerIds: artifact.snapshot.blockerIds,
    blocksAiPatch: false,
    blocksPublish: false,
    blocksVisualEdit: false,
    createdAt: new Date('2026-05-15T10:00:00.000Z'),
    createdBy: 'user-1',
    fatalCount: artifact.snapshot.issueCounts.fatal,
    id,
    infoCount: artifact.snapshot.issueCounts.info,
    issueCounts: artifact.snapshot.issueCounts,
    portalId: 'portal-1',
    projectionHash: artifact.snapshot.projectionHash,
    registryVersion: artifact.snapshot.templateRegistryVersion,
    safetyPolicyVersion: artifact.snapshot.safetyPolicyVersion,
    snapshot: artifact.snapshot as unknown as Record<string, unknown>,
    validationMode: artifact.snapshot.validationMode,
    validationState: 'validEditable',
    versionId: 'live-1',
    warningCount: artifact.snapshot.issueCounts.warning,
  };
}

describe('PublicHomepageProjectionService', () => {
  function createService() {
    const publicHomepageService = {
      getPublishedHomepageOrThrow: vi.fn(),
      getPublishedHomepageByCodesOrThrow: vi.fn(),
    } as unknown as PublicHomepageService;

    const publicHomepageReadRepository = {
      listActiveTenantSchemas: vi.fn().mockResolvedValue(['tenant_alpha']),
      findPublishedTalentByPath: vi.fn().mockResolvedValue(null),
      findActiveTenantSchemaByCode: vi.fn().mockResolvedValue('tenant_alpha'),
      findPublishedTalentByCode: vi.fn().mockResolvedValue(null),
    } as unknown as PublicHomepageReadRepository;

    const publicPresenceFoundationRepository = {
      findPortalByTalentId: vi.fn().mockResolvedValue(null),
      findDocumentVersionById: vi.fn().mockResolvedValue(null),
      findLatestVersionByTemplate: vi.fn().mockResolvedValue(null),
      findValidationSnapshotById: vi.fn().mockResolvedValue(null),
    } as unknown as PublicPresenceFoundationRepository;

    const homepageAdminRepository = {
      findTalentById: vi.fn(),
      findTenantCodeBySchema: vi.fn(),
    } as unknown as HomepageAdminRepository;
    const publicPresenceStudioService = {
      getWorkspace: vi.fn().mockResolvedValue({
        homepagePolicy: {
          allowedTemplateTypeCodes: ['pending-reveal'],
          blockedReasons: [],
          status: 'ready',
        },
        templateAssets: [
          {
            assetId: 'template-asset-1',
            isSelectable: true,
            templateId: 'debutReveal',
          },
        ],
      }),
    } as unknown as PublicPresenceStudioService;

    return {
      service: new PublicHomepageProjectionService(
        publicHomepageService,
        publicHomepageReadRepository,
        publicPresenceFoundationRepository,
        homepageAdminRepository,
        publicPresenceStudioService
      ),
      publicHomepageService,
      publicHomepageReadRepository,
      publicPresenceFoundationRepository,
      homepageAdminRepository,
      publicPresenceStudioService,
    };
  }

  it('falls back to the legacy public homepage runtime when no live Public Presence version exists', async () => {
    const { service, publicHomepageService } = createService();

    vi.mocked(publicHomepageService.getPublishedHomepageOrThrow).mockResolvedValue(
      baseHomepageData
    );

    const projection = await service.getPublishedHomepageProjectionOrThrow('tokino-sora');

    expect(projection.route).toMatchObject({
      canonicalPath: '/p/tokino-sora',
      legacyPath: 'tokino-sora',
    });
    expect(projection.portalId).toBeNull();
    expect(publicHomepageService.getPublishedHomepageOrThrow).toHaveBeenCalledWith('tokino-sora');
    expect(service.toPublicProjection(projection)).not.toHaveProperty('contentHash');
  });

  it('prefers the live Public Presence document when the portal has a published version', async () => {
    const { service, publicHomepageReadRepository, publicPresenceFoundationRepository } =
      createService();

    vi.mocked(publicHomepageReadRepository.findPublishedTalentByPath).mockResolvedValue(
      publishedTalent
    );
    vi.mocked(publicPresenceFoundationRepository.findPortalByTalentId).mockResolvedValue({
      id: 'portal-1',
      talentId: 'talent-1',
      draftVersionId: 'draft-1',
      liveVersionId: 'live-1',
      latestVersionNumber: 3,
      latestValidationState: 'validEditable',
      lastValidatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdAt: new Date('2026-05-15T08:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      version: 1,
    });
    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue({
      id: 'live-1',
      portalId: 'portal-1',
      versionNumber: 2,
      documentSchemaVersion: '1.0',
      templateId: 'debutReveal',
      templateAssetPin: null,
      document: liveDocument as unknown as Record<string, unknown>,
      documentState: 'published',
      contentHashAlgorithm: 'sha256',
      contentHash: 'public-presence-hash',
      lastValidationSnapshotId: 'snapshot-1',
      scheduledFor: null,
      publishedAt: new Date('2026-05-15T10:00:00.000Z'),
      publishedBy: 'user-1',
      createdAt: new Date('2026-05-15T09:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdBy: 'user-1',
    });
    vi.mocked(publicPresenceFoundationRepository.findValidationSnapshotById).mockResolvedValue(
      createValidationSnapshotRecord(liveDocument, 'publish')
    );

    const projection = await service.getPublishedHomepageProjectionOrThrow('tokino-sora');

    expect(projection.portalId).toBe('portal-1');
    expect(projection.documentVersionId).toBe('live-1');
    expect(projection.route).toMatchObject({
      canonicalPath: '/p/tokino-sora',
      legacyPath: 'tokino-sora',
      talentCode: 'sora',
    });
    expect(projection.metadata.title).toBe('Project S');
    expect(projection.metadata.ogImage).toBeNull();
    expect(service.toPublicProjection(projection)).not.toHaveProperty('documentVersionId');
  });

  it('builds draft preview projections for the Studio route with optional phase overrides', async () => {
    const {
      service,
      homepageAdminRepository,
      publicPresenceFoundationRepository,
      publicPresenceStudioService,
    } = createService();

    vi.mocked(homepageAdminRepository.findTalentById).mockResolvedValue({
      id: 'talent-1',
      code: 'sora',
      displayName: 'Tokino Sora',
      homepagePath: 'tokino-sora',
      customDomain: null,
      customDomainVerified: false,
      artistStageId: 'artist-stage-live',
      lifecycleStatus: 'published',
      timezone: 'Asia/Tokyo',
    });
    vi.mocked(homepageAdminRepository.findTenantCodeBySchema).mockResolvedValue('tenant-a');
    vi.mocked(publicPresenceFoundationRepository.findPortalByTalentId).mockResolvedValue({
      id: 'portal-1',
      talentId: 'talent-1',
      draftVersionId: 'draft-1',
      liveVersionId: 'live-1',
      latestVersionNumber: 3,
      latestValidationState: 'validEditable',
      lastValidatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdAt: new Date('2026-05-15T08:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      version: 1,
    });
    vi.mocked(publicPresenceStudioService.getWorkspace).mockResolvedValue({
      homepagePolicy: {
        allowedTemplateTypeCodes: ['pending-reveal'],
        blockedReasons: [],
        status: 'ready',
      },
      templateAssets: [
        {
          assetId: 'template-asset-1',
          isSelectable: false,
          templateId: 'debutReveal',
        },
      ],
    } as Awaited<ReturnType<PublicPresenceStudioService['getWorkspace']>>);
    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue({
      id: 'draft-1',
      portalId: 'portal-1',
      versionNumber: 3,
      documentSchemaVersion: '1.0',
      templateId: 'debutReveal',
      templateAssetPin: createTemplateAssetPin('debutReveal'),
      document: liveDocument as unknown as Record<string, unknown>,
      documentState: 'draft',
      contentHashAlgorithm: 'sha256',
      contentHash: 'draft-hash',
      lastValidationSnapshotId: 'snapshot-2',
      scheduledFor: null,
      publishedAt: null,
      publishedBy: null,
      createdAt: new Date('2026-05-15T09:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdBy: 'user-1',
    });
    vi.mocked(publicPresenceFoundationRepository.findValidationSnapshotById).mockResolvedValue(
      createValidationSnapshotRecord(liveDocument, 'draft', 'snapshot-2')
    );

    const projection = await service.getDraftPreviewProjectionOrThrow(
      'talent-1',
      'tenant_alpha',
      'revealed'
    );

    expect(projection.route).toMatchObject({
      canonicalPath: '/tenant-a/sora/homepage',
      legacyPath: 'tokino-sora',
      tenantCode: 'tenant-a',
      talentCode: 'sora',
    });
    expect(projection.resolvedRevealPhase).toBe('revealed');
    expect(projection.metadata.title).toBe('Sora reveal');
  });

  it('blocks draft preview projections when Artist Stage homepage policy blocks the template', async () => {
    const {
      service,
      homepageAdminRepository,
      publicPresenceFoundationRepository,
      publicPresenceStudioService,
    } = createService();

    vi.mocked(homepageAdminRepository.findTalentById).mockResolvedValue({
      id: 'talent-1',
      code: 'sora',
      displayName: 'Tokino Sora',
      homepagePath: 'tokino-sora',
      customDomain: null,
      customDomainVerified: false,
      artistStageId: 'artist-stage-draft',
      lifecycleStatus: 'draft',
      timezone: 'Asia/Tokyo',
    });
    vi.mocked(publicPresenceFoundationRepository.findPortalByTalentId).mockResolvedValue({
      id: 'portal-1',
      talentId: 'talent-1',
      draftVersionId: 'draft-1',
      liveVersionId: null,
      latestVersionNumber: 1,
      latestValidationState: 'validEditable',
      lastValidatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdAt: new Date('2026-05-15T08:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      version: 1,
    });
    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue({
      id: 'draft-1',
      portalId: 'portal-1',
      versionNumber: 1,
      documentSchemaVersion: '1.0',
      templateId: 'activeTalentHub',
      templateAssetPin: {
        assetId: 'template-asset-1',
        assetRevisionId: 'template-revision-1',
        snapshot: null,
        sourceHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
      document: {
        ...liveDocument,
        templateId: 'activeTalentHub',
      } as unknown as Record<string, unknown>,
      documentState: 'draft',
      contentHashAlgorithm: 'sha256',
      contentHash: 'draft-hash',
      lastValidationSnapshotId: 'snapshot-2',
      scheduledFor: null,
      publishedAt: null,
      publishedBy: null,
      createdAt: new Date('2026-05-15T09:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdBy: 'user-1',
    });
    vi.mocked(publicPresenceStudioService.getWorkspace).mockResolvedValue({
      homepagePolicy: {
        allowedTemplateTypeCodes: ['graduated'],
        blockedReasons: [
          {
            code: 'noAllowedTemplateAssets',
            messageKey: 'publicPresence.policy.noAllowedTemplateAssets',
          },
        ],
        status: 'blocked',
      },
      templateAssets: [
        {
          assetId: 'template-asset-1',
          isSelectable: false,
          templateId: 'activeTalentHub',
        },
      ],
    } as Awaited<ReturnType<PublicPresenceStudioService['getWorkspace']>>);

    let caught: unknown;

    try {
      await service.getDraftPreviewProjectionOrThrow('talent-1', 'tenant_alpha', 'current');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    expect((caught as BadRequestException).getResponse()).toMatchObject({
      message: expect.stringMatching(/Artist Stage policy does not allow/i),
    });
    expect(publicPresenceStudioService.getWorkspace).toHaveBeenCalledWith(
      'talent-1',
      'tenant_alpha',
      'activeTalentHub'
    );
  });

  it('uses the talent display name when an existing debut draft still stores raw internal identity copy', async () => {
    const { service, homepageAdminRepository, publicPresenceFoundationRepository } =
      createService();

    vi.mocked(homepageAdminRepository.findTalentById).mockResolvedValue({
      id: 'talent-1',
      code: 'talent_sakura',
      displayName: 'Sakura Ch.',
      homepagePath: 'sakura-home',
      customDomain: null,
      customDomainVerified: false,
      artistStageId: 'artist-stage-live',
      lifecycleStatus: 'published',
      timezone: 'Asia/Tokyo',
    });
    vi.mocked(homepageAdminRepository.findTenantCodeBySchema).mockResolvedValue('tenant-a');
    vi.mocked(publicPresenceFoundationRepository.findPortalByTalentId).mockResolvedValue({
      id: 'portal-1',
      talentId: 'talent-1',
      draftVersionId: 'draft-raw',
      liveVersionId: null,
      latestVersionNumber: 15,
      latestValidationState: 'validEditable',
      lastValidatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdAt: new Date('2026-05-15T08:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      version: 1,
    });
    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue({
      id: 'draft-raw',
      portalId: 'portal-1',
      versionNumber: 15,
      documentSchemaVersion: '1.0',
      templateId: 'debutReveal',
      templateAssetPin: null,
      document: {
        schemaVersion: '1.0',
        templateId: 'debutReveal',
        metadata: {
          title: 'TALENT_SAKURA',
        },
        sections: [
          {
            id: 'firstEncounter-1',
            kind: 'firstEncounter',
            fields: {
              headline: { provenance: 'publicPresence', value: 'TALENT_SAKURA debut campaign' },
              displayName: { provenance: 'publicPresence', value: 'TALENT_SAKURA' },
            },
            phaseVisibility: 'always',
          },
          {
            id: 'countdownReveal-2',
            kind: 'countdownReveal',
            fields: {
              phase: { provenance: 'publicPresence', value: 'teaser' },
              timezone: { provenance: 'publicPresence', value: 'UTC' },
            },
            phaseVisibility: 'teaser',
          },
        ],
      } as unknown as Record<string, unknown>,
      documentState: 'draft',
      contentHashAlgorithm: 'sha256',
      contentHash: 'draft-raw-hash',
      lastValidationSnapshotId: 'snapshot-raw',
      scheduledFor: null,
      publishedAt: null,
      publishedBy: null,
      createdAt: new Date('2026-05-15T09:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdBy: 'user-1',
    });
    vi.mocked(publicPresenceFoundationRepository.findValidationSnapshotById).mockResolvedValue(
      createValidationSnapshotRecord(
        {
          schemaVersion: '1.0',
          templateId: 'debutReveal',
          metadata: {
            title: 'Sakura Ch.',
          },
          sections: [
            {
              id: 'firstEncounter-1',
              kind: 'firstEncounter',
              fields: {
                headline: {
                  provenance: 'publicPresence',
                  value: 'Countdown updates, reveal moments, and launch links for fans.',
                },
                displayName: {
                  provenance: 'publicPresence',
                  value: 'Sakura Ch.',
                },
              },
              phaseVisibility: 'always',
            },
            {
              id: 'countdownReveal-2',
              kind: 'countdownReveal',
              fields: {
                phase: {
                  provenance: 'publicPresence',
                  value: 'teaser',
                },
                timezone: {
                  provenance: 'publicPresence',
                  value: 'UTC',
                },
              },
              phaseVisibility: 'teaser',
            },
          ],
        },
        'draft',
        'snapshot-raw'
      )
    );

    const projection = await service.getDraftPreviewProjectionOrThrow(
      'talent-1',
      'tenant_alpha',
      'teaser'
    );

    expect(projection.metadata.title).toBe('Sakura Ch.');
    expect(projection.sections[0]).toMatchObject({
      sectionType: 'hero',
      title: 'Sakura Ch.',
      description: 'Countdown updates, reveal moments, and launch links for fans.',
      timezone: null,
    });
    expect(JSON.stringify(projection)).not.toContain('TALENT_SAKURA');
  });
});

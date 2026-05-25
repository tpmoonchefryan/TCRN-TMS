import { describe, expect, it, vi } from 'vitest';

import {
  buildBlankPublicPresenceAssetSourceBundle,
  buildPublicPresenceComponentAssetManifest,
  buildPublicPresenceTemplateAssetManifest,
  getPublicPresenceComponentSeedText,
  getPublicPresenceTemplateSeedText,
  type PublicPresenceAssetListEntry,
  type PublicPresenceAssetRevisionPin,
  type PublicPresenceDocument,
  type RequestContext,
} from '@tcrn/shared';

import { TalentService } from '../../talent/talent.service';
import type {
  PublicPresenceDocumentVersionRecord,
  PublicPresencePortalRecord,
} from '../domain/public-presence-foundation.policy';
import { HomepageAdminRepository } from '../infrastructure/homepage-admin.repository';
import { PublicPresenceFoundationRepository } from '../infrastructure/public-presence-foundation.repository';
import { CdnPurgeService } from '../services/cdn-purge.service';
import { PublicPresenceAssetService } from './public-presence-asset.service';
import { PublicPresenceStudioService } from './public-presence-studio.service';
import { PublicPresenceWorkflowService } from './public-presence-workflow.service';

const activeHubDocument: PublicPresenceDocument = {
  schemaVersion: '1.0',
  templateId: 'activeTalentHub',
  metadata: {
    title: 'Aki Rosenthal',
    description: 'Official public presence',
  },
  sections: [
    {
      id: 'first-1',
      kind: 'firstEncounter',
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
      phaseVisibility: 'always',
    },
    {
      id: 'channels-1',
      kind: 'officialChannels',
      components: [
        {
          id: 'social-1',
          type: 'SocialLinks',
          props: {
            platforms: [
              {
                platformCode: 'youtube',
                label: 'YouTube',
                url: 'https://www.youtube.com/@aki',
              },
            ],
          },
        },
      ],
      phaseVisibility: 'always',
    },
  ],
};

const debutRevealDocument: PublicPresenceDocument = {
  schemaVersion: '1.0',
  templateId: 'debutReveal',
  metadata: {
    title: 'Aki Rosenthal',
    description: 'Debut countdown',
  },
  sections: [
    {
      id: 'first-1',
      kind: 'firstEncounter',
      fields: {
        displayName: {
          provenance: 'publicPresence',
          value: 'Aki Rosenthal',
        },
        headline: {
          provenance: 'publicPresence',
          value: 'Debut countdown',
        },
      },
      phaseVisibility: 'always',
    },
    {
      id: 'countdown-1',
      kind: 'countdownReveal',
      fields: {
        phase: {
          provenance: 'publicPresence',
          value: 'countdown',
        },
        revealAtUtc: {
          provenance: 'publicPresence',
          value: '2030-05-15T10:00:00.000Z',
        },
        revealName: {
          provenance: 'publicPresence',
          value: 'Aki Rosenthal',
        },
        teaserName: {
          provenance: 'publicPresence',
          value: 'Aki',
        },
        timezone: {
          provenance: 'publicPresence',
          value: 'Asia/Tokyo',
        },
      },
      phaseVisibility: 'countdown',
    },
  ],
};

const TALENT_OWNER_ID = '66666666-6666-4666-8666-666666666661';
const TEMPLATE_FIXTURES = {
  activeTalentHub: {
    assetId: '66666666-6666-4666-8666-666666666662',
    revisionId: '66666666-6666-4666-8666-666666666663',
  },
  debutReveal: {
    assetId: '66666666-6666-4666-8666-666666666664',
    revisionId: '66666666-6666-4666-8666-666666666665',
  },
} as const;
const SOCIAL_LINKS_FIXTURE = {
  assetId: '66666666-6666-4666-8666-666666666666',
  revisionId: '66666666-6666-4666-8666-666666666667',
} as const;

function createPortalRecord(): PublicPresencePortalRecord {
  return {
    createdAt: new Date('2026-05-15T12:00:00.000Z'),
    draftVersionId: 'draft-version-1',
    id: 'portal-1',
    lastValidatedAt: new Date('2026-05-15T12:05:00.000Z'),
    latestValidationState: 'validEditable',
    latestVersionNumber: 1,
    liveVersionId: 'live-version-1',
    talentId: 'talent-1',
    updatedAt: new Date('2026-05-15T12:05:00.000Z'),
    version: 1,
  };
}

function createVersionRecord(
  state: string = 'draft',
  templateId: 'activeTalentHub' | 'debutReveal' = 'activeTalentHub'
): PublicPresenceDocumentVersionRecord {
  const templateText = getPublicPresenceTemplateSeedText(templateId);
  const templateManifest = buildPublicPresenceTemplateAssetManifest(templateId, {
    assetCode: `${templateId}-code`,
    assetId: TEMPLATE_FIXTURES[templateId].assetId,
    assetRevisionId: TEMPLATE_FIXTURES[templateId].revisionId,
    description: templateText.description,
    name: templateText.name,
    ownerId: TALENT_OWNER_ID,
    ownerType: 'talent',
  });
  const templateAssetPin = {
    assetId: TEMPLATE_FIXTURES[templateId].assetId,
    assetRevisionId: TEMPLATE_FIXTURES[templateId].revisionId,
    snapshot: {
      assetId: TEMPLATE_FIXTURES[templateId].assetId,
      assetRevisionId: TEMPLATE_FIXTURES[templateId].revisionId,
      manifest: templateManifest,
      revisionNumber: 1,
      sourceBundle: buildBlankPublicPresenceAssetSourceBundle({
        assetCode: `${templateId}-code`,
        assetKind: 'template',
        manifest: templateManifest,
        name: templateText.name,
        templateId,
      }),
      sourceHash: 'a'.repeat(64),
    },
    sourceHash: 'a'.repeat(64),
  } satisfies PublicPresenceAssetRevisionPin;

  return {
    id: templateId === 'debutReveal' ? 'debut-version-1' : 'draft-version-1',
    portalId: 'portal-1',
    versionNumber: 1,
    documentSchemaVersion: '1.0',
    templateId,
    templateAssetPin,
    document: (templateId === 'debutReveal'
      ? debutRevealDocument
      : activeHubDocument) as unknown as Record<string, unknown>,
    documentState: state,
    contentHashAlgorithm: 'sha256',
    contentHash: 'hash-1',
    lastValidationSnapshotId: 'snapshot-1',
    scheduledFor: null,
    publishedAt: null,
    publishedBy: null,
    createdAt: new Date('2026-05-15T12:00:00.000Z'),
    updatedAt: new Date('2026-05-15T12:05:00.000Z'),
    createdBy: 'user-1',
  };
}

function createComponentAssetEntry(componentType: 'SocialLinks'): PublicPresenceAssetListEntry {
  const text = getPublicPresenceComponentSeedText(componentType);
  const manifest = buildPublicPresenceComponentAssetManifest(componentType, {
    assetCode: `${componentType.toLowerCase()}-code`,
    assetId: SOCIAL_LINKS_FIXTURE.assetId,
    assetRevisionId: SOCIAL_LINKS_FIXTURE.revisionId,
    description: text.description,
    name: text.name,
    ownerId: TALENT_OWNER_ID,
    ownerType: 'talent',
  });

  return {
    asset: {
      assetKind: 'component',
      code: `${componentType.toLowerCase()}-code`,
      componentType,
      createdAt: '2026-05-15T12:00:00.000Z',
      currentRevisionId: SOCIAL_LINKS_FIXTURE.revisionId,
      description: text.description,
      id: SOCIAL_LINKS_FIXTURE.assetId,
      isSystem: false,
      name: text.name,
      ownerId: TALENT_OWNER_ID,
      ownerType: 'talent',
      status: 'active',
      templateId: null,
      templateTypeCode: null,
      updatedAt: '2026-05-15T12:05:00.000Z',
      version: 1,
    },
    canEdit: true,
    currentRevision: {
      artifactStatus: 'active',
      assetId: SOCIAL_LINKS_FIXTURE.assetId,
      createdAt: '2026-05-15T12:00:00.000Z',
      createdBy: 'user-1',
      id: SOCIAL_LINKS_FIXTURE.revisionId,
      lastValidatedAt: '2026-05-15T12:05:00.000Z',
      manifest,
      revisionNumber: 1,
      runtimeContractVersion: '1.0.0',
      sourceBundle: buildBlankPublicPresenceAssetSourceBundle({
        assetCode: `${componentType.toLowerCase()}-code`,
        assetKind: 'component',
        componentType,
        manifest,
        name: text.name,
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

describe('PublicPresenceWorkflowService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'reviewer-1',
    userName: 'reviewer',
  };

  function createService() {
    const homepageAdminRepository = {
      findTalentById: vi.fn().mockResolvedValue({
        id: 'talent-1',
        code: 'aki',
        homepagePath: 'aki-home',
        customDomain: null,
        customDomainVerified: false,
      }),
      findTenantCodeBySchema: vi.fn().mockResolvedValue('tenant-a'),
    } as unknown as HomepageAdminRepository;

    const publicPresenceFoundationRepository = {
      findPortalByTalentId: vi.fn().mockResolvedValue(createPortalRecord()),
      findDocumentVersionById: vi.fn().mockResolvedValue(createVersionRecord()),
      findLatestVersionByTemplate: vi.fn().mockResolvedValue(null),
      updateDocumentWorkflowState: vi.fn().mockResolvedValue(createVersionRecord('inReview')),
      createValidationSnapshotForExistingDraft: vi.fn().mockResolvedValue({
        id: 'snapshot-2',
      }),
      findLatestWorkflowEventByVersionAndType: vi.fn().mockResolvedValue({
        actorId: 'submitter-1',
      }),
      publishVersionAndAssignLive: vi.fn().mockResolvedValue(createVersionRecord('published')),
      createDocumentFromSourceAndAssignDraft: vi.fn(),
      findDueScheduledVersions: vi.fn().mockResolvedValue([]),
    } as unknown as PublicPresenceFoundationRepository;

    const publicPresenceStudioService = {
      getWorkspace: vi
        .fn()
        .mockImplementation(
          async (
            _talentId: string,
            _tenantSchema: string,
            templateId: string | null | undefined
          ) => ({
            homepagePolicy: {
              allowedTemplateIds: ['activeTalentHub', 'debutReveal'],
              blockedReasons: [],
              status: 'ready',
            },
            templateAssets: [
              {
                assetId: TEMPLATE_FIXTURES.activeTalentHub.assetId,
                isSelectable: true,
                templateId: 'activeTalentHub',
              },
              {
                assetId: TEMPLATE_FIXTURES.debutReveal.assetId,
                isSelectable: true,
                templateId: 'debutReveal',
              },
            ],
            selectedTemplateId: templateId ?? 'activeTalentHub',
          })
        ),
    } as unknown as PublicPresenceStudioService;

    const publicPresenceAssetService = {
      listAssets: vi.fn().mockResolvedValue([createComponentAssetEntry('SocialLinks')]),
    } as unknown as PublicPresenceAssetService;

    const cdnPurgeService = {
      purgeHomepage: vi.fn().mockResolvedValue(undefined),
    } as unknown as CdnPurgeService;

    const talentService = {
      findById: vi.fn().mockResolvedValue({
        id: 'talent-1',
        lifecycleStatus: 'published',
        version: 3,
      }),
      publish: vi.fn().mockResolvedValue(undefined),
    } as unknown as TalentService;

    return {
      service: new PublicPresenceWorkflowService(
        homepageAdminRepository,
        publicPresenceFoundationRepository,
        publicPresenceStudioService,
        publicPresenceAssetService,
        cdnPurgeService,
        talentService
      ),
      homepageAdminRepository,
      publicPresenceFoundationRepository,
      publicPresenceStudioService,
      publicPresenceAssetService,
      cdnPurgeService,
      talentService,
    };
  }

  it('submits the current draft for review', async () => {
    const { service, publicPresenceFoundationRepository } = createService();

    await service.submitForReview('talent-1', context, 'hash-1');

    expect(publicPresenceFoundationRepository.updateDocumentWorkflowState).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        eventType: 'submittedForReview',
        toDocumentState: 'inReview',
        versionId: 'draft-version-1',
      })
    );
  });

  it('allows approving a draft when the reviewer matches the latest submitter', async () => {
    const { service, publicPresenceFoundationRepository } = createService();

    vi.mocked(
      publicPresenceFoundationRepository.findLatestWorkflowEventByVersionAndType
    ).mockResolvedValue({
      id: 'event-1',
      actorId: 'reviewer-1',
      contentHash: 'hash-1',
      contentHashAlgorithm: 'sha256',
      eventType: 'submittedForReview',
      fromDocumentState: 'draft',
      occurredAt: new Date('2026-05-15T12:06:00.000Z'),
      payload: {},
      portalId: 'portal-1',
      toDocumentState: 'inReview',
      versionId: 'draft-version-1',
    });
    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue(
      createVersionRecord('inReview')
    );

    await service.approve('talent-1', context, 'hash-1');

    expect(publicPresenceFoundationRepository.updateDocumentWorkflowState).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        actorId: 'reviewer-1',
        eventType: 'approved',
        toDocumentState: 'approved',
        versionId: 'draft-version-1',
      })
    );
  });

  it('publishes an approved version and purges the public route', async () => {
    const { service, publicPresenceFoundationRepository, cdnPurgeService } = createService();

    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue(
      createVersionRecord('approved')
    );

    await service.publishNow('talent-1', context, 'hash-1');

    expect(publicPresenceFoundationRepository.publishVersionAndAssignLive).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        eventType: 'published',
        versionId: 'draft-version-1',
      })
    );
    expect(cdnPurgeService.purgeHomepage).toHaveBeenCalledWith('aki-home', undefined);
  });

  it('runs submit, approve, and publish atomically after direct-publish preflight passes', async () => {
    const { service, publicPresenceFoundationRepository } = createService();

    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById)
      .mockResolvedValueOnce(createVersionRecord('draft', 'debutReveal'))
      .mockResolvedValueOnce(createVersionRecord('inReview', 'debutReveal'))
      .mockResolvedValueOnce(createVersionRecord('approved', 'debutReveal'));
    vi.mocked(publicPresenceFoundationRepository.findLatestVersionByTemplate).mockImplementation(
      async (_tenantSchema, _portalId, templateId, states) => {
        if (templateId !== 'activeTalentHub') {
          return null;
        }

        if (states?.includes('approved')) {
          return createVersionRecord('approved', 'activeTalentHub');
        }

        return createVersionRecord('approved', 'activeTalentHub');
      }
    );

    await service.publishNow('talent-1', context, 'hash-1');

    expect(publicPresenceFoundationRepository.updateDocumentWorkflowState).toHaveBeenNthCalledWith(
      1,
      'tenant_test',
      expect.objectContaining({
        eventType: 'submittedForReview',
        toDocumentState: 'inReview',
        versionId: 'debut-version-1',
      })
    );
    expect(publicPresenceFoundationRepository.updateDocumentWorkflowState).toHaveBeenNthCalledWith(
      2,
      'tenant_test',
      expect.objectContaining({
        eventType: 'approved',
        toDocumentState: 'approved',
        versionId: 'debut-version-1',
      })
    );
    expect(publicPresenceFoundationRepository.publishVersionAndAssignLive).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        eventType: 'published',
        versionId: 'debut-version-1',
      })
    );
  });

  it('rejects Debut direct publish before any workflow mutation when the Active Hub dependency is missing', async () => {
    const { service, publicPresenceFoundationRepository, talentService } = createService();

    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue(
      createVersionRecord('draft', 'debutReveal')
    );
    vi.mocked(publicPresenceFoundationRepository.findLatestVersionByTemplate).mockResolvedValue(
      null
    );

    await expect(service.publishNow('talent-1', context, 'hash-1')).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Approve the always-on hub before scheduling the debut switch.',
      }),
    });

    expect(publicPresenceFoundationRepository.updateDocumentWorkflowState).not.toHaveBeenCalled();
    expect(publicPresenceFoundationRepository.publishVersionAndAssignLive).not.toHaveBeenCalled();
    expect(talentService.publish).not.toHaveBeenCalled();
  });

  it('auto-publishes a draft talent lifecycle before releasing the homepage', async () => {
    const { service, publicPresenceFoundationRepository, talentService } = createService();

    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue(
      createVersionRecord('approved')
    );
    vi.mocked(talentService.findById).mockResolvedValue({
      id: 'talent-1',
      lifecycleStatus: 'draft',
      version: 7,
    } as Awaited<ReturnType<TalentService['findById']>>);

    await service.publishNow('talent-1', context, 'hash-1');

    expect(talentService.publish).toHaveBeenCalledWith('talent-1', 'tenant_test', 7, 'reviewer-1');
  });
});

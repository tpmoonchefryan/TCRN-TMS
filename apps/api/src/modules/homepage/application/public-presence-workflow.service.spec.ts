import type { PublicPresenceDocument, RequestContext } from '@tcrn/shared';
import { describe, expect, it, vi } from 'vitest';

import type {
  PublicPresenceDocumentVersionRecord,
  PublicPresencePortalRecord,
} from '../domain/public-presence-foundation.policy';
import { HomepageAdminRepository } from '../infrastructure/homepage-admin.repository';
import { PublicPresenceFoundationRepository } from '../infrastructure/public-presence-foundation.repository';
import { CdnPurgeService } from '../services/cdn-purge.service';
import { TalentService } from '../../talent/talent.service';
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
  templateId: 'activeTalentHub' | 'debutReveal' = 'activeTalentHub',
): PublicPresenceDocumentVersionRecord {
  return {
    id: templateId === 'debutReveal' ? 'debut-version-1' : 'draft-version-1',
    portalId: 'portal-1',
    versionNumber: 1,
    documentSchemaVersion: '1.0',
    templateId,
    document: (
      templateId === 'debutReveal' ? debutRevealDocument : activeHubDocument
    ) as unknown as Record<string, unknown>,
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
        cdnPurgeService,
        talentService,
      ),
      homepageAdminRepository,
      publicPresenceFoundationRepository,
      cdnPurgeService,
      talentService,
    };
  }

  it('submits the current draft for review', async () => {
    const { service, publicPresenceFoundationRepository } = createService();

    await service.submitForReview('talent-1', context, 'hash-1');

    expect(
      publicPresenceFoundationRepository.updateDocumentWorkflowState,
    ).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        eventType: 'submittedForReview',
        toDocumentState: 'inReview',
        versionId: 'draft-version-1',
      }),
    );
  });

  it('allows approving a draft when the reviewer matches the latest submitter', async () => {
    const { service, publicPresenceFoundationRepository } = createService();

    vi.mocked(
      publicPresenceFoundationRepository.findLatestWorkflowEventByVersionAndType,
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
      createVersionRecord('inReview'),
    );

    await service.approve('talent-1', context, 'hash-1');

    expect(
      publicPresenceFoundationRepository.updateDocumentWorkflowState,
    ).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        actorId: 'reviewer-1',
        eventType: 'approved',
        toDocumentState: 'approved',
        versionId: 'draft-version-1',
      }),
    );
  });

  it('publishes an approved version and purges the public route', async () => {
    const {
      service,
      publicPresenceFoundationRepository,
      cdnPurgeService,
    } = createService();

    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue(
      createVersionRecord('approved'),
    );

    await service.publishNow('talent-1', context, 'hash-1');

    expect(
      publicPresenceFoundationRepository.publishVersionAndAssignLive,
    ).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        eventType: 'published',
        versionId: 'draft-version-1',
      }),
    );
    expect(cdnPurgeService.purgeHomepage).toHaveBeenCalledWith('aki-home', undefined);
  });

  it('runs submit, approve, and publish atomically after direct-publish preflight passes', async () => {
    const {
      service,
      publicPresenceFoundationRepository,
    } = createService();

    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById)
      .mockResolvedValueOnce(createVersionRecord('draft', 'debutReveal'))
      .mockResolvedValueOnce(createVersionRecord('inReview', 'debutReveal'))
      .mockResolvedValueOnce(createVersionRecord('approved', 'debutReveal'));
    vi.mocked(publicPresenceFoundationRepository.findLatestVersionByTemplate)
      .mockImplementation(async (_tenantSchema, _portalId, templateId, states) => {
        if (templateId !== 'activeTalentHub') {
          return null;
        }

        if (states?.includes('approved')) {
          return createVersionRecord('approved', 'activeTalentHub');
        }

        return createVersionRecord('approved', 'activeTalentHub');
      });

    await service.publishNow('talent-1', context, 'hash-1');

    expect(
      publicPresenceFoundationRepository.updateDocumentWorkflowState,
    ).toHaveBeenNthCalledWith(
      1,
      'tenant_test',
      expect.objectContaining({
        eventType: 'submittedForReview',
        toDocumentState: 'inReview',
        versionId: 'debut-version-1',
      }),
    );
    expect(
      publicPresenceFoundationRepository.updateDocumentWorkflowState,
    ).toHaveBeenNthCalledWith(
      2,
      'tenant_test',
      expect.objectContaining({
        eventType: 'approved',
        toDocumentState: 'approved',
        versionId: 'debut-version-1',
      }),
    );
    expect(
      publicPresenceFoundationRepository.publishVersionAndAssignLive,
    ).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        eventType: 'published',
        versionId: 'debut-version-1',
      }),
    );
  });

  it('rejects Debut direct publish before any workflow mutation when the Active Hub dependency is missing', async () => {
    const {
      service,
      publicPresenceFoundationRepository,
      talentService,
    } = createService();

    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue(
      createVersionRecord('draft', 'debutReveal'),
    );
    vi.mocked(publicPresenceFoundationRepository.findLatestVersionByTemplate).mockResolvedValue(null);

    await expect(
      service.publishNow('talent-1', context, 'hash-1'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Approve the always-on hub before scheduling the debut switch.',
      }),
    });

    expect(
      publicPresenceFoundationRepository.updateDocumentWorkflowState,
    ).not.toHaveBeenCalled();
    expect(
      publicPresenceFoundationRepository.publishVersionAndAssignLive,
    ).not.toHaveBeenCalled();
    expect(talentService.publish).not.toHaveBeenCalled();
  });

  it('auto-publishes a draft talent lifecycle before releasing the homepage', async () => {
    const {
      service,
      publicPresenceFoundationRepository,
      talentService,
    } = createService();

    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue(
      createVersionRecord('approved'),
    );
    vi.mocked(talentService.findById).mockResolvedValue({
      id: 'talent-1',
      lifecycleStatus: 'draft',
      version: 7,
    } as Awaited<ReturnType<TalentService['findById']>>);

    await service.publishNow('talent-1', context, 'hash-1');

    expect(talentService.publish).toHaveBeenCalledWith(
      'talent-1',
      'tenant_test',
      7,
      'reviewer-1',
    );
  });
});

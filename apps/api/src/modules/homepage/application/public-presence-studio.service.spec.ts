import {
  createPublicPresenceValidationArtifact,
  type PublicPresenceDocument,
  type RequestContext,
} from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  PublicPresenceDocumentVersionRecord,
  PublicPresencePortalRecord,
  PublicPresenceValidationSnapshotRecord,
} from '../domain/public-presence-foundation.policy';
import { HomepageAdminRepository } from '../infrastructure/homepage-admin.repository';
import { PublicPresenceFoundationRepository } from '../infrastructure/public-presence-foundation.repository';
import { PublicPresenceFoundationService } from './public-presence-foundation.service';
import { PublicPresenceStudioService } from './public-presence-studio.service';

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
    templateId: 'activeTalentHub',
    updatedAt: new Date('2026-05-15T12:05:00.000Z'),
    versionNumber: 1,
  };
}

function createDebutRevealVersionRecord(
  documentState: string = 'draft',
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

describe('PublicPresenceStudioService', () => {
  let homepageAdminRepository: HomepageAdminRepository;
  let publicPresenceFoundationRepository: PublicPresenceFoundationRepository;
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

    service = new PublicPresenceStudioService(
      homepageAdminRepository,
      publicPresenceFoundationRepository,
      publicPresenceFoundationService,
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
      timezone: 'Asia/Tokyo',
    } as never);
    vi.mocked(
      publicPresenceFoundationRepository.findPortalByTalentId,
    ).mockResolvedValue(createPortalRecord());
    vi.mocked(
      publicPresenceFoundationRepository.findDraftVersion,
    ).mockResolvedValue(createVersionRecord());
    vi.mocked(
      publicPresenceFoundationRepository.findDocumentVersionById,
    ).mockResolvedValue(null);
    vi.mocked(
      publicPresenceFoundationRepository.findValidationSnapshotById,
    ).mockResolvedValue(createSnapshotRecord());

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
      expect.arrayContaining(['activeTalentHub', 'debutReveal']),
    );
    expect(result.stageSections.map((section) => section.kind)).toEqual(
      expect.arrayContaining(['firstEncounter', 'fanActions', 'agencyNotes']),
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
      timezone: 'Asia/Tokyo',
    } as never);
    vi.mocked(
      publicPresenceFoundationRepository.findPortalByTalentId,
    )
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createPortalRecord());
    vi.mocked(
      publicPresenceFoundationRepository.findDraftVersion,
    ).mockResolvedValue(createVersionRecord());
    vi.mocked(
      publicPresenceFoundationRepository.findDocumentVersionById,
    ).mockResolvedValue(null);
    vi.mocked(
      publicPresenceFoundationRepository.findValidationSnapshotById,
    ).mockResolvedValue(createSnapshotRecord());

    const result = await service.bootstrapDraft(
      'talent-1',
      'activeTalentHub',
      context,
    );

    expect(publicPresenceFoundationService.saveDraft).toHaveBeenCalledWith(
      'talent-1',
      expect.objectContaining({
        schemaVersion: '1.0',
        templateId: 'activeTalentHub',
      }),
      context,
      { expectedCurrentContentHash: null },
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
      timezone: 'Asia/Tokyo',
    } as never);
    vi.mocked(
      publicPresenceFoundationRepository.findPortalByTalentId,
    )
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createPortalRecord());
    vi.mocked(
      publicPresenceFoundationRepository.findDraftVersion,
    ).mockResolvedValue(createVersionRecord());
    vi.mocked(
      publicPresenceFoundationRepository.findDocumentVersionById,
    ).mockResolvedValue(null);
    vi.mocked(
      publicPresenceFoundationRepository.findValidationSnapshotById,
    ).mockResolvedValue(createSnapshotRecord());

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
      { expectedCurrentContentHash: null },
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
      timezone: 'Asia/Tokyo',
    } as never);
    vi.mocked(
      publicPresenceFoundationRepository.findPortalByTalentId,
    ).mockResolvedValue(createPortalRecord());
    vi.mocked(
      publicPresenceFoundationRepository.findLatestVersionsByPortal,
    ).mockResolvedValue([
      createDebutRevealVersionRecord(),
      createVersionRecord(),
    ]);
    vi.mocked(
      publicPresenceFoundationRepository.findValidationSnapshotById,
    ).mockResolvedValue(null);
    vi.mocked(
      publicPresenceFoundationRepository.findLatestVersionByTemplate,
    ).mockImplementation(async (_tenantSchema, _portalId, templateId, states) => {
      if (templateId !== 'activeTalentHub') {
        return null;
      }

      if (states?.includes('approved')) {
        return null;
      }

      return createVersionRecord();
    });

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

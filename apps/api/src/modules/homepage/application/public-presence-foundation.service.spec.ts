// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildBlankPublicPresenceAssetSourceBundle,
  buildPublicPresenceTemplateAssetManifest,
  getPublicPresenceTemplateSeedText,
  type PublicPresenceAssetRevisionPin,
  type PublicPresenceDocument,
  type RequestContext,
} from '@tcrn/shared';

import { calculatePublicPresenceContentHash } from '../domain/public-presence-foundation.policy';
import { PublicPresenceFoundationRepository } from '../infrastructure/public-presence-foundation.repository';
import { PublicPresenceAssetService } from './public-presence-asset.service';
import { PublicPresenceFoundationService } from './public-presence-foundation.service';

const safeDocument: PublicPresenceDocument = {
  schemaVersion: '1.0',
  templateId: 'activeTalentHub',
  sections: [
    {
      id: 'first-1',
      kind: 'firstEncounter',
      fields: {
        displayName: {
          value: 'Tokino Sora',
          provenance: 'override',
        },
        headline: {
          value: 'Official talent hub',
          provenance: 'publicPresence',
        },
      },
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
                url: 'https://www.youtube.com/@tokinosora',
              },
            ],
          },
        },
      ],
    },
  ],
};

describe('PublicPresenceFoundationService', () => {
  let service: PublicPresenceFoundationService;
  const TEMPLATE_ASSET_ID = '55555555-5555-4555-8555-555555555551';
  const TEMPLATE_REVISION_ID = '55555555-5555-4555-8555-555555555552';
  const TALENT_OWNER_ID = '55555555-5555-4555-8555-555555555553';

  const templatePin: PublicPresenceAssetRevisionPin = (() => {
    const text = getPublicPresenceTemplateSeedText('activeTalentHub');
    const manifest = buildPublicPresenceTemplateAssetManifest('activeTalentHub', {
      assetCode: 'active-talent-hub',
      assetId: TEMPLATE_ASSET_ID,
      assetRevisionId: TEMPLATE_REVISION_ID,
      description: text.description,
      name: text.name,
      ownerId: TALENT_OWNER_ID,
      ownerType: 'talent',
    });

    return {
      assetId: TEMPLATE_ASSET_ID,
      assetRevisionId: TEMPLATE_REVISION_ID,
      snapshot: {
        assetId: TEMPLATE_ASSET_ID,
        assetRevisionId: TEMPLATE_REVISION_ID,
        manifest,
        revisionNumber: 1,
        sourceBundle: buildBlankPublicPresenceAssetSourceBundle({
          assetCode: 'active-talent-hub',
          assetKind: 'template',
          manifest,
          name: text.name,
          templateId: 'activeTalentHub',
        }),
        sourceHash: 'a'.repeat(64),
      },
      sourceHash: 'a'.repeat(64),
    };
  })();

  const mockRepository = {
    createDraftVersionAndAssign: vi.fn(),
    createPortal: vi.fn(),
    createValidationSnapshotForExistingDraft: vi.fn(),
    findLatestVersionByTemplate: vi.fn(),
    findPortalByTalentId: vi.fn(),
  };
  const mockAssetService = {
    listAssets: vi.fn().mockResolvedValue([]),
  };

  const requestContext: RequestContext = {
    ipAddress: '127.0.0.1',
    requestId: 'req-1',
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userAgent: 'Vitest',
    userId: 'user-1',
    userName: 'Operator',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PublicPresenceFoundationService(
      mockRepository as unknown as PublicPresenceFoundationRepository,
      mockAssetService as unknown as PublicPresenceAssetService
    );
  });

  it('creates the portal and first immutable draft version when none exists', async () => {
    mockRepository.findPortalByTalentId.mockResolvedValue(null);
    mockRepository.createPortal.mockResolvedValue({
      id: 'portal-1',
      talentId: 'talent-1',
      draftVersionId: null,
      liveVersionId: null,
      latestVersionNumber: 0,
      latestValidationState: null,
      lastValidatedAt: null,
      createdAt: new Date('2026-05-15T06:00:00.000Z'),
      updatedAt: new Date('2026-05-15T06:00:00.000Z'),
      version: 1,
    });
    mockRepository.findLatestVersionByTemplate.mockResolvedValue(null);
    mockRepository.createDraftVersionAndAssign.mockResolvedValue({
      version: {
        id: 'version-1',
        portalId: 'portal-1',
        versionNumber: 1,
        documentSchemaVersion: '1.0',
        templateId: 'activeTalentHub',
        document: safeDocument,
        documentState: 'draft',
        contentHashAlgorithm: 'sha256',
        contentHash: 'hash-1',
        lastValidationSnapshotId: 'snapshot-1',
        scheduledFor: null,
        publishedAt: null,
        publishedBy: null,
        createdAt: new Date('2026-05-15T06:05:00.000Z'),
        updatedAt: new Date('2026-05-15T06:05:00.000Z'),
        createdBy: 'user-1',
      },
      validationSnapshot: {
        id: 'snapshot-1',
        portalId: 'portal-1',
        versionId: 'version-1',
        validationMode: 'draft',
        validationState: 'validEditable',
        fatalCount: 0,
        blockerCount: 0,
        warningCount: 0,
        infoCount: 0,
        issueCounts: { fatal: 0, blocker: 0, warning: 0, info: 0 },
        blockerIds: [],
        acknowledgementIds: [],
        blocksPublish: false,
        blocksVisualEdit: false,
        blocksAiPatch: false,
        projectionHash: null,
        registryVersion: '1.0.0',
        safetyPolicyVersion: '1.0.0',
        snapshot: {},
        createdAt: new Date('2026-05-15T06:05:00.000Z'),
        createdBy: 'user-1',
      },
    });

    const result = await service.saveDraft('talent-1', safeDocument, requestContext, {
      templateAssetPin: templatePin,
    });

    expect(result).toMatchObject({
      draftVersion: {
        id: 'version-1',
        versionNumber: 1,
      },
      isNewVersion: true,
      portalId: 'portal-1',
      validationSnapshot: {
        id: 'snapshot-1',
        validationState: 'validEditable',
      },
    });
    expect(mockRepository.createDraftVersionAndAssign).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        portalId: 'portal-1',
        versionNumber: 1,
      })
    );
  });

  it('fails closed on stale draft hashes before writing a new version', async () => {
    mockRepository.findPortalByTalentId.mockResolvedValue({
      id: 'portal-1',
      talentId: 'talent-1',
      draftVersionId: 'version-1',
      liveVersionId: null,
      latestVersionNumber: 1,
      latestValidationState: 'validEditable',
      lastValidatedAt: new Date('2026-05-15T06:00:00.000Z'),
      createdAt: new Date('2026-05-15T06:00:00.000Z'),
      updatedAt: new Date('2026-05-15T06:00:00.000Z'),
      version: 2,
    });
    mockRepository.findLatestVersionByTemplate.mockResolvedValue({
      id: 'version-1',
      portalId: 'portal-1',
      versionNumber: 1,
      documentSchemaVersion: '1.0',
      templateId: 'activeTalentHub',
      templateAssetPin: templatePin,
      document: safeDocument,
      documentState: 'draft',
      contentHashAlgorithm: 'sha256',
      contentHash: 'current-hash',
      lastValidationSnapshotId: 'snapshot-1',
      scheduledFor: null,
      publishedAt: null,
      publishedBy: null,
      createdAt: new Date('2026-05-15T06:00:00.000Z'),
      updatedAt: new Date('2026-05-15T06:00:00.000Z'),
      createdBy: 'user-1',
    });

    await expect(
      service.saveDraft('talent-1', safeDocument, requestContext, {
        expectedCurrentContentHash: 'stale-client-hash',
        templateAssetPin: templatePin,
      })
    ).rejects.toThrow(ConflictException);
    expect(mockRepository.createDraftVersionAndAssign).not.toHaveBeenCalled();
  });

  it('reuses the current draft version when the document hash is unchanged and only appends a new validation snapshot', async () => {
    const contentHash = calculatePublicPresenceContentHash(safeDocument);

    mockRepository.findPortalByTalentId.mockResolvedValue({
      id: 'portal-1',
      talentId: 'talent-1',
      draftVersionId: 'version-1',
      liveVersionId: null,
      latestVersionNumber: 1,
      latestValidationState: 'validEditable',
      lastValidatedAt: new Date('2026-05-15T06:00:00.000Z'),
      createdAt: new Date('2026-05-15T06:00:00.000Z'),
      updatedAt: new Date('2026-05-15T06:00:00.000Z'),
      version: 2,
    });
    mockRepository.findLatestVersionByTemplate.mockResolvedValue({
      id: 'version-1',
      portalId: 'portal-1',
      versionNumber: 1,
      documentSchemaVersion: '1.0',
      templateId: 'activeTalentHub',
      templateAssetPin: templatePin,
      document: safeDocument,
      documentState: 'draft',
      contentHashAlgorithm: 'sha256',
      contentHash,
      lastValidationSnapshotId: 'snapshot-1',
      scheduledFor: null,
      publishedAt: null,
      publishedBy: null,
      createdAt: new Date('2026-05-15T06:00:00.000Z'),
      updatedAt: new Date('2026-05-15T06:00:00.000Z'),
      createdBy: 'user-1',
    });
    mockRepository.createValidationSnapshotForExistingDraft.mockResolvedValue({
      id: 'snapshot-2',
      portalId: 'portal-1',
      versionId: 'version-1',
      validationMode: 'draft',
      validationState: 'validEditable',
      fatalCount: 0,
      blockerCount: 0,
      warningCount: 0,
      infoCount: 0,
      issueCounts: { fatal: 0, blocker: 0, warning: 0, info: 0 },
      blockerIds: [],
      acknowledgementIds: [],
      blocksPublish: false,
      blocksVisualEdit: false,
      blocksAiPatch: false,
      projectionHash: null,
      registryVersion: '1.0.0',
      safetyPolicyVersion: '1.0.0',
      snapshot: {},
      createdAt: new Date('2026-05-15T06:10:00.000Z'),
      createdBy: 'user-1',
    });

    const result = await service.saveDraft('talent-1', safeDocument, requestContext, {
      templateAssetPin: templatePin,
    });

    expect(result).toMatchObject({
      draftVersion: {
        id: 'version-1',
        contentHash,
      },
      isNewVersion: false,
      validationSnapshot: {
        id: 'snapshot-2',
      },
    });
    expect(mockRepository.createValidationSnapshotForExistingDraft).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        eventType: 'validationSnapshotted',
        versionId: 'version-1',
      })
    );
    expect(mockRepository.createDraftVersionAndAssign).not.toHaveBeenCalled();
  });
});

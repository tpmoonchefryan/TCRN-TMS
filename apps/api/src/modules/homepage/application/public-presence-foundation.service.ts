// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, Injectable } from '@nestjs/common';
import {
  createPublicPresenceValidationArtifact,
  ErrorCodes,
  type PublicPresenceDocument,
  type PublicPresenceDocumentState,
  type RequestContext,
} from '@tcrn/shared';

import {
  buildPublicPresenceSnapshotPersistencePayload,
  calculatePublicPresenceContentHash,
  derivePublicPresenceValidationState,
  type PublicPresencePortalRecord,
} from '../domain/public-presence-foundation.policy';
import { PublicPresenceFoundationRepository } from '../infrastructure/public-presence-foundation.repository';

interface SavePublicPresenceDraftOptions {
  expectedCurrentContentHash?: string | null;
}

@Injectable()
export class PublicPresenceFoundationService {
  constructor(
    private readonly publicPresenceFoundationRepository: PublicPresenceFoundationRepository,
  ) {}

  async saveDraft(
    talentId: string,
    document: PublicPresenceDocument,
    context: RequestContext,
    options: SavePublicPresenceDraftOptions = {},
  ): Promise<{
    draftVersion: {
      contentHash: string;
      contentHashAlgorithm: string;
      createdAt: string;
      documentState: string;
      id: string;
      versionNumber: number;
    };
    isNewVersion: boolean;
    portalId: string;
    validationSnapshot: {
      blockerCount: number;
      blocksAiPatch: boolean;
      blocksPublish: boolean;
      blocksVisualEdit: boolean;
      createdAt: string;
      fatalCount: number;
      id: string;
      infoCount: number;
      validationMode: string;
      validationState: string;
      warningCount: number;
    };
  }> {
    const tenantSchema = context.tenantSchema ?? '';
    const portal = await this.getOrCreatePortal(
      tenantSchema,
      talentId,
      context.userId ?? null,
    );
    const artifact = createPublicPresenceValidationArtifact(document, {
      mode: 'draft',
    });
    const contentHash = calculatePublicPresenceContentHash(artifact.document);
    const validationState = derivePublicPresenceValidationState(artifact.snapshot);
    const validationPersistence = buildPublicPresenceSnapshotPersistencePayload(
      artifact.snapshot,
    );
    const currentDraft =
      await this.publicPresenceFoundationRepository.findDraftVersion(
        tenantSchema,
        portal.id,
      );

    if (options.expectedCurrentContentHash !== undefined) {
      const currentContentHash = currentDraft?.contentHash ?? null;

      if (currentContentHash !== options.expectedCurrentContentHash) {
        throw new ConflictException({
          code: ErrorCodes.VERSION_CONFLICT,
          details: {
            currentContentHash,
            expectedCurrentContentHash: options.expectedCurrentContentHash,
          },
          message:
            'Public Presence draft hash is stale. Refresh the latest draft before saving.',
        });
      }
    }

    if (currentDraft && currentDraft.contentHash === contentHash) {
      const validationSnapshot =
        await this.publicPresenceFoundationRepository.createValidationSnapshotForExistingDraft(
          tenantSchema,
          {
            actorId: context.userId ?? null,
            contentHash,
            contentHashAlgorithm: 'sha256',
            documentState: currentDraft.documentState as PublicPresenceDocumentState,
            eventType: 'validationSnapshotted',
            portalId: portal.id,
            validationPersistence,
            validationSnapshot: artifact.snapshot,
            validationState,
            versionId: currentDraft.id,
          },
        );

      return {
        draftVersion: {
          contentHash,
          contentHashAlgorithm: currentDraft.contentHashAlgorithm,
          createdAt: currentDraft.createdAt.toISOString(),
          documentState: currentDraft.documentState,
          id: currentDraft.id,
          versionNumber: currentDraft.versionNumber,
        },
        isNewVersion: false,
        portalId: portal.id,
        validationSnapshot: {
          blockerCount: validationSnapshot.blockerCount,
          blocksAiPatch: validationSnapshot.blocksAiPatch,
          blocksPublish: validationSnapshot.blocksPublish,
          blocksVisualEdit: validationSnapshot.blocksVisualEdit,
          createdAt: validationSnapshot.createdAt.toISOString(),
          fatalCount: validationSnapshot.fatalCount,
          id: validationSnapshot.id,
          infoCount: validationSnapshot.infoCount,
          validationMode: validationSnapshot.validationMode,
          validationState: validationSnapshot.validationState,
          warningCount: validationSnapshot.warningCount,
        },
      };
    }

    const { validationSnapshot, version } =
      await this.publicPresenceFoundationRepository.createDraftVersionAndAssign(
        tenantSchema,
        {
          actorId: context.userId ?? null,
          contentHash,
          contentHashAlgorithm: 'sha256',
          document: artifact.document,
          portalId: portal.id,
          validationPersistence,
          validationSnapshot: artifact.snapshot,
          validationState,
          versionNumber: portal.latestVersionNumber + 1,
        },
      );

    return {
      draftVersion: {
        contentHash: version.contentHash,
        contentHashAlgorithm: version.contentHashAlgorithm,
        createdAt: version.createdAt.toISOString(),
        documentState: version.documentState,
        id: version.id,
        versionNumber: version.versionNumber,
      },
      isNewVersion: true,
      portalId: portal.id,
      validationSnapshot: {
        blockerCount: validationSnapshot.blockerCount,
        blocksAiPatch: validationSnapshot.blocksAiPatch,
        blocksPublish: validationSnapshot.blocksPublish,
        blocksVisualEdit: validationSnapshot.blocksVisualEdit,
        createdAt: validationSnapshot.createdAt.toISOString(),
        fatalCount: validationSnapshot.fatalCount,
        id: validationSnapshot.id,
        infoCount: validationSnapshot.infoCount,
        validationMode: validationSnapshot.validationMode,
        validationState: validationSnapshot.validationState,
        warningCount: validationSnapshot.warningCount,
      },
    };
  }

  private async getOrCreatePortal(
    tenantSchema: string,
    talentId: string,
    actorId: string | null,
  ): Promise<PublicPresencePortalRecord> {
    const existingPortal =
      await this.publicPresenceFoundationRepository.findPortalByTalentId(
        tenantSchema,
        talentId,
      );

    if (existingPortal) {
      return existingPortal;
    }

    return this.publicPresenceFoundationRepository.createPortal(tenantSchema, {
      actorId,
      talentId,
    });
  }
}

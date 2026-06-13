// SPDX-License-Identifier: Apache-2.0
import { ConflictException, Injectable } from '@nestjs/common';

import {
  createPublicPresenceValidationArtifact,
  ErrorCodes,
  type PublicPresenceAssetRevisionPin,
  type PublicPresenceDocument,
  type PublicPresenceDocumentState,
  type RequestContext,
} from '@tcrn/shared';

import { buildPublicPresenceRuntimeAuthority } from '../domain/public-presence-asset-runtime.policy';
import {
  buildPublicPresenceSnapshotPersistencePayload,
  calculatePublicPresenceContentHash,
  derivePublicPresenceValidationState,
  type PublicPresencePortalRecord,
} from '../domain/public-presence-foundation.policy';
import { PublicPresenceFoundationRepository } from '../infrastructure/public-presence-foundation.repository';
import { PublicPresenceAssetService } from './public-presence-asset.service';

interface SavePublicPresenceDraftOptions {
  expectedCurrentContentHash?: string | null;
  templateAssetPin?: PublicPresenceAssetRevisionPin | null;
}

@Injectable()
export class PublicPresenceFoundationService {
  constructor(
    private readonly publicPresenceFoundationRepository: PublicPresenceFoundationRepository,
    private readonly publicPresenceAssetService: PublicPresenceAssetService
  ) {}

  async saveDraft(
    talentId: string,
    document: PublicPresenceDocument,
    context: RequestContext,
    options: SavePublicPresenceDraftOptions = {}
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
    const portal = await this.getOrCreatePortal(tenantSchema, talentId, context.userId ?? null);
    const currentDraft = await this.publicPresenceFoundationRepository.findLatestVersionByTemplate(
      tenantSchema,
      portal.id,
      document.templateId
    );
    const templateAssetPin = options.templateAssetPin ?? currentDraft?.templateAssetPin ?? null;
    const componentAssets = await this.publicPresenceAssetService.listAssets(
      tenantSchema,
      {
        assetKind: 'component',
        scopeId: talentId,
        scopeType: 'talent',
      },
      context.userId ?? null
    );
    const runtimeAuthority = buildPublicPresenceRuntimeAuthority({
      componentAssets,
      templatePin: templateAssetPin,
    });
    const artifact = createPublicPresenceValidationArtifact(document, {
      mode: 'draft',
      runtimeAuthority,
    });
    const draftValidationSnapshot = artifact.snapshot;
    const contentHash = calculatePublicPresenceContentHash(artifact.document);
    const validationState = derivePublicPresenceValidationState(draftValidationSnapshot);
    const validationPersistence =
      buildPublicPresenceSnapshotPersistencePayload(draftValidationSnapshot);

    if (options.expectedCurrentContentHash !== undefined) {
      const currentContentHash = currentDraft?.contentHash ?? null;

      if (currentContentHash !== options.expectedCurrentContentHash) {
        throw new ConflictException({
          code: ErrorCodes.VERSION_CONFLICT,
          details: {
            currentContentHash,
            expectedCurrentContentHash: options.expectedCurrentContentHash,
          },
          message: 'Public Presence draft hash is stale. Refresh the latest draft before saving.',
        });
      }
    }

    if (currentDraft && currentDraft.contentHash === contentHash) {
      const persistedValidationSnapshot =
        await this.publicPresenceFoundationRepository.createValidationSnapshotForExistingDraft(
          tenantSchema,
          {
            actorId: context.userId ?? null,
            contentHash,
            contentHashAlgorithm: 'sha256',
            documentState: currentDraft.documentState as PublicPresenceDocumentState,
            eventType: 'validationSnapshotted',
            portalId: portal.id,
            templateAssetPin,
            validationPersistence,
            validationSnapshot: draftValidationSnapshot,
            validationState,
            versionId: currentDraft.id,
          }
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
          blockerCount: persistedValidationSnapshot.blockerCount,
          blocksAiPatch: persistedValidationSnapshot.blocksAiPatch,
          blocksPublish: persistedValidationSnapshot.blocksPublish,
          blocksVisualEdit: persistedValidationSnapshot.blocksVisualEdit,
          createdAt: persistedValidationSnapshot.createdAt.toISOString(),
          fatalCount: persistedValidationSnapshot.fatalCount,
          id: persistedValidationSnapshot.id,
          infoCount: persistedValidationSnapshot.infoCount,
          validationMode: persistedValidationSnapshot.validationMode,
          validationState: persistedValidationSnapshot.validationState,
          warningCount: persistedValidationSnapshot.warningCount,
        },
      };
    }

    const { validationSnapshot: persistedValidationSnapshot, version } =
      await this.publicPresenceFoundationRepository.createDraftVersionAndAssign(tenantSchema, {
        actorId: context.userId ?? null,
        contentHash,
        contentHashAlgorithm: 'sha256',
        document: artifact.document,
        portalId: portal.id,
        templateAssetPin,
        validationPersistence,
        validationSnapshot: draftValidationSnapshot,
        validationState,
        versionNumber: portal.latestVersionNumber + 1,
      });

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
        blockerCount: persistedValidationSnapshot.blockerCount,
        blocksAiPatch: persistedValidationSnapshot.blocksAiPatch,
        blocksPublish: persistedValidationSnapshot.blocksPublish,
        blocksVisualEdit: persistedValidationSnapshot.blocksVisualEdit,
        createdAt: persistedValidationSnapshot.createdAt.toISOString(),
        fatalCount: persistedValidationSnapshot.fatalCount,
        id: persistedValidationSnapshot.id,
        infoCount: persistedValidationSnapshot.infoCount,
        validationMode: persistedValidationSnapshot.validationMode,
        validationState: persistedValidationSnapshot.validationState,
        warningCount: persistedValidationSnapshot.warningCount,
      },
    };
  }

  private async getOrCreatePortal(
    tenantSchema: string,
    talentId: string,
    actorId: string | null
  ): Promise<PublicPresencePortalRecord> {
    const existingPortal = await this.publicPresenceFoundationRepository.findPortalByTalentId(
      tenantSchema,
      talentId
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

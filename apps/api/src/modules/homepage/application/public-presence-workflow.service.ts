// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createPublicPresenceValidationArtifact,
  ErrorCodes,
  PublicPresenceDocumentSchema,
  type PublicPresenceDocumentState,
  type RequestContext,
} from '@tcrn/shared';

import {
  buildPublicPresenceSnapshotPersistencePayload,
  derivePublicPresenceValidationState,
  type PublicPresenceDocumentVersionRecord,
  type PublicPresencePortalRecord,
} from '../domain/public-presence-foundation.policy';
import {
  buildPublicHomepageProjectionEvent,
  buildPublicPresenceProjectionFromDocument,
} from '../domain/public-presence-projection.policy';
import { HomepageAdminRepository } from '../infrastructure/homepage-admin.repository';
import { PublicPresenceFoundationRepository } from '../infrastructure/public-presence-foundation.repository';
import { CdnPurgeService } from '../services/cdn-purge.service';

interface WorkflowTargetContext {
  portal: PublicPresencePortalRecord;
  talent: Awaited<ReturnType<HomepageAdminRepository['findTalentById']>> extends infer T
    ? NonNullable<T>
    : never;
  tenantCode: string;
  tenantSchema: string;
  version: PublicPresenceDocumentVersionRecord;
}

@Injectable()
export class PublicPresenceWorkflowService {
  constructor(
    private readonly homepageAdminRepository: HomepageAdminRepository,
    private readonly publicPresenceFoundationRepository: PublicPresenceFoundationRepository,
    private readonly cdnPurgeService: CdnPurgeService,
  ) {}

  async submitForReview(
    talentId: string,
    context: RequestContext,
    expectedCurrentContentHash?: string | null,
  ) {
    const target = await this.loadWorkflowTarget(talentId, context.tenantSchema ?? '');
    this.assertCurrentHash(target.version, expectedCurrentContentHash);
    this.assertDocumentState(target.version, ['draft', 'changesRequested']);

    await this.publicPresenceFoundationRepository.updateDocumentWorkflowState(
      target.tenantSchema,
      {
        actorId: context.userId ?? null,
        contentHash: target.version.contentHash,
        contentHashAlgorithm: 'sha256',
        eventType: 'submittedForReview',
        payload: {
          submittedBy: context.userName ?? null,
        },
        portalId: target.portal.id,
        publishedAt: target.version.publishedAt,
        publishedBy: target.version.publishedBy,
        scheduledFor: target.version.scheduledFor,
        toDocumentState: 'inReview',
        versionId: target.version.id,
      },
    );
  }

  async requestChanges(
    talentId: string,
    context: RequestContext,
    input: {
      comment?: string | null;
      expectedCurrentContentHash?: string | null;
    },
  ) {
    const target = await this.loadWorkflowTarget(talentId, context.tenantSchema ?? '');
    this.assertCurrentHash(target.version, input.expectedCurrentContentHash);
    this.assertDocumentState(target.version, ['inReview', 'approved', 'scheduled']);

    await this.publicPresenceFoundationRepository.updateDocumentWorkflowState(
      target.tenantSchema,
      {
        actorId: context.userId ?? null,
        contentHash: target.version.contentHash,
        contentHashAlgorithm: 'sha256',
        eventType: 'changesRequested',
        payload: {
          comment: input.comment ?? null,
          requestedBy: context.userName ?? null,
        },
        portalId: target.portal.id,
        publishedAt: target.version.publishedAt,
        publishedBy: target.version.publishedBy,
        scheduledFor: null,
        toDocumentState: 'changesRequested',
        versionId: target.version.id,
      },
    );
  }

  async approve(
    talentId: string,
    context: RequestContext,
    expectedCurrentContentHash?: string | null,
  ) {
    const target = await this.loadWorkflowTarget(talentId, context.tenantSchema ?? '');
    this.assertCurrentHash(target.version, expectedCurrentContentHash);
    this.assertDocumentState(target.version, ['inReview', 'changesRequested']);

    await this.validateForPublish(target, context, 'approved');

    await this.publicPresenceFoundationRepository.updateDocumentWorkflowState(
      target.tenantSchema,
      {
        actorId: context.userId ?? null,
        contentHash: target.version.contentHash,
        contentHashAlgorithm: 'sha256',
        eventType: 'approved',
        payload: {
          approvedBy: context.userName ?? null,
        },
        portalId: target.portal.id,
        publishedAt: target.version.publishedAt,
        publishedBy: target.version.publishedBy,
        scheduledFor: null,
        toDocumentState: 'approved',
        versionId: target.version.id,
      },
    );
  }

  async schedulePublish(
    talentId: string,
    context: RequestContext,
    input: {
      expectedCurrentContentHash?: string | null;
      scheduledFor: string;
    },
  ) {
    const scheduledFor = new Date(input.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Scheduled publish time must be a valid future instant.',
      });
    }

    const target = await this.loadWorkflowTarget(talentId, context.tenantSchema ?? '');
    this.assertCurrentHash(target.version, input.expectedCurrentContentHash);
    this.assertDocumentState(target.version, ['approved']);

    await this.validateForPublish(target, context, 'scheduled');

    await this.publicPresenceFoundationRepository.updateDocumentWorkflowState(
      target.tenantSchema,
      {
        actorId: context.userId ?? null,
        contentHash: target.version.contentHash,
        contentHashAlgorithm: 'sha256',
        eventType: 'scheduled',
        payload: {
          scheduledBy: context.userName ?? null,
          scheduledFor: scheduledFor.toISOString(),
        },
        portalId: target.portal.id,
        publishedAt: target.version.publishedAt,
        publishedBy: target.version.publishedBy,
        scheduledFor,
        toDocumentState: 'scheduled',
        versionId: target.version.id,
      },
    );
  }

  async cancelScheduledPublish(
    talentId: string,
    context: RequestContext,
    expectedCurrentContentHash?: string | null,
  ) {
    const target = await this.loadWorkflowTarget(talentId, context.tenantSchema ?? '');
    this.assertCurrentHash(target.version, expectedCurrentContentHash);
    this.assertDocumentState(target.version, ['scheduled']);

    await this.publicPresenceFoundationRepository.updateDocumentWorkflowState(
      target.tenantSchema,
      {
        actorId: context.userId ?? null,
        contentHash: target.version.contentHash,
        contentHashAlgorithm: 'sha256',
        eventType: 'scheduleCancelled',
        payload: {
          cancelledBy: context.userName ?? null,
        },
        portalId: target.portal.id,
        publishedAt: target.version.publishedAt,
        publishedBy: target.version.publishedBy,
        scheduledFor: null,
        toDocumentState: 'approved',
        versionId: target.version.id,
      },
    );
  }

  async publishNow(
    talentId: string,
    context: RequestContext,
    expectedCurrentContentHash?: string | null,
  ) {
    const target = await this.loadWorkflowTarget(talentId, context.tenantSchema ?? '');
    this.assertCurrentHash(target.version, expectedCurrentContentHash);
    this.assertDocumentState(target.version, ['approved', 'scheduled']);

    await this.publishVersion(target, context);
  }

  async executeDueScheduledPublishes(tenantSchema: string) {
    const dueVersions =
      await this.publicPresenceFoundationRepository.findDueScheduledVersions(
        tenantSchema,
        new Date(),
      );
    let published = 0;
    let failed = 0;

    for (const dueVersion of dueVersions) {
      try {
        const target = await this.loadVersionTarget(
          dueVersion.talentId,
          tenantSchema,
          dueVersion.versionId,
        );
        await this.publishVersion(target, {
          tenantSchema,
          userId: null,
          userName: 'scheduler',
        });
        published += 1;
      } catch {
        failed += 1;
      }
    }

    return {
      failed,
      published,
    };
  }

  async createRollbackDraft(
    talentId: string,
    context: RequestContext,
    sourceVersionId?: string | null,
  ) {
    const target = await this.loadWorkflowTarget(talentId, context.tenantSchema ?? '');
    const rollbackSourceId = sourceVersionId ?? target.portal.liveVersionId ?? null;

    if (!rollbackSourceId) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'No live Public Presence version is available to roll back from.',
      });
    }

    const sourceVersion =
      await this.publicPresenceFoundationRepository.findDocumentVersionById(
        target.tenantSchema,
        rollbackSourceId,
      );

    if (!sourceVersion) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Rollback source version not found',
      });
    }

    const document = PublicPresenceDocumentSchema.parse(sourceVersion.document);
    const rollbackDraft =
      await this.publicPresenceFoundationRepository.createDocumentFromSourceAndAssignDraft(
        target.tenantSchema,
        {
          actorId: context.userId ?? null,
          contentHash: sourceVersion.contentHash,
          contentHashAlgorithm: 'sha256',
          document,
          documentState: 'draft',
          payload: {
            rollbackRequestedBy: context.userName ?? null,
          },
          portalId: target.portal.id,
          sourceVersionId: sourceVersion.id,
          templateId: sourceVersion.templateId,
          versionNumber: target.portal.latestVersionNumber + 1,
        },
      );

    const artifact = createPublicPresenceValidationArtifact(document, {
      mode: 'draft',
    });
    const validationPersistence = buildPublicPresenceSnapshotPersistencePayload(
      artifact.snapshot,
    );

    await this.publicPresenceFoundationRepository.createValidationSnapshotForExistingDraft(
      target.tenantSchema,
      {
        actorId: context.userId ?? null,
        contentHash: rollbackDraft.contentHash,
        contentHashAlgorithm: 'sha256',
        documentState: 'draft',
        eventType: 'validationSnapshotted',
        portalId: target.portal.id,
        validationPersistence,
        validationSnapshot: artifact.snapshot,
        validationState: derivePublicPresenceValidationState(artifact.snapshot),
        versionId: rollbackDraft.id,
      },
    );
  }

  private async loadWorkflowTarget(
    talentId: string,
    tenantSchema: string,
  ): Promise<WorkflowTargetContext> {
    const talent = await this.homepageAdminRepository.findTalentById(
      tenantSchema,
      talentId,
    );

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    const portal =
      await this.publicPresenceFoundationRepository.findPortalByTalentId(
        tenantSchema,
        talentId,
      );

    if (!portal?.draftVersionId) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Public Presence draft not found',
      });
    }

    const draftVersion =
      await this.publicPresenceFoundationRepository.findDocumentVersionById(
        tenantSchema,
        portal.draftVersionId,
      );

    if (!draftVersion) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Public Presence version not found',
      });
    }

    const tenantCode =
      (await this.homepageAdminRepository.findTenantCodeBySchema(tenantSchema))
      ?? tenantSchema;

    return {
      portal,
      talent,
      tenantCode,
      tenantSchema,
      version: draftVersion,
    };
  }

  private async loadVersionTarget(
    talentId: string,
    tenantSchema: string,
    versionId: string,
  ): Promise<WorkflowTargetContext> {
    const base = await this.loadWorkflowTarget(talentId, tenantSchema);
    const version =
      await this.publicPresenceFoundationRepository.findDocumentVersionById(
        tenantSchema,
        versionId,
      );

    if (!version) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Scheduled Public Presence version not found',
      });
    }

    return {
      ...base,
      version,
    };
  }

  private assertCurrentHash(
    version: PublicPresenceDocumentVersionRecord,
    expectedCurrentContentHash?: string | null,
  ) {
    if (
      expectedCurrentContentHash !== undefined
      && version.contentHash !== expectedCurrentContentHash
    ) {
      throw new ConflictException({
        code: ErrorCodes.VERSION_CONFLICT,
        details: {
          currentContentHash: version.contentHash,
          expectedCurrentContentHash,
        },
        message:
          'Public Presence draft hash is stale. Refresh the latest draft before continuing.',
      });
    }
  }

  private assertDocumentState(
    version: PublicPresenceDocumentVersionRecord,
    allowedStates: PublicPresenceDocumentState[],
  ) {
    if (
      !allowedStates.includes(
        version.documentState as PublicPresenceDocumentState,
      )
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Public Presence version must be in ${allowedStates.join(', ')} state before this action.`,
      });
    }
  }

  private async validateForPublish(
    target: WorkflowTargetContext,
    context: RequestContext,
    mode: 'approved' | 'scheduled' | 'published',
  ) {
    const document = PublicPresenceDocumentSchema.parse(target.version.document);
    const artifact = createPublicPresenceValidationArtifact(document, {
      mode: 'publish',
    });

    if (artifact.snapshot.issues.some((issue) => issue.blocksPublish)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        details: {
          blockerIds: artifact.snapshot.blockerIds,
          issueCounts: artifact.snapshot.issueCounts,
        },
        message:
          'Public Presence draft still has publish-blocking validation issues.',
      });
    }

    const projection = buildPublicPresenceProjectionFromDocument({
      contentHash: target.version.contentHash,
      createdAt: target.version.createdAt.toISOString(),
      document,
      documentVersionId: target.version.id,
      mode: 'projection',
      portalId: target.portal.id,
      rebuiltAt: target.version.updatedAt.toISOString(),
      route: {
        canonicalPath: `/${target.tenantCode}/${target.talent.code}/homepage`,
        legacyPath: target.talent.homepagePath,
        talentCode: target.talent.code,
        tenantCode: target.tenantCode,
      },
      source: 'publicPresenceDocument',
      validationSnapshotId: target.version.lastValidationSnapshotId,
    });

    const snapshot = {
      ...artifact.snapshot,
      projectionHash: projection.projectionHash,
    };
    const validationPersistence =
      buildPublicPresenceSnapshotPersistencePayload(snapshot);
    const persistedValidation =
      await this.publicPresenceFoundationRepository.createValidationSnapshotForExistingDraft(
        target.tenantSchema,
        {
          actorId: context.userId ?? null,
          contentHash: target.version.contentHash,
          contentHashAlgorithm: 'sha256',
          documentState: mode === 'approved'
            ? 'approved'
            : mode === 'scheduled'
              ? 'scheduled'
              : 'published',
          eventType: 'validationSnapshotted',
          portalId: target.portal.id,
          validationPersistence,
          validationSnapshot: snapshot,
          validationState: derivePublicPresenceValidationState(snapshot),
          versionId: target.version.id,
        },
      );

    return {
      projection,
      validationSnapshotId: persistedValidation.id,
    };
  }

  private async publishVersion(
    target: WorkflowTargetContext,
    context: RequestContext,
  ) {
    const validation = await this.validateForPublish(target, context, 'published');
    const publishedAt = new Date();

    await this.publicPresenceFoundationRepository.publishVersionAndAssignLive(
      target.tenantSchema,
      {
        actorId: context.userId ?? null,
        contentHash: target.version.contentHash,
        contentHashAlgorithm: 'sha256',
        eventType: 'published',
        payload: {
          publishedBy: context.userName ?? null,
          projectionEvent: buildPublicHomepageProjectionEvent(validation.projection),
          scheduledFor: target.version.scheduledFor?.toISOString() ?? null,
          validationSnapshotId: validation.validationSnapshotId,
        },
        portalId: target.portal.id,
        publishedAt,
        publishedBy: context.userId ?? null,
        scheduledFor: null,
        toDocumentState: 'published',
        versionId: target.version.id,
      },
    );

    try {
      await this.cdnPurgeService.purgeHomepage(
        target.talent.homepagePath ?? '',
        target.talent.customDomain ?? undefined,
      );
    } catch {
      // Preserve the publish transition even if CDN invalidation is temporarily unavailable.
    }
  }
}

// SPDX-License-Identifier: Apache-2.0
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
  type PublicPresenceWorkflowEventType,
  PublicPresenceTemplateIdSchema,
  type RequestContext,
} from '@tcrn/shared';

import { TalentService } from '../../talent/talent.service';
import { buildPublicPresenceRuntimeAuthority } from '../domain/public-presence-asset-runtime.policy';
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
import { PublicPresenceAssetService } from './public-presence-asset.service';
import {
  buildDebutRevealAutoSwitchDependency,
  extractRevealAutoSwitchAt,
} from './public-presence-release-readiness';
import { PublicPresenceStudioService } from './public-presence-studio.service';

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
    private readonly publicPresenceStudioService: PublicPresenceStudioService,
    private readonly publicPresenceAssetService: PublicPresenceAssetService,
    private readonly cdnPurgeService: CdnPurgeService,
    private readonly talentService: TalentService
  ) {}

  async submitForReview(
    talentId: string,
    context: RequestContext,
    expectedCurrentContentHash?: string | null,
    templateId?: string | null
  ) {
    const target = await this.loadWorkflowTarget(talentId, context.tenantSchema ?? '', templateId);
    this.assertCurrentHash(target.version, expectedCurrentContentHash);
    this.assertDocumentState(target.version, ['draft', 'changesRequested']);
    await this.transitionToInReview(target, context);
  }

  async requestChanges(
    talentId: string,
    context: RequestContext,
    input: {
      comment?: string | null;
      expectedCurrentContentHash?: string | null;
      templateId?: string | null;
    }
  ) {
    const target = await this.loadWorkflowTarget(
      talentId,
      context.tenantSchema ?? '',
      input.templateId
    );
    this.assertCurrentHash(target.version, input.expectedCurrentContentHash);
    this.assertDocumentState(target.version, ['inReview', 'approved', 'scheduled']);

    await this.publicPresenceFoundationRepository.updateDocumentWorkflowState(target.tenantSchema, {
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
    });
  }

  async approve(
    talentId: string,
    context: RequestContext,
    expectedCurrentContentHash?: string | null,
    templateId?: string | null
  ) {
    const target = await this.loadWorkflowTarget(talentId, context.tenantSchema ?? '', templateId);
    this.assertCurrentHash(target.version, expectedCurrentContentHash);
    this.assertDocumentState(target.version, ['inReview', 'changesRequested']);
    await this.transitionToApproved(target, context);
  }

  async schedulePublish(
    talentId: string,
    context: RequestContext,
    input: {
      expectedCurrentContentHash?: string | null;
      scheduledFor: string;
      templateId?: string | null;
    }
  ) {
    const scheduledFor = new Date(input.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Scheduled publish time must be a valid future instant.',
      });
    }

    const target = await this.loadWorkflowTarget(
      talentId,
      context.tenantSchema ?? '',
      input.templateId
    );
    this.assertCurrentHash(target.version, input.expectedCurrentContentHash);
    this.assertDocumentState(target.version, ['approved']);
    const validation = await this.preparePublishValidation(target);
    await this.persistValidationSnapshot(target, context, validation.snapshot, 'scheduled');

    await this.publicPresenceFoundationRepository.updateDocumentWorkflowState(target.tenantSchema, {
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
    });
  }

  async cancelScheduledPublish(
    talentId: string,
    context: RequestContext,
    expectedCurrentContentHash?: string | null,
    templateId?: string | null
  ) {
    const target = await this.loadWorkflowTarget(talentId, context.tenantSchema ?? '', templateId);
    this.assertCurrentHash(target.version, expectedCurrentContentHash);
    this.assertDocumentState(target.version, ['scheduled']);

    await this.publicPresenceFoundationRepository.updateDocumentWorkflowState(target.tenantSchema, {
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
    });
  }

  async publishNow(
    talentId: string,
    context: RequestContext,
    expectedCurrentContentHash?: string | null,
    templateId?: string | null
  ) {
    const target = await this.loadWorkflowTarget(talentId, context.tenantSchema ?? '', templateId);
    this.assertCurrentHash(target.version, expectedCurrentContentHash);
    this.assertDocumentState(target.version, [
      'draft',
      'changesRequested',
      'inReview',
      'approved',
      'scheduled',
    ]);

    if (['draft', 'changesRequested', 'inReview'].includes(target.version.documentState)) {
      await this.preflightDirectPublish(target, context);

      let currentTarget = target;

      if (['draft', 'changesRequested'].includes(currentTarget.version.documentState)) {
        await this.transitionToInReview(currentTarget, context);
        currentTarget = await this.loadVersionTarget(
          talentId,
          context.tenantSchema ?? '',
          currentTarget.version.id
        );
      }

      if (['inReview', 'changesRequested'].includes(currentTarget.version.documentState)) {
        await this.transitionToApproved(currentTarget, context);
        currentTarget = await this.loadVersionTarget(
          talentId,
          context.tenantSchema ?? '',
          currentTarget.version.id
        );
      }

      this.assertDocumentState(currentTarget.version, ['approved', 'scheduled']);
      await this.publishVersion(currentTarget, context);
      return;
    }

    await this.publishVersion(target, context);
  }

  async executeDueScheduledPublishes(tenantSchema: string) {
    const dueVersions = await this.publicPresenceFoundationRepository.findDueScheduledVersions(
      tenantSchema,
      new Date()
    );
    let published = 0;
    let failed = 0;

    for (const dueVersion of dueVersions) {
      try {
        const target = await this.loadVersionTarget(
          dueVersion.talentId,
          tenantSchema,
          dueVersion.versionId
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

    const autoSwitched = await this.executeDueRevealAutoSwitches(tenantSchema);

    return {
      autoSwitched,
      failed,
      published,
    };
  }

  async createRollbackDraft(
    talentId: string,
    context: RequestContext,
    sourceVersionId?: string | null
  ) {
    const target = await this.loadWorkflowTarget(talentId, context.tenantSchema ?? '');
    const rollbackSourceId = sourceVersionId ?? target.portal.liveVersionId ?? null;

    if (!rollbackSourceId) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'No live Public Presence version is available to roll back from.',
      });
    }

    const sourceVersion = await this.publicPresenceFoundationRepository.findDocumentVersionById(
      target.tenantSchema,
      rollbackSourceId
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
          templateAssetPin: sourceVersion.templateAssetPin,
          templateId: sourceVersion.templateId,
          versionNumber: target.portal.latestVersionNumber + 1,
        }
      );

    const artifact = createPublicPresenceValidationArtifact(document, {
      mode: 'draft',
      runtimeAuthority: await this.loadRuntimeAuthority(
        target.tenantSchema,
        target.talent.id,
        sourceVersion.templateAssetPin,
        context.userId ?? null
      ),
    });
    const rollbackSnapshot = sourceVersion.templateAssetPin
      ? {
          ...artifact.snapshot,
          templateAssetPin: sourceVersion.templateAssetPin,
        }
      : artifact.snapshot;
    const validationPersistence = buildPublicPresenceSnapshotPersistencePayload(rollbackSnapshot);

    await this.publicPresenceFoundationRepository.createValidationSnapshotForExistingDraft(
      target.tenantSchema,
      {
        actorId: context.userId ?? null,
        contentHash: rollbackDraft.contentHash,
        contentHashAlgorithm: 'sha256',
        documentState: 'draft',
        eventType: 'validationSnapshotted',
        portalId: target.portal.id,
        templateAssetPin: sourceVersion.templateAssetPin,
        validationPersistence,
        validationSnapshot: rollbackSnapshot,
        validationState: derivePublicPresenceValidationState(rollbackSnapshot),
        versionId: rollbackDraft.id,
      }
    );
  }

  private async loadPortalContext(
    talentId: string,
    tenantSchema: string
  ): Promise<Omit<WorkflowTargetContext, 'version'>> {
    const talent = await this.homepageAdminRepository.findTalentById(tenantSchema, talentId);

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    const portal = await this.publicPresenceFoundationRepository.findPortalByTalentId(
      tenantSchema,
      talentId
    );

    if (!portal) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Public Presence workspace not found',
      });
    }

    const tenantCode =
      (await this.homepageAdminRepository.findTenantCodeBySchema(tenantSchema)) ?? tenantSchema;

    return {
      portal,
      talent,
      tenantCode,
      tenantSchema,
    };
  }

  private async loadWorkflowTarget(
    talentId: string,
    tenantSchema: string,
    templateIdInput?: string | null
  ): Promise<WorkflowTargetContext> {
    const base = await this.loadPortalContext(talentId, tenantSchema);
    const requestedTemplateId = PublicPresenceTemplateIdSchema.safeParse(templateIdInput ?? null);
    const version = requestedTemplateId.success
      ? await this.publicPresenceFoundationRepository.findLatestVersionByTemplate(
          tenantSchema,
          base.portal.id,
          requestedTemplateId.data
        )
      : base.portal.draftVersionId
        ? await this.publicPresenceFoundationRepository.findDocumentVersionById(
            tenantSchema,
            base.portal.draftVersionId
          )
        : null;

    if (!version) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: requestedTemplateId.success
          ? `Public Presence ${requestedTemplateId.data} version not found`
          : 'Public Presence draft not found',
      });
    }

    return {
      ...base,
      version,
    };
  }

  private async loadVersionTarget(
    talentId: string,
    tenantSchema: string,
    versionId: string
  ): Promise<WorkflowTargetContext> {
    const base = await this.loadPortalContext(talentId, tenantSchema);
    const version = await this.publicPresenceFoundationRepository.findDocumentVersionById(
      tenantSchema,
      versionId
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

  private async executeDueRevealAutoSwitches(tenantSchema: string) {
    const liveRevealVersions =
      await this.publicPresenceFoundationRepository.findLiveDebutRevealVersions(tenantSchema);
    let autoSwitched = 0;

    for (const liveRevealVersion of liveRevealVersions) {
      const revealTarget = await this.loadVersionTarget(
        liveRevealVersion.talentId,
        tenantSchema,
        liveRevealVersion.versionId
      );
      const revealAt = extractRevealAutoSwitchAt(revealTarget.version);

      if (!revealAt || Date.parse(revealAt) > Date.now()) {
        continue;
      }

      const nextHubVersion =
        await this.publicPresenceFoundationRepository.findLatestVersionByTemplate(
          tenantSchema,
          revealTarget.portal.id,
          'activeTalentHub',
          ['approved', 'scheduled', 'published']
        );

      if (!nextHubVersion || nextHubVersion.id === revealTarget.version.id) {
        continue;
      }

      const nextHubTarget = await this.loadVersionTarget(
        liveRevealVersion.talentId,
        tenantSchema,
        nextHubVersion.id
      );

      await this.publishVersion(
        nextHubTarget,
        {
          tenantSchema,
          userId: null,
          userName: 'reveal-scheduler',
        },
        {
          eventType: 'revealAutoSwitched',
          extraPayload: {
            autoSwitchedFromVersionId: revealTarget.version.id,
            autoSwitchAt: revealAt,
            switchReason: 'countdownRevealCompleted',
          },
        }
      );
      autoSwitched += 1;
    }

    return autoSwitched;
  }

  private assertCurrentHash(
    version: PublicPresenceDocumentVersionRecord,
    expectedCurrentContentHash?: string | null
  ) {
    if (
      expectedCurrentContentHash !== undefined &&
      version.contentHash !== expectedCurrentContentHash
    ) {
      throw new ConflictException({
        code: ErrorCodes.VERSION_CONFLICT,
        details: {
          currentContentHash: version.contentHash,
          expectedCurrentContentHash,
        },
        message: 'Public Presence draft hash is stale. Refresh the latest draft before continuing.',
      });
    }
  }

  private assertDocumentState(
    version: PublicPresenceDocumentVersionRecord,
    allowedStates: PublicPresenceDocumentState[]
  ) {
    if (!allowedStates.includes(version.documentState as PublicPresenceDocumentState)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Public Presence version must be in ${allowedStates.join(', ')} state before this action.`,
      });
    }
  }

  private async preflightDirectPublish(target: WorkflowTargetContext, context: RequestContext) {
    await this.assertTalentCanBePublishedForPublicRelease(target, context);
    await this.preparePublishValidation(target);
  }

  private async transitionToInReview(target: WorkflowTargetContext, context: RequestContext) {
    await this.publicPresenceFoundationRepository.updateDocumentWorkflowState(target.tenantSchema, {
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
    });
  }

  private async transitionToApproved(target: WorkflowTargetContext, context: RequestContext) {
    const validation = await this.preparePublishValidation(target);
    await this.persistValidationSnapshot(target, context, validation.snapshot, 'approved');

    await this.publicPresenceFoundationRepository.updateDocumentWorkflowState(target.tenantSchema, {
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
    });
  }

  private async preparePublishValidation(target: WorkflowTargetContext) {
    await this.assertHomepagePolicyAllowsPublish(target);
    const releaseDependency = await this.resolveDebutRevealReleaseDependency(target);
    const document = PublicPresenceDocumentSchema.parse(target.version.document);
    const artifact = createPublicPresenceValidationArtifact(document, {
      mode: 'publish',
      runtimeAuthority: await this.loadRuntimeAuthority(
        target.tenantSchema,
        target.talent.id,
        target.version.templateAssetPin,
        null
      ),
    });

    if (artifact.snapshot.issues.some((issue) => issue.blocksPublish)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        details: {
          blockerIds: artifact.snapshot.blockerIds,
          issueCounts: artifact.snapshot.issueCounts,
        },
        message: 'Public Presence draft still has publish-blocking validation issues.',
      });
    }

    if (releaseDependency?.blocksPublish) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        details: {
          releaseReadiness: {
            blockingDependencyCount: 1,
            dependencies: [releaseDependency],
          },
        },
        message: releaseDependency.suggestedFix,
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
      validationSnapshot: artifact.snapshot,
      templateAssetPin: target.version.templateAssetPin,
      validationSnapshotId: target.version.lastValidationSnapshotId,
    });

    const snapshot = {
      ...artifact.snapshot,
      projectionHash: projection.projectionHash,
      templateAssetPin: target.version.templateAssetPin,
    };

    return {
      projection,
      snapshot,
    };
  }

  private async assertHomepagePolicyAllowsPublish(target: WorkflowTargetContext) {
    const workspace = await this.publicPresenceStudioService.getWorkspace(
      target.talent.id,
      target.tenantSchema,
      target.version.templateId
    );

    if (workspace.homepagePolicy.status !== 'ready') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        details: {
          homepagePolicy: workspace.homepagePolicy,
        },
        message: 'Homepage work is unavailable for the current Artist Stage.',
      });
    }

    const pinnedAssetId = target.version.templateAssetPin?.assetId ?? null;

    if (!pinnedAssetId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'The current draft is missing its pinned template asset revision.',
      });
    }

    const pinnedAsset = workspace.templateAssets.find((asset) => asset.assetId === pinnedAssetId);

    if (!pinnedAsset || !pinnedAsset.isSelectable) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        details: {
          assetId: pinnedAssetId,
          homepagePolicy: workspace.homepagePolicy,
        },
        message: 'The pinned template asset is no longer allowed for the current Artist Stage.',
      });
    }
  }

  private async persistValidationSnapshot(
    target: WorkflowTargetContext,
    context: RequestContext,
    snapshot: ReturnType<typeof createPublicPresenceValidationArtifact>['snapshot'],
    mode: 'approved' | 'scheduled' | 'published'
  ) {
    const validationPersistence = buildPublicPresenceSnapshotPersistencePayload(snapshot);
    const persistedValidation =
      await this.publicPresenceFoundationRepository.createValidationSnapshotForExistingDraft(
        target.tenantSchema,
        {
          actorId: context.userId ?? null,
          contentHash: target.version.contentHash,
          contentHashAlgorithm: 'sha256',
          documentState:
            mode === 'approved' ? 'approved' : mode === 'scheduled' ? 'scheduled' : 'published',
          eventType: 'validationSnapshotted',
          portalId: target.portal.id,
          templateAssetPin: target.version.templateAssetPin,
          validationPersistence,
          validationSnapshot: snapshot,
          validationState: derivePublicPresenceValidationState(snapshot),
          versionId: target.version.id,
        }
      );

    return persistedValidation.id;
  }

  private async publishVersion(
    target: WorkflowTargetContext,
    context: RequestContext,
    options?: {
      eventType?: PublicPresenceWorkflowEventType;
      extraPayload?: Record<string, unknown>;
    }
  ) {
    await this.ensureTalentPublishedForPublicRelease(target, context);

    const validation = await this.preparePublishValidation(target);
    const validationSnapshotId = await this.persistValidationSnapshot(
      target,
      context,
      validation.snapshot,
      'published'
    );
    const publishedAt = new Date();

    await this.publicPresenceFoundationRepository.publishVersionAndAssignLive(target.tenantSchema, {
      actorId: context.userId ?? null,
      contentHash: target.version.contentHash,
      contentHashAlgorithm: 'sha256',
      eventType: options?.eventType ?? 'published',
      payload: {
        ...options?.extraPayload,
        publishedBy: context.userName ?? null,
        projectionEvent: buildPublicHomepageProjectionEvent(validation.projection),
        scheduledFor: target.version.scheduledFor?.toISOString() ?? null,
        validationSnapshotId,
      },
      portalId: target.portal.id,
      publishedAt,
      publishedBy: context.userId ?? null,
      scheduledFor: null,
      toDocumentState: 'published',
      versionId: target.version.id,
    });

    try {
      await this.cdnPurgeService.purgeHomepage(
        target.talent.homepagePath ?? '',
        target.talent.customDomain ?? undefined
      );
    } catch {
      // Preserve the publish transition even if CDN invalidation is temporarily unavailable.
    }
  }

  private async ensureTalentPublishedForPublicRelease(
    target: WorkflowTargetContext,
    context: RequestContext
  ) {
    const talent = await this.loadTalentLifecycleTarget(target);

    if (talent.lifecycleStatus === 'published') {
      return;
    }

    if (talent.lifecycleStatus !== 'draft') {
      throw new ConflictException({
        code: ErrorCodes.TALENT_PUBLISH_BLOCKED,
        message: 'Talent business workspace must be re-enabled before this homepage can go live.',
      });
    }

    if (!context.userId) {
      throw new ConflictException({
        code: ErrorCodes.TALENT_PUBLISH_BLOCKED,
        message:
          'Talent must already be published before an automated homepage release can continue.',
      });
    }

    await this.talentService.publish(
      talent.id,
      target.tenantSchema,
      talent.version,
      context.userId
    );
  }

  private async assertTalentCanBePublishedForPublicRelease(
    target: WorkflowTargetContext,
    context: RequestContext
  ) {
    const talent = await this.loadTalentLifecycleTarget(target);

    if (talent.lifecycleStatus === 'published') {
      return;
    }

    if (talent.lifecycleStatus !== 'draft') {
      throw new ConflictException({
        code: ErrorCodes.TALENT_PUBLISH_BLOCKED,
        message: 'Talent business workspace must be re-enabled before this homepage can go live.',
      });
    }

    if (!context.userId) {
      throw new ConflictException({
        code: ErrorCodes.TALENT_PUBLISH_BLOCKED,
        message:
          'Talent must already be published before an automated homepage release can continue.',
      });
    }
  }

  private async loadTalentLifecycleTarget(target: WorkflowTargetContext) {
    const talent = await this.talentService.findById(target.talent.id, target.tenantSchema);

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    return talent;
  }

  private async resolveDebutRevealReleaseDependency(target: WorkflowTargetContext) {
    if (target.version.templateId !== 'debutReveal' || !extractRevealAutoSwitchAt(target.version)) {
      return null;
    }

    const [latestActiveHubVersion, publishReadyActiveHubVersion] = await Promise.all([
      this.publicPresenceFoundationRepository.findLatestVersionByTemplate(
        target.tenantSchema,
        target.portal.id,
        'activeTalentHub'
      ),
      this.publicPresenceFoundationRepository.findLatestVersionByTemplate(
        target.tenantSchema,
        target.portal.id,
        'activeTalentHub',
        ['approved', 'scheduled', 'published']
      ),
    ]);

    return buildDebutRevealAutoSwitchDependency({
      debutVersion: target.version,
      latestActiveHubVersion,
      publishReadyActiveHubVersion,
    });
  }

  private async loadRuntimeAuthority(
    tenantSchema: string,
    talentId: string,
    templateAssetPin: PublicPresenceDocumentVersionRecord['templateAssetPin'],
    actorId: string | null
  ) {
    const componentAssets = await this.publicPresenceAssetService.listAssets(
      tenantSchema,
      {
        assetKind: 'component',
        scopeId: talentId,
        scopeType: 'talent',
      },
      actorId
    );

    return buildPublicPresenceRuntimeAuthority({
      componentAssets,
      templatePin: templateAssetPin,
    });
  }
}

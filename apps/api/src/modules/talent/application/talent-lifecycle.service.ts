// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  createArtistLifecycleFlowSchema,
  ErrorCodes,
  type ArtistLifecycleFlow,
  type ArtistLifecycleFlowTransition,
} from '@tcrn/shared';

import { CustomerArchiveAccessService } from '../../customer/application/customer-archive-access.service';
import { buildTalentPublishReadiness } from '../domain/talent-lifecycle.policy';
import type { TalentData, TalentPublishReadiness } from '../domain/talent-read.policy';
import { TalentLifecycleRepository } from '../infrastructure/talent-lifecycle.repository';
import type { ArtistStageLifecycleCatalogRecord } from '../infrastructure/talent-lifecycle.repository';
import { TalentReadService } from './talent-read.service';

export interface TalentStageTransitionInput {
  targetArtistStageId?: string;
  transitionId?: string;
  version: number;
}

interface ArtistLifecycleContext {
  currentStage: ArtistStageLifecycleCatalogRecord;
  flow: ArtistLifecycleFlow;
  stages: ArtistStageLifecycleCatalogRecord[];
}

interface ResolvedArtistStageTransition {
  targetStage: ArtistStageLifecycleCatalogRecord;
  transition: ArtistLifecycleFlowTransition;
}

@Injectable()
export class TalentLifecycleService {
  constructor(
    private readonly talentReadService: TalentReadService,
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
    private readonly talentLifecycleRepository: TalentLifecycleRepository
  ) {}

  async getPublishReadiness(id: string, tenantSchema: string): Promise<TalentPublishReadiness> {
    const talent = await this.requireTalent(id, tenantSchema);
    const archiveReadiness =
      talent.lifecycleStatus === 'published'
        ? { hasActiveArchiveTarget: true }
        : await this.customerArchiveAccessService.getTalentArchiveReadiness(id, tenantSchema);
    const externalPagesDomain = await this.talentReadService.getExternalPagesDomainConfig(
      id,
      tenantSchema
    );

    return buildTalentPublishReadiness({
      talent,
      hasReadyCustomerArchive: archiveReadiness.hasActiveArchiveTarget,
      externalPagesDomain,
    });
  }

  async publish(
    id: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<TalentData> {
    const current = await this.requireTalent(id, tenantSchema);
    this.assertVersion(current, version);
    const lifecycleContext = await this.loadArtistLifecycleContext(
      tenantSchema,
      current.artistStageId
    );
    const resolvedTransition = this.resolveLegacyLifecycleTransition(
      lifecycleContext,
      current,
      'published'
    );
    return this.executeStageTransition(
      current,
      tenantSchema,
      userId,
      resolvedTransition.targetStage
    );
  }

  async disable(
    id: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<TalentData> {
    const current = await this.requireTalent(id, tenantSchema);
    this.assertVersion(current, version);
    const lifecycleContext = await this.loadArtistLifecycleContext(
      tenantSchema,
      current.artistStageId
    );
    const resolvedTransition = this.resolveLegacyLifecycleTransition(
      lifecycleContext,
      current,
      'disabled'
    );
    return this.executeStageTransition(
      current,
      tenantSchema,
      userId,
      resolvedTransition.targetStage
    );
  }

  async reEnable(
    id: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<TalentData> {
    const current = await this.requireTalent(id, tenantSchema);
    this.assertVersion(current, version);
    const lifecycleContext = await this.loadArtistLifecycleContext(
      tenantSchema,
      current.artistStageId
    );
    const resolvedTransition = this.resolveLegacyLifecycleTransition(
      lifecycleContext,
      current,
      'published'
    );
    return this.executeStageTransition(
      current,
      tenantSchema,
      userId,
      resolvedTransition.targetStage
    );
  }

  async transitionArtistStage(
    id: string,
    tenantSchema: string,
    input: TalentStageTransitionInput,
    userId: string
  ): Promise<TalentData> {
    const current = await this.requireTalent(id, tenantSchema);
    this.assertVersion(current, input.version);
    const lifecycleContext = await this.loadArtistLifecycleContext(
      tenantSchema,
      current.artistStageId
    );
    const resolvedTransition = this.resolveRequestedStageTransition(lifecycleContext, input);
    return this.executeStageTransition(
      current,
      tenantSchema,
      userId,
      resolvedTransition.targetStage
    );
  }

  async move(
    _id: string,
    _tenantSchema: string,
    _newSubsidiaryId: string | null,
    _version: number,
    _userId: string
  ): Promise<TalentData> {
    throw new ConflictException({
      code: ErrorCodes.RES_CONFLICT,
      message:
        'Talent move has been retired from normal product flow. If structural correction is required, it must be performed via direct database intervention.',
    });
  }

  private async requireTalent(id: string, tenantSchema: string): Promise<TalentData> {
    const talent = await this.talentReadService.findById(id, tenantSchema);

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    return talent;
  }

  private assertVersion(current: TalentData, version: number) {
    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }
  }

  private assertPublishReadiness(readiness: TalentPublishReadiness) {
    if (!readiness.canEnterPublishedState) {
      throw new ConflictException({
        code: ErrorCodes.TALENT_PUBLISH_BLOCKED,
        message: 'Talent is not ready to enter published state.',
        details: { blockers: readiness.blockers },
      });
    }
  }

  private async executeStageTransition(
    talent: TalentData,
    tenantSchema: string,
    userId: string,
    targetStage: ArtistStageLifecycleCatalogRecord
  ) {
    if (targetStage.artistStatusCode === 'published') {
      const readiness = await this.getPublishReadiness(talent.id, tenantSchema);
      this.assertPublishReadiness(readiness);
    }

    return this.talentLifecycleRepository.transitionToStage(
      talent.id,
      tenantSchema,
      userId,
      targetStage.id,
      targetStage.artistStatusCode
    );
  }

  private async loadArtistLifecycleContext(
    tenantSchema: string,
    currentStageId: string
  ): Promise<ArtistLifecycleContext> {
    const stages = await this.talentLifecycleRepository.listArtistStages(tenantSchema);

    const flow = await this.talentLifecycleRepository.readArtistLifecycleFlow(tenantSchema);

    let normalizedFlow;

    try {
      normalizedFlow = createArtistLifecycleFlowSchema({
        stageCatalog: stages,
      }).parse(flow);
    } catch {
      throw new ConflictException({
        code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
        message: 'Artist lifecycle flow is missing or invalid for this tenant.',
      });
    }

    const currentStage = stages.find((stage) => stage.id === currentStageId);
    if (!currentStage) {
      throw new ConflictException({
        code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
        message: 'Current Artist Stage is unavailable in the tenant stage catalog.',
      });
    }

    return {
      currentStage,
      flow: normalizedFlow,
      stages,
    };
  }

  private resolveLegacyLifecycleTransition(
    lifecycleContext: ArtistLifecycleContext,
    talent: TalentData,
    targetLifecycleStatus: TalentData['lifecycleStatus']
  ): ResolvedArtistStageTransition {
    const candidateTransitions = lifecycleContext.flow.transitions
      .filter((transition) => transition.fromStageId === talent.artistStageId)
      .map((transition) => ({
        targetStage: lifecycleContext.stages.find((stage) => stage.id === transition.toStageId),
        transition,
      }))
      .filter((candidate): candidate is ResolvedArtistStageTransition =>
        Boolean(candidate.targetStage)
      )
      .filter(
        (stage) =>
          stage.targetStage.isActive && stage.targetStage.artistStatusCode === targetLifecycleStatus
      );

    if (candidateTransitions.length === 0) {
      throw new ConflictException({
        code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
        message: 'No allowed Artist Stage transition matches this lifecycle action.',
      });
    }

    if (candidateTransitions.length > 1) {
      throw new ConflictException({
        code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
        message:
          'Multiple Artist Stage transitions match this lifecycle action. Use an explicit stage-transition workflow.',
      });
    }

    return candidateTransitions[0];
  }

  private resolveRequestedStageTransition(
    lifecycleContext: ArtistLifecycleContext,
    input: TalentStageTransitionInput
  ): ResolvedArtistStageTransition {
    this.assertExplicitStageTransitionRequest(input);

    if (input.transitionId) {
      const matchedTransitions = lifecycleContext.flow.transitions
        .filter(
          (transition) =>
            transition.fromStageId === lifecycleContext.currentStage.id &&
            transition.id === input.transitionId
        )
        .map((transition) => ({
          targetStage: lifecycleContext.stages.find((stage) => stage.id === transition.toStageId),
          transition,
        }))
        .filter((candidate): candidate is ResolvedArtistStageTransition =>
          Boolean(candidate.targetStage)
        );

      if (matchedTransitions.length === 0) {
        throw new ConflictException({
          code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
          message: 'Requested Artist Stage transition is not allowed from the current stage.',
        });
      }

      if (matchedTransitions.length > 1) {
        throw new ConflictException({
          code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
          message: 'Artist lifecycle flow contains duplicate transition ids for the current stage.',
        });
      }

      return matchedTransitions[0];
    }

    const targetArtistStageId = input.targetArtistStageId as string;
    const matchedTransition = lifecycleContext.flow.transitions.find(
      (transition) =>
        transition.fromStageId === lifecycleContext.currentStage.id &&
        transition.toStageId === targetArtistStageId
    );

    if (!matchedTransition) {
      throw new ConflictException({
        code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
        message: 'Requested Artist Stage transition is not allowed from the current stage.',
      });
    }

    const targetStage = lifecycleContext.stages.find(
      (stage) => stage.id === matchedTransition.toStageId
    );

    if (!targetStage) {
      throw new ConflictException({
        code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
        message: 'Requested Artist Stage target is unavailable in the tenant stage catalog.',
      });
    }

    return {
      targetStage,
      transition: matchedTransition,
    };
  }

  private assertExplicitStageTransitionRequest(input: TalentStageTransitionInput) {
    const hasTargetArtistStageId = Boolean(input.targetArtistStageId?.trim());
    const hasTransitionId = Boolean(input.transitionId?.trim());

    if (hasTargetArtistStageId === hasTransitionId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message:
          'Provide exactly one of targetArtistStageId or transitionId for an Artist Stage transition.',
      });
    }
  }
}

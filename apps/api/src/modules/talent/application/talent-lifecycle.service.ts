// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import { CustomerArchiveAccessService } from '../../customer/application/customer-archive-access.service';
import { buildTalentPublishReadiness } from '../domain/talent-lifecycle.policy';
import type { TalentData, TalentPublishReadiness } from '../domain/talent-read.policy';
import { TalentLifecycleRepository } from '../infrastructure/talent-lifecycle.repository';
import { TalentReadService } from './talent-read.service';

@Injectable()
export class TalentLifecycleService {
  constructor(
    private readonly talentReadService: TalentReadService,
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
    private readonly talentLifecycleRepository: TalentLifecycleRepository,
  ) {}

  async getPublishReadiness(
    id: string,
    tenantSchema: string,
  ): Promise<TalentPublishReadiness> {
    const talent = await this.requireTalent(id, tenantSchema);
    const archiveReadiness =
      talent.lifecycleStatus === 'published'
        ? { hasActiveArchiveTarget: true }
        : await this.customerArchiveAccessService.getTalentArchiveReadiness(
            id,
            tenantSchema,
          );
    const externalPagesDomain =
      await this.talentReadService.getExternalPagesDomainConfig(id, tenantSchema);

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
    userId: string,
  ): Promise<TalentData> {
    const current = await this.requireTalent(id, tenantSchema);
    this.assertVersion(current, version);

    if (current.lifecycleStatus !== 'draft') {
      throw new ConflictException({
        code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
        message:
          'Talent cannot perform this lifecycle action from its current state.',
      });
    }

    const readiness = await this.getPublishReadiness(id, tenantSchema);
    this.assertPublishReadiness(readiness);

    return this.talentLifecycleRepository.publish(id, tenantSchema, userId);
  }

  async disable(
    id: string,
    tenantSchema: string,
    version: number,
    userId: string,
  ): Promise<TalentData> {
    const current = await this.requireTalent(id, tenantSchema);
    this.assertVersion(current, version);

    if (current.lifecycleStatus !== 'published') {
      throw new ConflictException({
        code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
        message:
          'Talent cannot perform this lifecycle action from its current state.',
      });
    }

    return this.talentLifecycleRepository.disable(id, tenantSchema, userId);
  }

  async reEnable(
    id: string,
    tenantSchema: string,
    version: number,
    userId: string,
  ): Promise<TalentData> {
    const current = await this.requireTalent(id, tenantSchema);
    this.assertVersion(current, version);

    if (current.lifecycleStatus !== 'disabled') {
      throw new ConflictException({
        code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
        message:
          'Talent cannot perform this lifecycle action from its current state.',
      });
    }

    const readiness = await this.getPublishReadiness(id, tenantSchema);
    this.assertPublishReadiness(readiness);

    return this.talentLifecycleRepository.reEnable(id, tenantSchema, userId);
  }

  async move(
    _id: string,
    _tenantSchema: string,
    _newSubsidiaryId: string | null,
    _version: number,
    _userId: string,
  ): Promise<TalentData> {
    throw new ConflictException({
      code: ErrorCodes.RES_CONFLICT,
      message:
        'Talent move has been retired from normal product flow. If structural correction is required, it must be performed via direct database intervention.',
    });
  }

  private async requireTalent(
    id: string,
    tenantSchema: string,
  ): Promise<TalentData> {
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
}

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import { buildManagedNameTranslationPayload } from '../../../platform/persistence/managed-name-translations';
import type { TalentData } from '../domain/talent-read.policy';
import {
  buildTalentDefaultSettings,
  buildTalentDeleteBlockedDependencies,
  buildTalentPath,
  canHardDeleteTalent,
  type TalentCreateInput,
  type TalentDeleteInput,
  type TalentDeleteResult,
  type TalentUpdateInput,
} from '../domain/talent-write.policy';
import { TalentWriteRepository } from '../infrastructure/talent-write.repository';
import { TalentReadService } from './talent-read.service';

@Injectable()
export class TalentWriteService {
  constructor(
    private readonly talentReadService: TalentReadService,
    private readonly talentWriteRepository: TalentWriteRepository,
  ) {}

  async create(
    tenantSchema: string,
    data: TalentCreateInput,
    userId: string,
  ): Promise<TalentData> {
    const translationPayload = buildManagedNameTranslationPayload(data);
    const hasActiveProfileStore =
      await this.talentWriteRepository.hasActiveProfileStore(
        tenantSchema,
        data.profileStoreId,
      );

    if (!hasActiveProfileStore) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Profile Store not found or inactive',
      });
    }

    const existingByCode = await this.talentReadService.findByCode(
      data.code,
      tenantSchema,
    );
    if (existingByCode) {
      throw new BadRequestException({
        code: ErrorCodes.CODE_ALREADY_EXISTS,
        message: 'Talent code already exists',
      });
    }

    if (data.homepagePath) {
      const existingByPath = await this.talentReadService.findByHomepagePath(
        data.homepagePath,
        tenantSchema,
      );
      if (existingByPath) {
        throw new BadRequestException({
          code: 'HOMEPAGE_PATH_TAKEN',
          message: 'Homepage path is already in use',
        });
      }
    }

    const subsidiaryPath = data.subsidiaryId
      ? await this.talentWriteRepository.findSubsidiaryPath(
          tenantSchema,
          data.subsidiaryId,
        )
      : null;

    if (data.subsidiaryId && !subsidiaryPath) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Subsidiary not found',
      });
    }

    return this.talentWriteRepository.create(
      tenantSchema,
      {
        ...data,
        nameEn: translationPayload.nameEn,
        nameZh: translationPayload.nameZh ?? undefined,
        nameJa: translationPayload.nameJa ?? undefined,
        extraData: translationPayload.extraData,
        path: buildTalentPath(data.code, subsidiaryPath),
        settings: buildTalentDefaultSettings(data.settings),
      },
      userId,
    );
  }

  async update(
    id: string,
    tenantSchema: string,
    data: TalentUpdateInput,
    userId: string,
  ): Promise<TalentData> {
    const current = await this.talentReadService.findById(id, tenantSchema);

    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    if (current.version !== data.version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    if (
      data.homepagePath &&
      data.homepagePath !== current.homepagePath
    ) {
      const existingByPath = await this.talentReadService.findByHomepagePath(
        data.homepagePath,
        tenantSchema,
      );
      if (existingByPath && existingByPath.id !== id) {
        throw new BadRequestException({
          code: 'HOMEPAGE_PATH_TAKEN',
          message: 'Homepage path is already in use',
        });
      }
    }

    const translationPayload = buildManagedNameTranslationPayload(data, current);

    return this.talentWriteRepository.update(
      id,
      tenantSchema,
      {
        ...data,
        nameEn: translationPayload.nameEn,
        nameZh: translationPayload.nameZh ?? undefined,
        nameJa: translationPayload.nameJa ?? undefined,
        extraData: translationPayload.extraData,
      },
      userId,
    );
  }

  async delete(
    id: string,
    tenantSchema: string,
    data: TalentDeleteInput,
  ): Promise<TalentDeleteResult> {
    const current = await this.talentReadService.findById(id, tenantSchema);

    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    if (current.version !== data.version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    if (!canHardDeleteTalent(current.lifecycleStatus)) {
      throw new ConflictException({
        code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
        message: 'Only draft talents can be hard-deleted from normal product flow.',
        details: {
          lifecycleStatus: current.lifecycleStatus,
        },
      });
    }

    const result = await this.talentWriteRepository.deleteDraftTalent(
      tenantSchema,
      id,
      data.version,
    );

    switch (result.outcome) {
      case 'deleted':
        return {
          id: result.id,
          deleted: true,
        };
      case 'not_found':
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Talent not found',
        });
      case 'version_mismatch':
        throw new BadRequestException({
          code: ErrorCodes.RES_VERSION_MISMATCH,
          message: 'Data has been modified. Please refresh and try again.',
          details: {
            currentVersion: result.currentVersion,
          },
        });
      case 'lifecycle_conflict':
        throw new ConflictException({
          code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
          message: 'Only draft talents can be hard-deleted from normal product flow.',
          details: {
            lifecycleStatus: result.lifecycleStatus,
          },
        });
      case 'protected_dependency':
        throw new ConflictException({
          code: ErrorCodes.TALENT_LIFECYCLE_CONFLICT,
          message:
            'Draft talent cannot be hard-deleted because protected dependent data already exists.',
          details: {
            dependencies: buildTalentDeleteBlockedDependencies(
              result.dependencies,
            ),
          },
        });
    }
  }
}

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type ChangeAction, ErrorCodes, type RequestContext } from '@tcrn/shared';

import { ChangeLogService } from '../../log';
import {
  buildDefaultMarshmallowConfig,
  buildMarshmallowConfigChanges,
  buildMarshmallowConfigResponse,
  buildMarshmallowConfigStats,
  isMarshmallowEnabledByTalentSettings,
} from '../domain/marshmallow-config.policy';
import type { UpdateConfigDto } from '../dto/marshmallow.dto';
import { MarshmallowConfigRepository } from '../infrastructure/marshmallow-config.repository';

@Injectable()
export class MarshmallowConfigApplicationService {
  constructor(
    private readonly marshmallowConfigRepository: MarshmallowConfigRepository,
    private readonly changeLogService: ChangeLogService,
    private readonly configService: ConfigService,
  ) {}

  async getOrCreate(talentId: string, tenantSchema: string) {
    this.assertTenantSchema(tenantSchema);

    let config = await this.findExistingConfig(talentId, tenantSchema);

    if (!config) {
      const talent = await this.marshmallowConfigRepository.findActiveTalent(
        tenantSchema,
        talentId,
      );

      if (!talent) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: `Talent with ID ${talentId} not found`,
        });
      }

      config = await this.marshmallowConfigRepository.insertDefaultConfig({
        tenantSchema,
        talentId,
        defaultConfig: buildDefaultMarshmallowConfig(
          isMarshmallowEnabledByTalentSettings(talent.settings),
        ),
      });
    }

    const [statsRow, homepagePath] = await Promise.all([
      this.marshmallowConfigRepository.findStatsByConfigId(tenantSchema, config.id),
      this.marshmallowConfigRepository.findTalentHomepagePath(tenantSchema, talentId),
    ]);

    return buildMarshmallowConfigResponse({
      config,
      stats: buildMarshmallowConfigStats(statsRow),
      appUrl: this.configService.get<string>('APP_URL', 'http://localhost:3000'),
      homepagePath,
    });
  }

  async update(
    talentId: string,
    tenantSchema: string,
    dto: UpdateConfigDto,
    context: RequestContext,
  ) {
    this.assertTenantSchema(tenantSchema);

    const config = await this.marshmallowConfigRepository.findConfigByTalentId(
      tenantSchema,
      talentId,
    );

    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Marshmallow config not found',
      });
    }

    if (config.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Config was modified by another user',
      });
    }

    const { changedFields, newValue, oldValue } = buildMarshmallowConfigChanges(
      config,
      dto,
    );

    if (changedFields.length > 0) {
      await this.marshmallowConfigRepository.updateConfigFields(
        tenantSchema,
        config.id,
        changedFields,
      );

      await this.changeLogService.createDirect(
        {
          action: 'update' as ChangeAction,
          objectType: 'marshmallow_config',
          objectId: config.id,
          objectName: 'Marshmallow config',
          oldValue,
          newValue,
        },
        context,
      );
    }

    return this.getOrCreate(talentId, tenantSchema);
  }

  findExistingConfig(
    talentId: string,
    tenantSchema: string,
  ) {
    this.assertTenantSchema(tenantSchema);
    return this.marshmallowConfigRepository.findConfigByTalentId(
      tenantSchema,
      talentId,
    );
  }

  private assertTenantSchema(tenantSchema: string): void {
    if (!tenantSchema || typeof tenantSchema !== 'string') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Tenant schema is required',
      });
    }
  }
}

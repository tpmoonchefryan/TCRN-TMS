// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@tcrn/database';
import { ErrorCodes, LogSeverity, type RequestContext, TechEventType } from '@tcrn/shared';

import { ChangeLogService, TechEventLogService } from '../../log';
import type { IntegrationAdapterOwnerScope } from '../domain/adapter-read.policy';
import {
  ADAPTER_SECRET_REVEAL_EXPIRY_SECONDS,
  buildAdapterActiveStateResult,
  buildAdapterConfigUpdateResult,
  buildAdapterUpdateMutationPlan,
  buildInheritedAdapterScopeStateResult,
  canMutateInheritedAdapterAtScope,
  hasAdapterVersionMismatch,
  type IntegrationAdapterMutationRecord,
  isAdapterOwnedByScope,
  isSecretAdapterConfigKey,
} from '../domain/adapter-write.policy';
import { buildNameTranslationPayload } from '../domain/name-translation.policy';
import {
  CreateAdapterDto,
  OwnerType,
  UpdateAdapterConfigsDto,
  UpdateAdapterDto,
} from '../dto/integration.dto';
import {
  type AdapterConfigPersistenceInput,
  AdapterWriteRepository,
} from '../infrastructure/adapter-write.repository';
import { AdapterCryptoService } from '../services/adapter-crypto.service';
import { getAdapterTenantSchema } from './adapter-context.util';
import { AdapterReadApplicationService } from './adapter-read.service';

@Injectable()
export class AdapterWriteApplicationService {
  constructor(
    private readonly adapterWriteRepository: AdapterWriteRepository,
    private readonly adapterReadApplicationService: AdapterReadApplicationService,
    private readonly cryptoService: AdapterCryptoService,
    private readonly changeLogService: ChangeLogService,
    private readonly techEventLog: TechEventLogService,
  ) {}

  async create(
    dto: CreateAdapterDto,
    context: RequestContext,
    scope: IntegrationAdapterOwnerScope = { ownerType: OwnerType.TENANT, ownerId: null },
  ) {
    const tenantSchema = getAdapterTenantSchema(context);
    const translationPayload = buildNameTranslationPayload(dto);

    if (!translationPayload.nameEn) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Adapter English name is required',
      });
    }

    const adapterId = await this.adapterWriteRepository.withTransaction(async (prisma) => {
      const platform = await this.adapterWriteRepository.findPlatformById(
        prisma,
        tenantSchema,
        dto.platformId,
      );

      if (!platform) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Platform not found',
        });
      }

      const existing = await this.adapterWriteRepository.findByCode(
        prisma,
        tenantSchema,
        scope,
        dto.code,
      );

      if (existing) {
        throw new ConflictException({
          code: ErrorCodes.RES_ALREADY_EXISTS,
          message: `Adapter with code '${dto.code}' already exists`,
        });
      }

      const existingPlatform = await this.adapterWriteRepository.findByPlatformAndType(
        prisma,
        tenantSchema,
        scope,
        dto.platformId,
        dto.adapterType,
      );

      if (existingPlatform) {
        throw new ConflictException({
          code: ErrorCodes.RES_ALREADY_EXISTS,
          message: `Adapter for platform '${platform.code}' with type '${dto.adapterType}' already exists`,
        });
      }

      const createdId = await this.adapterWriteRepository.create(prisma, tenantSchema, {
        ownerType: scope.ownerType,
        ownerId: scope.ownerId,
        platformId: dto.platformId,
        code: dto.code,
        nameEn: translationPayload.nameEn,
        nameZh: translationPayload.nameZh,
        nameJa: translationPayload.nameJa,
        extraData: translationPayload.extraData,
        adapterType: dto.adapterType,
        inherit: dto.inherit ?? true,
        userId: context.userId ?? null,
      });

      if (!createdId) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Adapter creation failed',
        });
      }

      if (dto.configs?.length) {
        await this.adapterWriteRepository.upsertConfigs(
          prisma,
          tenantSchema,
          createdId,
          this.toPersistenceConfigs(dto.configs),
        );
      }

      await this.changeLogService.create(
        prisma,
        {
          action: 'create',
          objectType: 'integration_adapter',
          objectId: createdId,
          objectName: dto.code,
          newValue: {
            code: dto.code,
            adapterType: dto.adapterType,
            ownerType: scope.ownerType,
            ownerId: scope.ownerId,
          },
        },
        context,
      );

      return createdId;
    });

    return this.adapterReadApplicationService.findById(adapterId, context);
  }

  async update(id: string, dto: UpdateAdapterDto, context: RequestContext) {
    const tenantSchema = getAdapterTenantSchema(context);

    await this.adapterWriteRepository.withTransaction(async (prisma) => {
      const adapter = await this.getAdapterOrThrow(prisma, tenantSchema, id);

      if (hasAdapterVersionMismatch(adapter, dto.version)) {
        throw new ConflictException({
          code: ErrorCodes.VERSION_CONFLICT,
          message: 'Adapter was modified by another user',
        });
      }

      const translationPayload = buildNameTranslationPayload(dto, adapter);
      if (!translationPayload.nameEn) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Adapter English name is required',
        });
      }

      const updatePlan = buildAdapterUpdateMutationPlan(
        adapter,
        dto,
        translationPayload.translations,
        translationPayload.extraData,
      );
      await this.adapterWriteRepository.update(prisma, tenantSchema, id, {
        nameEn: updatePlan.nameEn,
        nameZh: updatePlan.nameZh,
        nameJa: updatePlan.nameJa,
        extraData: updatePlan.extraData,
        inherit: updatePlan.inherit,
        userId: context.userId ?? null,
      });

      await this.changeLogService.create(
        prisma,
        {
          action: 'update',
          objectType: 'integration_adapter',
          objectId: id,
          objectName: adapter.code,
          oldValue: updatePlan.oldValue,
          newValue: updatePlan.newValue,
        },
        context,
      );
    });

    return this.adapterReadApplicationService.findById(id, context);
  }

  async updateConfigs(adapterId: string, dto: UpdateAdapterConfigsDto, context: RequestContext) {
    const tenantSchema = getAdapterTenantSchema(context);
    const nextVersion = await this.adapterWriteRepository.withTransaction(async (prisma) => {
      const adapter = await this.getAdapterOrThrow(prisma, tenantSchema, adapterId);

      if (hasAdapterVersionMismatch(adapter, dto.adapterVersion)) {
        throw new ConflictException({
          code: ErrorCodes.VERSION_CONFLICT,
          message: 'Adapter was modified by another user',
        });
      }

      await this.adapterWriteRepository.upsertConfigs(
        prisma,
        tenantSchema,
        adapterId,
        this.toPersistenceConfigs(dto.configs),
      );

      const version = await this.adapterWriteRepository.incrementVersion(
        prisma,
        tenantSchema,
        adapterId,
        context.userId ?? null,
      );

      await this.changeLogService.create(
        prisma,
        {
          action: 'update',
          objectType: 'adapter_config',
          objectId: adapterId,
          objectName: adapter.code,
          newValue: { configKeys: dto.configs.map((config) => config.configKey) },
        },
        context,
      );

      return version ?? adapter.version + 1;
    });

    return buildAdapterConfigUpdateResult(dto.configs.length, nextVersion);
  }

  async revealConfig(adapterId: string, configKey: string, context: RequestContext) {
    const config = await this.adapterWriteRepository.findConfig(
      getAdapterTenantSchema(context),
      adapterId,
      configKey,
    );

    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Config not found',
      });
    }

    const revealedAt = new Date().toISOString();

    if (!config.isSecret) {
      return {
        configKey,
        configValue: config.configValue,
        revealedAt,
      };
    }

    await this.techEventLog.log({
      eventType: TechEventType.SECURITY_EVENT,
      scope: 'security',
      severity: LogSeverity.WARN,
      payload: {
        action: 'secret_revealed',
        adapterId,
        configKey,
        userId: context.userId,
      },
    });

    return {
      configKey,
      configValue: this.cryptoService.decrypt(config.configValue),
      revealedAt,
      expiresInSeconds: ADAPTER_SECRET_REVEAL_EXPIRY_SECONDS,
    };
  }

  async deactivate(id: string, context: RequestContext) {
    return this.setActiveStatus(id, false, context);
  }

  async reactivate(id: string, context: RequestContext) {
    return this.setActiveStatus(id, true, context);
  }

  async disableInherited(
    adapterId: string,
    scope: IntegrationAdapterOwnerScope,
    context: RequestContext,
  ) {
    const tenantSchema = getAdapterTenantSchema(context);

    return this.adapterWriteRepository.withTransaction(async (prisma) => {
      const adapter = await this.getAdapterOrThrow(prisma, tenantSchema, adapterId);

      if (!canMutateInheritedAdapterAtScope(scope)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Tenant-root adapters cannot be disabled through inherited owner routes',
        });
      }

      if (isAdapterOwnedByScope(adapter, scope)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Cannot disable an adapter owned by the same scope',
        });
      }

      const existing = await this.adapterWriteRepository.findDisabledOverride(
        prisma,
        tenantSchema,
        adapterId,
        scope,
      );

      if (existing?.isDisabled) {
        throw new ConflictException({
          code: ErrorCodes.RES_ALREADY_EXISTS,
          message: 'Adapter is already disabled at this scope',
        });
      }

      await this.adapterWriteRepository.upsertDisabledOverride(
        prisma,
        tenantSchema,
        adapterId,
        scope,
        context.userId ?? null,
      );

      await this.changeLogService.create(
        prisma,
        {
          action: 'disable_inherited',
          objectType: 'integration_adapter',
          objectId: adapterId,
          objectName: adapter.code,
          newValue: {
            ownerType: scope.ownerType,
            ownerId: scope.ownerId,
            isDisabled: true,
          },
        },
        context,
      );

      return buildInheritedAdapterScopeStateResult(adapterId, adapter.code, scope, true);
    });
  }

  async enableInherited(
    adapterId: string,
    scope: IntegrationAdapterOwnerScope,
    context: RequestContext,
  ) {
    const tenantSchema = getAdapterTenantSchema(context);

    return this.adapterWriteRepository.withTransaction(async (prisma) => {
      const adapter = await this.getAdapterOrThrow(prisma, tenantSchema, adapterId);

      if (!canMutateInheritedAdapterAtScope(scope)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Tenant-root adapters cannot be enabled through inherited owner routes',
        });
      }

      if (isAdapterOwnedByScope(adapter, scope)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Cannot enable an adapter owned by the same scope',
        });
      }

      const existing = await this.adapterWriteRepository.findDisabledOverride(
        prisma,
        tenantSchema,
        adapterId,
        scope,
      );

      if (!existing?.isDisabled) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Adapter is not disabled at this scope',
        });
      }

      await this.adapterWriteRepository.deleteDisabledOverride(
        prisma,
        tenantSchema,
        adapterId,
        scope,
      );

      await this.changeLogService.create(
        prisma,
        {
          action: 'enable_inherited',
          objectType: 'integration_adapter',
          objectId: adapterId,
          objectName: adapter.code,
          newValue: {
            ownerType: scope.ownerType,
            ownerId: scope.ownerId,
            isDisabled: false,
          },
        },
        context,
      );

      return buildInheritedAdapterScopeStateResult(adapterId, adapter.code, scope, false);
    });
  }

  private async setActiveStatus(
    id: string,
    isActive: boolean,
    context: RequestContext,
  ) {
    const tenantSchema = getAdapterTenantSchema(context);

    return this.adapterWriteRepository.withTransaction(async (prisma) => {
      const adapter = await this.getAdapterOrThrow(prisma, tenantSchema, id);

      await this.adapterWriteRepository.setActiveStatus(
        prisma,
        tenantSchema,
        id,
        isActive,
        context.userId ?? null,
      );

      await this.changeLogService.create(
        prisma,
        {
          action: isActive ? 'reactivate' : 'deactivate',
          objectType: 'integration_adapter',
          objectId: id,
          objectName: adapter.code,
          oldValue: { isActive: adapter.isActive },
          newValue: { isActive },
        },
        context,
      );

      return buildAdapterActiveStateResult(id, isActive);
    });
  }

  private async getAdapterOrThrow(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    adapterId: string,
  ): Promise<IntegrationAdapterMutationRecord> {
    const adapter = await this.adapterWriteRepository.findById(prisma, tenantSchema, adapterId);

    if (!adapter) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Adapter not found',
      });
    }

    return adapter;
  }

  private toPersistenceConfigs(
    configs: Array<{ configKey: string; configValue: string }>,
  ): AdapterConfigPersistenceInput[] {
    return configs.map((config) => {
      const isSecret = isSecretAdapterConfigKey(config.configKey);

      return {
        configKey: config.configKey,
        configValue: isSecret
          ? this.cryptoService.encrypt(config.configValue)
          : config.configValue,
        isSecret,
      };
    });
  }
}

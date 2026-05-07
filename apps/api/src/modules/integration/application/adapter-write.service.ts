// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@tcrn/database';
import {
  ErrorCodes,
  getIntegrationAdapterDefinition,
  type IntegrationAdapterDefinition,
  LogSeverity,
  type RequestContext,
  TechEventScope,
  TechEventType,
} from '@tcrn/shared';

import { ChangeLogService, TechEventLogService } from '../../log';
import type { IntegrationAdapterOwnerScope } from '../domain/adapter-read.policy';
import {
  ADAPTER_SECRET_REVEAL_EXPIRY_SECONDS,
  buildAdapterActiveStateResult,
  buildAdapterConfigMutationPlan,
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
    const definition = this.resolveCreateDefinition(dto.definitionKey);
    const createInput = this.buildCreateInput(dto, definition);
    const translationPayload = buildNameTranslationPayload(createInput);

    if (!translationPayload.nameEn) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Adapter English name is required',
      });
    }

    const adapterId = await this.adapterWriteRepository.withTransaction(async (prisma) => {
      const platform = definition
        ? await this.adapterWriteRepository.ensurePlatformForDefinition(
          prisma,
          tenantSchema,
          definition.platform,
        )
        : await this.adapterWriteRepository.findPlatformById(
          prisma,
          tenantSchema,
          createInput.platformId,
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
        createInput.code,
      );

      if (existing) {
        throw new ConflictException({
          code: ErrorCodes.RES_ALREADY_EXISTS,
          message: `Adapter with code '${createInput.code}' already exists`,
        });
      }

      const existingPlatform = await this.adapterWriteRepository.findByPlatformAndType(
        prisma,
        tenantSchema,
        scope,
        platform.id,
        createInput.adapterType,
      );

      if (existingPlatform) {
        throw new ConflictException({
          code: ErrorCodes.RES_ALREADY_EXISTS,
          message: `Adapter for platform '${platform.code}' with type '${createInput.adapterType}' already exists`,
        });
      }

      const createdId = await this.adapterWriteRepository.create(prisma, tenantSchema, {
        ownerType: scope.ownerType,
        ownerId: scope.ownerId,
        platformId: platform.id,
        code: createInput.code,
        nameEn: translationPayload.nameEn,
        nameZh: translationPayload.nameZh,
        nameJa: translationPayload.nameJa,
        extraData: this.mergeDefinitionExtraData(translationPayload.extraData, definition),
        adapterType: createInput.adapterType,
        inherit: createInput.inherit,
        userId: context.userId ?? null,
      });

      if (!createdId) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Adapter creation failed',
        });
      }

      if (createInput.configs.length) {
        await this.adapterWriteRepository.upsertConfigs(
          prisma,
          tenantSchema,
          createdId,
          this.toPersistenceConfigs(createInput.configs),
        );
      }

      await this.changeLogService.create(
        prisma,
        {
          action: 'create',
          objectType: 'integration_adapter',
          objectId: createdId,
          objectName: createInput.code,
          newValue: {
            code: createInput.code,
            adapterType: createInput.adapterType,
            definitionKey: definition?.key,
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

  private resolveCreateDefinition(definitionKey: string | undefined) {
    if (!definitionKey) {
      return null;
    }

    const definition = getIntegrationAdapterDefinition(definitionKey);
    if (!definition) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Unsupported adapter definition '${definitionKey}'`,
      });
    }

    return definition;
  }

  private buildCreateInput(
    dto: CreateAdapterDto,
    definition: IntegrationAdapterDefinition | null,
  ): {
    platformId: string;
    code: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    translations?: Record<string, string>;
    adapterType: string;
    inherit: boolean;
    configs: Array<{ configKey: string; configValue: string }>;
  } {
    if (!definition) {
      if (!dto.platformId || !dto.adapterType || !dto.code || !dto.nameEn) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Platform, adapter type, code, and English name are required without a definition key',
        });
      }

      return {
        platformId: dto.platformId,
        code: dto.code.trim().toUpperCase(),
        nameEn: dto.nameEn.trim(),
        nameZh: dto.nameZh,
        nameJa: dto.nameJa,
        translations: dto.translations,
        adapterType: dto.adapterType,
        inherit: dto.inherit ?? true,
        configs: dto.configs ?? [],
      };
    }

    this.assertDefinitionIdentityLocked(dto, definition);

    return {
      platformId: '',
      code: definition.code,
      nameEn: definition.name.en,
      nameZh: definition.name.zh_HANS,
      nameJa: definition.name.ja,
      translations: { ...definition.name },
      adapterType: definition.adapterType,
      inherit: dto.inherit ?? true,
      configs: this.buildDefinitionConfigs(definition, dto.configs ?? []),
    };
  }

  private assertDefinitionIdentityLocked(
    dto: CreateAdapterDto,
    definition: IntegrationAdapterDefinition,
  ) {
    const hasLockedField = Boolean(
      dto.platformId
      || dto.adapterType
      || dto.code
      || dto.nameEn
      || dto.nameZh
      || dto.nameJa
      || dto.translations,
    );

    if (hasLockedField) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Adapter definition '${definition.key}' controls platform, type, code, and name fields`,
      });
    }
  }

  private buildDefinitionConfigs(
    definition: IntegrationAdapterDefinition,
    configs: Array<{ configKey: string; configValue: string }>,
  ): Array<{ configKey: string; configValue: string }> {
    const provided = new Map(
      configs.map((config) => [config.configKey.trim(), config.configValue] as const),
    );
    const allowedKeys = new Set(definition.configFields.map((field) => field.key));
    const unknownKey = [...provided.keys()].find((configKey) => !allowedKeys.has(configKey));

    if (unknownKey) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Config '${unknownKey}' is not supported by adapter definition '${definition.key}'`,
      });
    }

    return definition.configFields.flatMap((field) => {
      const rawValue = provided.get(field.key) ?? field.defaultValue ?? '';
      const normalizedValue = rawValue.trim();

      if (field.required && !normalizedValue) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `Config '${field.key}' is required by adapter definition '${definition.key}'`,
        });
      }

      return normalizedValue
        ? [{ configKey: field.key, configValue: normalizedValue }]
        : [];
    });
  }

  private mergeDefinitionExtraData(
    extraData: Record<string, unknown> | null,
    definition: IntegrationAdapterDefinition | null,
  ) {
    if (!definition) {
      return extraData;
    }

    return {
      ...(extraData ?? {}),
      definitionKey: definition.key,
      definitionCode: definition.code,
      aiProvider: definition.aiProvider ?? null,
      capabilities: definition.capabilities,
      protocol: definition.protocol,
    };
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

      const plans = dto.configs.map((config) =>
        buildAdapterConfigMutationPlan(adapter, config),
      );
      const replacePlans = plans.filter((plan) => plan.mutation === 'replace');
      const clearPlans = plans.filter((plan) => plan.mutation === 'clear');
      const mutationSummary = plans
        .filter((plan) => plan.mutation !== 'keep')
        .map((plan) => ({
          configKey: plan.configKey,
          mutation: plan.mutation,
          isSecret: plan.isSecret,
        }));

      for (const plan of plans) {
        if (plan.mutation === 'replace' && (!plan.configValue || plan.configValue.length === 0)) {
          throw new BadRequestException({
            code: ErrorCodes.VALIDATION_FAILED,
            message: `Replacement value is required for config '${plan.configKey}'`,
          });
        }

        if (plan.mutation !== 'replace' && plan.configValue !== undefined) {
          throw new BadRequestException({
            code: ErrorCodes.VALIDATION_FAILED,
            message: `Config value is only allowed for replace mutations`,
          });
        }

        if (plan.mutation === 'clear' && !plan.isSecret) {
          throw new BadRequestException({
            code: ErrorCodes.VALIDATION_FAILED,
            message: `Only optional secret configs can be cleared explicitly`,
          });
        }

        if (plan.mutation === 'clear' && plan.isRequiredSecret) {
          throw new BadRequestException({
            code: ErrorCodes.VALIDATION_FAILED,
            message: `Required secret '${plan.configKey}' cannot be cleared; replace the secret or disable the adapter instead`,
          });
        }
      }

      if (replacePlans.length === 0 && clearPlans.length === 0) {
        return adapter.version;
      }

      if (replacePlans.length > 0) {
        await this.adapterWriteRepository.upsertConfigs(
          prisma,
          tenantSchema,
          adapterId,
          this.toPersistenceConfigs(
            replacePlans.map((plan) => ({
              configKey: plan.configKey,
              configValue: plan.configValue ?? '',
            })),
          ),
        );
      }

      for (const plan of clearPlans) {
        await this.adapterWriteRepository.deleteConfig(
          prisma,
          tenantSchema,
          adapterId,
          plan.configKey,
        );
      }

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
          newValue: { configMutations: mutationSummary },
        },
        context,
      );

      await this.logSecretConfigMutations(adapterId, plans, context);

      return version ?? adapter.version + 1;
    });

    return buildAdapterConfigUpdateResult(
      dto.configs.filter((config) => config.mutation !== 'keep').length,
      nextVersion,
    );
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

  private async logSecretConfigMutations(
    adapterId: string,
    plans: Array<{
      configKey: string;
      mutation: 'keep' | 'replace' | 'clear';
      isSecret: boolean;
    }>,
    context: RequestContext,
  ) {
    for (const plan of plans) {
      if (!plan.isSecret || (plan.mutation !== 'replace' && plan.mutation !== 'clear')) {
        continue;
      }

      await this.techEventLog.log({
        eventType: TechEventType.SECURITY_EVENT,
        scope: TechEventScope.SECURITY,
        severity: LogSeverity.WARN,
        payload: {
          action: plan.mutation === 'clear' ? 'secret_cleared' : 'secret_replaced',
          adapterId,
          configKey: plan.configKey,
          userId: context.userId,
        },
      });
    }
  }
}

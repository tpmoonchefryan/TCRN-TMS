// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@tcrn/database';
import { ErrorCodes, LogSeverity, type RequestContext,TechEventType } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService, TechEventLogService } from '../../log';
import {
    AdapterListQueryDto,
    CreateAdapterDto,
    DisableAdapterDto,
    OwnerType,
    UpdateAdapterConfigsDto,
    UpdateAdapterDto
} from '../dto/integration.dto';
import { AdapterCryptoService } from './adapter-crypto.service';

// Config keys that should be encrypted
const SECRET_CONFIG_KEYS = [
  'client_secret',
  'access_token',
  'refresh_token',
  'api_key',
  'api_secret',
  'verify_token',
];

@Injectable()
export class AdapterService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cryptoService: AdapterCryptoService,
    private readonly changeLogService: ChangeLogService,
    private readonly techEventLog: TechEventLogService,
  ) {}

  /**
   * List adapters with inheritance support
   */
  async findMany(query: AdapterListQueryDto) {
    const prisma = this.databaseService.getPrisma();

    const where: Prisma.IntegrationAdapterWhereInput = {};

    if (query.platformId) {
      where.platformId = query.platformId;
    }

    if (query.adapterType) {
      where.adapterType = query.adapterType;
    }

    if (query.ownerOnly && query.scopeType && query.scopeId) {
      where.ownerType = query.scopeType;
      where.ownerId = query.scopeId;
    } else if (query.includeInherited && query.scopeType) {
      // Build inherited query based on scope hierarchy
      where.OR = this.buildInheritanceQuery(query.scopeType, query.scopeId);
    }

    if (!query.includeDisabled) {
      where.isActive = true;
    }

    const adapters = await prisma.integrationAdapter.findMany({
      where,
      include: {
        platform: true,
        adapterConfigs: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return adapters.map((adapter) => ({
      id: adapter.id,
      ownerType: adapter.ownerType,
      ownerId: adapter.ownerId,
      platformId: adapter.platformId,
      platform: {
        code: adapter.platform.code,
        displayName: adapter.platform.displayName,
        iconUrl: adapter.platform.iconUrl,
      },
      code: adapter.code,
      nameEn: adapter.nameEn,
      nameZh: adapter.nameZh,
      nameJa: adapter.nameJa,
      adapterType: adapter.adapterType,
      inherit: adapter.inherit,
      isActive: adapter.isActive,
      isInherited: query.scopeType && adapter.ownerType !== query.scopeType,
      configCount: adapter.adapterConfigs.length,
      createdAt: adapter.createdAt.toISOString(),
      updatedAt: adapter.updatedAt.toISOString(),
      version: adapter.version,
    }));
  }

  /**
   * Get adapter by ID
   */
  async findById(id: string) {
    const prisma = this.databaseService.getPrisma();

    const adapter = await prisma.integrationAdapter.findUnique({
      where: { id },
      include: {
        platform: true,
        adapterConfigs: true,
      },
    });

    if (!adapter) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Adapter not found',
      });
    }

    return {
      id: adapter.id,
      ownerType: adapter.ownerType,
      ownerId: adapter.ownerId,
      platform: {
        id: adapter.platform.id,
        code: adapter.platform.code,
        displayName: adapter.platform.displayName,
      },
      code: adapter.code,
      nameEn: adapter.nameEn,
      nameZh: adapter.nameZh,
      nameJa: adapter.nameJa,
      adapterType: adapter.adapterType,
      inherit: adapter.inherit,
      isActive: adapter.isActive,
      configs: adapter.adapterConfigs.map((c) => ({
        id: c.id,
        configKey: c.configKey,
        configValue: c.isSecret ? '******' : c.configValue,
        isSecret: c.isSecret,
      })),
      createdAt: adapter.createdAt.toISOString(),
      updatedAt: adapter.updatedAt.toISOString(),
      createdBy: adapter.createdBy,
      updatedBy: adapter.updatedBy,
      version: adapter.version,
    };
  }

  /**
   * Create adapter
   */
  async create(dto: CreateAdapterDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    // Check platform exists
    const platform = await prisma.socialPlatform.findUnique({
      where: { id: dto.platformId },
    });

    if (!platform) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Platform not found',
      });
    }

    // Check code uniqueness within owner scope
    const existing = await prisma.integrationAdapter.findFirst({
      where: {
        ownerType: dto.ownerType ?? OwnerType.TENANT,
        ownerId: dto.ownerId ?? null,
        code: dto.code,
      },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: `Adapter with code '${dto.code}' already exists`,
      });
    }

    // Check platform + type uniqueness
    const existingPlatform = await prisma.integrationAdapter.findFirst({
      where: {
        ownerType: dto.ownerType ?? OwnerType.TENANT,
        ownerId: dto.ownerId ?? null,
        platformId: dto.platformId,
        adapterType: dto.adapterType,
      },
    });

    if (existingPlatform) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: `Adapter for platform '${platform.code}' with type '${dto.adapterType}' already exists`,
      });
    }

    const adapter = await prisma.$transaction(async (tx) => {
      const newAdapter = await tx.integrationAdapter.create({
        data: {
          ownerType: dto.ownerType ?? OwnerType.TENANT,
          ownerId: dto.ownerId ?? null,
          platformId: dto.platformId,
          code: dto.code,
          nameEn: dto.nameEn,
          nameZh: dto.nameZh,
          nameJa: dto.nameJa,
          adapterType: dto.adapterType,
          inherit: dto.inherit ?? true,
          isActive: true,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          createdBy: context.userId!,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          updatedBy: context.userId!,
        },
      });

      // Create configs if provided
      if (dto.configs?.length) {
        for (const config of dto.configs) {
          const isSecret = SECRET_CONFIG_KEYS.includes(config.configKey);
          await tx.adapterConfig.create({
            data: {
              adapterId: newAdapter.id,
              configKey: config.configKey,
              configValue: isSecret
                ? this.cryptoService.encrypt(config.configValue)
                : config.configValue,
              isSecret,
            },
          });
        }
      }

      await this.changeLogService.create(tx, {
        action: 'create',
        objectType: 'integration_adapter',
        objectId: newAdapter.id,
        objectName: dto.code,
        newValue: { code: dto.code, adapterType: dto.adapterType },
      }, context);

      return newAdapter;
    });

    return this.findById(adapter.id);
  }

  /**
   * Update adapter
   */
  async update(id: string, dto: UpdateAdapterDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const adapter = await prisma.integrationAdapter.findUnique({
      where: { id },
    });

    if (!adapter) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Adapter not found',
      });
    }

    if (adapter.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.VERSION_CONFLICT,
        message: 'Adapter was modified by another user',
      });
    }

    const updateData: Record<string, unknown> = {};
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};

    if (dto.nameEn !== undefined) {
      updateData.nameEn = dto.nameEn;
      oldValue.nameEn = adapter.nameEn;
      newValue.nameEn = dto.nameEn;
    }
    if (dto.nameZh !== undefined) {
      updateData.nameZh = dto.nameZh;
    }
    if (dto.nameJa !== undefined) {
      updateData.nameJa = dto.nameJa;
    }
    if (dto.inherit !== undefined) {
      updateData.inherit = dto.inherit;
      oldValue.inherit = adapter.inherit;
      newValue.inherit = dto.inherit;
    }

    await prisma.$transaction(async (tx) => {
      await tx.integrationAdapter.update({
        where: { id },
        data: {
          ...updateData,
          updatedBy: context.userId,
          version: { increment: 1 },
        },
      });

      await this.changeLogService.create(tx, {
        action: 'update',
        objectType: 'integration_adapter',
        objectId: id,
        objectName: adapter.code,
        oldValue,
        newValue,
      }, context);
    });

    return this.findById(id);
  }

  /**
   * Update adapter configs
   */
  async updateConfigs(adapterId: string, dto: UpdateAdapterConfigsDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const adapter = await prisma.integrationAdapter.findUnique({
      where: { id: adapterId },
    });

    if (!adapter) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Adapter not found',
      });
    }

    if (adapter.version !== dto.adapterVersion) {
      throw new ConflictException({
        code: ErrorCodes.VERSION_CONFLICT,
        message: 'Adapter was modified by another user',
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const config of dto.configs) {
        const isSecret = SECRET_CONFIG_KEYS.includes(config.configKey);
        const value = isSecret
          ? this.cryptoService.encrypt(config.configValue)
          : config.configValue;

        await tx.adapterConfig.upsert({
          where: {
            adapterId_configKey: {
              adapterId,
              configKey: config.configKey,
            },
          },
          update: {
            configValue: value,
            isSecret,
          },
          create: {
            adapterId,
            configKey: config.configKey,
            configValue: value,
            isSecret,
          },
        });
      }

      await tx.integrationAdapter.update({
        where: { id: adapterId },
        data: {
          version: { increment: 1 },
          updatedBy: context.userId,
        },
      });

      await this.changeLogService.create(tx, {
        action: 'update',
        objectType: 'adapter_config',
        objectId: adapterId,
        objectName: adapter.code,
        newValue: { configKeys: dto.configs.map((c) => c.configKey) },
      }, context);
    });

    return { updatedCount: dto.configs.length, adapterVersion: adapter.version + 1 };
  }

  /**
   * Reveal secret config value
   */
  async revealConfig(adapterId: string, configKey: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const config = await prisma.adapterConfig.findUnique({
      where: {
        adapterId_configKey: { adapterId, configKey },
      },
    });

    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Config not found',
      });
    }

    if (!config.isSecret) {
      return {
        configKey,
        configValue: config.configValue,
        revealedAt: new Date().toISOString(),
      };
    }

    // Log security event
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

    const decrypted = this.cryptoService.decrypt(config.configValue);

    return {
      configKey,
      configValue: decrypted,
      revealedAt: new Date().toISOString(),
      expiresInSeconds: 30,
    };
  }

  /**
   * Deactivate adapter
   */
  async deactivate(id: string, context: RequestContext) {
    return this.setActiveStatus(id, false, context);
  }

  /**
   * Reactivate adapter
   */
  async reactivate(id: string, context: RequestContext) {
    return this.setActiveStatus(id, true, context);
  }

  private async setActiveStatus(id: string, isActive: boolean, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const adapter = await prisma.integrationAdapter.findUnique({
      where: { id },
    });

    if (!adapter) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Adapter not found',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.integrationAdapter.update({
        where: { id },
        data: {
          isActive,
          updatedBy: context.userId,
          version: { increment: 1 },
        },
      });

      await this.changeLogService.create(tx, {
        action: isActive ? 'reactivate' : 'deactivate',
        objectType: 'integration_adapter',
        objectId: id,
        objectName: adapter.code,
        oldValue: { isActive: adapter.isActive },
        newValue: { isActive },
      }, context);
    });

    return { id, isActive };
  }

  /**
   * Disable inherited adapter at a specific scope
   * Creates a ConfigOverride record to mark the adapter as disabled
   */
  async disableInherited(adapterId: string, dto: DisableAdapterDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const adapter = await prisma.integrationAdapter.findUnique({
      where: { id: adapterId },
    });

    if (!adapter) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Adapter not found',
      });
    }

    // Verify the adapter is inheritable (must be from a parent scope)
    if (adapter.ownerType === dto.scopeType && adapter.ownerId === dto.scopeId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Cannot disable an adapter owned by the same scope',
      });
    }

    // Check if already disabled
    const existing = await prisma.configOverride.findUnique({
      where: {
        entityType_entityId_ownerType_ownerId: {
          entityType: 'integration_adapter',
          entityId: adapterId,
          ownerType: dto.scopeType,
          ownerId: dto.scopeId,
        },
      },
    });

    if (existing?.isDisabled) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: 'Adapter is already disabled at this scope',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.configOverride.upsert({
        where: {
          entityType_entityId_ownerType_ownerId: {
            entityType: 'integration_adapter',
            entityId: adapterId,
            ownerType: dto.scopeType,
            ownerId: dto.scopeId,
          },
        },
        update: {
          isDisabled: true,
          updatedBy: context.userId,
        },
        create: {
          entityType: 'integration_adapter',
          entityId: adapterId,
          ownerType: dto.scopeType,
          ownerId: dto.scopeId,
          isDisabled: true,
          createdBy: context.userId,
          updatedBy: context.userId,
        },
      });

      await this.changeLogService.create(tx, {
        action: 'disable_inherited',
        objectType: 'integration_adapter',
        objectId: adapterId,
        objectName: adapter.code,
        newValue: { scopeType: dto.scopeType, scopeId: dto.scopeId, isDisabled: true },
      }, context);
    });

    return {
      id: adapterId,
      code: adapter.code,
      scopeType: dto.scopeType,
      scopeId: dto.scopeId,
      isDisabledHere: true,
    };
  }

  /**
   * Enable previously disabled inherited adapter
   * Removes or updates the ConfigOverride record
   */
  async enableInherited(adapterId: string, dto: DisableAdapterDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const adapter = await prisma.integrationAdapter.findUnique({
      where: { id: adapterId },
    });

    if (!adapter) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Adapter not found',
      });
    }

    const existing = await prisma.configOverride.findUnique({
      where: {
        entityType_entityId_ownerType_ownerId: {
          entityType: 'integration_adapter',
          entityId: adapterId,
          ownerType: dto.scopeType,
          ownerId: dto.scopeId,
        },
      },
    });

    if (!existing || !existing.isDisabled) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Adapter is not disabled at this scope',
      });
    }

    await prisma.$transaction(async (tx) => {
      // Delete the override record instead of updating
      await tx.configOverride.delete({
        where: {
          entityType_entityId_ownerType_ownerId: {
            entityType: 'integration_adapter',
            entityId: adapterId,
            ownerType: dto.scopeType,
            ownerId: dto.scopeId,
          },
        },
      });

      await this.changeLogService.create(tx, {
        action: 'enable_inherited',
        objectType: 'integration_adapter',
        objectId: adapterId,
        objectName: adapter.code,
        newValue: { scopeType: dto.scopeType, scopeId: dto.scopeId, isDisabled: false },
      }, context);
    });

    return {
      id: adapterId,
      code: adapter.code,
      scopeType: dto.scopeType,
      scopeId: dto.scopeId,
      isDisabledHere: false,
    };
  }

  private buildInheritanceQuery(
    scopeType: OwnerType,
    scopeId?: string,
  ): Prisma.IntegrationAdapterWhereInput[] {
    const conditions: Prisma.IntegrationAdapterWhereInput[] = [];

    // Always include tenant level
    conditions.push({ ownerType: OwnerType.TENANT, ownerId: null, inherit: true });

    if (scopeType === OwnerType.SUBSIDIARY && scopeId) {
      conditions.push({ ownerType: OwnerType.SUBSIDIARY, ownerId: scopeId });
    }

    if (scopeType === OwnerType.TALENT && scopeId) {
      conditions.push({ ownerType: OwnerType.TALENT, ownerId: scopeId });
    }

    return conditions;
  }
}

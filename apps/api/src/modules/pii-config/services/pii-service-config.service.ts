// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@tcrn/database';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import { PiiClientService } from '../../pii';
import {
  CreatePiiServiceConfigDto,
  UpdatePiiServiceConfigDto,
  PaginationQueryDto,
} from '../dto/pii-config.dto';

@Injectable()
export class PiiServiceConfigService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
    private readonly piiClientService: PiiClientService,
  ) {}

  /**
   * Get all PII service configs
   */
  async findMany(query: PaginationQueryDto) {
    const prisma = this.databaseService.getPrisma();
    const { page = 1, pageSize = 20, includeInactive = false } = query;
    const pagination = this.databaseService.buildPagination(page, pageSize);

    const where: Prisma.PiiServiceConfigWhereInput = includeInactive
      ? {}
      : { isActive: true };

    const [items, total] = await Promise.all([
      prisma.piiServiceConfig.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          _count: {
            select: { profileStores: true },
          },
        },
      }),
      prisma.piiServiceConfig.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.nameEn,
        nameZh: item.nameZh,
        nameJa: item.nameJa,
        apiUrl: item.apiUrl,
        authType: item.authType,
        isHealthy: item.isHealthy,
        lastHealthCheckAt: item.lastHealthCheckAt,
        isActive: item.isActive,
        profileStoreCount: item._count.profileStores,
        createdAt: item.createdAt,
        version: item.version,
      })),
      meta: {
        pagination: this.databaseService.calculatePaginationMeta(total, page, pageSize),
      },
    };
  }

  /**
   * Get PII service config by ID
   */
  async findById(id: string) {
    const prisma = this.databaseService.getPrisma();

    const config = await prisma.piiServiceConfig.findUnique({
      where: { id },
      include: {
        _count: {
          select: { profileStores: true },
        },
      },
    });

    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'PII service config not found',
      });
    }

    return {
      id: config.id,
      code: config.code,
      name: config.nameEn,
      nameZh: config.nameZh,
      nameJa: config.nameJa,
      description: config.descriptionEn,
      descriptionZh: config.descriptionZh,
      descriptionJa: config.descriptionJa,
      apiUrl: config.apiUrl,
      authType: config.authType,
      healthCheckUrl: config.healthCheckUrl,
      healthCheckIntervalSec: config.healthCheckIntervalSec,
      isHealthy: config.isHealthy,
      lastHealthCheckAt: config.lastHealthCheckAt,
      isActive: config.isActive,
      profileStoreCount: config._count.profileStores,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      version: config.version,
    };
  }

  /**
   * Create PII service config
   */
  async create(dto: CreatePiiServiceConfigDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    // Check for duplicate code
    const existing = await prisma.piiServiceConfig.findFirst({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: 'PII service config with this code already exists',
      });
    }

    // Create config
    const config = await prisma.$transaction(async (tx) => {
      const newConfig = await tx.piiServiceConfig.create({
        data: {
          code: dto.code,
          nameEn: dto.nameEn,
          nameZh: dto.nameZh,
          nameJa: dto.nameJa,
          descriptionEn: dto.descriptionEn,
          descriptionZh: dto.descriptionZh,
          descriptionJa: dto.descriptionJa,
          apiUrl: dto.apiUrl,
          authType: dto.authType,
          // Note: In production, mTLS certs and API keys should be encrypted with KEK
          healthCheckUrl: dto.healthCheckUrl || `${dto.apiUrl}/health`,
          healthCheckIntervalSec: dto.healthCheckIntervalSec || 60,
          createdBy: context.userId,
          updatedBy: context.userId,
        },
      });

      // Record change log
      await this.changeLogService.create(tx, {
        action: 'create',
        objectType: 'pii_service_config',
        objectId: newConfig.id,
        objectName: dto.code,
        newValue: {
          code: dto.code,
          nameEn: dto.nameEn,
          apiUrl: dto.apiUrl,
          authType: dto.authType,
        },
      }, context);

      return newConfig;
    });

    return {
      id: config.id,
      code: config.code,
      name: config.nameEn,
      createdAt: config.createdAt,
    };
  }

  /**
   * Update PII service config
   */
  async update(id: string, dto: UpdatePiiServiceConfigDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    // Get existing config
    const existing = await prisma.piiServiceConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'PII service config not found',
      });
    }

    // Check version
    if (existing.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user',
      });
    }

    // Build update data
    const updateData: Prisma.PiiServiceConfigUpdateInput = {
      updatedBy: context.userId,
      version: { increment: 1 },
    };

    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.nameZh !== undefined) updateData.nameZh = dto.nameZh;
    if (dto.nameJa !== undefined) updateData.nameJa = dto.nameJa;
    if (dto.descriptionEn !== undefined) updateData.descriptionEn = dto.descriptionEn;
    if (dto.descriptionZh !== undefined) updateData.descriptionZh = dto.descriptionZh;
    if (dto.descriptionJa !== undefined) updateData.descriptionJa = dto.descriptionJa;
    if (dto.apiUrl !== undefined) updateData.apiUrl = dto.apiUrl;
    if (dto.authType !== undefined) updateData.authType = dto.authType;
    if (dto.healthCheckUrl !== undefined) updateData.healthCheckUrl = dto.healthCheckUrl;
    if (dto.healthCheckIntervalSec !== undefined) updateData.healthCheckIntervalSec = dto.healthCheckIntervalSec;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Update
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.piiServiceConfig.update({
        where: { id },
        data: updateData,
      });

      // Record change log
      await this.changeLogService.create(tx, {
        action: 'update',
        objectType: 'pii_service_config',
        objectId: id,
        objectName: result.code,
        oldValue: {
          nameEn: existing.nameEn,
          apiUrl: existing.apiUrl,
          isActive: existing.isActive,
        },
        newValue: {
          nameEn: result.nameEn,
          apiUrl: result.apiUrl,
          isActive: result.isActive,
        },
      }, context);

      return result;
    });

    return {
      id: updated.id,
      code: updated.code,
      version: updated.version,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Test PII service connection
   */
  async testConnection(id: string) {
    const prisma = this.databaseService.getPrisma();

    const config = await prisma.piiServiceConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'PII service config not found',
      });
    }

    // Test health endpoint
    const healthUrl = config.healthCheckUrl || `${config.apiUrl}/health`;
    const result = await this.piiClientService.checkHealth(healthUrl.replace('/health', ''));

    // Update health status
    await prisma.piiServiceConfig.update({
      where: { id },
      data: {
        isHealthy: result.status === 'ok',
        lastHealthCheckAt: new Date(),
      },
    });

    return {
      status: result.status,
      latencyMs: result.latencyMs,
      testedAt: new Date(),
    };
  }
}

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@tcrn/database';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import {
  CreateProfileStoreDto,
  UpdateProfileStoreDto,
  PaginationQueryDto,
} from '../dto/pii-config.dto';

@Injectable()
export class ProfileStoreService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
  ) {}

  /**
   * Get all profile stores (multi-tenant aware)
   */
  async findMany(query: PaginationQueryDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;
    const { page = 1, pageSize = 20, includeInactive = false } = query;
    const pagination = this.databaseService.buildPagination(page, pageSize);

    const where: Prisma.ProfileStoreWhereInput = includeInactive
      ? {}
      : { isActive: true };

    const [items, total] = await Promise.all([
      prisma.profileStore.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
        include: {
          piiServiceConfig: {
            select: {
              id: true,
              code: true,
              nameEn: true,
              isHealthy: true,
            },
          },
          _count: {
            select: {
              customerProfiles: true,
            },
          },
        },
      }),
      prisma.profileStore.count({ where }),
    ]);

    // Count talents per store using raw SQL for multi-tenant support
    const talentCounts: number[] = [];
    for (const item of items) {
      const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count FROM "${schema}".talent WHERE profile_store_id = $1::uuid
      `, item.id);
      talentCounts.push(Number(result[0]?.count || 0));
    }

    return {
      items: items.map((item, index) => ({
        id: item.id,
        code: item.code,
        name: item.nameEn,
        nameZh: item.nameZh,
        nameJa: item.nameJa,
        piiServiceConfig: item.piiServiceConfig ? {
          id: item.piiServiceConfig.id,
          code: item.piiServiceConfig.code,
          name: item.piiServiceConfig.nameEn,
          isHealthy: item.piiServiceConfig.isHealthy,
        } : null,
        talentCount: talentCounts[index],
        customerCount: item._count.customerProfiles,
        isDefault: item.isDefault,
        isActive: item.isActive,
        createdAt: item.createdAt,
        version: item.version,
      })),
      meta: {
        pagination: this.databaseService.calculatePaginationMeta(total, page, pageSize),
      },
    };
  }

  /**
   * Get profile store by ID (multi-tenant aware)
   */
  async findById(id: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    const store = await prisma.profileStore.findUnique({
      where: { id },
      include: {
        piiServiceConfig: {
          select: {
            id: true,
            code: true,
            nameEn: true,
            apiUrl: true,
            isHealthy: true,
          },
        },
        _count: {
          select: {
            customerProfiles: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Profile store not found',
      });
    }

    // Count talents using raw SQL for multi-tenant support
    const talentCountResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${schema}".talent WHERE profile_store_id = $1::uuid
    `, id);
    const talentCount = Number(talentCountResult[0]?.count || 0);

    return {
      id: store.id,
      code: store.code,
      name: store.nameEn,
      nameZh: store.nameZh,
      nameJa: store.nameJa,
      description: store.descriptionEn,
      descriptionZh: store.descriptionZh,
      descriptionJa: store.descriptionJa,
      piiServiceConfig: store.piiServiceConfig ? {
        id: store.piiServiceConfig.id,
        code: store.piiServiceConfig.code,
        name: store.piiServiceConfig.nameEn,
        apiUrl: store.piiServiceConfig.apiUrl,
        isHealthy: store.piiServiceConfig.isHealthy,
      } : null,
      talentCount,
      customerCount: store._count.customerProfiles,
      isDefault: store.isDefault,
      isActive: store.isActive,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      version: store.version,
    };
  }

  /**
   * Create profile store
   */
  async create(dto: CreateProfileStoreDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    // Check for duplicate code
    const existing = await prisma.profileStore.findFirst({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: 'Profile store with this code already exists',
      });
    }

    // Get PII service config
    const piiConfig = await prisma.piiServiceConfig.findFirst({
      where: { code: dto.piiServiceConfigCode, isActive: true },
    });

    if (!piiConfig) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'PII service config not found',
      });
    }

    // Create store
    const store = await prisma.$transaction(async (tx) => {
      // If setting as default, unset other defaults
      if (dto.isDefault) {
        await tx.profileStore.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const newStore = await tx.profileStore.create({
        data: {
          code: dto.code,
          nameEn: dto.nameEn,
          nameZh: dto.nameZh,
          nameJa: dto.nameJa,
          descriptionEn: dto.descriptionEn,
          descriptionZh: dto.descriptionZh,
          descriptionJa: dto.descriptionJa,
          piiServiceConfigId: piiConfig.id,
          isDefault: dto.isDefault ?? false,
          createdBy: context.userId,
          updatedBy: context.userId,
        },
      });

      // Record change log
      await this.changeLogService.create(tx, {
        action: 'create',
        objectType: 'profile_store',
        objectId: newStore.id,
        objectName: dto.code,
        newValue: {
          code: dto.code,
          nameEn: dto.nameEn,
          piiServiceConfigCode: dto.piiServiceConfigCode,
          isDefault: dto.isDefault,
        },
      }, context);

      return newStore;
    });

    return {
      id: store.id,
      code: store.code,
      name: store.nameEn,
      isDefault: store.isDefault,
      createdAt: store.createdAt,
    };
  }

  /**
   * Update profile store (multi-tenant aware)
   */
  async update(id: string, dto: UpdateProfileStoreDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Get existing store
    const existing = await prisma.profileStore.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Profile store not found',
      });
    }

    // Check version
    if (existing.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user',
      });
    }

    // Get PII service config if changing
    let piiServiceConfigId = existing.piiServiceConfigId;
    if (dto.piiServiceConfigCode) {
      const piiConfig = await prisma.piiServiceConfig.findFirst({
        where: { code: dto.piiServiceConfigCode, isActive: true },
      });

      if (!piiConfig) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'PII service config not found',
        });
      }

      piiServiceConfigId = piiConfig.id;
    }

    // Check if trying to deactivate a store with customers using raw SQL
    if (dto.isActive === false) {
      const customerCountResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count FROM "${schema}".customer_profile WHERE profile_store_id = $1::uuid
      `, id);
      const customerCount = Number(customerCountResult[0]?.count || 0);

      if (customerCount > 0) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `Cannot deactivate profile store with ${customerCount} customers`,
        });
      }
    }

    // Build update data
    const updateData: Prisma.ProfileStoreUpdateInput = {
      updatedBy: context.userId,
      version: { increment: 1 },
    };

    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.nameZh !== undefined) updateData.nameZh = dto.nameZh;
    if (dto.nameJa !== undefined) updateData.nameJa = dto.nameJa;
    if (dto.descriptionEn !== undefined) updateData.descriptionEn = dto.descriptionEn;
    if (dto.descriptionZh !== undefined) updateData.descriptionZh = dto.descriptionZh;
    if (dto.descriptionJa !== undefined) updateData.descriptionJa = dto.descriptionJa;
    if (piiServiceConfigId !== existing.piiServiceConfigId) {
      updateData.piiServiceConfig = { connect: { id: piiServiceConfigId } };
    }
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Update
    const updated = await prisma.$transaction(async (tx) => {
      // Handle default flag
      if (dto.isDefault === true && !existing.isDefault) {
        await tx.profileStore.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
        updateData.isDefault = true;
      } else if (dto.isDefault === false && existing.isDefault) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Cannot unset default flag. Set another store as default first.',
        });
      }

      const result = await tx.profileStore.update({
        where: { id },
        data: updateData,
      });

      // Record change log
      await this.changeLogService.create(tx, {
        action: 'update',
        objectType: 'profile_store',
        objectId: id,
        objectName: result.code,
        oldValue: {
          nameEn: existing.nameEn,
          piiServiceConfigId: existing.piiServiceConfigId,
          isActive: existing.isActive,
          isDefault: existing.isDefault,
        },
        newValue: {
          nameEn: result.nameEn,
          piiServiceConfigId: result.piiServiceConfigId,
          isActive: result.isActive,
          isDefault: result.isDefault,
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
}

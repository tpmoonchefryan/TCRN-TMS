// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { prisma, setTenantSchema } from '@tcrn/database';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import {
    CreateProfileStoreDto,
    PaginationQueryDto,
    UpdateProfileStoreDto,
} from '../dto/pii-config.dto';

@Injectable()
export class ProfileStoreService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
  ) {}

  /**
   * Get all profile stores (multi-tenant aware - using raw SQL for proper schema support)
   */
  async findMany(query: PaginationQueryDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;
    const { page = 1, pageSize = 20, includeInactive = false } = query;
    const offset = (page - 1) * pageSize;

    // Build WHERE clause
    const whereClause = includeInactive ? '1=1' : 'ps.is_active = true';

    // Query profile stores with PII service config using raw SQL
    const items = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
      nameZh: string | null;
      nameJa: string | null;
      piiServiceConfigId: string | null;
      piiConfigCode: string | null;
      piiConfigNameEn: string | null;
      piiConfigIsHealthy: boolean | null;
      isDefault: boolean;
      isActive: boolean;
      createdAt: Date;
      version: number;
    }>>(`
      SELECT 
        ps.id, ps.code, 
        ps.name_en as "nameEn", 
        ps.name_zh as "nameZh", 
        ps.name_ja as "nameJa",
        ps.pii_service_config_id as "piiServiceConfigId",
        psc.code as "piiConfigCode",
        psc.name_en as "piiConfigNameEn",
        psc.is_healthy as "piiConfigIsHealthy",
        ps.is_default as "isDefault",
        ps.is_active as "isActive",
        ps.created_at as "createdAt",
        ps.version
      FROM "${schema}".profile_store ps
      LEFT JOIN "${schema}".pii_service_config psc ON psc.id = ps.pii_service_config_id
      WHERE ${whereClause}
      ORDER BY ps.is_default DESC, ps.created_at DESC
      LIMIT $1 OFFSET $2
    `, pageSize, offset);

    // Get total count
    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${schema}".profile_store ps WHERE ${whereClause}
    `);
    const total = Number(totalResult[0]?.count || 0);

    // Count talents and customers per store
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const [talentCountResult, customerCountResult] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
          SELECT COUNT(*) as count FROM "${schema}".talent WHERE profile_store_id = $1::uuid
        `, item.id),
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
          SELECT COUNT(*) as count FROM "${schema}".customer_profile WHERE profile_store_id = $1::uuid
        `, item.id),
      ]);

      return {
        id: item.id,
        code: item.code,
        name: item.nameEn,
        nameZh: item.nameZh,
        nameJa: item.nameJa,
        piiServiceConfig: item.piiServiceConfigId ? {
          id: item.piiServiceConfigId,
          code: item.piiConfigCode,
          name: item.piiConfigNameEn,
          isHealthy: item.piiConfigIsHealthy ?? false,
        } : null,
        talentCount: Number(talentCountResult[0]?.count || 0),
        customerCount: Number(customerCountResult[0]?.count || 0),
        isDefault: item.isDefault,
        isActive: item.isActive,
        createdAt: item.createdAt,
        version: item.version,
      };
    }));

    return {
      items: enrichedItems,
      meta: {
        pagination: this.databaseService.calculatePaginationMeta(total, page, pageSize),
      },
    };
  }

  /**
   * Get profile store by ID (multi-tenant aware - using raw SQL for proper schema support)
   */
  async findById(id: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Query profile store with PII service config using raw SQL
    const results = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
      nameZh: string | null;
      nameJa: string | null;
      descriptionEn: string | null;
      descriptionZh: string | null;
      descriptionJa: string | null;
      piiServiceConfigId: string | null;
      piiConfigCode: string | null;
      piiConfigNameEn: string | null;
      piiConfigApiUrl: string | null;
      piiConfigIsHealthy: boolean | null;
      isDefault: boolean;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    }>>(`
      SELECT 
        ps.id, ps.code, 
        ps.name_en as "nameEn", 
        ps.name_zh as "nameZh", 
        ps.name_ja as "nameJa",
        ps.description_en as "descriptionEn",
        ps.description_zh as "descriptionZh",
        ps.description_ja as "descriptionJa",
        ps.pii_service_config_id as "piiServiceConfigId",
        psc.code as "piiConfigCode",
        psc.name_en as "piiConfigNameEn",
        psc.api_url as "piiConfigApiUrl",
        psc.is_healthy as "piiConfigIsHealthy",
        ps.is_default as "isDefault",
        ps.is_active as "isActive",
        ps.created_at as "createdAt",
        ps.updated_at as "updatedAt",
        ps.version
      FROM "${schema}".profile_store ps
      LEFT JOIN "${schema}".pii_service_config psc ON psc.id = ps.pii_service_config_id
      WHERE ps.id = $1::uuid
    `, id);

    const store = results[0];
    if (!store) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Profile store not found',
      });
    }

    // Count talents and customers using raw SQL
    const [talentCountResult, customerCountResult] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count FROM "${schema}".talent WHERE profile_store_id = $1::uuid
      `, id),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count FROM "${schema}".customer_profile WHERE profile_store_id = $1::uuid
      `, id),
    ]);

    return {
      id: store.id,
      code: store.code,
      name: store.nameEn,
      nameZh: store.nameZh,
      nameJa: store.nameJa,
      description: store.descriptionEn,
      descriptionZh: store.descriptionZh,
      descriptionJa: store.descriptionJa,
      piiServiceConfig: store.piiServiceConfigId ? {
        id: store.piiServiceConfigId,
        code: store.piiConfigCode,
        name: store.piiConfigNameEn,
        apiUrl: store.piiConfigApiUrl,
        isHealthy: store.piiConfigIsHealthy ?? false,
      } : null,
      talentCount: Number(talentCountResult[0]?.count || 0),
      customerCount: Number(customerCountResult[0]?.count || 0),
      isDefault: store.isDefault,
      isActive: store.isActive,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      version: store.version,
    };
  }

  /**
   * Create profile store (multi-tenant aware - using raw SQL for proper schema support)
   */
  async create(dto: CreateProfileStoreDto, context: RequestContext) {
    const schema = context.tenantSchema;

    // Check for duplicate code using raw SQL
    const existingResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${schema}".profile_store WHERE code = $1
    `, dto.code);

    if (existingResult.length > 0) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: 'Profile store with this code already exists',
      });
    }

    // Get PII service config using raw SQL (optional - can be null for local-only stores)
    let piiConfigId: string | null = null;
    if (dto.piiServiceConfigCode) {
      const piiConfigResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${schema}".pii_service_config WHERE code = $1 AND is_active = true
      `, dto.piiServiceConfigCode);

      // If user provided a code, it must exist
      if (piiConfigResult.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'PII service config not found',
        });
      }
      piiConfigId = piiConfigResult[0].id;
    }
    // If piiServiceConfigCode not provided, piiConfigId remains null (local-only mode)

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await prisma.$executeRawUnsafe(`
        UPDATE "${schema}".profile_store SET is_default = false WHERE is_default = true
      `);
    }

    // Create store using raw SQL
    const createResult = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
      isDefault: boolean;
      createdAt: Date;
    }>>(`
      INSERT INTO "${schema}".profile_store 
        (id, code, name_en, name_zh, name_ja, description_en, description_zh, description_ja, 
         pii_service_config_id, is_default, is_active, sort_order, created_at, updated_at, created_by, updated_by, version)
      VALUES 
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8::uuid, $9, true, 0, now(), now(), $10::uuid, $10::uuid, 1)
      RETURNING id, code, name_en as "nameEn", is_default as "isDefault", created_at as "createdAt"
    `,
      dto.code,
      dto.nameEn,
      dto.nameZh || null,
      dto.nameJa || null,
      dto.descriptionEn || null,
      dto.descriptionZh || null,
      dto.descriptionJa || null,
      piiConfigId,
      dto.isDefault ?? false,
      context.userId
    );

    const store = createResult[0];

    // Record change log (set schema first for the log service)
    await setTenantSchema(schema);
    await this.changeLogService.create(prisma, {
      action: 'create',
      objectType: 'profile_store',
      objectId: store.id,
      objectName: dto.code,
      newValue: {
        code: dto.code,
        nameEn: dto.nameEn,
        piiServiceConfigCode: dto.piiServiceConfigCode,
        isDefault: dto.isDefault,
      },
    }, context);

    return {
      id: store.id,
      code: store.code,
      name: store.nameEn,
      isDefault: store.isDefault,
      createdAt: store.createdAt,
    };
  }

  /**
   * Update profile store (multi-tenant aware - using raw SQL for proper schema support)
   */
  async update(id: string, dto: UpdateProfileStoreDto, context: RequestContext) {
    const schema = context.tenantSchema;

    // Get existing store using raw SQL
    const existingResult = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
      piiServiceConfigId: string | null;
      isActive: boolean;
      isDefault: boolean;
      version: number;
    }>>(`
      SELECT id, code, name_en as "nameEn", pii_service_config_id as "piiServiceConfigId", 
             is_active as "isActive", is_default as "isDefault", version
      FROM "${schema}".profile_store WHERE id = $1::uuid
    `, id);

    const existing = existingResult[0];
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
      const piiConfigResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${schema}".pii_service_config WHERE code = $1 AND is_active = true
      `, dto.piiServiceConfigCode);

      if (piiConfigResult.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'PII service config not found',
        });
      }

      piiServiceConfigId = piiConfigResult[0].id;
    }

    // Check if trying to deactivate a store with customers
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

    // Handle default flag
    if (dto.isDefault === false && existing.isDefault) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Cannot unset default flag. Set another store as default first.',
      });
    }

    // If setting as new default, unset other defaults
    if (dto.isDefault === true && !existing.isDefault) {
      await prisma.$executeRawUnsafe(`
        UPDATE "${schema}".profile_store SET is_default = false WHERE is_default = true
      `);
    }

    // Build UPDATE query
    const updates: string[] = ['updated_at = now()', 'updated_by = $2::uuid', 'version = version + 1'];
    const params: unknown[] = [id, context.userId];
    let paramIndex = 3;

    if (dto.nameEn !== undefined) {
      updates.push(`name_en = $${paramIndex}`);
      params.push(dto.nameEn);
      paramIndex++;
    }
    if (dto.nameZh !== undefined) {
      updates.push(`name_zh = $${paramIndex}`);
      params.push(dto.nameZh);
      paramIndex++;
    }
    if (dto.nameJa !== undefined) {
      updates.push(`name_ja = $${paramIndex}`);
      params.push(dto.nameJa);
      paramIndex++;
    }
    if (dto.descriptionEn !== undefined) {
      updates.push(`description_en = $${paramIndex}`);
      params.push(dto.descriptionEn);
      paramIndex++;
    }
    if (dto.descriptionZh !== undefined) {
      updates.push(`description_zh = $${paramIndex}`);
      params.push(dto.descriptionZh);
      paramIndex++;
    }
    if (dto.descriptionJa !== undefined) {
      updates.push(`description_ja = $${paramIndex}`);
      params.push(dto.descriptionJa);
      paramIndex++;
    }
    if (piiServiceConfigId !== existing.piiServiceConfigId) {
      updates.push(`pii_service_config_id = $${paramIndex}::uuid`);
      params.push(piiServiceConfigId);
      paramIndex++;
    }
    if (dto.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(dto.isActive);
      paramIndex++;
    }
    if (dto.isDefault === true) {
      updates.push(`is_default = true`);
    }

    // Execute update
    const updateResult = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
      piiServiceConfigId: string | null;
      isActive: boolean;
      isDefault: boolean;
      version: number;
      updatedAt: Date;
    }>>(`
      UPDATE "${schema}".profile_store
      SET ${updates.join(', ')}
      WHERE id = $1::uuid
      RETURNING id, code, name_en as "nameEn", pii_service_config_id as "piiServiceConfigId",
                is_active as "isActive", is_default as "isDefault", version, updated_at as "updatedAt"
    `, ...params);

    const updated = updateResult[0];

    // Record change log
    await setTenantSchema(schema);
    await this.changeLogService.create(prisma, {
      action: 'update',
      objectType: 'profile_store',
      objectId: id,
      objectName: updated.code,
      oldValue: {
        nameEn: existing.nameEn,
        piiServiceConfigId: existing.piiServiceConfigId,
        isActive: existing.isActive,
        isDefault: existing.isDefault,
      },
      newValue: {
        nameEn: updated.nameEn,
        piiServiceConfigId: updated.piiServiceConfigId,
        isActive: updated.isActive,
        isDefault: updated.isDefault,
      },
    }, context);

    return {
      id: updated.id,
      code: updated.code,
      version: updated.version,
      updatedAt: updated.updatedAt,
    };
  }
}

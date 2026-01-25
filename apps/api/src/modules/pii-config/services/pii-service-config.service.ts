// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { prisma, setTenantSchema } from '@tcrn/database';
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
   * Get all PII service configs (multi-tenant aware - using raw SQL for proper schema support)
   */
  async findMany(query: PaginationQueryDto, context: RequestContext) {
    const schema = context.tenantSchema;
    const { page = 1, pageSize = 20, includeInactive = false } = query;
    const offset = (page - 1) * pageSize;

    // Build WHERE clause
    const whereClause = includeInactive ? '1=1' : 'psc.is_active = true';

    // Query PII service configs using raw SQL
    const items = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
      nameZh: string | null;
      nameJa: string | null;
      apiUrl: string;
      authType: string;
      isHealthy: boolean;
      lastHealthCheckAt: Date | null;
      isActive: boolean;
      createdAt: Date;
      version: number;
    }>>(`
      SELECT 
        psc.id, psc.code, 
        psc.name_en as "nameEn", 
        psc.name_zh as "nameZh", 
        psc.name_ja as "nameJa",
        psc.api_url as "apiUrl",
        psc.auth_type as "authType",
        psc.is_healthy as "isHealthy",
        psc.last_health_check_at as "lastHealthCheckAt",
        psc.is_active as "isActive",
        psc.created_at as "createdAt",
        psc.version
      FROM "${schema}".pii_service_config psc
      WHERE ${whereClause}
      ORDER BY psc.created_at DESC
      LIMIT $1 OFFSET $2
    `, pageSize, offset);

    // Get total count
    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${schema}".pii_service_config psc WHERE ${whereClause}
    `);
    const total = Number(totalResult[0]?.count || 0);

    // Count profile stores per config
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count FROM "${schema}".profile_store WHERE pii_service_config_id = $1::uuid
      `, item.id);

      return {
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
        profileStoreCount: Number(countResult[0]?.count || 0),
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
   * Get PII service config by ID (multi-tenant aware - using raw SQL for proper schema support)
   */
  async findById(id: string, context: RequestContext) {
    const schema = context.tenantSchema;

    // Query PII service config using raw SQL
    const results = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
      nameZh: string | null;
      nameJa: string | null;
      descriptionEn: string | null;
      descriptionZh: string | null;
      descriptionJa: string | null;
      apiUrl: string;
      authType: string;
      healthCheckUrl: string | null;
      healthCheckIntervalSec: number;
      isHealthy: boolean;
      lastHealthCheckAt: Date | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    }>>(`
      SELECT 
        id, code, 
        name_en as "nameEn", 
        name_zh as "nameZh", 
        name_ja as "nameJa",
        description_en as "descriptionEn",
        description_zh as "descriptionZh",
        description_ja as "descriptionJa",
        api_url as "apiUrl",
        auth_type as "authType",
        health_check_url as "healthCheckUrl",
        health_check_interval_sec as "healthCheckIntervalSec",
        is_healthy as "isHealthy",
        last_health_check_at as "lastHealthCheckAt",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt",
        version
      FROM "${schema}".pii_service_config
      WHERE id = $1::uuid
    `, id);

    const config = results[0];
    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'PII service config not found',
      });
    }

    // Count profile stores
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${schema}".profile_store WHERE pii_service_config_id = $1::uuid
    `, id);

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
      profileStoreCount: Number(countResult[0]?.count || 0),
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      version: config.version,
    };
  }

  /**
   * Create PII service config (multi-tenant aware - using raw SQL for proper schema support)
   */
  async create(dto: CreatePiiServiceConfigDto, context: RequestContext) {
    const schema = context.tenantSchema;

    // Check for duplicate code using raw SQL
    const existingResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${schema}".pii_service_config WHERE code = $1
    `, dto.code);

    if (existingResult.length > 0) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: 'PII service config with this code already exists',
      });
    }

    // Create config using raw SQL
    const healthCheckUrl = dto.healthCheckUrl || `${dto.apiUrl}/health`;
    const healthCheckIntervalSec = dto.healthCheckIntervalSec || 60;

    const createResult = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
      createdAt: Date;
    }>>(`
      INSERT INTO "${schema}".pii_service_config 
        (id, code, name_en, name_zh, name_ja, description_en, description_zh, description_ja, 
         api_url, auth_type, health_check_url, health_check_interval_sec, 
         is_healthy, is_active, created_at, updated_at, created_by, updated_by, version)
      VALUES 
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
         false, true, now(), now(), $12::uuid, $12::uuid, 1)
      RETURNING id, code, name_en as "nameEn", created_at as "createdAt"
    `,
      dto.code,
      dto.nameEn,
      dto.nameZh || null,
      dto.nameJa || null,
      dto.descriptionEn || null,
      dto.descriptionZh || null,
      dto.descriptionJa || null,
      dto.apiUrl,
      dto.authType,
      healthCheckUrl,
      healthCheckIntervalSec,
      context.userId
    );

    const config = createResult[0];

    // Record change log
    await setTenantSchema(schema);
    await this.changeLogService.create(prisma, {
      action: 'create',
      objectType: 'pii_service_config',
      objectId: config.id,
      objectName: dto.code,
      newValue: {
        code: dto.code,
        nameEn: dto.nameEn,
        apiUrl: dto.apiUrl,
        authType: dto.authType,
      },
    }, context);

    return {
      id: config.id,
      code: config.code,
      name: config.nameEn,
      createdAt: config.createdAt,
    };
  }

  /**
   * Update PII service config (multi-tenant aware - using raw SQL for proper schema support)
   */
  async update(id: string, dto: UpdatePiiServiceConfigDto, context: RequestContext) {
    const schema = context.tenantSchema;

    // Get existing config using raw SQL
    const existingResult = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
      apiUrl: string;
      isActive: boolean;
      version: number;
    }>>(`
      SELECT id, code, name_en as "nameEn", api_url as "apiUrl", is_active as "isActive", version
      FROM "${schema}".pii_service_config WHERE id = $1::uuid
    `, id);

    const existing = existingResult[0];
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
    if (dto.apiUrl !== undefined) {
      updates.push(`api_url = $${paramIndex}`);
      params.push(dto.apiUrl);
      paramIndex++;
    }
    if (dto.authType !== undefined) {
      updates.push(`auth_type = $${paramIndex}`);
      params.push(dto.authType);
      paramIndex++;
    }
    if (dto.healthCheckUrl !== undefined) {
      updates.push(`health_check_url = $${paramIndex}`);
      params.push(dto.healthCheckUrl);
      paramIndex++;
    }
    if (dto.healthCheckIntervalSec !== undefined) {
      updates.push(`health_check_interval_sec = $${paramIndex}`);
      params.push(dto.healthCheckIntervalSec);
      paramIndex++;
    }
    if (dto.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(dto.isActive);
      paramIndex++;
    }

    // Execute update
    const updateResult = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
      apiUrl: string;
      isActive: boolean;
      version: number;
      updatedAt: Date;
    }>>(`
      UPDATE "${schema}".pii_service_config
      SET ${updates.join(', ')}
      WHERE id = $1::uuid
      RETURNING id, code, name_en as "nameEn", api_url as "apiUrl", is_active as "isActive", version, updated_at as "updatedAt"
    `, ...params);

    const updated = updateResult[0];

    // Record change log
    await setTenantSchema(schema);
    await this.changeLogService.create(prisma, {
      action: 'update',
      objectType: 'pii_service_config',
      objectId: id,
      objectName: updated.code,
      oldValue: {
        nameEn: existing.nameEn,
        apiUrl: existing.apiUrl,
        isActive: existing.isActive,
      },
      newValue: {
        nameEn: updated.nameEn,
        apiUrl: updated.apiUrl,
        isActive: updated.isActive,
      },
    }, context);

    return {
      id: updated.id,
      code: updated.code,
      version: updated.version,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Test PII service connection (multi-tenant aware)
   */
  async testConnection(id: string, context: RequestContext) {
    const schema = context.tenantSchema;

    // Get config using raw SQL
    const configResult = await prisma.$queryRawUnsafe<Array<{
      id: string;
      apiUrl: string;
      healthCheckUrl: string | null;
    }>>(`
      SELECT id, api_url as "apiUrl", health_check_url as "healthCheckUrl"
      FROM "${schema}".pii_service_config WHERE id = $1::uuid
    `, id);

    const config = configResult[0];
    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'PII service config not found',
      });
    }

    // Test health endpoint
    const healthUrl = config.healthCheckUrl || `${config.apiUrl}/health`;
    const result = await this.piiClientService.checkHealth(healthUrl.replace('/health', ''));

    // Update health status using raw SQL
    await prisma.$executeRawUnsafe(`
      UPDATE "${schema}".pii_service_config
      SET is_healthy = $2, last_health_check_at = now()
      WHERE id = $1::uuid
    `, id, result.status === 'ok');

    return {
      status: result.status,
      latencyMs: result.latencyMs,
      testedAt: new Date(),
    };
  }
}

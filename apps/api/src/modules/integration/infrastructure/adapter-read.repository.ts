// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  IntegrationAdapterConfigRow,
  IntegrationAdapterDetailRow,
  IntegrationAdapterListRow,
  IntegrationAdapterOwnerScope,
} from '../domain/adapter-read.policy';
import { type AdapterListQueryDto, OwnerType } from '../dto/integration.dto';

@Injectable()
export class AdapterReadRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  async findMany(
    tenantSchema: string,
    scope: IntegrationAdapterOwnerScope,
    query: AdapterListQueryDto,
  ): Promise<IntegrationAdapterListRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.platformId) {
      conditions.push(`ia.platform_id = $${paramIndex++}::uuid`);
      params.push(query.platformId);
    }

    if (query.adapterType) {
      conditions.push(`ia.adapter_type = $${paramIndex++}`);
      params.push(query.adapterType);
    }

    if (scope.ownerType === OwnerType.TENANT) {
      conditions.push(`ia.owner_type = '${OwnerType.TENANT}'`);
      conditions.push('ia.owner_id IS NULL');
    } else if (query.includeInherited) {
      conditions.push(`
        (
          (ia.owner_type = '${OwnerType.TENANT}' AND ia.owner_id IS NULL AND ia.inherit = true)
          OR
          (ia.owner_type = $${paramIndex++} AND ia.owner_id = $${paramIndex++}::uuid)
        )
      `);
      params.push(scope.ownerType, scope.ownerId);
    } else {
      conditions.push(`ia.owner_type = $${paramIndex++}`);
      conditions.push(`ia.owner_id = $${paramIndex++}::uuid`);
      params.push(scope.ownerType, scope.ownerId);
    }

    if (!query.includeDisabled) {
      conditions.push('ia.is_active = true');
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.map((condition) => condition.trim()).join(' AND ')}`
        : '';

    return this.databaseService.getPrisma().$queryRawUnsafe<IntegrationAdapterListRow[]>(
      `
        SELECT
          ia.id,
          ia.owner_type as "ownerType",
          ia.owner_id as "ownerId",
          ia.platform_id as "platformId",
          sp.code as "platformCode",
          sp.display_name as "platformDisplayName",
          sp.icon_url as "platformIconUrl",
          ia.code,
          ia.name_en as "nameEn",
          ia.name_zh as "nameZh",
          ia.name_ja as "nameJa",
          ia.adapter_type as "adapterType",
          ia.inherit,
          ia.is_active as "isActive",
          COALESCE(cfg.config_count, 0)::int as "configCount",
          ia.created_at as "createdAt",
          ia.updated_at as "updatedAt",
          ia.version
        FROM "${tenantSchema}".integration_adapter ia
        JOIN "${tenantSchema}".social_platform sp ON sp.id = ia.platform_id
        LEFT JOIN (
          SELECT adapter_id, COUNT(*)::int as config_count
          FROM "${tenantSchema}".adapter_config
          GROUP BY adapter_id
        ) cfg ON cfg.adapter_id = ia.id
        ${whereClause}
        ORDER BY ia.created_at DESC
      `,
      ...params,
    );
  }

  async findById(
    tenantSchema: string,
    adapterId: string,
  ): Promise<IntegrationAdapterDetailRow | null> {
    const rows = await this.databaseService.getPrisma().$queryRawUnsafe<
      IntegrationAdapterDetailRow[]
    >(
      `
        SELECT
          ia.id,
          ia.owner_type as "ownerType",
          ia.owner_id as "ownerId",
          ia.platform_id as "platformId",
          sp.id as "platformRecordId",
          sp.code as "platformCode",
          sp.display_name as "platformDisplayName",
          ia.code,
          ia.name_en as "nameEn",
          ia.name_zh as "nameZh",
          ia.name_ja as "nameJa",
          ia.adapter_type as "adapterType",
          ia.inherit,
          ia.is_active as "isActive",
          ia.created_at as "createdAt",
          ia.updated_at as "updatedAt",
          ia.created_by as "createdBy",
          ia.updated_by as "updatedBy",
          ia.version
        FROM "${tenantSchema}".integration_adapter ia
        JOIN "${tenantSchema}".social_platform sp ON sp.id = ia.platform_id
        WHERE ia.id = $1::uuid
        LIMIT 1
      `,
      adapterId,
    );

    return rows[0] ?? null;
  }

  findConfigs(
    tenantSchema: string,
    adapterId: string,
  ): Promise<IntegrationAdapterConfigRow[]> {
    return this.databaseService.getPrisma().$queryRawUnsafe<IntegrationAdapterConfigRow[]>(
      `
        SELECT
          id,
          config_key as "configKey",
          config_value as "configValue",
          is_secret as "isSecret"
        FROM "${tenantSchema}".adapter_config
        WHERE adapter_id = $1::uuid
        ORDER BY created_at ASC, id ASC
      `,
      adapterId,
    );
  }
}

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  EffectiveAdapterConfigRow,
  EffectiveAdapterLookupRow,
  EffectiveAdapterOverrideRow,
  EffectiveAdapterScope,
  SubsidiaryAdapterScopeRecord,
  TalentAdapterHierarchyRecord,
} from '../domain/adapter-resolution.policy';

@Injectable()
export class AdapterResolutionRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  async findTalentHierarchy(
    tenantSchema: string,
    talentId: string,
  ): Promise<TalentAdapterHierarchyRecord | null> {
    const rows = await this.databaseService.getPrisma().$queryRawUnsafe<
      TalentAdapterHierarchyRecord[]
    >(
      `
        SELECT
          id,
          subsidiary_id as "subsidiaryId"
        FROM "${tenantSchema}".talent
        WHERE id = $1::uuid
        LIMIT 1
      `,
      talentId,
    );

    return rows[0] ?? null;
  }

  async findSubsidiaryScope(
    tenantSchema: string,
    subsidiaryId: string,
  ): Promise<SubsidiaryAdapterScopeRecord | null> {
    const rows = await this.databaseService.getPrisma().$queryRawUnsafe<
      SubsidiaryAdapterScopeRecord[]
    >(
      `
        SELECT id
        FROM "${tenantSchema}".subsidiary
        WHERE id = $1::uuid
        LIMIT 1
      `,
      subsidiaryId,
    );

    return rows[0] ?? null;
  }

  async findAdapters(
    tenantSchema: string,
    lineage: EffectiveAdapterScope[],
    platformCode: string,
    adapterType?: string,
  ): Promise<EffectiveAdapterLookupRow[]> {
    if (lineage.length === 0) {
      return [];
    }

    const conditions: string[] = ['sp.code = $1'];
    const params: unknown[] = [platformCode];
    let paramIndex = 2;

    if (adapterType) {
      conditions.push(`ia.adapter_type = $${paramIndex++}`);
      params.push(adapterType);
    }

    const ownerClauses = lineage.map((scope) => {
      if (scope.ownerId === null) {
        params.push(scope.ownerType);
        const ownerTypeIndex = paramIndex++;
        return `(ia.owner_type = $${ownerTypeIndex} AND ia.owner_id IS NULL)`;
      }

      params.push(scope.ownerType, scope.ownerId);
      const ownerTypeIndex = paramIndex++;
      const ownerIdIndex = paramIndex++;
      return `(ia.owner_type = $${ownerTypeIndex} AND ia.owner_id = $${ownerIdIndex}::uuid)`;
    });

    conditions.push(`(${ownerClauses.join(' OR ')})`);

    return this.databaseService.getPrisma().$queryRawUnsafe<EffectiveAdapterLookupRow[]>(
      `
        SELECT
          ia.id,
          ia.owner_type as "ownerType",
          ia.owner_id as "ownerId",
          ia.platform_id as "platformId",
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
          ia.version
        FROM "${tenantSchema}".integration_adapter ia
        JOIN "${tenantSchema}".social_platform sp
          ON sp.id = ia.platform_id
        WHERE ${conditions.join(' AND ')}
      `,
      ...params,
    );
  }

  async findConfigs(
    tenantSchema: string,
    adapterIds: string[],
  ): Promise<EffectiveAdapterConfigRow[]> {
    if (adapterIds.length === 0) {
      return [];
    }

    const placeholders = adapterIds.map((_, index) => `$${index + 1}::uuid`).join(', ');

    return this.databaseService.getPrisma().$queryRawUnsafe<EffectiveAdapterConfigRow[]>(
      `
        SELECT
          adapter_id as "adapterId",
          id,
          config_key as "configKey",
          config_value as "configValue",
          is_secret as "isSecret"
        FROM "${tenantSchema}".adapter_config
        WHERE adapter_id IN (${placeholders})
        ORDER BY created_at ASC, id ASC
      `,
      ...adapterIds,
    );
  }

  async findOverrides(
    tenantSchema: string,
    adapterIds: string[],
    scopes: EffectiveAdapterScope[],
  ): Promise<EffectiveAdapterOverrideRow[]> {
    if (adapterIds.length === 0 || scopes.length === 0) {
      return [];
    }

    const params: unknown[] = [];
    let paramIndex = 1;

    const adapterPlaceholders = adapterIds.map(() => `$${paramIndex++}::uuid`);
    params.push(...adapterIds);

    const scopeClauses = scopes.map((scope) => {
      if (scope.ownerId === null) {
        params.push(scope.ownerType);
        const ownerTypeIndex = paramIndex++;
        return `(owner_type = $${ownerTypeIndex} AND owner_id IS NULL)`;
      }

      params.push(scope.ownerType, scope.ownerId);
      const ownerTypeIndex = paramIndex++;
      const ownerIdIndex = paramIndex++;
      return `(owner_type = $${ownerTypeIndex} AND owner_id = $${ownerIdIndex}::uuid)`;
    });

    return this.databaseService.getPrisma().$queryRawUnsafe<EffectiveAdapterOverrideRow[]>(
      `
        SELECT
          entity_id as "adapterId",
          owner_type as "ownerType",
          owner_id as "ownerId",
          is_disabled as "isDisabled"
        FROM "${tenantSchema}".config_override
        WHERE entity_type = 'integration_adapter'
          AND entity_id IN (${adapterPlaceholders.join(', ')})
          AND (${scopeClauses.join(' OR ')})
      `,
      ...params,
    );
  }
}

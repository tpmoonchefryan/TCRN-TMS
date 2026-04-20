// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  ExternalBlocklistDisableCandidate,
  ExternalBlocklistScope,
  RawExternalBlocklistPatternRecord,
} from '../domain/external-blocklist.policy';
import type {
  CreateExternalBlocklistDto,
  OwnerType,
  UpdateExternalBlocklistDto,
} from '../dto/external-blocklist.dto';

const NULL_UUID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class ExternalBlocklistRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async getScopeChain(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null,
  ): Promise<ExternalBlocklistScope[]> {
    const chain: ExternalBlocklistScope[] = [{ type: 'tenant' as OwnerType, id: null }];

    if (scopeType === 'tenant' || !scopeId) {
      return chain;
    }

    if (scopeType === 'subsidiary') {
      const subsidiaries = await this.prisma.$queryRawUnsafe<Array<{ id: string; path: string }>>(
        `
          SELECT id, path
          FROM "${tenantSchema}".subsidiary
          WHERE id = $1::uuid
        `,
        scopeId,
      );

      if (subsidiaries.length === 0) {
        return chain;
      }

      const ancestors = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT id
          FROM "${tenantSchema}".subsidiary
          WHERE $1 LIKE path || '%' AND path != $1
          ORDER BY length(path)
        `,
        subsidiaries[0].path,
      );

      for (const ancestor of ancestors) {
        chain.push({ type: 'subsidiary' as OwnerType, id: ancestor.id });
      }

      chain.push({ type: 'subsidiary' as OwnerType, id: scopeId });
      return chain;
    }

    const talents = await this.prisma.$queryRawUnsafe<Array<{ subsidiaryId: string | null; path: string }>>(
      `
        SELECT subsidiary_id as "subsidiaryId", path
        FROM "${tenantSchema}".talent
        WHERE id = $1::uuid
      `,
      scopeId,
    );

    if (talents.length > 0 && talents[0].subsidiaryId) {
      const subsidiaries = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT id
          FROM "${tenantSchema}".subsidiary
          WHERE $1 LIKE path || '%'
          ORDER BY length(path)
        `,
        talents[0].path,
      );

      for (const subsidiary of subsidiaries) {
        chain.push({ type: 'subsidiary' as OwnerType, id: subsidiary.id });
      }
    }

    chain.push({ type: 'talent' as OwnerType, id: scopeId });
    return chain;
  }

  async countMany(
    tenantSchema: string,
    scopes: ExternalBlocklistScope[],
    options: {
      category?: string;
      includeInactive?: boolean;
    },
  ): Promise<number> {
    const { clause, params } = this.buildOwnerScopeClause(scopes);
    const whereConditions = [`(${clause})`];

    if (options.category) {
      const categoryIndex = params.push(options.category);
      whereConditions.push(`category = $${categoryIndex}`);
    }

    if (!options.includeInactive) {
      whereConditions.push('is_active = true');
    }

    const result = await this.prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `
        SELECT COUNT(*)::int as count
        FROM "${tenantSchema}".external_blocklist_pattern
        WHERE ${whereConditions.join(' AND ')}
      `,
      ...params,
    );

    return result[0]?.count ?? 0;
  }

  async findMany(
    tenantSchema: string,
    scopes: ExternalBlocklistScope[],
    options: {
      category?: string;
      includeInactive?: boolean;
      page: number;
      pageSize: number;
    },
  ): Promise<RawExternalBlocklistPatternRecord[]> {
    const { clause, params } = this.buildOwnerScopeClause(scopes);
    const whereConditions = [`(${clause})`];

    if (options.category) {
      const categoryIndex = params.push(options.category);
      whereConditions.push(`category = $${categoryIndex}`);
    }

    if (!options.includeInactive) {
      whereConditions.push('is_active = true');
    }

    const limitIndex = params.push(options.pageSize);
    const offsetIndex = params.push((options.page - 1) * options.pageSize);

    return this.prisma.$queryRawUnsafe<RawExternalBlocklistPatternRecord[]>(
      `
        SELECT
          id,
          owner_type as "ownerType",
          owner_id as "ownerId",
          pattern,
          pattern_type as "patternType",
          name_en as "nameEn",
          name_zh as "nameZh",
          name_ja as "nameJa",
          extra_data as "extraData",
          description,
          category,
          severity,
          action,
          replacement,
          inherit,
          sort_order as "sortOrder",
          is_active as "isActive",
          is_force_use as "isForceUse",
          is_system as "isSystem",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
        FROM "${tenantSchema}".external_blocklist_pattern
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY sort_order ASC, severity DESC, created_at DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      ...params,
    );
  }

  async findWithInheritance(
    tenantSchema: string,
    scopeChain: ExternalBlocklistScope[],
    currentScope: ExternalBlocklistScope,
  ): Promise<RawExternalBlocklistPatternRecord[]> {
    const { clause, params } = this.buildInheritedScopeClause(scopeChain, currentScope);

    return this.prisma.$queryRawUnsafe<RawExternalBlocklistPatternRecord[]>(
      `
        SELECT
          id,
          owner_type as "ownerType",
          owner_id as "ownerId",
          pattern,
          pattern_type as "patternType",
          name_en as "nameEn",
          name_zh as "nameZh",
          name_ja as "nameJa",
          extra_data as "extraData",
          description,
          category,
          severity,
          action,
          replacement,
          inherit,
          sort_order as "sortOrder",
          is_active as "isActive",
          is_force_use as "isForceUse",
          is_system as "isSystem",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
        FROM "${tenantSchema}".external_blocklist_pattern
        WHERE is_active = true
          AND (${clause})
        ORDER BY sort_order ASC, severity DESC, created_at DESC
      `,
      ...params,
    );
  }

  async findById(
    tenantSchema: string,
    id: string,
  ): Promise<RawExternalBlocklistPatternRecord | null> {
    const items = await this.prisma.$queryRawUnsafe<RawExternalBlocklistPatternRecord[]>(
      `
        SELECT
          id,
          owner_type as "ownerType",
          owner_id as "ownerId",
          pattern,
          pattern_type as "patternType",
          name_en as "nameEn",
          name_zh as "nameZh",
          name_ja as "nameJa",
          extra_data as "extraData",
          description,
          category,
          severity,
          action,
          replacement,
          inherit,
          sort_order as "sortOrder",
          is_active as "isActive",
          is_force_use as "isForceUse",
          is_system as "isSystem",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
        FROM "${tenantSchema}".external_blocklist_pattern
        WHERE id = $1::uuid
      `,
      id,
    );

    return items[0] ?? null;
  }

  async create(
    tenantSchema: string,
    dto: CreateExternalBlocklistDto & { extraData: Record<string, unknown> | null },
    userId: string | null,
  ): Promise<RawExternalBlocklistPatternRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const items = await this.prisma.$queryRawUnsafe<RawExternalBlocklistPatternRecord[]>(
      `
        INSERT INTO "${tenantSchema}".external_blocklist_pattern (
          id,
          owner_type,
          owner_id,
          pattern,
          pattern_type,
          name_en,
          name_zh,
          name_ja,
          extra_data,
          description,
          category,
          severity,
          action,
          replacement,
          inherit,
          sort_order,
          is_active,
          is_force_use,
          is_system,
          created_at,
          updated_at,
          created_by,
          updated_by,
          version
        ) VALUES (
          $1::uuid,
          $2,
          $3::uuid,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9::jsonb,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          true,
          $17,
          false,
          $18::timestamptz,
          $18::timestamptz,
          $19::uuid,
          $19::uuid,
          1
        )
        RETURNING
          id,
          owner_type as "ownerType",
          owner_id as "ownerId",
          pattern,
          pattern_type as "patternType",
          name_en as "nameEn",
          name_zh as "nameZh",
          name_ja as "nameJa",
          extra_data as "extraData",
          description,
          category,
          severity,
          action,
          replacement,
          inherit,
          sort_order as "sortOrder",
          is_active as "isActive",
          is_force_use as "isForceUse",
          is_system as "isSystem",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
      `,
      id,
      dto.ownerType,
      dto.ownerId ?? null,
      dto.pattern,
      dto.patternType,
      dto.nameEn,
      dto.nameZh ?? null,
      dto.nameJa ?? null,
      dto.extraData ? JSON.stringify(dto.extraData) : null,
      dto.description ?? null,
      dto.category ?? null,
      dto.severity ?? 'medium',
      dto.action ?? 'reject',
      dto.replacement ?? '[链接已移除]',
      dto.inherit ?? true,
      dto.sortOrder ?? 0,
      dto.isForceUse ?? false,
      now,
      userId,
    );

    return items[0];
  }

  async update(
    tenantSchema: string,
    id: string,
    dto: UpdateExternalBlocklistDto & { extraData?: Record<string, unknown> | null },
    userId: string | null,
  ): Promise<RawExternalBlocklistPatternRecord | null> {
    const now = new Date().toISOString();
    const setClauses: string[] = [
      'updated_at = $2::timestamptz',
      'updated_by = $3::uuid',
      'version = version + 1',
    ];
    const params: Array<string | number | boolean | null> = [id, now, userId];
    let paramIndex = 4;

    const fields: Array<{ key: keyof (UpdateExternalBlocklistDto & { extraData?: Record<string, unknown> | null }); column: string }> = [
      { key: 'pattern', column: 'pattern' },
      { key: 'patternType', column: 'pattern_type' },
      { key: 'nameEn', column: 'name_en' },
      { key: 'nameZh', column: 'name_zh' },
      { key: 'nameJa', column: 'name_ja' },
      { key: 'extraData', column: 'extra_data' },
      { key: 'description', column: 'description' },
      { key: 'category', column: 'category' },
      { key: 'severity', column: 'severity' },
      { key: 'action', column: 'action' },
      { key: 'replacement', column: 'replacement' },
      { key: 'inherit', column: 'inherit' },
      { key: 'sortOrder', column: 'sort_order' },
      { key: 'isActive', column: 'is_active' },
      { key: 'isForceUse', column: 'is_force_use' },
    ];

    for (const { key, column } of fields) {
      if (dto[key] !== undefined) {
        const value = dto[key];
        const nextParamIndex = paramIndex++;

        setClauses.push(`${column} = $${nextParamIndex}${key === 'extraData' ? '::jsonb' : ''}`);
        params.push(
          key === 'extraData' && value && typeof value === 'object'
            ? JSON.stringify(value)
            : (value as string | number | boolean | null),
        );
      }
    }

    const versionIndex = params.push(dto.version);

    const items = await this.prisma.$queryRawUnsafe<RawExternalBlocklistPatternRecord[]>(
      `
        UPDATE "${tenantSchema}".external_blocklist_pattern
        SET ${setClauses.join(', ')}
        WHERE id = $1::uuid AND version = $${versionIndex}
        RETURNING
          id,
          owner_type as "ownerType",
          owner_id as "ownerId",
          pattern,
          pattern_type as "patternType",
          name_en as "nameEn",
          name_zh as "nameZh",
          name_ja as "nameJa",
          extra_data as "extraData",
          description,
          category,
          severity,
          action,
          replacement,
          inherit,
          sort_order as "sortOrder",
          is_active as "isActive",
          is_force_use as "isForceUse",
          is_system as "isSystem",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
      `,
      ...params,
    );

    return items[0] ?? null;
  }

  async delete(tenantSchema: string, id: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM "${tenantSchema}".external_blocklist_pattern WHERE id = $1::uuid`,
      id,
    );
  }

  async batchToggle(
    tenantSchema: string,
    ids: string[],
    isActive: boolean,
    userId: string | null,
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const now = new Date().toISOString();
    const placeholders = ids.map((_, index) => `$${index + 4}::uuid`).join(', ');

    return this.prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".external_blocklist_pattern
        SET is_active = $1, updated_at = $2::timestamptz, updated_by = $3::uuid, version = version + 1
        WHERE id IN (${placeholders})
      `,
      isActive,
      now,
      userId,
      ...ids,
    ) as Promise<number>;
  }

  async findDisableCandidate(
    tenantSchema: string,
    id: string,
  ): Promise<ExternalBlocklistDisableCandidate | null> {
    const items = await this.prisma.$queryRawUnsafe<ExternalBlocklistDisableCandidate[]>(
      `
        SELECT
          id,
          owner_type as "ownerType",
          owner_id as "ownerId",
          is_force_use as "isForceUse",
          name_en as "nameEn"
        FROM "${tenantSchema}".external_blocklist_pattern
        WHERE id = $1::uuid
      `,
      id,
    );

    return items[0] ?? null;
  }

  async disableInScope(
    tenantSchema: string,
    id: string,
    scopeType: OwnerType,
    scopeId: string | null,
    userId: string,
  ): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantSchema}".config_override
          (id, entity_type, entity_id, owner_type, owner_id, is_disabled, created_at, updated_at, created_by, updated_by)
        VALUES
          (gen_random_uuid(), 'external_blocklist_pattern', $1::uuid, $2, $3::uuid, true, now(), now(), $4::uuid, $4::uuid)
        ON CONFLICT (entity_type, entity_id, owner_type, COALESCE(owner_id, '${NULL_UUID}'::uuid))
        DO UPDATE SET is_disabled = true, updated_at = now(), updated_by = $4::uuid
      `,
      id,
      scopeType,
      scopeId,
      userId,
    );
  }

  async enableInScope(
    tenantSchema: string,
    id: string,
    scopeType: OwnerType,
    scopeId: string | null,
  ): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `
        DELETE FROM "${tenantSchema}".config_override
        WHERE entity_type = 'external_blocklist_pattern'
          AND entity_id = $1::uuid
          AND owner_type = $2
          AND COALESCE(owner_id, '${NULL_UUID}'::uuid) = COALESCE($3::uuid, '${NULL_UUID}'::uuid)
      `,
      id,
      scopeType,
      scopeId,
    );
  }

  async getDisabledIds(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null,
  ): Promise<Set<string>> {
    const overrides = await this.prisma.$queryRawUnsafe<Array<{ entityId: string }>>(
      `
        SELECT entity_id as "entityId"
        FROM "${tenantSchema}".config_override
        WHERE entity_type = 'external_blocklist_pattern'
          AND owner_type = $1
          AND COALESCE(owner_id, '${NULL_UUID}'::uuid) = COALESCE($2::uuid, '${NULL_UUID}'::uuid)
          AND is_disabled = true
      `,
      scopeType,
      scopeId,
    );

    return new Set(overrides.map((override) => override.entityId));
  }

  private buildOwnerScopeClause(
    scopes: ExternalBlocklistScope[],
  ): { clause: string; params: Array<string | number | null> } {
    const params: Array<string | number | null> = [];
    const scopeClauses = scopes.map((scope) => {
      const ownerTypeIndex = params.push(scope.type);
      if (scope.id === null) {
        return `(owner_type = $${ownerTypeIndex} AND owner_id IS NULL)`;
      }

      const ownerIdIndex = params.push(scope.id);
      return `(owner_type = $${ownerTypeIndex} AND owner_id = $${ownerIdIndex}::uuid)`;
    });

    return {
      clause: scopeClauses.join(' OR '),
      params,
    };
  }

  private buildInheritedScopeClause(
    scopes: ExternalBlocklistScope[],
    currentScope: ExternalBlocklistScope,
  ): { clause: string; params: Array<string | number | null> } {
    const params: Array<string | number | null> = [];
    const scopeClauses = scopes.map((scope) => {
      const ownerTypeIndex = params.push(scope.type);
      const isCurrentScope = scope.type === currentScope.type && scope.id === currentScope.id;

      if (scope.id === null) {
        return isCurrentScope
          ? `(owner_type = $${ownerTypeIndex} AND owner_id IS NULL)`
          : `(owner_type = $${ownerTypeIndex} AND owner_id IS NULL AND inherit = true)`;
      }

      const ownerIdIndex = params.push(scope.id);
      return isCurrentScope
        ? `(owner_type = $${ownerTypeIndex} AND owner_id = $${ownerIdIndex}::uuid)`
        : `(owner_type = $${ownerTypeIndex} AND owner_id = $${ownerIdIndex}::uuid AND inherit = true)`;
    });

    return {
      clause: scopeClauses.join(' OR '),
      params,
    };
  }

  private get prisma() {
    return this.databaseService.getPrisma();
  }
}

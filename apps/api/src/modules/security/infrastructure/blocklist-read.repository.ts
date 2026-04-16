// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  BlocklistDetailRow,
  BlocklistListOptions,
  BlocklistListRow,
  BlocklistScopeRef,
  OwnerType,
} from '../domain/blocklist-read.policy';

interface BlocklistWhereClause {
  params: unknown[];
  whereClause: string;
}

@Injectable()
export class BlocklistReadRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async getScopeChain(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null,
  ): Promise<BlocklistScopeRef[]> {
    const prisma = this.databaseService.getPrisma();
    const chain: BlocklistScopeRef[] = [{ type: 'tenant', id: null }];

    if (scopeType === 'tenant') {
      return chain;
    }

    if (scopeType === 'subsidiary' && scopeId) {
      const subsidiaries = await prisma.$queryRawUnsafe<Array<{
        id: string;
        path: string;
      }>>(
        `
          SELECT id, path
          FROM "${tenantSchema}".subsidiary
          WHERE id = $1::uuid
        `,
        scopeId,
      );

      if (subsidiaries.length > 0) {
        const ancestors = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `
            SELECT id
            FROM "${tenantSchema}".subsidiary
            WHERE $1 LIKE path || '%' AND path != $1
            ORDER BY length(path)
          `,
          subsidiaries[0].path,
        );

        for (const ancestor of ancestors) {
          chain.push({ type: 'subsidiary', id: ancestor.id });
        }

        chain.push({ type: 'subsidiary', id: scopeId });
      }
    }

    if (scopeType === 'talent' && scopeId) {
      const talents = await prisma.$queryRawUnsafe<
        Array<{ subsidiaryId: string | null; path: string }>
      >(
        `
          SELECT subsidiary_id as "subsidiaryId", path
          FROM "${tenantSchema}".talent
          WHERE id = $1::uuid
        `,
        scopeId,
      );

      if (talents.length > 0 && talents[0].subsidiaryId) {
        const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `
            SELECT id
            FROM "${tenantSchema}".subsidiary
            WHERE $1 LIKE path || '%'
            ORDER BY length(path)
          `,
          talents[0].path,
        );

        for (const subsidiary of subsidiaries) {
          chain.push({ type: 'subsidiary', id: subsidiary.id });
        }
      }

      chain.push({ type: 'talent', id: scopeId });
    }

    return chain;
  }

  async countMany(
    tenantSchema: string,
    options: BlocklistListOptions,
    scopeChain: BlocklistScopeRef[],
  ): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const { params, whereClause } = this.buildWhereClause(options, scopeChain);
    const result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `
        SELECT COUNT(*)::int as count
        FROM "${tenantSchema}".blocklist_entry
        WHERE ${whereClause}
      `,
      ...params,
    );

    return result[0]?.count ?? 0;
  }

  async findMany(
    tenantSchema: string,
    options: BlocklistListOptions,
    scopeChain: BlocklistScopeRef[],
  ): Promise<BlocklistListRow[]> {
    const prisma = this.databaseService.getPrisma();
    const { params, whereClause } = this.buildWhereClause(options, scopeChain);
    const offset = (options.page - 1) * options.pageSize;

    return prisma.$queryRawUnsafe<BlocklistListRow[]>(
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
          description,
          category,
          severity,
          action,
          replacement,
          scope,
          inherit,
          sort_order as "sortOrder",
          is_active as "isActive",
          is_force_use as "isForceUse",
          is_system as "isSystem",
          match_count as "matchCount",
          last_matched_at as "lastMatchedAt",
          created_at as "createdAt",
          created_by as "createdBy",
          version
        FROM "${tenantSchema}".blocklist_entry
        WHERE ${whereClause}
        ORDER BY sort_order ASC, severity DESC, created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      ...params,
      options.pageSize,
      offset,
    );
  }

  async getDisabledIds(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null,
  ): Promise<Set<string>> {
    const prisma = this.databaseService.getPrisma();
    const overrides = await prisma.$queryRawUnsafe<Array<{ entityId: string }>>(
      `
        SELECT entity_id as "entityId"
        FROM "${tenantSchema}".config_override
        WHERE entity_type = 'blocklist_entry'
          AND owner_type = $1
          AND COALESCE(owner_id, '00000000-0000-0000-0000-000000000000') =
            COALESCE($2::uuid, '00000000-0000-0000-0000-000000000000')
          AND is_disabled = true
      `,
      scopeType,
      scopeId,
    );

    return new Set(overrides.map((override) => override.entityId));
  }

  async findById(
    tenantSchema: string,
    id: string,
  ): Promise<BlocklistDetailRow | null> {
    const prisma = this.databaseService.getPrisma();
    const entries = await prisma.$queryRawUnsafe<BlocklistDetailRow[]>(
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
          description,
          category,
          severity,
          action,
          replacement,
          scope,
          inherit,
          sort_order as "sortOrder",
          is_active as "isActive",
          is_force_use as "isForceUse",
          is_system as "isSystem",
          match_count as "matchCount",
          last_matched_at as "lastMatchedAt",
          created_at as "createdAt",
          updated_at as "updatedAt",
          created_by as "createdBy",
          updated_by as "updatedBy",
          version
        FROM "${tenantSchema}".blocklist_entry
        WHERE id = $1::uuid
        LIMIT 1
      `,
      id,
    );

    return entries[0] ?? null;
  }

  private buildWhereClause(
    options: BlocklistListOptions,
    scopeChain: BlocklistScopeRef[],
  ): BlocklistWhereClause {
    const params: unknown[] = [];
    const scopeRefs = options.includeInherited
      ? scopeChain
      : [{ type: options.scopeType, id: options.scopeId }];

    const scopeConditions = scopeRefs.map((scopeRef) => {
      if (scopeRef.id === null) {
        params.push(scopeRef.type);
        return `(owner_type = $${params.length} AND owner_id IS NULL)`;
      }

      params.push(scopeRef.type);
      const ownerTypeIndex = params.length;
      params.push(scopeRef.id);
      const ownerIdIndex = params.length;

      return `(owner_type = $${ownerTypeIndex} AND owner_id = $${ownerIdIndex}::uuid)`;
    });

    const conditions: string[] = [`(${scopeConditions.join(' OR ')})`];

    if (options.category) {
      params.push(options.category);
      conditions.push(`category = $${params.length}`);
    }

    if (options.patternType) {
      params.push(options.patternType);
      conditions.push(`pattern_type = $${params.length}`);
    }

    if (options.scope) {
      params.push(options.scope);
      conditions.push(`$${params.length} = ANY(scope)`);
    }

    if (!options.includeInactive) {
      conditions.push('is_active = true');
    }

    return {
      params,
      whereClause: conditions.join(' AND '),
    };
  }
}

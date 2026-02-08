// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { RedisService } from '../../redis';
import {
  CreateExternalBlocklistDto,
  DisableExternalBlocklistDto,
  ExternalBlocklistItem,
  ExternalBlocklistQueryDto,
  OwnerType,
  UpdateExternalBlocklistDto,
} from '../dto/external-blocklist.dto';

export interface ExternalBlocklistItemWithMeta extends ExternalBlocklistItem {
  sortOrder: number;
  isForceUse: boolean;
  isSystem: boolean;
  isInherited: boolean;
  isDisabledHere: boolean;
  canDisable: boolean;
}

@Injectable()
export class ExternalBlocklistService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Find all external blocklist patterns with inheritance support
   */
  async findMany(
    tenantSchema: string,
    query: ExternalBlocklistQueryDto,
  ): Promise<{ items: ExternalBlocklistItemWithMeta[]; total: number }> {
    const { 
      scopeType = 'tenant',
      scopeId = null,
      category, 
      includeInherited = true,
      includeDisabled = false,
      includeInactive = false,
      page = 1, 
      pageSize = 20,
    } = query;

    // Build scope chain for inheritance
    const scopeChain = await this.getScopeChain(tenantSchema, scopeType as OwnerType, scopeId ?? null);
    
    // Build scope conditions
    let scopeConditions: string[];
    if (includeInherited) {
      scopeConditions = scopeChain.map((s) => {
        if (s.id === null) {
          return `(owner_type = '${s.type}' AND owner_id IS NULL)`;
        }
        return `(owner_type = '${s.type}' AND owner_id = '${s.id}')`;
      });
    } else {
      // Only current scope
      if (scopeId === null) {
        scopeConditions = [`(owner_type = '${scopeType}' AND owner_id IS NULL)`];
      } else {
        scopeConditions = [`(owner_type = '${scopeType}' AND owner_id = '${scopeId}')`];
      }
    }

    // Build WHERE clause
    const conditions: string[] = [`(${scopeConditions.join(' OR ')})`];
    
    if (category) {
      conditions.push(`category = '${category}'`);
    }
    if (!includeInactive) {
      conditions.push(`is_active = true`);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * pageSize;

    // Count query
    const countResult = await prisma.$queryRawUnsafe<{ count: number }[]>(`
      SELECT COUNT(*)::int as count
      FROM "${tenantSchema}".external_blocklist_pattern
      WHERE ${whereClause}
    `);
    const total = countResult[0]?.count ?? 0;

    // Data query
    const items = await prisma.$queryRawUnsafe<Array<{
      id: string;
      ownerType: string;
      ownerId: string | null;
      pattern: string;
      patternType: string;
      nameEn: string;
      nameZh: string | null;
      nameJa: string | null;
      description: string | null;
      category: string | null;
      severity: string;
      action: string;
      replacement: string;
      inherit: boolean;
      sortOrder: number;
      isActive: boolean;
      isForceUse: boolean;
      isSystem: boolean;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    }>>(`
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
        inherit,
        sort_order as "sortOrder",
        is_active as "isActive",
        is_force_use as "isForceUse",
        is_system as "isSystem",
        created_at as "createdAt",
        updated_at as "updatedAt",
        version
      FROM "${tenantSchema}".external_blocklist_pattern
      WHERE ${whereClause}
      ORDER BY sort_order ASC, severity DESC, created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // Get disabled IDs
    const disabledIds = await this.getDisabledIds(tenantSchema, scopeType as OwnerType, scopeId ?? null);

    // Filter and enrich with metadata
    const enrichedItems: ExternalBlocklistItemWithMeta[] = items
      .filter(item => includeDisabled || !disabledIds.has(item.id))
      .map(item => {
        const isInherited = item.ownerType !== scopeType || item.ownerId !== scopeId;
        return {
          ...item,
          createdAt: new Date(item.createdAt).toISOString(),
          updatedAt: new Date(item.updatedAt).toISOString(),
          isInherited,
          isDisabledHere: disabledIds.has(item.id),
          canDisable: !item.isForceUse && isInherited,
        };
      });

    return {
      items: enrichedItems,
      total: includeDisabled ? total : enrichedItems.length,
    };
  }

  /**
   * Find patterns with full inheritance (for a specific scope)
   * Returns tenant + subsidiary chain + talent patterns
   */
  async findWithInheritance(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null,
  ): Promise<ExternalBlocklistItemWithMeta[]> {
    // Build scope chain
    const scopeChain = await this.getScopeChain(tenantSchema, scopeType, scopeId);
    
    // Build scope conditions
    const scopeConditions = scopeChain.map((s) => {
      if (s.id === null) {
        return `(owner_type = '${s.type}' AND owner_id IS NULL AND inherit = true)`;
      }
      // For the current scope, don't require inherit=true
      if (s.type === scopeType && s.id === scopeId) {
        return `(owner_type = '${s.type}' AND owner_id = '${s.id}')`;
      }
      return `(owner_type = '${s.type}' AND owner_id = '${s.id}' AND inherit = true)`;
    });

    const items = await prisma.$queryRawUnsafe<Array<{
      id: string;
      ownerType: string;
      ownerId: string | null;
      pattern: string;
      patternType: string;
      nameEn: string;
      nameZh: string | null;
      nameJa: string | null;
      description: string | null;
      category: string | null;
      severity: string;
      action: string;
      replacement: string;
      inherit: boolean;
      sortOrder: number;
      isActive: boolean;
      isForceUse: boolean;
      isSystem: boolean;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    }>>(`
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
        AND (${scopeConditions.join(' OR ')})
      ORDER BY 
        sort_order ASC,
        severity DESC,
        created_at DESC
    `);

    // Get disabled IDs
    const disabledIds = await this.getDisabledIds(tenantSchema, scopeType, scopeId);

    // Filter and enrich
    return items
      .filter(item => !disabledIds.has(item.id))
      .map((item) => {
        const isInherited = item.ownerType !== scopeType || item.ownerId !== scopeId;
        return {
          ...item,
          createdAt: new Date(item.createdAt).toISOString(),
          updatedAt: new Date(item.updatedAt).toISOString(),
          isInherited,
          isDisabledHere: false,
          canDisable: !item.isForceUse && isInherited,
        };
      });
  }

  /**
   * Find single pattern by ID
   */
  async findById(
    tenantSchema: string,
    id: string,
  ): Promise<ExternalBlocklistItem | null> {
    const items = await prisma.$queryRawUnsafe<ExternalBlocklistItem[]>(`
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
    `, id);
    
    const item = items[0];

    if (!item) return null;

    return {
      ...item,
      createdAt: new Date(item.createdAt as unknown as string).toISOString(),
      updatedAt: new Date(item.updatedAt as unknown as string).toISOString(),
    };
  }

  /**
   * Create external blocklist pattern
   */
  async create(
    tenantSchema: string,
    dto: CreateExternalBlocklistDto,
    context: RequestContext,
  ): Promise<ExternalBlocklistItem> {
    // Validate pattern for url_regex type
    if (dto.patternType === 'url_regex') {
      try {
        new RegExp(dto.pattern);
      } catch {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Invalid regex pattern',
        });
      }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const items = await prisma.$queryRawUnsafe<ExternalBlocklistItem[]>(`
      INSERT INTO "${tenantSchema}".external_blocklist_pattern (
        id,
        owner_type,
        owner_id,
        pattern,
        pattern_type,
        name_en,
        name_zh,
        name_ja,
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
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        true,
        $16,
        false,
        $17::timestamptz,
        $17::timestamptz,
        $18::uuid,
        $18::uuid,
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
      dto.description ?? null,
      dto.category ?? null,
      dto.severity ?? 'medium',
      dto.action ?? 'reject',
      dto.replacement ?? '[链接已移除]',
      dto.inherit ?? true,
      dto.sortOrder ?? 0,
      dto.isForceUse ?? false,
      now,
      context.userId,
    );

    const item = items[0];

    // Clear cache for affected talent(s)
    await this.clearCacheForOwner(dto.ownerType as OwnerType, dto.ownerId);

    return {
      ...item,
      createdAt: new Date(item.createdAt as unknown as string).toISOString(),
      updatedAt: new Date(item.updatedAt as unknown as string).toISOString(),
    };
  }

  /**
   * Update external blocklist pattern
   */
  async update(
    tenantSchema: string,
    id: string,
    dto: UpdateExternalBlocklistDto,
    context: RequestContext,
  ): Promise<ExternalBlocklistItem> {
    // Check existence and version
    const existing = await this.findById(tenantSchema, id);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'External blocklist pattern not found',
      });
    }

    if (existing.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.RES_CONFLICT,
        message: 'Version conflict. Please refresh and try again.',
      });
    }

    // Validate pattern for url_regex type
    if (dto.patternType === 'url_regex' && dto.pattern) {
      try {
        new RegExp(dto.pattern);
      } catch {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Invalid regex pattern',
        });
      }
    }

    const now = new Date().toISOString();

    // Build SET clause dynamically
    const setClauses: string[] = ['updated_at = $2::timestamptz', 'updated_by = $3::uuid', 'version = version + 1'];
    const params: (string | boolean | number | null)[] = [id, now, context.userId ?? null];
    let paramIndex = 4;

    const fields: Array<{ key: keyof UpdateExternalBlocklistDto; column: string }> = [
      { key: 'pattern', column: 'pattern' },
      { key: 'patternType', column: 'pattern_type' },
      { key: 'nameEn', column: 'name_en' },
      { key: 'nameZh', column: 'name_zh' },
      { key: 'nameJa', column: 'name_ja' },
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
        setClauses.push(`${column} = $${paramIndex++}`);
        params.push(dto[key] as string | boolean | number | null);
      }
    }

    const items = await prisma.$queryRawUnsafe<ExternalBlocklistItem[]>(`
      UPDATE "${tenantSchema}".external_blocklist_pattern
      SET ${setClauses.join(', ')}
      WHERE id = $1::uuid AND version = ${dto.version}
      RETURNING 
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
        inherit,
        sort_order as "sortOrder",
        is_active as "isActive",
        is_force_use as "isForceUse",
        is_system as "isSystem",
        created_at as "createdAt",
        updated_at as "updatedAt",
        version
    `, ...params);

    const item = items[0];

    if (!item) {
      throw new ConflictException({
        code: ErrorCodes.RES_CONFLICT,
        message: 'Update failed. Version conflict.',
      });
    }

    // Clear cache for affected talent(s)
    await this.clearCacheForOwner(existing.ownerType as OwnerType, existing.ownerId);

    return {
      ...item,
      createdAt: new Date(item.createdAt as unknown as string).toISOString(),
      updatedAt: new Date(item.updatedAt as unknown as string).toISOString(),
    };
  }

  /**
   * Delete external blocklist pattern
   */
  async delete(tenantSchema: string, id: string): Promise<void> {
    const existing = await this.findById(tenantSchema, id);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'External blocklist pattern not found',
      });
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM "${tenantSchema}".external_blocklist_pattern WHERE id = $1::uuid`,
      id,
    );

    // Clear cache for affected talent(s)
    await this.clearCacheForOwner(existing.ownerType as OwnerType, existing.ownerId);
  }

  /**
   * Batch toggle active status
   */
  async batchToggle(
    tenantSchema: string,
    ids: string[],
    isActive: boolean,
    context: RequestContext,
  ): Promise<{ updated: number }> {
    const now = new Date().toISOString();

    // Build the IN clause
    const placeholders = ids.map((_, i) => `$${i + 4}::uuid`).join(', ');

    const result = await prisma.$executeRawUnsafe(
      `
      UPDATE "${tenantSchema}".external_blocklist_pattern
      SET is_active = $1, updated_at = $2::timestamptz, updated_by = $3::uuid, version = version + 1
      WHERE id IN (${placeholders})
    `,
      isActive,
      now,
      context.userId ?? null,
      ...ids,
    );

    // Clear all caches (simplified approach)
    await this.clearAllCaches();

    return { updated: result as number };
  }

  /**
   * Disable inherited pattern in current scope
   */
  async disableInScope(
    tenantSchema: string,
    id: string,
    dto: DisableExternalBlocklistDto,
    userId: string,
  ): Promise<{ id: string; disabled: boolean }> {
    const { scopeType, scopeId } = dto;

    // Find the entry
    const entries = await prisma.$queryRawUnsafe<Array<{
      id: string;
      ownerType: string;
      ownerId: string | null;
      isForceUse: boolean;
      nameEn: string;
    }>>(`
      SELECT id, owner_type as "ownerType", owner_id as "ownerId", is_force_use as "isForceUse", name_en as "nameEn"
      FROM "${tenantSchema}".external_blocklist_pattern
      WHERE id = $1::uuid
    `, id);

    if (entries.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'External blocklist pattern not found',
      });
    }

    const entry = entries[0];

    // Check if it's inherited (not from current scope)
    if (entry.ownerType === scopeType && entry.ownerId === scopeId) {
      throw new BadRequestException({
        code: 'CONFIG_NOT_INHERITED',
        message: 'Can only disable inherited patterns',
      });
    }

    // Check if force use
    if (entry.isForceUse) {
      throw new BadRequestException({
        code: 'CONFIG_FORCE_USE',
        message: 'This pattern is set to force use and cannot be disabled',
      });
    }

    // Create or update override
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}".config_override 
        (id, entity_type, entity_id, owner_type, owner_id, is_disabled, created_at, updated_at, created_by, updated_by)
      VALUES 
        (gen_random_uuid(), 'external_blocklist_pattern', $1::uuid, $2, $3::uuid, true, now(), now(), $4::uuid, $4::uuid)
      ON CONFLICT (entity_type, entity_id, owner_type, COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO UPDATE SET is_disabled = true, updated_at = now(), updated_by = $4::uuid
    `, id, scopeType, scopeId, userId);

    // Clear cache
    await this.clearCacheForOwner(scopeType as OwnerType, scopeId);

    return { id, disabled: true };
  }

  /**
   * Enable previously disabled inherited pattern
   */
  async enableInScope(
    tenantSchema: string,
    id: string,
    dto: DisableExternalBlocklistDto,
  ): Promise<{ id: string; enabled: boolean }> {
    const { scopeType, scopeId } = dto;

    await prisma.$executeRawUnsafe(`
      DELETE FROM "${tenantSchema}".config_override
      WHERE entity_type = 'external_blocklist_pattern' 
        AND entity_id = $1::uuid 
        AND owner_type = $2 
        AND COALESCE(owner_id, '00000000-0000-0000-0000-000000000000') = COALESCE($3::uuid, '00000000-0000-0000-0000-000000000000')
    `, id, scopeType, scopeId);

    // Clear cache
    await this.clearCacheForOwner(scopeType as OwnerType, scopeId);

    return { id, enabled: true };
  }

  /**
   * Build scope chain for inheritance
   */
  private async getScopeChain(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null,
  ): Promise<Array<{ type: OwnerType; id: string | null }>> {
    const chain: Array<{ type: OwnerType; id: string | null }> = [];
    chain.push({ type: OwnerType.TENANT, id: null });

    if (scopeType === OwnerType.TENANT) {
      return chain;
    }

    if (scopeType === OwnerType.SUBSIDIARY && scopeId) {
      const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string; path: string }>>(`
        SELECT id, path FROM "${tenantSchema}".subsidiary WHERE id = $1::uuid
      `, scopeId);

      if (subsidiaries.length > 0) {
        const ancestors = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
          SELECT id FROM "${tenantSchema}".subsidiary 
          WHERE $1 LIKE path || '%' AND path != $1
          ORDER BY length(path)
        `, subsidiaries[0].path);

        for (const anc of ancestors) {
          chain.push({ type: OwnerType.SUBSIDIARY, id: anc.id });
        }
        chain.push({ type: OwnerType.SUBSIDIARY, id: scopeId });
      }
    }

    if (scopeType === OwnerType.TALENT && scopeId) {
      const talents = await prisma.$queryRawUnsafe<Array<{ subsidiaryId: string | null; path: string }>>(`
        SELECT subsidiary_id as "subsidiaryId", path FROM "${tenantSchema}".talent WHERE id = $1::uuid
      `, scopeId);

      if (talents.length > 0 && talents[0].subsidiaryId) {
        const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
          SELECT id FROM "${tenantSchema}".subsidiary 
          WHERE $1 LIKE path || '%'
          ORDER BY length(path)
        `, talents[0].path);

        for (const sub of subsidiaries) {
          chain.push({ type: OwnerType.SUBSIDIARY, id: sub.id });
        }
      }
      chain.push({ type: OwnerType.TALENT, id: scopeId });
    }

    return chain;
  }

  /**
   * Get disabled entry IDs for current scope
   */
  private async getDisabledIds(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null,
  ): Promise<Set<string>> {
    const overrides = await prisma.$queryRawUnsafe<Array<{ entityId: string }>>(`
      SELECT entity_id as "entityId" FROM "${tenantSchema}".config_override
      WHERE entity_type = 'external_blocklist_pattern' AND owner_type = $1 
        AND COALESCE(owner_id, '00000000-0000-0000-0000-000000000000') = COALESCE($2::uuid, '00000000-0000-0000-0000-000000000000')
        AND is_disabled = true
    `, scopeType, scopeId);

    return new Set(overrides.map((o) => o.entityId));
  }

  /**
   * Clear cache for affected owner
   */
  private async clearCacheForOwner(ownerType: OwnerType, ownerId: string | null | undefined): Promise<void> {
    if (ownerType === OwnerType.TALENT && ownerId) {
      await this.redisService.del(`external_blocklist:${ownerId}`);
    } else if (ownerType === OwnerType.TENANT || ownerType === OwnerType.SUBSIDIARY) {
      // Tenant/Subsidiary-level change affects all talents - clear all external_blocklist caches
      await this.clearAllCaches();
    }
  }

  /**
   * Clear all external blocklist caches
   */
  private async clearAllCaches(): Promise<void> {
    // Get all keys matching the pattern and delete them
    const keys = await this.redisService.keys('external_blocklist:*');
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redisService.del(key)));
    }
  }
}

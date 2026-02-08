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
import { ChangeLogService } from '../../log';
import {
    BlocklistListQueryDto,
    CreateBlocklistDto,
    DisableScopeDto,
    TestBlocklistDto,
    UpdateBlocklistDto,
} from '../dto/security.dto';
import { BlocklistMatcherService } from './blocklist-matcher.service';

export type OwnerType = 'tenant' | 'subsidiary' | 'talent';

export interface BlocklistEntryWithMeta {
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
  scope: string[];
  inherit: boolean;
  sortOrder: number;
  isActive: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  matchCount: number;
  lastMatchedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  version: number;
  // Inheritance metadata
  isInherited: boolean;
  isDisabledHere: boolean;
  canDisable: boolean;
}

@Injectable()
export class BlocklistService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
    private readonly matcherService: BlocklistMatcherService,
  ) {}

  /**
   * List blocklist entries with inheritance support
   */
  async findMany(
    tenantSchema: string,
    query: BlocklistListQueryDto
  ): Promise<{ items: BlocklistEntryWithMeta[]; total: number }> {
    const { 
      page = 1, 
      pageSize = 20, 
      scopeType = 'tenant',
      scopeId = null,
      category, 
      patternType, 
      scope, 
      includeInherited = true,
      includeDisabled = false,
      includeInactive = false,
    } = query;

    // Build scope chain for inheritance
    const scopeChain = await this.getScopeChain(tenantSchema, scopeType as OwnerType, scopeId);
    
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
    if (patternType) {
      conditions.push(`pattern_type = '${patternType}'`);
    }
    if (scope) {
      conditions.push(`'${scope}' = ANY(scope)`);
    }
    if (!includeInactive) {
      conditions.push(`is_active = true`);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * pageSize;

    // Count query
    const countResult = await prisma.$queryRawUnsafe<{ count: number }[]>(`
      SELECT COUNT(*)::int as count
      FROM "${tenantSchema}".blocklist_entry
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
      scope: string[];
      inherit: boolean;
      sortOrder: number;
      isActive: boolean;
      isForceUse: boolean;
      isSystem: boolean;
      matchCount: number;
      lastMatchedAt: Date | null;
      createdAt: Date;
      createdBy: string | null;
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
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // Get disabled IDs
    const disabledIds = await this.getDisabledIds(tenantSchema, scopeType as OwnerType, scopeId);

    // Filter and enrich with metadata
    const enrichedItems: BlocklistEntryWithMeta[] = items
      .filter(item => includeDisabled || !disabledIds.has(item.id))
      .map(item => {
        const isInherited = item.ownerType !== scopeType || item.ownerId !== scopeId;
        return {
          ...item,
          lastMatchedAt: item.lastMatchedAt ? new Date(item.lastMatchedAt).toISOString() : null,
          createdAt: new Date(item.createdAt).toISOString(),
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
   * Get entry by ID
   */
  async findById(id: string) {
    const prisma = this.databaseService.getPrisma();

    const entry = await prisma.blocklistEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Blocklist entry not found',
      });
    }

    return {
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      lastMatchedAt: entry.lastMatchedAt?.toISOString() ?? null,
    };
  }

  /**
   * Create entry
   */
  async create(dto: CreateBlocklistDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    // Validate regex pattern
    if (dto.patternType === 'regex') {
      try {
        new RegExp(dto.pattern);
      } catch {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Invalid regex pattern',
        });
      }
    }

    const entry = await prisma.$transaction(async (tx) => {
      const newEntry = await tx.blocklistEntry.create({
        data: {
          ownerType: dto.ownerType,
          ownerId: dto.ownerId ?? null,
          pattern: dto.pattern,
          patternType: dto.patternType,
          nameEn: dto.nameEn,
          nameZh: dto.nameZh,
          nameJa: dto.nameJa,
          description: dto.description,
          category: dto.category,
          severity: dto.severity,
          action: dto.action,
          replacement: dto.replacement,
          scope: dto.scope,
          inherit: dto.inherit,
          sortOrder: dto.sortOrder ?? 0,
          isActive: true,
          isForceUse: dto.isForceUse ?? false,
          matchCount: 0,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          createdBy: context.userId!,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          updatedBy: context.userId!,
        },
      });

      await this.changeLogService.create(tx, {
        action: 'create',
        objectType: 'blocklist_entry',
        objectId: newEntry.id,
        objectName: dto.nameEn,
        newValue: { pattern: dto.pattern, patternType: dto.patternType },
      }, context);

      return newEntry;
    });

    // Rebuild matcher
    await this.matcherService.rebuildMatcher();

    return this.findById(entry.id);
  }

  /**
   * Update entry
   */
  async update(id: string, dto: UpdateBlocklistDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const entry = await prisma.blocklistEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Blocklist entry not found',
      });
    }

    if (entry.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.VERSION_CONFLICT,
        message: 'Entry was modified by another user',
      });
    }

    // Validate regex pattern if changed
    if (dto.patternType === 'regex' && dto.pattern) {
      try {
        new RegExp(dto.pattern);
      } catch {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Invalid regex pattern',
        });
      }
    }

    const updateData: Record<string, unknown> = {};

    const fields = [
      'pattern', 'patternType', 'nameEn', 'nameZh', 'nameJa',
      'description', 'category', 'severity', 'action', 'replacement',
      'scope', 'inherit', 'sortOrder', 'isForceUse',
    ];

    for (const field of fields) {
      if (dto[field as keyof UpdateBlocklistDto] !== undefined) {
        updateData[field] = dto[field as keyof UpdateBlocklistDto];
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.blocklistEntry.update({
        where: { id },
        data: {
          ...updateData,
          updatedBy: context.userId,
          version: { increment: 1 },
        },
      });

      await this.changeLogService.create(tx, {
        action: 'update',
        objectType: 'blocklist_entry',
        objectId: id,
        objectName: entry.nameEn,
      }, context);
    });

    // Rebuild matcher
    await this.matcherService.rebuildMatcher();

    return this.findById(id);
  }

  /**
   * Delete entry (soft delete)
   */
  async delete(id: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const entry = await prisma.blocklistEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Blocklist entry not found',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.blocklistEntry.update({
        where: { id },
        data: {
          isActive: false,
          updatedBy: context.userId,
          version: { increment: 1 },
        },
      });

      await this.changeLogService.create(tx, {
        action: 'delete',
        objectType: 'blocklist_entry',
        objectId: id,
        objectName: entry.nameEn,
      }, context);
    });

    // Rebuild matcher
    await this.matcherService.rebuildMatcher();

    return { id, deleted: true };
  }

  /**
   * Test pattern
   */
  test(dto: TestBlocklistDto) {
    return this.matcherService.testPattern(
      dto.testContent,
      dto.pattern,
      dto.patternType,
    );
  }

  /**
   * Disable inherited blocklist entry in current scope
   */
  async disableInScope(
    tenantSchema: string,
    id: string,
    dto: DisableScopeDto,
    userId: string
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
      FROM "${tenantSchema}".blocklist_entry
      WHERE id = $1::uuid
    `, id);

    if (entries.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Blocklist entry not found',
      });
    }

    const entry = entries[0];

    // Check if it's inherited (not from current scope)
    if (entry.ownerType === scopeType && entry.ownerId === scopeId) {
      throw new BadRequestException({
        code: 'CONFIG_NOT_INHERITED',
        message: 'Can only disable inherited blocklist entries',
      });
    }

    // Check if force use
    if (entry.isForceUse) {
      throw new BadRequestException({
        code: 'CONFIG_FORCE_USE',
        message: 'This blocklist entry is set to force use and cannot be disabled',
      });
    }

    // Create or update override
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}".config_override 
        (id, entity_type, entity_id, owner_type, owner_id, is_disabled, created_at, updated_at, created_by, updated_by)
      VALUES 
        (gen_random_uuid(), 'blocklist_entry', $1::uuid, $2, $3::uuid, true, now(), now(), $4::uuid, $4::uuid)
      ON CONFLICT (entity_type, entity_id, owner_type, COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO UPDATE SET is_disabled = true, updated_at = now(), updated_by = $4::uuid
    `, id, scopeType, scopeId, userId);

    return { id, disabled: true };
  }

  /**
   * Enable previously disabled inherited blocklist entry
   */
  async enableInScope(
    tenantSchema: string,
    id: string,
    dto: DisableScopeDto
  ): Promise<{ id: string; enabled: boolean }> {
    const { scopeType, scopeId } = dto;

    await prisma.$executeRawUnsafe(`
      DELETE FROM "${tenantSchema}".config_override
      WHERE entity_type = 'blocklist_entry' 
        AND entity_id = $1::uuid 
        AND owner_type = $2 
        AND COALESCE(owner_id, '00000000-0000-0000-0000-000000000000') = COALESCE($3::uuid, '00000000-0000-0000-0000-000000000000')
    `, id, scopeType, scopeId);

    return { id, enabled: true };
  }

  /**
   * Build scope chain for inheritance
   */
  private async getScopeChain(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null
  ): Promise<Array<{ type: OwnerType; id: string | null }>> {
    const chain: Array<{ type: OwnerType; id: string | null }> = [];
    chain.push({ type: 'tenant', id: null });

    if (scopeType === 'tenant') {
      return chain;
    }

    if (scopeType === 'subsidiary' && scopeId) {
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
          chain.push({ type: 'subsidiary', id: anc.id });
        }
        chain.push({ type: 'subsidiary', id: scopeId });
      }
    }

    if (scopeType === 'talent' && scopeId) {
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
          chain.push({ type: 'subsidiary', id: sub.id });
        }
      }
      chain.push({ type: 'talent', id: scopeId });
    }

    return chain;
  }

  /**
   * Get disabled entry IDs for current scope
   */
  private async getDisabledIds(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null
  ): Promise<Set<string>> {
    const overrides = await prisma.$queryRawUnsafe<Array<{ entityId: string }>>(`
      SELECT entity_id as "entityId" FROM "${tenantSchema}".config_override
      WHERE entity_type = 'blocklist_entry' AND owner_type = $1 
        AND COALESCE(owner_id, '00000000-0000-0000-0000-000000000000') = COALESCE($2::uuid, '00000000-0000-0000-0000-000000000000')
        AND is_disabled = true
    `, scopeType, scopeId);

    return new Set(overrides.map(o => o.entityId));
  }
}

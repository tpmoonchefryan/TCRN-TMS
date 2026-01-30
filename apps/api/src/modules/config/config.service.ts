// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

import {
    BaseConfigEntity,
    CONFIG_EXTRA_FIELDS,
    CONFIG_HAS_AUDIT,
    CONFIG_HAS_CODE,
    CONFIG_HAS_DESCRIPTION,
    CONFIG_HAS_SORT_ORDER,
    CONFIG_HAS_SYSTEM_CONTROL,
    CONFIG_SCOPED_ENTITIES,
    CONFIG_TABLE_NAMES,
    ConfigEntityType,
    ConfigEntityWithMeta,
    OwnerType,
} from './config.types';

/**
 * Config Service
 * Generic CRUD operations for configuration entities
 */
@Injectable()
export class ConfigService {
  /**
   * List config entities with inheritance
   */
  async list(
    entityType: ConfigEntityType,
    tenantSchema: string,
    options: {
      scopeType?: OwnerType;
      scopeId?: string | null;
      includeInherited?: boolean;
      includeDisabled?: boolean;
      includeInactive?: boolean;
      ownerOnly?: boolean;
      search?: string;
      parentId?: string;
      page?: number;
      pageSize?: number;
      sort?: string;
      language?: string;
    } = {}
  ): Promise<{ data: ConfigEntityWithMeta[]; total: number }> {
    const tableName = CONFIG_TABLE_NAMES[entityType];
    const extraFields = CONFIG_EXTRA_FIELDS[entityType];
    const { 
      scopeType = 'tenant', 
      scopeId = null, 
      includeInherited = true, 
      includeDisabled = false,
      includeInactive = false,
      ownerOnly = false,
      search,
      parentId,
      page = 1, 
      pageSize = 50,
      sort,
      language = 'en',
    } = options;

    const isScoped = CONFIG_SCOPED_ENTITIES.has(entityType);
    const scopeOwnerFields = isScoped 
      ? 'owner_type as "ownerType", owner_id as "ownerId",' 
      : 'NULL as "ownerType", NULL as "ownerId",';

    // Build scope chain for inheritance
    // Only irrelevant if not scoped, but we keep the variable for structure
    const scopeChain = await this.getScopeChain(tenantSchema, scopeType, scopeId);
    
    // Build WHERE clause
    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (isScoped) {
      if (ownerOnly) {
        // Only items from current scope
        if (scopeId) {
          whereClause += ` AND owner_type = $${paramIndex++} AND owner_id = $${paramIndex++}::uuid`;
          params.push(scopeType, scopeId);
        } else {
          whereClause += ` AND owner_type = 'tenant' AND owner_id IS NULL`;
        }
      } else if (includeInherited) {
        // Items from all scopes in the chain
        const scopeConditions = scopeChain.map((scope) => {
          if (scope.id === null) {
            return `(owner_type = '${scope.type}' AND owner_id IS NULL)`;
          }
          return `(owner_type = '${scope.type}' AND owner_id = '${scope.id}')`;
        });
        whereClause += ` AND (${scopeConditions.join(' OR ')})`;
      }
    }

    if (!includeInactive) {
      whereClause += ' AND is_active = true';
    }

    const hasCode = CONFIG_HAS_CODE.has(entityType);
    if (search) {
      if (hasCode) {
        whereClause += ` AND (code ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex} OR name_zh ILIKE $${paramIndex})`;
      } else {
        // For entities without code field (e.g., blocklist-entries), search by name only
        whereClause += ` AND (name_en ILIKE $${paramIndex} OR name_zh ILIKE $${paramIndex})`;
      }
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Handle parent_id for hierarchical entities
    if (parentId !== undefined) {
      const parentField = this.getParentField(entityType);
      if (parentField) {
        // Cast to UUID for parent field comparisons
        whereClause += ` AND ${parentField} = $${paramIndex++}::uuid`;
        params.push(parentId);
      }
    }

    // Build ORDER BY
    const hasSortOrder = CONFIG_HAS_SORT_ORDER.has(entityType);
    let orderBy = hasSortOrder 
      ? (hasCode ? 'sort_order ASC, code ASC' : 'sort_order ASC, name_en ASC')
      : (hasCode ? 'code ASC' : 'name_en ASC');
    if (sort) {
      const isDesc = sort.startsWith('-');
      const field = isDesc ? sort.substring(1) : sort;
      const fieldMap: Record<string, string> = {
        code: hasCode ? 'code' : 'name_en',
        name: 'name_en',
        sortOrder: hasSortOrder ? 'sort_order' : 'name_en',
        createdAt: 'created_at',
      };
      const dbField = fieldMap[field] || (hasSortOrder ? 'sort_order' : 'name_en');
      orderBy = `${dbField} ${isDesc ? 'DESC' : 'ASC'}`;
    }

    const extraFieldsSelect = extraFields.length > 0 
      ? ', ' + extraFields.map(f => `${f} as "${this.snakeToCamel(f)}"`).join(', ')
      : '';

    const hasDesc = CONFIG_HAS_DESCRIPTION.has(entityType);
    const hasSys = CONFIG_HAS_SYSTEM_CONTROL.has(entityType);
    const hasAudit = CONFIG_HAS_AUDIT.has(entityType);
    
    const codeField = hasCode ? 'code,' : 'NULL as code,';
    const sortOrderField = hasSortOrder ? 'sort_order as "sortOrder",' : '0 as "sortOrder",';
    
    const descFields = hasDesc 
      ? `description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",`
      : `NULL as "descriptionEn", NULL as "descriptionZh", NULL as "descriptionJa",`;
      
    const sysFields = hasSys
      ? `is_force_use as "isForceUse", is_system as "isSystem",`
      : `false as "isForceUse", false as "isSystem",`; 
      
    const auditFields = hasAudit
      ? `created_by as "createdBy", updated_by as "updatedBy",`
      : `NULL as "createdBy", NULL as "updatedBy",`;

    // Get total count
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${tenantSchema}".${tableName} WHERE ${whereClause}
    `, ...params);
    const total = Number(countResult[0]?.count || 0);

    // Get data
    const offset = (page - 1) * pageSize;
    const data = await prisma.$queryRawUnsafe<Array<BaseConfigEntity & Record<string, unknown>>>(`
      SELECT 
        id, ${scopeOwnerFields} ${codeField}
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        ${descFields}
        ${sortOrderField} is_active as "isActive", ${sysFields}
        created_at as "createdAt", updated_at as "updatedAt", ${auditFields} version
        ${extraFieldsSelect}
      FROM "${tenantSchema}".${tableName}
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${pageSize} OFFSET ${offset}
    `, ...params);

    // Get overrides for current scope
    const overrides = includeDisabled 
      ? new Set<string>()
      : await this.getDisabledIds(tenantSchema, entityType, scopeType, scopeId);

    // Enrich with metadata
    const enrichedData: ConfigEntityWithMeta[] = data
      .filter(item => includeDisabled || !overrides.has(item.id))
      .map(item => ({
        ...item,
        name: this.getLocalizedField(item, 'name', language),
        description: this.getLocalizedField(item, 'description', language),
        ownerName: null, // Would need a join to get this
        isInherited: item.ownerType !== scopeType || item.ownerId !== scopeId,
        isDisabledHere: overrides.has(item.id),
        canDisable: !item.isForceUse && (item.ownerType !== scopeType || item.ownerId !== scopeId),
      } as ConfigEntityWithMeta));

    return { data: enrichedData, total };
  }

  /**
   * Get single config entity
   */
  async findById(
    entityType: ConfigEntityType,
    id: string,
    tenantSchema: string,
    language: string = 'en'
  ): Promise<ConfigEntityWithMeta | null> {
    const tableName = CONFIG_TABLE_NAMES[entityType];
    const extraFields = CONFIG_EXTRA_FIELDS[entityType];
    
    const extraFieldsSelect = extraFields.length > 0 
      ? ', ' + extraFields.map(f => `${f} as "${this.snakeToCamel(f)}"`).join(', ')
      : '';

    const isScoped = CONFIG_SCOPED_ENTITIES.has(entityType);
    const scopeOwnerFields = isScoped 
      ? 'owner_type as "ownerType", owner_id as "ownerId",' 
      : 'NULL as "ownerType", NULL as "ownerId",';

    const hasCode = CONFIG_HAS_CODE.has(entityType);
    const hasSortOrder = CONFIG_HAS_SORT_ORDER.has(entityType);
    const hasDesc = CONFIG_HAS_DESCRIPTION.has(entityType);
    const hasSys = CONFIG_HAS_SYSTEM_CONTROL.has(entityType);
    const hasAudit = CONFIG_HAS_AUDIT.has(entityType);
    
    const codeField = hasCode ? 'code,' : 'NULL as code,';
    const sortOrderField = hasSortOrder ? 'sort_order as "sortOrder",' : '0 as "sortOrder",';
    
    const descFields = hasDesc 
      ? `description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",`
      : `NULL as "descriptionEn", NULL as "descriptionZh", NULL as "descriptionJa",`;
      
    const sysFields = hasSys
      ? `is_force_use as "isForceUse", is_system as "isSystem",`
      : `false as "isForceUse", false as "isSystem",`; 
      
    const auditFields = hasAudit
      ? `created_by as "createdBy", updated_by as "updatedBy",`
      : `NULL as "createdBy", NULL as "updatedBy",`;

    const results = await prisma.$queryRawUnsafe<Array<BaseConfigEntity & Record<string, unknown>>>(`
      SELECT 
        id, ${scopeOwnerFields} ${codeField}
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        ${descFields}
        ${sortOrderField} is_active as "isActive", ${sysFields}
        created_at as "createdAt", updated_at as "updatedAt", ${auditFields} version
        ${extraFieldsSelect}
      FROM "${tenantSchema}".${tableName}
      WHERE id = $1::uuid
    `, id);

    if (results.length === 0) {
      return null;
    }

    const item = results[0];
    return {
      ...item,
      name: this.getLocalizedField(item, 'name', language),
      description: this.getLocalizedField(item, 'description', language),
      ownerName: null,
      isInherited: false,
      isDisabledHere: false,
      canDisable: false,
    } as ConfigEntityWithMeta;
  }

  /**
   * Create config entity
   */
  async create(
    entityType: ConfigEntityType,
    tenantSchema: string,
    data: {
      code?: string;
      nameEn: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      sortOrder?: number;
      isForceUse?: boolean;
      ownerType?: OwnerType;
      ownerId?: string | null;
      [key: string]: unknown;
    },
    userId: string
  ): Promise<BaseConfigEntity> {
    const tableName = CONFIG_TABLE_NAMES[entityType];
    const extraFields = CONFIG_EXTRA_FIELDS[entityType];

    const isScoped = CONFIG_SCOPED_ENTITIES.has(entityType);
    const hasCode = CONFIG_HAS_CODE.has(entityType);
    const hasSortOrder = CONFIG_HAS_SORT_ORDER.has(entityType);

    // Check code uniqueness globally within tenant schema (regardless of scope)
    if (hasCode && data.code) {
      const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${tenantSchema}".${tableName}
        WHERE code = $1
      `, data.code);

      if (existing.length > 0) {
        throw new BadRequestException({
          code: ErrorCodes.CODE_ALREADY_EXISTS,
          message: `Code '${data.code}' already exists`,
        });
      }
    }

    // Build INSERT - start with minimal fields
    const baseFields = ['id', 'name_en', 'name_zh', 'name_ja', 'is_active', 'created_at', 'updated_at', 'version'];
    const baseValues = ['gen_random_uuid()', '$1', '$2', '$3', 'true', 'now()', 'now()', '1'];
    const baseParams: (string | number | boolean | null)[] = [data.nameEn, data.nameZh || null, data.nameJa || null];

    // Add code field if entity supports it
    if (hasCode && data.code) {
      baseFields.push('code');
      baseValues.push(`$${baseParams.length + 1}`);
      baseParams.push(data.code);
    }

    // Add sort_order field if entity supports it
    if (hasSortOrder) {
      baseFields.push('sort_order');
      baseValues.push(`$${baseParams.length + 1}`);
      baseParams.push(data.sortOrder || 0);
    }

    const hasDesc = CONFIG_HAS_DESCRIPTION.has(entityType);
    const hasSys = CONFIG_HAS_SYSTEM_CONTROL.has(entityType);
    const hasAudit = CONFIG_HAS_AUDIT.has(entityType);

    if (hasDesc) {
      baseFields.push('description_en', 'description_zh', 'description_ja');
      baseValues.push(`$${baseParams.length + 1}`, `$${baseParams.length + 2}`, `$${baseParams.length + 3}`);
      baseParams.push(data.descriptionEn || null, data.descriptionZh || null, data.descriptionJa || null);
    }

    if (hasSys) {
      baseFields.push('is_force_use', 'is_system');
      baseValues.push(`$${baseParams.length + 1}`, 'false');
      baseParams.push(data.isForceUse || false);
    }

    if (hasAudit) {
      baseFields.push('created_by', 'updated_by');
      baseValues.push(`$${baseParams.length + 1}::uuid`, `$${baseParams.length + 1}::uuid`);
      baseParams.push(userId);
    }

    if (isScoped) {
      baseFields.push('owner_type');
      baseFields.push('owner_id');
      baseValues.push(`$${baseParams.length + 1}`);
      baseValues.push(`$${baseParams.length + 2}::uuid`);
      baseParams.push(data.ownerType || 'tenant');
      baseParams.push(data.ownerId || null);
    }

    // Add extra fields
    let paramIndex = baseParams.length + 1;
    for (const field of extraFields) {
      const camelField = this.snakeToCamel(field);
      if (data[camelField] !== undefined) {
        baseFields.push(field);
        baseValues.push(`$${paramIndex++}`);
        baseParams.push(data[camelField] as string | number | boolean);
      }
    }

    const extraFieldsReturn = extraFields.length > 0 
      ? ', ' + extraFields.map(f => `${f} as "${this.snakeToCamel(f)}"`).join(', ')
      : '';
    
    const scopeOwnerFields = isScoped 
      ? 'owner_type as "ownerType", owner_id as "ownerId",' 
      : 'NULL as "ownerType", NULL as "ownerId",';
    
    const codeFieldReturn = hasCode ? 'code,' : 'NULL as code,';
    const sortOrderFieldReturn = hasSortOrder ? 'sort_order as "sortOrder",' : '0 as "sortOrder",';
      
    const descFields = hasDesc 
      ? `description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",`
      : `NULL as "descriptionEn", NULL as "descriptionZh", NULL as "descriptionJa",`;
      
    const sysFields = hasSys
      ? `is_force_use as "isForceUse", is_system as "isSystem",`
      : `false as "isForceUse", false as "isSystem",`; 
      
    const auditFields = hasAudit
      ? `created_by as "createdBy", updated_by as "updatedBy",`
      : `NULL as "createdBy", NULL as "updatedBy",`;

    const results = await prisma.$queryRawUnsafe<BaseConfigEntity[]>(`
      INSERT INTO "${tenantSchema}".${tableName} (${baseFields.join(', ')})
      VALUES (${baseValues.join(', ')})
      RETURNING 
        id, ${scopeOwnerFields} ${codeFieldReturn}
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        ${descFields}
        ${sortOrderFieldReturn} is_active as "isActive", ${sysFields}
        created_at as "createdAt", updated_at as "updatedAt", ${auditFields} version
        ${extraFieldsReturn}
      `, ...baseParams);

    return results[0];
  }

  /**
   * Update config entity
   */
  async update(
    entityType: ConfigEntityType,
    id: string,
    tenantSchema: string,
    data: {
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      sortOrder?: number;
      isForceUse?: boolean;
      version: number;
      [key: string]: unknown;
    },
    userId: string
  ): Promise<BaseConfigEntity> {
    const tableName = CONFIG_TABLE_NAMES[entityType];
    const extraFields = CONFIG_EXTRA_FIELDS[entityType];

    const current = await this.findById(entityType, id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Config entity not found',
      });
    }

    if (current.version !== data.version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    const hasCode = CONFIG_HAS_CODE.has(entityType);
    const hasSortOrder = CONFIG_HAS_SORT_ORDER.has(entityType);
    const hasDesc = CONFIG_HAS_DESCRIPTION.has(entityType);
    const hasSys = CONFIG_HAS_SYSTEM_CONTROL.has(entityType);
    const hasAudit = CONFIG_HAS_AUDIT.has(entityType);

    // Build UPDATE
    const updates: string[] = [];
    const params: unknown[] = [id];
    let paramIndex = 2;
    
    // If hasAudit, we need to include userId for updated_by
    if (hasAudit) {
      params.push(userId);
      paramIndex = 3;
    }

    // Build field mappings based on table structure
    const fieldMappings: Record<string, string> = {
      nameEn: 'name_en',
      nameZh: 'name_zh',
      nameJa: 'name_ja',
    };
    
    // Only add sortOrder mapping if entity supports it
    if (hasSortOrder) {
      fieldMappings['sortOrder'] = 'sort_order';
    }
    
    if (hasDesc) {
      fieldMappings['descriptionEn'] = 'description_en';
      fieldMappings['descriptionZh'] = 'description_zh';
      fieldMappings['descriptionJa'] = 'description_ja';
    }
    
    if (hasSys) {
      fieldMappings['isForceUse'] = 'is_force_use';
    }

    for (const [key, dbField] of Object.entries(fieldMappings)) {
      if (data[key] !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        params.push(data[key]);
      }
    }

    // Handle extra fields
    for (const field of extraFields) {
      const camelField = this.snakeToCamel(field);
      if (data[camelField] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push(data[camelField]);
      }
    }

    updates.push('updated_at = now()');
    if (hasAudit) {
      // userId is at index 2 ($2) if hasAudit is true
      updates.push('updated_by = $2::uuid');
    }
    updates.push('version = version + 1');

    const extraFieldsReturn = extraFields.length > 0 
      ? ', ' + extraFields.map(f => `${f} as "${this.snakeToCamel(f)}"`).join(', ')
      : '';

    const isScoped = CONFIG_SCOPED_ENTITIES.has(entityType);
    const scopeOwnerFields = isScoped 
      ? 'owner_type as "ownerType", owner_id as "ownerId",' 
      : 'NULL as "ownerType", NULL as "ownerId",';
    
    const codeFieldReturn = hasCode ? 'code,' : 'NULL as code,';
    const sortOrderFieldReturn = hasSortOrder ? 'sort_order as "sortOrder",' : '0 as "sortOrder",';
      
    const descFields = hasDesc 
      ? `description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",`
      : `NULL as "descriptionEn", NULL as "descriptionZh", NULL as "descriptionJa",`;
      
    const sysFields = hasSys
      ? `is_force_use as "isForceUse", is_system as "isSystem",`
      : `false as "isForceUse", false as "isSystem",`; 
      
    const auditFields = hasAudit
      ? `created_by as "createdBy", updated_by as "updatedBy",`
      : `NULL as "createdBy", NULL as "updatedBy",`;

    const results = await prisma.$queryRawUnsafe<BaseConfigEntity[]>(`
      UPDATE "${tenantSchema}".${tableName}
      SET ${updates.join(', ')}
      WHERE id = $1::uuid
      RETURNING 
        id, ${scopeOwnerFields} ${codeFieldReturn}
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        ${descFields}
        ${sortOrderFieldReturn} is_active as "isActive", ${sysFields}
        created_at as "createdAt", updated_at as "updatedAt", ${auditFields} version
        ${extraFieldsReturn}
    `, ...params);

    return results[0];
  }

  /**
   * Deactivate config entity
   */
  async deactivate(
    entityType: ConfigEntityType,
    id: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<BaseConfigEntity> {
    const tableName = CONFIG_TABLE_NAMES[entityType];

    const current = await this.findById(entityType, id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Config entity not found',
      });
    }

    if (current.isSystem) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Cannot deactivate system config',
      });
    }

    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".${tableName}
      SET is_active = false, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1::uuid
    `, id, userId);

    const deactivated = await this.findById(entityType, id, tenantSchema);
    if (!deactivated) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Config entity not found after deactivation',
      });
    }
    return deactivated;
  }

  /**
   * Reactivate config entity
   */
  async reactivate(
    entityType: ConfigEntityType,
    id: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<BaseConfigEntity> {
    const tableName = CONFIG_TABLE_NAMES[entityType];

    const current = await this.findById(entityType, id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Config entity not found',
      });
    }

    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".${tableName}
      SET is_active = true, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1::uuid
    `, id, userId);

    const reactivated = await this.findById(entityType, id, tenantSchema);
    if (!reactivated) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Config entity not found after reactivation',
      });
    }
    return reactivated;
  }

  /**
   * Disable inherited config in current scope
   */
  async disableInScope(
    entityType: ConfigEntityType,
    id: string,
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string,
    userId: string
  ): Promise<void> {
    const tableName = CONFIG_TABLE_NAMES[entityType];

    const isScoped = CONFIG_SCOPED_ENTITIES.has(entityType);
    if (!isScoped) {
      throw new BadRequestException({
        code: 'CONFIG_NOT_SCOPED',
        message: 'This config entity does not support inheritance scoping',
      });
    }

    const current = await this.findById(entityType, id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Config entity not found',
      });
    }

    // Check if it's inherited (not from current scope)
    if (current.ownerType === scopeType && current.ownerId === scopeId) {
      throw new BadRequestException({
        code: 'CONFIG_NOT_INHERITED',
        message: 'Can only disable inherited configs',
      });
    }

    // Check if force use
    if (current.isForceUse) {
      throw new BadRequestException({
        code: 'CONFIG_FORCE_USE',
        message: 'This config is set to force use and cannot be disabled',
      });
    }

    // Create or update override
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}".config_override 
        (id, entity_type, entity_id, owner_type, owner_id, is_disabled, created_at, created_by)
      VALUES 
        (gen_random_uuid(), $1::uuid, $2, $3, $4, true, now(), $5)
      ON CONFLICT (entity_type, entity_id, owner_type, COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO UPDATE SET is_disabled = true
    `, tableName, id, scopeType, scopeId, userId);
  }

  /**
   * Enable previously disabled inherited config
   */
  async enableInScope(
    entityType: ConfigEntityType,
    id: string,
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string
  ): Promise<void> {
    const tableName = CONFIG_TABLE_NAMES[entityType];

    const isScoped = CONFIG_SCOPED_ENTITIES.has(entityType);
    if (!isScoped) {
      // Nothing to do if not scoped, or throw error. 
      // Silently return is safer for now.
      return;
    }

    await prisma.$executeRawUnsafe(`
      DELETE FROM "${tenantSchema}".config_override
      WHERE entity_type = $1 AND entity_id = $2::uuid AND owner_type = $3 
        AND COALESCE(owner_id, '00000000-0000-0000-0000-000000000000') = COALESCE($4::uuid, '00000000-0000-0000-0000-000000000000')
    `, tableName, id, scopeType, scopeId);
  }

  /**
   * Get complete membership tree structure
   * Returns: Class -> Type -> Level hierarchy
   */
  async getMembershipTree(
    tenantSchema: string,
    options: {
      scopeType?: OwnerType;
      scopeId?: string | null;
      includeInactive?: boolean;
      language?: string;
    } = {}
  ): Promise<Array<{
    id: string;
    code: string;
    name: string;
    nameEn: string;
    nameZh: string | null;
    nameJa: string | null;
    sortOrder: number;
    isActive: boolean;
    types: Array<{
      id: string;
      code: string;
      name: string;
      nameEn: string;
      nameZh: string | null;
      nameJa: string | null;
      classId: string;
      externalControl: boolean;
      defaultRenewalDays: number;
      sortOrder: number;
      isActive: boolean;
      levels: Array<{
        id: string;
        code: string;
        name: string;
        nameEn: string;
        nameZh: string | null;
        nameJa: string | null;
        typeId: string;
        rank: number;
        color: string | null;
        badgeUrl: string | null;
        sortOrder: number;
        isActive: boolean;
      }>;
    }>;
  }>> {
    const { 
      scopeType = 'tenant', 
      scopeId = null, 
      includeInactive = false,
      language = 'en',
    } = options;

    // Build scope chain for inheritance
    const scopeChain = await this.getScopeChain(tenantSchema, scopeType, scopeId);
    
    // Build scope conditions for membership_class (only scoped entity)
    const scopeConditions = scopeChain.map((scope) => {
      if (scope.id === null) {
        return `(owner_type = '${scope.type}' AND owner_id IS NULL)`;
      }
      return `(owner_type = '${scope.type}' AND owner_id = '${scope.id}')`;
    });

    const activeClause = includeInactive ? '' : 'AND is_active = true';

    // Get all membership classes in scope
    const classes = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
      nameZh: string | null;
      nameJa: string | null;
      sortOrder: number;
      isActive: boolean;
    }>>(`
      SELECT 
        id, code, 
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        sort_order as "sortOrder", is_active as "isActive"
      FROM "${tenantSchema}".membership_class
      WHERE (${scopeConditions.join(' OR ')}) ${activeClause}
      ORDER BY sort_order ASC, code ASC
    `);

    if (classes.length === 0) {
      return [];
    }

    const classIds = classes.map(c => c.id);

    // Get all membership types for these classes
    const types = await prisma.$queryRawUnsafe<Array<{
      id: string;
      membershipClassId: string;
      code: string;
      nameEn: string;
      nameZh: string | null;
      nameJa: string | null;
      externalControl: boolean;
      defaultRenewalDays: number;
      sortOrder: number;
      isActive: boolean;
    }>>(`
      SELECT 
        id, membership_class_id as "membershipClassId", code,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        external_control as "externalControl", default_renewal_days as "defaultRenewalDays",
        sort_order as "sortOrder", is_active as "isActive"
      FROM "${tenantSchema}".membership_type
      WHERE membership_class_id = ANY($1::uuid[]) ${activeClause}
      ORDER BY sort_order ASC, code ASC
    `, classIds);

    const typeIds = types.map(t => t.id);

    // Get all membership levels for these types
    const levels = typeIds.length > 0 
      ? await prisma.$queryRawUnsafe<Array<{
          id: string;
          membershipTypeId: string;
          code: string;
          nameEn: string;
          nameZh: string | null;
          nameJa: string | null;
          rank: number;
          color: string | null;
          badgeUrl: string | null;
          sortOrder: number;
          isActive: boolean;
        }>>(`
          SELECT 
            id, membership_type_id as "membershipTypeId", code,
            name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
            rank, color, badge_url as "badgeUrl",
            sort_order as "sortOrder", is_active as "isActive"
          FROM "${tenantSchema}".membership_level
          WHERE membership_type_id = ANY($1::uuid[]) ${activeClause}
          ORDER BY rank ASC, sort_order ASC, code ASC
        `, typeIds)
      : [];

    // Group levels by type
    const levelsByType = new Map<string, typeof levels>();
    for (const level of levels) {
      if (!levelsByType.has(level.membershipTypeId)) {
        levelsByType.set(level.membershipTypeId, []);
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      levelsByType.get(level.membershipTypeId)!.push(level);
    }

    // Group types by class
    const typesByClass = new Map<string, typeof types>();
    for (const type of types) {
      if (!typesByClass.has(type.membershipClassId)) {
        typesByClass.set(type.membershipClassId, []);
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      typesByClass.get(type.membershipClassId)!.push(type);
    }

    // Build the tree
    return classes.map(cls => ({
      id: cls.id,
      code: cls.code,
      name: this.getLocalizedField(cls, 'name', language) || cls.nameEn,
      nameEn: cls.nameEn,
      nameZh: cls.nameZh,
      nameJa: cls.nameJa,
      sortOrder: cls.sortOrder,
      isActive: cls.isActive,
      types: (typesByClass.get(cls.id) || []).map(type => ({
        id: type.id,
        code: type.code,
        name: this.getLocalizedField(type, 'name', language) || type.nameEn,
        nameEn: type.nameEn,
        nameZh: type.nameZh,
        nameJa: type.nameJa,
        classId: type.membershipClassId,
        externalControl: type.externalControl,
        defaultRenewalDays: type.defaultRenewalDays,
        sortOrder: type.sortOrder,
        isActive: type.isActive,
        levels: (levelsByType.get(type.id) || []).map(level => ({
          id: level.id,
          code: level.code,
          name: this.getLocalizedField(level, 'name', language) || level.nameEn,
          nameEn: level.nameEn,
          nameZh: level.nameZh,
          nameJa: level.nameJa,
          typeId: level.membershipTypeId,
          rank: level.rank,
          color: level.color,
          badgeUrl: level.badgeUrl,
          sortOrder: level.sortOrder,
          isActive: level.isActive,
        })),
      })),
    }));
  }

  // Helper methods
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

  private async getDisabledIds(
    tenantSchema: string,
    entityType: ConfigEntityType,
    scopeType: OwnerType,
    scopeId: string | null
  ): Promise<Set<string>> {
    const tableName = CONFIG_TABLE_NAMES[entityType];
    
    const overrides = await prisma.$queryRawUnsafe<Array<{ entityId: string }>>(`
      SELECT entity_id as "entityId" FROM "${tenantSchema}".config_override
      WHERE entity_type = $1 AND owner_type = $2 
        AND COALESCE(owner_id, '00000000-0000-0000-0000-000000000000') = COALESCE($3::uuid, '00000000-0000-0000-0000-000000000000')
        AND is_disabled = true
    `, tableName, scopeType, scopeId);

    return new Set(overrides.map(o => o.entityId));
  }

  private getLocalizedField(
    entity: Record<string, unknown>,
    field: 'name' | 'description',
    language: string
  ): string | null {
    const enField = `${field}En`;
    const zhField = `${field}Zh`;
    const jaField = `${field}Ja`;

    switch (language) {
      case 'zh':
        return (entity[zhField] as string | null) || (entity[enField] as string | null);
      case 'ja':
        return (entity[jaField] as string | null) || (entity[enField] as string | null);
      default:
        return entity[enField] as string | null;
    }
  }

  private getParentField(entityType: ConfigEntityType): string | null {
    const parentFields: Partial<Record<ConfigEntityType, string>> = {
      'communication-type': 'channel_category_id',
      'inactivation-reason': 'reason_category_id',
      'membership-type': 'membership_class_id',
      'membership-level': 'membership_type_id',
    };
    return parentFields[entityType] || null;
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

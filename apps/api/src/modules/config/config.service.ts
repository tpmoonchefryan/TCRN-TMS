// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes, normalizeSupportedUiLocale, resolveTrilingualLocaleFamily } from '@tcrn/shared';

import {
    BaseConfigEntity,
    CONFIG_EXTRA_FIELDS,
    CONFIG_HAS_AUDIT,
    CONFIG_HAS_CODE,
    CONFIG_HAS_DESCRIPTION,
    CONFIG_HAS_EXTRA_DATA,
    CONFIG_HAS_SORT_ORDER,
    CONFIG_HAS_SYSTEM_CONTROL,
    CONFIG_SCOPED_ENTITIES,
    CONFIG_TABLE_NAMES,
    ConfigEntityType,
    ConfigEntityWithMeta,
    OwnerType,
} from './config.types';

type TranslationMap = Record<string, string>;

interface ConfigTranslationPayload {
  descriptionTranslations: TranslationMap;
  extraData: Record<string, unknown> | null;
  legacyFields: Record<string, string | null | undefined>;
  contentTranslations: TranslationMap;
  translations: TranslationMap;
}

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
    const hasExtraData = CONFIG_HAS_EXTRA_DATA.has(entityType);
    
    const codeField = hasCode ? 'code,' : 'NULL as code,';
    const sortOrderField = hasSortOrder ? 'sort_order as "sortOrder",' : '0 as "sortOrder",';
    const extraDataField = hasExtraData ? 'extra_data as "extraData",' : 'NULL::jsonb as "extraData",';
    
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
        ${extraDataField}
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
        ...this.decorateEntity(entityType, item, language),
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
    const hasExtraData = CONFIG_HAS_EXTRA_DATA.has(entityType);
    
    const codeField = hasCode ? 'code,' : 'NULL as code,';
    const sortOrderField = hasSortOrder ? 'sort_order as "sortOrder",' : '0 as "sortOrder",';
    const extraDataField = hasExtraData ? 'extra_data as "extraData",' : 'NULL::jsonb as "extraData",';
    
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
        ${extraDataField}
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
      ...this.decorateEntity(entityType, item, language),
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
      translations?: Record<string, string>;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      descriptionTranslations?: Record<string, string>;
      contentTranslations?: Record<string, string>;
      extraData?: Record<string, unknown>;
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
    const hasExtraData = CONFIG_HAS_EXTRA_DATA.has(entityType);
    const translationPayload = this.prepareTranslationPayload(entityType, data);
    const normalizedData = {
      ...data,
      ...translationPayload.legacyFields,
    };

    // Check code uniqueness globally within tenant schema (regardless of scope)
    if (hasCode && normalizedData.code) {
      const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${tenantSchema}".${tableName}
        WHERE code = $1
      `, normalizedData.code);

      if (existing.length > 0) {
        throw new BadRequestException({
          code: ErrorCodes.CODE_ALREADY_EXISTS,
          message: `Code '${normalizedData.code}' already exists`,
        });
      }
    }

    // Build INSERT - start with minimal fields
    const baseFields = ['id', 'name_en', 'name_zh', 'name_ja', 'is_active', 'created_at', 'updated_at', 'version'];
    const baseValues = ['gen_random_uuid()', '$1', '$2', '$3', 'true', 'now()', 'now()', '1'];
    const baseParams: unknown[] = [
      normalizedData.nameEn,
      normalizedData.nameZh ?? null,
      normalizedData.nameJa ?? null,
    ];

    // Add code field if entity supports it
    if (hasCode && normalizedData.code) {
      baseFields.push('code');
      baseValues.push(`$${baseParams.length + 1}`);
      baseParams.push(normalizedData.code);
    }

    // Add sort_order field if entity supports it
    if (hasSortOrder) {
      baseFields.push('sort_order');
      baseValues.push(`$${baseParams.length + 1}`);
      baseParams.push(normalizedData.sortOrder || 0);
    }

    const hasDesc = CONFIG_HAS_DESCRIPTION.has(entityType);
    const hasSys = CONFIG_HAS_SYSTEM_CONTROL.has(entityType);
    const hasAudit = CONFIG_HAS_AUDIT.has(entityType);

    if (hasDesc) {
      baseFields.push('description_en', 'description_zh', 'description_ja');
      baseValues.push(`$${baseParams.length + 1}`, `$${baseParams.length + 2}`, `$${baseParams.length + 3}`);
      baseParams.push(
        normalizedData.descriptionEn ?? null,
        normalizedData.descriptionZh ?? null,
        normalizedData.descriptionJa ?? null,
      );
    }

    if (hasExtraData) {
      baseFields.push('extra_data');
      baseValues.push(`$${baseParams.length + 1}::jsonb`);
      baseParams.push(translationPayload.extraData ? JSON.stringify(translationPayload.extraData) : null);
    }

    if (hasSys) {
      baseFields.push('is_force_use', 'is_system');
      baseValues.push(`$${baseParams.length + 1}`, 'false');
      baseParams.push(normalizedData.isForceUse || false);
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
      baseParams.push(normalizedData.ownerType || 'tenant');
      baseParams.push(normalizedData.ownerId || null);
    }

    // Add extra fields
    let paramIndex = baseParams.length + 1;
    for (const field of extraFields) {
      const camelField = this.snakeToCamel(field);
      if (normalizedData[camelField] !== undefined) {
        baseFields.push(field);
        baseValues.push(`$${paramIndex++}`);
        baseParams.push(normalizedData[camelField]);
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
    const extraDataFieldReturn = hasExtraData ? 'extra_data as "extraData",' : 'NULL::jsonb as "extraData",';
      
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
        ${extraDataFieldReturn}
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
      translations?: Record<string, string>;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      descriptionTranslations?: Record<string, string>;
      contentTranslations?: Record<string, string>;
      extraData?: Record<string, unknown>;
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
    const hasExtraData = CONFIG_HAS_EXTRA_DATA.has(entityType);
    const translationPayload = this.prepareTranslationPayload(entityType, data, current);
    const normalizedData = {
      ...data,
      ...translationPayload.legacyFields,
    };

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
      if (normalizedData[key] !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        params.push(normalizedData[key]);
      }
    }

    if (hasExtraData) {
      updates.push(`extra_data = $${paramIndex++}::jsonb`);
      params.push(translationPayload.extraData ? JSON.stringify(translationPayload.extraData) : null);
    }

    // Handle extra fields
    for (const field of extraFields) {
      const camelField = this.snakeToCamel(field);
      if (normalizedData[camelField] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push(normalizedData[camelField]);
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
    const extraDataFieldReturn = hasExtraData ? 'extra_data as "extraData",' : 'NULL::jsonb as "extraData",';
      
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
        ${extraDataFieldReturn}
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

  private decorateEntity(
    entityType: ConfigEntityType,
    entity: BaseConfigEntity & Record<string, unknown>,
    language: string,
  ): BaseConfigEntity & {
    contentTranslations?: TranslationMap;
    description: string | null;
    descriptionTranslations: TranslationMap;
    name: string;
    translations: TranslationMap;
  } {
    const translations = this.buildTranslations(entity, entity.extraData);
    const descriptionTranslations = this.buildDescriptionTranslations(entity, entity.extraData);
    const contentTranslations = entityType === 'consent'
      ? this.buildContentTranslations(entity, entity.extraData)
      : undefined;

    return {
      ...entity,
      translations,
      descriptionTranslations,
      ...(contentTranslations ? { contentTranslations } : {}),
      name: this.getLocalizedValue(translations, language, entity.nameEn) ?? entity.nameEn,
      description: this.getLocalizedValue(descriptionTranslations, language, entity.descriptionEn),
    };
  }

  private prepareTranslationPayload(
    entityType: ConfigEntityType,
    data: Record<string, unknown>,
    current?: ConfigEntityWithMeta | null,
  ): ConfigTranslationPayload {
    const translations = data.translations !== undefined
      ? this.normalizeTranslationInput(data.translations)
      : { ...(current?.translations ?? {}) };

    this.applyLegacyTranslation(translations, 'en', data.nameEn);
    this.applyLegacyTranslation(translations, 'zh_HANS', data.nameZh);
    this.applyLegacyTranslation(translations, 'ja', data.nameJa);

    const descriptionTranslations = data.descriptionTranslations !== undefined
      ? this.normalizeTranslationInput(data.descriptionTranslations)
      : { ...(current?.descriptionTranslations ?? {}) };

    this.applyLegacyTranslation(descriptionTranslations, 'en', data.descriptionEn);
    this.applyLegacyTranslation(descriptionTranslations, 'zh_HANS', data.descriptionZh);
    this.applyLegacyTranslation(descriptionTranslations, 'ja', data.descriptionJa);

    const contentTranslations = data.contentTranslations !== undefined
      ? this.normalizeTranslationInput(data.contentTranslations)
      : { ...(current?.contentTranslations ?? {}) };

    if (entityType === 'consent') {
      this.applyLegacyTranslation(contentTranslations, 'en', data.contentMarkdownEn);
      this.applyLegacyTranslation(contentTranslations, 'zh_HANS', data.contentMarkdownZh);
      this.applyLegacyTranslation(contentTranslations, 'ja', data.contentMarkdownJa);
    }

    const requestedExtraData = this.asRecord(data.extraData);
    const baseExtraData = requestedExtraData !== null
      ? requestedExtraData
      : current?.extraData ?? null;

    return {
      translations,
      descriptionTranslations,
      contentTranslations,
      extraData: this.mergeExtraData(
        baseExtraData,
        translations,
        descriptionTranslations,
        contentTranslations,
        entityType,
      ),
      legacyFields: {
        nameEn: this.pickLegacyValue(data.nameEn, translations.en, current?.nameEn),
        nameZh: this.pickLegacyValue(data.nameZh, translations.zh_HANS, current?.nameZh),
        nameJa: this.pickLegacyValue(data.nameJa, translations.ja, current?.nameJa),
        descriptionEn: this.pickLegacyValue(data.descriptionEn, descriptionTranslations.en, current?.descriptionEn),
        descriptionZh: this.pickLegacyValue(data.descriptionZh, descriptionTranslations.zh_HANS, current?.descriptionZh),
        descriptionJa: this.pickLegacyValue(data.descriptionJa, descriptionTranslations.ja, current?.descriptionJa),
        contentMarkdownEn: entityType === 'consent'
          ? this.pickLegacyValue(data.contentMarkdownEn, contentTranslations.en, current?.contentMarkdownEn as string | null | undefined)
          : undefined,
        contentMarkdownZh: entityType === 'consent'
          ? this.pickLegacyValue(data.contentMarkdownZh, contentTranslations.zh_HANS, current?.contentMarkdownZh as string | null | undefined)
          : undefined,
        contentMarkdownJa: entityType === 'consent'
          ? this.pickLegacyValue(data.contentMarkdownJa, contentTranslations.ja, current?.contentMarkdownJa as string | null | undefined)
          : undefined,
      },
    };
  }

  private buildTranslations(
    entity: { nameEn: string; nameZh?: string | null; nameJa?: string | null },
    extraData: Record<string, unknown> | null,
  ): TranslationMap {
    const extraTranslations = this.readExtraTranslationMap(extraData, 'translations');

    return this.withLegacyTranslations(extraTranslations, {
      en: entity.nameEn,
      zh_HANS: entity.nameZh,
      ja: entity.nameJa,
    });
  }

  private buildDescriptionTranslations(
    entity: { descriptionEn?: string | null; descriptionZh?: string | null; descriptionJa?: string | null },
    extraData: Record<string, unknown> | null,
  ): TranslationMap {
    const extraTranslations = this.readExtraTranslationMap(extraData, 'descriptionTranslations');

    return this.withLegacyTranslations(extraTranslations, {
      en: entity.descriptionEn,
      zh_HANS: entity.descriptionZh,
      ja: entity.descriptionJa,
    });
  }

  private buildContentTranslations(
    entity: Record<string, unknown>,
    extraData: Record<string, unknown> | null,
  ): TranslationMap {
    const extraTranslations = this.readExtraTranslationMap(extraData, 'contentTranslations');

    return this.withLegacyTranslations(extraTranslations, {
      en: entity.contentMarkdownEn as string | null | undefined,
      zh_HANS: entity.contentMarkdownZh as string | null | undefined,
      ja: entity.contentMarkdownJa as string | null | undefined,
    });
  }

  private withLegacyTranslations(
    translations: TranslationMap,
    legacy: Record<string, string | null | undefined>,
  ): TranslationMap {
    const result: TranslationMap = { ...translations };

    Object.entries(legacy).forEach(([locale, value]) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        result[locale] = value.trim();
      }
    });

    return result;
  }

  private readExtraTranslationMap(
    extraData: Record<string, unknown> | null,
    key: 'translations' | 'descriptionTranslations' | 'contentTranslations',
  ): TranslationMap {
    const candidate = extraData?.[key];

    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return {};
    }

    return this.normalizeTranslationInput(candidate);
  }

  private normalizeTranslationInput(input: unknown): TranslationMap {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return {};
    }

    const result: TranslationMap = {};

    Object.entries(input).forEach(([locale, value]) => {
      if (typeof value !== 'string') {
        return;
      }

      const normalizedLocale = this.normalizeTranslationKey(locale);
      const trimmedValue = value.trim();

      if (!normalizedLocale || trimmedValue.length === 0) {
        return;
      }

      result[normalizedLocale] = trimmedValue;
    });

    return result;
  }

  private mergeExtraData(
    baseExtraData: Record<string, unknown> | null,
    translations: TranslationMap,
    descriptionTranslations: TranslationMap,
    contentTranslations: TranslationMap,
    entityType: ConfigEntityType,
  ): Record<string, unknown> | null {
    const nextExtraData: Record<string, unknown> = {
      ...(baseExtraData ?? {}),
    };

    delete nextExtraData.translations;
    delete nextExtraData.descriptionTranslations;
    delete nextExtraData.contentTranslations;

    this.assignExtraTranslationMap(nextExtraData, 'translations', translations);
    this.assignExtraTranslationMap(nextExtraData, 'descriptionTranslations', descriptionTranslations);

    if (entityType === 'consent') {
      this.assignExtraTranslationMap(nextExtraData, 'contentTranslations', contentTranslations);
    }

    return Object.keys(nextExtraData).length > 0 ? nextExtraData : null;
  }

  private assignExtraTranslationMap(
    extraData: Record<string, unknown>,
    key: 'translations' | 'descriptionTranslations' | 'contentTranslations',
    translations: TranslationMap,
  ): void {
    const extraTranslations = Object.fromEntries(
      Object.entries(translations).filter(([locale]) => !['en', 'zh_HANS', 'ja'].includes(locale)),
    );

    if (Object.keys(extraTranslations).length > 0) {
      extraData[key] = extraTranslations;
    }
  }

  private normalizeTranslationKey(input?: string | null): string | null {
    if (!input) {
      return null;
    }

    const normalizedSupportedLocale = normalizeSupportedUiLocale(input);
    if (normalizedSupportedLocale) {
      return normalizedSupportedLocale;
    }

    const normalized = input.trim().replace(/-/g, '_');
    if (!normalized) {
      return null;
    }

    const [language, ...rest] = normalized.split('_').filter(Boolean);
    if (!language) {
      return null;
    }

    if (rest.length === 0) {
      return language.toLowerCase();
    }

    return `${language.toLowerCase()}_${rest.join('_').toUpperCase()}`;
  }

  private getLocalizedValue(
    translations: TranslationMap,
    language: string,
    fallback: string | null | undefined,
  ): string | null {
    const normalizedLocale = this.normalizeTranslationKey(language);

    if (normalizedLocale && translations[normalizedLocale]) {
      return translations[normalizedLocale];
    }

    if (normalizedLocale) {
      const [baseLanguage] = normalizedLocale.split('_');
      if (baseLanguage && translations[baseLanguage]) {
        return translations[baseLanguage];
      }
    }

    const localeFamily = resolveTrilingualLocaleFamily(language);
    if (localeFamily === 'zh') {
      return translations.zh_HANS || translations.zh_HANT || fallback || null;
    }

    if (localeFamily === 'ja') {
      return translations.ja || fallback || null;
    }

    return translations.en || fallback || null;
  }

  private applyLegacyTranslation(
    translations: TranslationMap,
    locale: string,
    value: unknown,
  ): void {
    if (typeof value !== 'string') {
      return;
    }

    const normalizedLocale = this.normalizeTranslationKey(locale);
    const trimmedValue = value.trim();

    if (!normalizedLocale || trimmedValue.length === 0) {
      return;
    }

    translations[normalizedLocale] = trimmedValue;
  }

  private pickLegacyValue(
    explicitValue: unknown,
    translationValue: string | undefined,
    currentValue: string | null | undefined,
  ): string | null | undefined {
    if (typeof explicitValue === 'string') {
      return explicitValue.trim().length > 0 ? explicitValue.trim() : null;
    }

    if (typeof translationValue === 'string' && translationValue.trim().length > 0) {
      return translationValue.trim();
    }

    return currentValue;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private getLocalizedField(
    entity: Record<string, unknown>,
    field: 'name' | 'description',
    language: string
  ): string | null {
    const enField = `${field}En`;
    const zhField = `${field}Zh`;
    const jaField = `${field}Ja`;

    const localeFamily = resolveTrilingualLocaleFamily(language);

    if (localeFamily === 'zh') {
      return (entity[zhField] as string | null) || (entity[enField] as string | null);
    }

    if (localeFamily === 'ja') {
      return (entity[jaField] as string | null) || (entity[enField] as string | null);
    }

    return entity[enField] as string | null;
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

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, prisma } from '@tcrn/database';
import {
  ARTIST_STATUS_DICTIONARY_CODE,
  ErrorCodes,
  HOMEPAGE_TEMPLATE_TYPE_DICTIONARY_CODE,
  mergeLocalizedText,
  normalizeLocalizedText,
  pickLocalizedText,
  type LocalizedText,
} from '@tcrn/shared';

import {
  localizedTextOrderExpression,
  localizedTextSearchExpression,
  readLocalizedText,
  stringifyLocalizedText,
} from '../../platform/persistence/localized-text.persistence';
import {
  BaseConfigEntity,
  CONFIG_EXTRA_FIELDS,
  CONFIG_HAS_AUDIT,
  CONFIG_HAS_CODE,
  CONFIG_HAS_DESCRIPTION,
  CONFIG_HAS_EXTRA_DATA,
  CONFIG_HAS_FORCE_USE_CONTROL,
  CONFIG_HAS_SORT_ORDER,
  CONFIG_HAS_SYSTEM_FLAG,
  CONFIG_SCOPED_ENTITIES,
  CONFIG_TABLE_NAMES,
  CONFIG_TENANT_ONLY_SCOPED_ENTITIES,
  ConfigEntityCreateInput,
  ConfigEntityType,
  ConfigEntityUpdateInput,
  ConfigEntityWithMeta,
  OwnerType,
} from './config.types';

type RawConfigEntity = {
  code: string;
  createdAt: Date;
  createdBy: string | null;
  description: Prisma.JsonValue | null;
  extraData: Record<string, unknown> | null;
  id: string;
  isActive: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  name: Prisma.JsonValue;
  ownerId: string | null;
  ownerType: OwnerType;
  sortOrder: number;
  updatedAt: Date;
  updatedBy: string | null;
  version: number;
};

type ConfigScopeRef = { type: OwnerType; id: string | null };

/**
 * Generic CRUD service for configuration entities.
 *
 * Localized content is stored and exposed only as LocalizedText JSONB. Derived
 * display labels are returned as localizedName/localizedDescription.
 */
@Injectable()
export class ConfigService {
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
    const scopeChain = await this.getScopeChain(tenantSchema, scopeType, scopeId);
    const { params, whereClause } = this.buildWhereClause({
      entityType,
      includeInherited,
      includeInactive,
      isScoped,
      ownerOnly,
      parentId,
      scopeChain,
      scopeId,
      scopeType,
      search,
    });
    const orderBy = this.buildOrderBy(entityType, sort);

    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM "${tenantSchema}".${tableName}
        WHERE ${whereClause}
      `,
      ...params
    );
    const total = Number(countResult[0]?.count ?? 0);

    const offset = (page - 1) * pageSize;
    const data = await prisma.$queryRawUnsafe<RawConfigEntity[]>(
      `
        SELECT ${this.buildBaseSelect(entityType)}
        FROM "${tenantSchema}".${tableName}
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ${pageSize} OFFSET ${offset}
      `,
      ...params
    );

    const disabledIds = includeDisabled
      ? new Set<string>()
      : await this.getDisabledIds(tenantSchema, entityType, scopeType, scopeId);

    return {
      data: data
        .filter((item) => includeDisabled || !disabledIds.has(item.id))
        .map((item) => ({
          ...this.decorateEntity(entityType, item, language),
          ownerName: null,
          isInherited: item.ownerType !== scopeType || item.ownerId !== scopeId,
          isDisabledHere: disabledIds.has(item.id),
          canDisable:
            !item.isForceUse && (item.ownerType !== scopeType || item.ownerId !== scopeId),
        })),
      total,
    };
  }

  async findById(
    entityType: ConfigEntityType,
    id: string,
    tenantSchema: string,
    language = 'en'
  ): Promise<ConfigEntityWithMeta | null> {
    const tableName = CONFIG_TABLE_NAMES[entityType];
    const results = await prisma.$queryRawUnsafe<RawConfigEntity[]>(
      `
        SELECT ${this.buildBaseSelect(entityType)}
        FROM "${tenantSchema}".${tableName}
        WHERE id = $1::uuid
        LIMIT 1
      `,
      id
    );

    const item = results[0];
    if (!item) {
      return null;
    }

    return {
      ...this.decorateEntity(entityType, item, language),
      ownerName: null,
      isInherited: false,
      isDisabledHere: false,
      canDisable: false,
    };
  }

  async create(
    entityType: ConfigEntityType,
    tenantSchema: string,
    data: ConfigEntityCreateInput,
    userId: string
  ): Promise<BaseConfigEntity> {
    const tableName = CONFIG_TABLE_NAMES[entityType];
    const isScoped = CONFIG_SCOPED_ENTITIES.has(entityType);
    const hasCode = CONFIG_HAS_CODE.has(entityType);
    const hasSortOrder = CONFIG_HAS_SORT_ORDER.has(entityType);
    const hasDescription = CONFIG_HAS_DESCRIPTION.has(entityType);
    const hasExtraData = CONFIG_HAS_EXTRA_DATA.has(entityType);
    const hasSystemFlag = CONFIG_HAS_SYSTEM_FLAG.has(entityType);
    const hasForceUseControl = CONFIG_HAS_FORCE_USE_CONTROL.has(entityType);
    const hasAudit = CONFIG_HAS_AUDIT.has(entityType);
    const normalizedName = normalizeLocalizedText(data.name, data.name?.en);

    this.assertTenantOnlyScopedEntityOwner(
      entityType,
      data.ownerType ?? 'tenant',
      data.ownerId ?? null
    );

    if (!normalizedName.en.trim()) {
      throw new BadRequestException('name.en is required');
    }
    await this.assertArtistStageDictionaryReferences(entityType, data, true);

    if (hasCode && data.code) {
      const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT id
          FROM "${tenantSchema}".${tableName}
          WHERE code = $1
          LIMIT 1
        `,
        data.code
      );

      if (existing.length > 0) {
        throw new BadRequestException({
          code: ErrorCodes.CODE_ALREADY_EXISTS,
          message: `Code '${data.code}' already exists`,
        });
      }
    }

    const fields = ['id', 'name', 'is_active', 'created_at', 'updated_at', 'version'];
    const values = ['gen_random_uuid()', '$1::jsonb', 'true', 'now()', 'now()', '1'];
    const params: unknown[] = [stringifyLocalizedText(normalizedName)];

    if (hasCode && data.code) {
      fields.push('code');
      values.push(`$${params.length + 1}`);
      params.push(data.code);
    }

    if (hasSortOrder) {
      fields.push('sort_order');
      values.push(`$${params.length + 1}`);
      params.push(data.sortOrder ?? 0);
    }

    if (hasDescription) {
      fields.push('description');
      values.push(`$${params.length + 1}::jsonb`);
      params.push(
        stringifyLocalizedText(normalizeLocalizedText(data.description, normalizedName.en))
      );
    }

    if (hasExtraData) {
      fields.push('extra_data');
      values.push(`$${params.length + 1}::jsonb`);
      params.push(this.stringifyJson(data.extraData ?? null));
    }

    if (hasForceUseControl) {
      fields.push('is_force_use', 'is_system');
      values.push(`$${params.length + 1}`, 'false');
      params.push(data.isForceUse ?? false);
    } else if (hasSystemFlag) {
      fields.push('is_system');
      values.push('false');
    }

    if (hasAudit) {
      fields.push('created_by', 'updated_by');
      values.push(`$${params.length + 1}::uuid`, `$${params.length + 1}::uuid`);
      params.push(userId);
    }

    if (isScoped) {
      fields.push('owner_type', 'owner_id');
      values.push(`$${params.length + 1}`, `$${params.length + 2}::uuid`);
      params.push(data.ownerType ?? 'tenant', data.ownerId ?? null);
    }

    this.appendExtraFieldParams(entityType, data, fields, values, params, normalizedName);

    const results = await prisma.$queryRawUnsafe<RawConfigEntity[]>(
      `
        INSERT INTO "${tenantSchema}".${tableName} (${fields.join(', ')})
        VALUES (${values.join(', ')})
        RETURNING ${this.buildBaseSelect(entityType)}
      `,
      ...params
    );

    return this.decorateEntity(entityType, results[0], 'en');
  }

  async update(
    entityType: ConfigEntityType,
    id: string,
    tenantSchema: string,
    data: ConfigEntityUpdateInput,
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

    if (current.version !== data.version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }
    await this.assertArtistStageDictionaryReferences(entityType, data, false);

    const hasDescription = CONFIG_HAS_DESCRIPTION.has(entityType);
    const hasExtraData = CONFIG_HAS_EXTRA_DATA.has(entityType);
    const hasForceUseControl = CONFIG_HAS_FORCE_USE_CONTROL.has(entityType);
    const hasSortOrder = CONFIG_HAS_SORT_ORDER.has(entityType);
    const hasAudit = CONFIG_HAS_AUDIT.has(entityType);
    const updates: string[] = [];
    const params: unknown[] = [id];
    let paramIndex = 2;

    if (hasAudit) {
      params.push(userId);
      paramIndex = 3;
    }

    let nextName = current.name;
    if (data.name !== undefined) {
      nextName = mergeLocalizedText(current.name, data.name);
      updates.push(`name = $${paramIndex++}::jsonb`);
      params.push(stringifyLocalizedText(nextName));
    }

    if (hasDescription && data.description !== undefined) {
      updates.push(`description = $${paramIndex++}::jsonb`);
      params.push(
        stringifyLocalizedText(
          normalizeLocalizedText(
            {
              ...(current.description ?? normalizeLocalizedText(null, nextName.en)),
              ...data.description,
            },
            nextName.en
          )
        )
      );
    }

    if (hasSortOrder && data.sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      params.push(data.sortOrder);
    }

    if (hasForceUseControl && data.isForceUse !== undefined) {
      updates.push(`is_force_use = $${paramIndex++}`);
      params.push(data.isForceUse);
    }

    if (hasExtraData && data.extraData !== undefined) {
      updates.push(`extra_data = $${paramIndex++}::jsonb`);
      params.push(this.stringifyJson(data.extraData));
    }

    this.appendExtraFieldUpdates(entityType, data, current, updates, params, paramIndex, nextName);

    if (updates.length === 0) {
      return current;
    }

    updates.push('updated_at = now()');
    if (hasAudit) {
      updates.push('updated_by = $2::uuid');
    }
    updates.push('version = version + 1');

    const results = await prisma.$queryRawUnsafe<RawConfigEntity[]>(
      `
        UPDATE "${tenantSchema}".${tableName}
        SET ${updates.join(', ')}
        WHERE id = $1::uuid
        RETURNING ${this.buildBaseSelect(entityType)}
      `,
      ...params
    );

    return this.decorateEntity(entityType, results[0], 'en');
  }

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

    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".${tableName}
        SET is_active = false, updated_at = now(), updated_by = $2::uuid, version = version + 1
        WHERE id = $1::uuid
      `,
      id,
      userId
    );

    const deactivated = await this.findById(entityType, id, tenantSchema);
    if (!deactivated) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Config entity not found after deactivation',
      });
    }
    return deactivated;
  }

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

    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".${tableName}
        SET is_active = true, updated_at = now(), updated_by = $2::uuid, version = version + 1
        WHERE id = $1::uuid
      `,
      id,
      userId
    );

    const reactivated = await this.findById(entityType, id, tenantSchema);
    if (!reactivated) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Config entity not found after reactivation',
      });
    }
    return reactivated;
  }

  async disableInScope(
    entityType: ConfigEntityType,
    id: string,
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string,
    userId: string
  ): Promise<void> {
    const tableName = CONFIG_TABLE_NAMES[entityType];

    if (!CONFIG_SCOPED_ENTITIES.has(entityType)) {
      throw new BadRequestException({
        code: 'CONFIG_NOT_SCOPED',
        message: 'This config entity does not support inheritance scoping',
      });
    }

    if (CONFIG_TENANT_ONLY_SCOPED_ENTITIES.has(entityType)) {
      throw new BadRequestException({
        code: 'CONFIG_TENANT_ONLY',
        message: 'This config entity is tenant-owned and cannot be disabled in lower scopes',
      });
    }

    const current = await this.findById(entityType, id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Config entity not found',
      });
    }

    if (current.ownerType === scopeType && current.ownerId === scopeId) {
      throw new BadRequestException({
        code: 'CONFIG_NOT_INHERITED',
        message: 'Can only disable inherited configs',
      });
    }

    if (current.isForceUse) {
      throw new BadRequestException({
        code: 'CONFIG_FORCE_USE',
        message: 'This config is set to force use and cannot be disabled',
      });
    }

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantSchema}".config_override
          (id, entity_type, entity_id, owner_type, owner_id, is_disabled, created_at, created_by)
        VALUES
          (gen_random_uuid(), $1, $2::uuid, $3, $4::uuid, true, now(), $5::uuid)
        ON CONFLICT (entity_type, entity_id, owner_type, owner_id)
        DO UPDATE SET is_disabled = true, updated_at = now(), updated_by = $5::uuid
      `,
      tableName,
      id,
      scopeType,
      scopeId,
      userId
    );
  }

  async enableInScope(
    entityType: ConfigEntityType,
    id: string,
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string
  ): Promise<void> {
    const tableName = CONFIG_TABLE_NAMES[entityType];

    if (!CONFIG_SCOPED_ENTITIES.has(entityType)) {
      return;
    }

    if (CONFIG_TENANT_ONLY_SCOPED_ENTITIES.has(entityType)) {
      throw new BadRequestException({
        code: 'CONFIG_TENANT_ONLY',
        message: 'This config entity is tenant-owned and cannot be overridden in lower scopes',
      });
    }

    await prisma.$executeRawUnsafe(
      `
        DELETE FROM "${tenantSchema}".config_override
        WHERE entity_type = $1
          AND entity_id = $2::uuid
          AND owner_type = $3
          AND owner_id = $4::uuid
      `,
      tableName,
      id,
      scopeType,
      scopeId
    );
  }

  async getMembershipTree(
    tenantSchema: string,
    options: {
      scopeType?: OwnerType;
      scopeId?: string | null;
      includeInactive?: boolean;
      language?: string;
    } = {}
  ): Promise<
    Array<{
      id: string;
      code: string;
      name: LocalizedText;
      localizedName: string;
      sortOrder: number;
      isActive: boolean;
      types: Array<{
        id: string;
        code: string;
        name: LocalizedText;
        localizedName: string;
        classId: string;
        externalControl: boolean;
        defaultRenewalDays: number;
        sortOrder: number;
        isActive: boolean;
        levels: Array<{
          id: string;
          code: string;
          name: LocalizedText;
          localizedName: string;
          typeId: string;
          rank: number;
          color: string | null;
          badgeUrl: string | null;
          sortOrder: number;
          isActive: boolean;
        }>;
      }>;
    }>
  > {
    const {
      scopeType = 'tenant',
      scopeId = null,
      includeInactive = false,
      language = 'en',
    } = options;
    const scopeChain = await this.getScopeChain(tenantSchema, scopeType, scopeId);
    const scopeConditions = scopeChain.map((scope) =>
      scope.id === null
        ? `(owner_type = '${scope.type}' AND owner_id IS NULL)`
        : `(owner_type = '${scope.type}' AND owner_id = '${scope.id}')`
    );
    const activeClause = includeInactive ? '' : 'AND is_active = true';

    const classes = await prisma.$queryRawUnsafe<
      Array<{
        code: string;
        id: string;
        isActive: boolean;
        name: Prisma.JsonValue;
        sortOrder: number;
      }>
    >(
      `
        SELECT id, code, name, sort_order as "sortOrder", is_active as "isActive"
        FROM "${tenantSchema}".membership_class
        WHERE (${scopeConditions.join(' OR ')}) ${activeClause}
        ORDER BY sort_order ASC, code ASC
      `
    );

    if (classes.length === 0) {
      return [];
    }

    const classIds = classes.map((item) => item.id);
    const types = await prisma.$queryRawUnsafe<
      Array<{
        code: string;
        defaultRenewalDays: number;
        externalControl: boolean;
        id: string;
        isActive: boolean;
        membershipClassId: string;
        name: Prisma.JsonValue;
        sortOrder: number;
      }>
    >(
      `
        SELECT
          id,
          membership_class_id as "membershipClassId",
          code,
          name,
          external_control as "externalControl",
          default_renewal_days as "defaultRenewalDays",
          sort_order as "sortOrder",
          is_active as "isActive"
        FROM "${tenantSchema}".membership_type
        WHERE membership_class_id = ANY($1::uuid[]) ${activeClause}
        ORDER BY sort_order ASC, code ASC
      `,
      classIds
    );

    const typeIds = types.map((item) => item.id);
    const levels =
      typeIds.length > 0
        ? await prisma.$queryRawUnsafe<
            Array<{
              badgeUrl: string | null;
              code: string;
              color: string | null;
              id: string;
              isActive: boolean;
              membershipTypeId: string;
              name: Prisma.JsonValue;
              rank: number;
              sortOrder: number;
            }>
          >(
            `
            SELECT
              id,
              membership_type_id as "membershipTypeId",
              code,
              name,
              rank,
              color,
              badge_url as "badgeUrl",
              sort_order as "sortOrder",
              is_active as "isActive"
            FROM "${tenantSchema}".membership_level
            WHERE membership_type_id = ANY($1::uuid[]) ${activeClause}
            ORDER BY rank ASC, sort_order ASC, code ASC
          `,
            typeIds
          )
        : [];

    const levelsByType = new Map<string, typeof levels>();
    for (const level of levels) {
      const currentLevels = levelsByType.get(level.membershipTypeId) ?? [];
      currentLevels.push(level);
      levelsByType.set(level.membershipTypeId, currentLevels);
    }

    const typesByClass = new Map<string, typeof types>();
    for (const type of types) {
      const currentTypes = typesByClass.get(type.membershipClassId) ?? [];
      currentTypes.push(type);
      typesByClass.set(type.membershipClassId, currentTypes);
    }

    return classes.map((cls) => {
      const className = readLocalizedText(cls.name, 'membership_class.name');
      return {
        id: cls.id,
        code: cls.code,
        name: className,
        localizedName: pickLocalizedText(className, language),
        sortOrder: cls.sortOrder,
        isActive: cls.isActive,
        types: (typesByClass.get(cls.id) ?? []).map((type) => {
          const typeName = readLocalizedText(type.name, 'membership_type.name');
          return {
            id: type.id,
            code: type.code,
            name: typeName,
            localizedName: pickLocalizedText(typeName, language),
            classId: type.membershipClassId,
            externalControl: type.externalControl,
            defaultRenewalDays: type.defaultRenewalDays,
            sortOrder: type.sortOrder,
            isActive: type.isActive,
            levels: (levelsByType.get(type.id) ?? []).map((level) => {
              const levelName = readLocalizedText(level.name, 'membership_level.name');
              return {
                id: level.id,
                code: level.code,
                name: levelName,
                localizedName: pickLocalizedText(levelName, language),
                typeId: level.membershipTypeId,
                rank: level.rank,
                color: level.color,
                badgeUrl: level.badgeUrl,
                sortOrder: level.sortOrder,
                isActive: level.isActive,
              };
            }),
          };
        }),
      };
    });
  }

  private buildWhereClause(args: {
    entityType: ConfigEntityType;
    includeInherited: boolean;
    includeInactive: boolean;
    isScoped: boolean;
    ownerOnly: boolean;
    parentId?: string;
    scopeChain: ConfigScopeRef[];
    scopeId: string | null;
    scopeType: OwnerType;
    search?: string;
  }): { params: unknown[]; whereClause: string } {
    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (args.isScoped) {
      if (args.ownerOnly) {
        if (args.scopeId) {
          whereClause += ` AND owner_type = $${paramIndex++} AND owner_id = $${paramIndex++}::uuid`;
          params.push(args.scopeType, args.scopeId);
        } else {
          whereClause += ` AND owner_type = 'tenant' AND owner_id IS NULL`;
        }
      } else if (args.includeInherited) {
        const scopeConditions = args.scopeChain.map((scope) =>
          scope.id === null
            ? `(owner_type = '${scope.type}' AND owner_id IS NULL)`
            : `(owner_type = '${scope.type}' AND owner_id = '${scope.id}')`
        );
        whereClause += ` AND (${scopeConditions.join(' OR ')})`;
      }
    }

    if (!args.includeInactive) {
      whereClause += ' AND is_active = true';
    }

    if (args.search) {
      const hasCode = CONFIG_HAS_CODE.has(args.entityType);
      if (hasCode) {
        whereClause += ` AND (code ILIKE $${paramIndex} OR ${localizedTextSearchExpression('name', `$${paramIndex}`)})`;
      } else {
        whereClause += ` AND ${localizedTextSearchExpression('name', `$${paramIndex}`)}`;
      }
      params.push(`%${args.search}%`);
      paramIndex += 1;
    }

    if (args.parentId !== undefined) {
      const parentField = this.getParentField(args.entityType);
      if (parentField) {
        whereClause += ` AND ${parentField} = $${paramIndex++}::uuid`;
        params.push(args.parentId);
      }
    }

    return { params, whereClause };
  }

  private buildOrderBy(entityType: ConfigEntityType, sort?: string): string {
    const hasCode = CONFIG_HAS_CODE.has(entityType);
    const hasSortOrder = CONFIG_HAS_SORT_ORDER.has(entityType);
    const localizedNameOrder = localizedTextOrderExpression('name');

    if (!sort) {
      return hasSortOrder
        ? hasCode
          ? 'sort_order ASC, code ASC'
          : `sort_order ASC, ${localizedNameOrder} ASC`
        : hasCode
          ? 'code ASC'
          : `${localizedNameOrder} ASC`;
    }

    const isDesc = sort.startsWith('-');
    const field = isDesc ? sort.slice(1) : sort;
    const fieldMap: Record<string, string> = {
      code: hasCode ? 'code' : localizedNameOrder,
      name: localizedNameOrder,
      sortOrder: hasSortOrder ? 'sort_order' : localizedNameOrder,
      createdAt: 'created_at',
    };

    return `${fieldMap[field] ?? (hasSortOrder ? 'sort_order' : localizedNameOrder)} ${isDesc ? 'DESC' : 'ASC'}`;
  }

  private buildBaseSelect(entityType: ConfigEntityType): string {
    const extraFields = CONFIG_EXTRA_FIELDS[entityType];
    const isScoped = CONFIG_SCOPED_ENTITIES.has(entityType);
    const hasCode = CONFIG_HAS_CODE.has(entityType);
    const hasSortOrder = CONFIG_HAS_SORT_ORDER.has(entityType);
    const hasDescription = CONFIG_HAS_DESCRIPTION.has(entityType);
    const hasExtraData = CONFIG_HAS_EXTRA_DATA.has(entityType);
    const hasSystemFlag = CONFIG_HAS_SYSTEM_FLAG.has(entityType);
    const hasForceUseControl = CONFIG_HAS_FORCE_USE_CONTROL.has(entityType);
    const hasAudit = CONFIG_HAS_AUDIT.has(entityType);
    const extraFieldsSelect =
      extraFields.length > 0
        ? `, ${extraFields.map((field) => `${field} as "${this.snakeToCamel(field)}"`).join(', ')}`
        : '';

    return [
      'id',
      isScoped
        ? 'owner_type as "ownerType", owner_id as "ownerId"'
        : 'NULL as "ownerType", NULL as "ownerId"',
      hasCode ? 'code' : 'NULL as code',
      'name',
      hasDescription ? 'description' : 'NULL::jsonb as description',
      hasExtraData ? 'extra_data as "extraData"' : 'NULL::jsonb as "extraData"',
      hasSortOrder ? 'sort_order as "sortOrder"' : '0 as "sortOrder"',
      'is_active as "isActive"',
      hasForceUseControl ? 'is_force_use as "isForceUse"' : 'false as "isForceUse"',
      hasSystemFlag ? 'is_system as "isSystem"' : 'false as "isSystem"',
      'created_at as "createdAt"',
      'updated_at as "updatedAt"',
      hasAudit
        ? 'created_by as "createdBy", updated_by as "updatedBy"'
        : 'NULL as "createdBy", NULL as "updatedBy"',
      `version${extraFieldsSelect}`,
    ].join(', ');
  }

  private decorateEntity(
    entityType: ConfigEntityType,
    entity: RawConfigEntity & Record<string, unknown>,
    language: string
  ): BaseConfigEntity & {
    localizedDescription: string | null;
    localizedName: string;
  } {
    const name = readLocalizedText(entity.name, `${entityType}.name`);
    const description = entity.description
      ? readLocalizedText(entity.description, `${entityType}.description`)
      : null;

    return {
      ...entity,
      name,
      description,
      ...(entityType === 'consent' && entity.contentMarkdown
        ? {
            contentMarkdown: readLocalizedText(
              entity.contentMarkdown as Prisma.JsonValue,
              'consent.contentMarkdown'
            ),
          }
        : {}),
      localizedName: pickLocalizedText(name, language),
      localizedDescription: description ? pickLocalizedText(description, language) : null,
    };
  }

  private appendExtraFieldParams(
    entityType: ConfigEntityType,
    data: ConfigEntityCreateInput,
    fields: string[],
    values: string[],
    params: unknown[],
    name: LocalizedText
  ): void {
    for (const field of CONFIG_EXTRA_FIELDS[entityType]) {
      const camelField = this.snakeToCamel(field);
      let value = data[camelField];

      if (field === 'content_markdown') {
        value = stringifyLocalizedText(normalizeLocalizedText(data.contentMarkdown, name.en));
      }

      if (value === undefined) {
        continue;
      }

      fields.push(field);
      values.push(`$${params.length + 1}${this.getColumnCast(field)}`);
      params.push(this.prepareExtraFieldValue(field, value));
    }
  }

  private appendExtraFieldUpdates(
    entityType: ConfigEntityType,
    data: ConfigEntityUpdateInput,
    current: BaseConfigEntity & Record<string, unknown>,
    updates: string[],
    params: unknown[],
    paramIndex: number,
    name: LocalizedText
  ): void {
    let nextParamIndex = paramIndex;

    for (const field of CONFIG_EXTRA_FIELDS[entityType]) {
      const camelField = this.snakeToCamel(field);
      let value = data[camelField];

      if (field === 'content_markdown' && data.contentMarkdown !== undefined) {
        const currentContent = current.contentMarkdown
          ? readLocalizedText(
              current.contentMarkdown as Prisma.JsonValue,
              'consent.contentMarkdown'
            )
          : normalizeLocalizedText(null, name.en);
        value = stringifyLocalizedText(mergeLocalizedText(currentContent, data.contentMarkdown));
      }

      if (value === undefined) {
        continue;
      }

      updates.push(`${field} = $${nextParamIndex++}${this.getColumnCast(field)}`);
      params.push(this.prepareExtraFieldValue(field, value));
    }
  }

  private getColumnCast(field: string): string {
    if (field === 'content_markdown') {
      return '::jsonb';
    }

    if (field === 'owner_id' || field.endsWith('_id')) {
      return '::uuid';
    }

    if (field === 'allowed_ips' || field === 'scope') {
      return '::text[]';
    }

    return '';
  }

  private prepareExtraFieldValue(field: string, value: unknown): unknown {
    if (field === 'content_markdown') {
      return value;
    }

    return value;
  }

  private stringifyJson(input: Record<string, unknown> | null | undefined): string | null {
    return input ? JSON.stringify(input) : null;
  }

  private assertTenantOnlyScopedEntityOwner(
    entityType: ConfigEntityType,
    ownerType: OwnerType,
    ownerId: string | null
  ): void {
    if (!CONFIG_TENANT_ONLY_SCOPED_ENTITIES.has(entityType)) {
      return;
    }

    if (ownerType !== 'tenant' || ownerId !== null) {
      throw new BadRequestException({
        code: 'CONFIG_TENANT_ONLY',
        message: 'This config entity must stay tenant-owned',
      });
    }
  }

  private async assertArtistStageDictionaryReferences(
    entityType: ConfigEntityType,
    data: ConfigEntityCreateInput | ConfigEntityUpdateInput,
    required: boolean
  ): Promise<void> {
    if (entityType !== 'artist-stage') {
      return;
    }

    if (data.artistStatusCode === undefined && required) {
      throw new BadRequestException({
        code: 'CONFIG_ARTIST_STAGE_STATUS_REQUIRED',
        message: 'Artist Stage requires an Artist Status.',
      });
    }
    if (
      data.artistStatusCode !== undefined &&
      (data.artistStatusCode === null || String(data.artistStatusCode).trim() === '')
    ) {
      throw new BadRequestException({
        code: 'CONFIG_ARTIST_STAGE_STATUS_REQUIRED',
        message: 'Artist Stage requires an Artist Status.',
      });
    }
    if (data.homepageTemplateTypeCode === undefined && required) {
      throw new BadRequestException({
        code: 'CONFIG_ARTIST_STAGE_TEMPLATE_TYPE_REQUIRED',
        message: 'Artist Stage requires a Homepage Template Type.',
      });
    }
    if (
      data.homepageTemplateTypeCode !== undefined &&
      (data.homepageTemplateTypeCode === null ||
        String(data.homepageTemplateTypeCode).trim() === '')
    ) {
      throw new BadRequestException({
        code: 'CONFIG_ARTIST_STAGE_TEMPLATE_TYPE_REQUIRED',
        message: 'Artist Stage requires a Homepage Template Type.',
      });
    }

    if (data.artistStatusCode !== undefined) {
      await this.assertActiveSystemDictionaryItem(
        ARTIST_STATUS_DICTIONARY_CODE,
        String(data.artistStatusCode),
        'CONFIG_ARTIST_STAGE_STATUS_INVALID',
        'Artist Stage Artist Status is not an active dictionary item.'
      );
    }
    if (data.homepageTemplateTypeCode !== undefined) {
      await this.assertActiveSystemDictionaryItem(
        HOMEPAGE_TEMPLATE_TYPE_DICTIONARY_CODE,
        String(data.homepageTemplateTypeCode),
        'CONFIG_ARTIST_STAGE_TEMPLATE_TYPE_INVALID',
        'Artist Stage Homepage Template Type is not an active dictionary item.'
      );
    }
  }

  private async assertActiveSystemDictionaryItem(
    dictionaryCode: string,
    itemCode: string,
    errorCode: string,
    message: string
  ): Promise<void> {
    const rows = await prisma.$queryRawUnsafe<Array<{ code: string }>>(
      `
        SELECT i.code
        FROM public.system_dictionary d
        INNER JOIN public.system_dictionary_item i ON i.dictionary_code = d.code
        WHERE d.code = $1
          AND i.code = $2
          AND d.is_active = true
          AND i.is_active = true
        LIMIT 1
      `,
      dictionaryCode,
      itemCode
    );

    if (rows.length === 0) {
      throw new BadRequestException({
        code: errorCode,
        message,
      });
    }
  }

  private async getScopeChain(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null
  ): Promise<ConfigScopeRef[]> {
    const chain: ConfigScopeRef[] = [{ type: 'tenant', id: null }];

    if (scopeType === 'tenant') {
      return chain;
    }

    if (scopeType === 'subsidiary' && scopeId) {
      const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string; path: string }>>(
        `
          SELECT id, path
          FROM "${tenantSchema}".subsidiary
          WHERE id = $1::uuid
        `,
        scopeId
      );

      if (subsidiaries.length > 0) {
        const ancestors = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `
            SELECT id
            FROM "${tenantSchema}".subsidiary
            WHERE $1 LIKE path || '%' AND path != $1
            ORDER BY length(path)
          `,
          subsidiaries[0].path
        );

        for (const ancestor of ancestors) {
          chain.push({ type: 'subsidiary', id: ancestor.id });
        }
        chain.push({ type: 'subsidiary', id: scopeId });
      }
    }

    if (scopeType === 'talent' && scopeId) {
      const talents = await prisma.$queryRawUnsafe<
        Array<{
          path: string;
          subsidiaryId: string | null;
        }>
      >(
        `
          SELECT subsidiary_id as "subsidiaryId", path
          FROM "${tenantSchema}".talent
          WHERE id = $1::uuid
        `,
        scopeId
      );

      if (talents.length > 0 && talents[0].subsidiaryId) {
        const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `
            SELECT id
            FROM "${tenantSchema}".subsidiary
            WHERE $1 LIKE path || '%'
            ORDER BY length(path)
          `,
          talents[0].path
        );

        for (const subsidiary of subsidiaries) {
          chain.push({ type: 'subsidiary', id: subsidiary.id });
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
    const overrides = await prisma.$queryRawUnsafe<Array<{ entityId: string }>>(
      `
        SELECT entity_id as "entityId"
        FROM "${tenantSchema}".config_override
        WHERE entity_type = $1
          AND owner_type = $2
          AND COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = COALESCE($3::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
          AND is_disabled = true
      `,
      tableName,
      scopeType,
      scopeId
    );

    return new Set(overrides.map((override) => override.entityId));
  }

  private getParentField(entityType: ConfigEntityType): string | null {
    const parentFields: Partial<Record<ConfigEntityType, string>> = {
      'communication-type': 'channel_category_id',
      'inactivation-reason': 'reason_category_id',
      'membership-type': 'membership_class_id',
      'membership-level': 'membership_type_id',
    };

    return parentFields[entityType] ?? null;
  }

  private snakeToCamel(input: string): string {
    return input.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

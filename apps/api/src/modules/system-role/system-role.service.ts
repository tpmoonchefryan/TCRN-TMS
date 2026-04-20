// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@tcrn/database';
import {
  type CreateSystemRoleInput,
  ErrorCodes,
  isRbacRoleAvailableForTenantTier,
  normalizeSupportedUiLocale,
  type RbacRolePolicyEffect,
  type RbacTenantTier,
  resolveRbacPermission,
  type RolePermissionInput,
  type UpdateSystemRoleInput,
} from '@tcrn/shared';

import { DatabaseService } from '../database/database.service';

export interface SystemRoleScopeBindingData {
  scopeType: string;
  scopeId: string | null;
  scopeName: string | null;
  scopePath: string | null;
  assignmentCount: number;
  userCount: number;
  inheritedAssignmentCount: number;
}

export interface SystemRoleAssignedUserData {
  assignmentId: string;
  userId: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  scopeType: string;
  scopeId: string | null;
  scopeName: string | null;
  scopePath: string | null;
  inherit: boolean;
  grantedAt: Date;
  expiresAt: Date | null;
}

type TranslationMap = Record<string, string>;

interface RoleTranslationCarrier {
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  extraData?: Prisma.JsonValue | null;
}

interface RoleTranslationPayload {
  extraData: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  nameEn: string;
  nameJa: string | null;
  nameZh: string | null;
  translations: TranslationMap;
}

@Injectable()
export class SystemRoleService {
  constructor(private db: DatabaseService) {}

  async create(createDto: CreateSystemRoleInput) {
    const {
      nameEn: _nameEn,
      nameJa: _nameJa,
      nameZh: _nameZh,
      permissions,
      translations: _translations,
      ...roleData
    } = createDto;
    const translationPayload = this.buildRoleTranslationPayload(createDto);

    const existing = await this.db.getPrisma().role.findUnique({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new BadRequestException(`Role code '${createDto.code}' already exists`);
    }

    return this.db.getPrisma().$transaction(async (tx) => {
      // 1. Create Role
      const role = await tx.role.create({
        data: {
          ...roleData,
          extraData: translationPayload.extraData,
          isSystem: true,
          nameEn: translationPayload.nameEn,
          nameJa: translationPayload.nameJa,
          nameZh: translationPayload.nameZh,
        },
      });

      // 2. Handle Permissions
      if (permissions && permissions.length > 0) {
        await this.assignPermissions(tx, role.id, permissions);
      }

      return this.decorateRoleTranslations(role);
    });
  }

  async findAll(
    filters?: { isActive?: boolean; isSystem?: boolean; search?: string },
    tenantSchema?: string,
    tenantTier?: RbacTenantTier,
  ) {
    // Build where clause based on filters
    const where: Prisma.RoleWhereInput = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }

    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { nameEn: { contains: filters.search, mode: 'insensitive' } },
        { nameZh: { contains: filters.search, mode: 'insensitive' } },
        { nameJa: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Return roles with optional filters, sorted by isSystem desc, then by code
    const roles = await this.db.getPrisma().role.findMany({
      where,
      orderBy: [
        { isSystem: 'desc' },
        { code: 'asc' },
      ],
      include: {
        _count: {
          select: {
            userRoles: true,
            rolePolicies: true,
          },
        },
      },
    });

    // Transform _count to expected format
    const userCounts = tenantSchema
      ? await this.db.getPrisma().$queryRawUnsafe<Array<{ roleId: string; userCount: bigint }>>(`
          SELECT role_id as "roleId", COUNT(DISTINCT user_id) as "userCount"
          FROM "${tenantSchema}".user_role
          GROUP BY role_id
        `)
      : [];

    const userCountMap = new Map(
      userCounts.map((row) => [row.roleId, Number(row.userCount)]),
    );

    return roles
      .filter((role) => (tenantTier ? isRbacRoleAvailableForTenantTier(role.code, tenantTier) : true))
      .map((role) => ({
        ...this.decorateRoleTranslations(role),
        permissionCount: role._count?.rolePolicies ?? 0,
        userCount: userCountMap.get(role.id) ?? role._count?.userRoles ?? 0,
        _count: undefined,
      }));
  }

  async findOne(id: string, tenantSchema?: string, tenantTier?: RbacTenantTier) {
    const role = await this.db.getPrisma().role.findUnique({
      where: { id },
      include: {
         rolePolicies: {
           include: {
             policy: {
               include: {
                 resource: true
               }
             }
           }
         }
      }
    });

    if (!role) return null;

    if (tenantTier && !isRbacRoleAvailableForTenantTier(role.code, tenantTier)) {
      return null;
    }

    // Transform rolePolicies to permissions array for frontend
    const permissions = role.rolePolicies.map((rp) => ({
      resource: rp.policy.resource.code,
      action: rp.policy.action,
      effect: rp.effect,
    }));

    const scopeBindings = tenantSchema
      ? await this.db.getPrisma().$queryRawUnsafe<SystemRoleScopeBindingData[]>(`
          SELECT
            ur.scope_type as "scopeType",
            ur.scope_id as "scopeId",
            CASE
              WHEN ur.scope_type = 'tenant' THEN 'Tenant root'
              WHEN ur.scope_type = 'subsidiary' THEN (
                SELECT COALESCE(s.name_zh, s.name_en)
                FROM "${tenantSchema}".subsidiary s
                WHERE s.id = ur.scope_id
              )
              WHEN ur.scope_type = 'talent' THEN (
                SELECT t.display_name
                FROM "${tenantSchema}".talent t
                WHERE t.id = ur.scope_id
              )
              ELSE NULL
            END as "scopeName",
            CASE
              WHEN ur.scope_type = 'subsidiary' THEN (
                SELECT s.path
                FROM "${tenantSchema}".subsidiary s
                WHERE s.id = ur.scope_id
              )
              WHEN ur.scope_type = 'talent' THEN (
                SELECT t.path
                FROM "${tenantSchema}".talent t
                WHERE t.id = ur.scope_id
              )
              ELSE NULL
            END as "scopePath",
            COUNT(*)::int as "assignmentCount",
            COUNT(DISTINCT ur.user_id)::int as "userCount",
            SUM(CASE WHEN ur.inherit THEN 1 ELSE 0 END)::int as "inheritedAssignmentCount"
          FROM "${tenantSchema}".user_role ur
          WHERE ur.role_id = $1::uuid
          GROUP BY ur.scope_type, ur.scope_id
          ORDER BY
            CASE ur.scope_type
              WHEN 'tenant' THEN 0
              WHEN 'subsidiary' THEN 1
              WHEN 'talent' THEN 2
              ELSE 3
            END,
            "scopeName" ASC NULLS FIRST
        `, id)
      : [];

    const assignedUsers = tenantSchema
      ? await this.db.getPrisma().$queryRawUnsafe<SystemRoleAssignedUserData[]>(`
          SELECT
            ur.id as "assignmentId",
            su.id as "userId",
            su.username,
            su.email,
            su.display_name as "displayName",
            su.avatar_url as "avatarUrl",
            su.is_active as "isActive",
            ur.scope_type as "scopeType",
            ur.scope_id as "scopeId",
            CASE
              WHEN ur.scope_type = 'tenant' THEN 'Tenant root'
              WHEN ur.scope_type = 'subsidiary' THEN (
                SELECT COALESCE(s.name_zh, s.name_en)
                FROM "${tenantSchema}".subsidiary s
                WHERE s.id = ur.scope_id
              )
              WHEN ur.scope_type = 'talent' THEN (
                SELECT t.display_name
                FROM "${tenantSchema}".talent t
                WHERE t.id = ur.scope_id
              )
              ELSE NULL
            END as "scopeName",
            CASE
              WHEN ur.scope_type = 'subsidiary' THEN (
                SELECT s.path
                FROM "${tenantSchema}".subsidiary s
                WHERE s.id = ur.scope_id
              )
              WHEN ur.scope_type = 'talent' THEN (
                SELECT t.path
                FROM "${tenantSchema}".talent t
                WHERE t.id = ur.scope_id
              )
              ELSE NULL
            END as "scopePath",
            ur.inherit,
            ur.granted_at as "grantedAt",
            ur.expires_at as "expiresAt"
          FROM "${tenantSchema}".user_role ur
          JOIN "${tenantSchema}".system_user su ON su.id = ur.user_id
          WHERE ur.role_id = $1::uuid
          ORDER BY
            CASE ur.scope_type
              WHEN 'tenant' THEN 0
              WHEN 'subsidiary' THEN 1
              WHEN 'talent' THEN 2
              ELSE 3
            END,
            COALESCE(su.display_name, su.username) ASC,
            su.username ASC
        `, id)
      : [];

    const distinctAssignedUserCount = new Set(
      assignedUsers.map((assignment) => assignment.userId),
    ).size;

    return {
      ...this.decorateRoleTranslations(role),
      permissions,
      permissionCount: permissions.length,
      userCount: distinctAssignedUserCount,
      scopeBindings,
      assignedUsers,
      rolePolicies: undefined,
    };
  }

  async update(id: string, updateDto: UpdateSystemRoleInput) {
    const existing = await this.db.getPrisma().role.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'System role not found',
      });
    }

    const {
      nameEn: _nameEn,
      nameJa: _nameJa,
      nameZh: _nameZh,
      permissions,
      translations: _translations,
      ...roleData
    } = updateDto;
    const translationPayload = this.buildRoleTranslationPayload(updateDto, existing);

    return this.db.getPrisma().$transaction(async (tx) => {
      // 1. Update Role basic info
      const role = await tx.role.update({
        where: { id },
        data: {
          ...roleData,
          extraData: translationPayload.extraData,
          nameEn: translationPayload.nameEn,
          nameJa: translationPayload.nameJa,
          nameZh: translationPayload.nameZh,
        },
      });

      // 2. Update Permissions if provided
      if (permissions) {
        // Delete existing
        await tx.rolePolicy.deleteMany({
          where: { roleId: id },
        });

        // Assign new
        if (permissions.length > 0) {
          await this.assignPermissions(tx, id, permissions);
        }
      }

      return this.decorateRoleTranslations(role);
    });
  }

  async remove(id: string) {
    // Check if role is in use
    const role = await this.db.getPrisma().role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'System role not found',
      });
    }

    if (role && role._count.userRoles > 0) {
      throw new BadRequestException('Cannot delete role that is assigned to users');
    }

    return this.db.getPrisma().role.delete({
      where: { id },
    });
  }

  /**
   * Helper to resolve policies and create RolePolicy relations
   * Now supports three-state permissions: grant, deny, unset
   */
  private async assignPermissions(
    tx: Prisma.TransactionClient,
    roleId: string,
    permissions: RolePermissionInput[],
  ) {
    const normalizedPermissions = permissions.map((permission) => {
      const resolved = resolveRbacPermission(permission.resource, permission.action);

      return {
        ...permission,
        resource: resolved.resourceCode,
        action: resolved.checkedAction,
      };
    });

    // Find all matching policies (policy table no longer has effect field)
    const policies = await tx.policy.findMany({
      where: {
        OR: normalizedPermissions.map((permission) => ({
          action: permission.action,
          resource: {
            code: permission.resource,
          },
        })),
      },
      include: {
        resource: { select: { code: true } },
      },
    });

    if (policies.length !== normalizedPermissions.length) {
      const availablePolicyKeys = new Set(
        policies.map((policy: { action: string; resource: { code: string } }) =>
          `${policy.resource.code}:${policy.action}`),
      );

      const missingPermission = normalizedPermissions.find(
        (permission) => !availablePolicyKeys.has(`${permission.resource}:${permission.action}`),
      );

      if (missingPermission) {
        throw new BadRequestException(
          `RBAC policy ${missingPermission.resource}:${missingPermission.action} is missing from the database contract`,
        );
      }
    }

    // Create a map for quick lookup of policy by resource:action
    const policyMap = new Map<string, string>();
    for (const policy of policies) {
      const key = `${policy.resource.code}:${policy.action}`;
      policyMap.set(key, policy.id);
    }

    // Create RolePolicy entries with effect
    const rolePolicyData: Array<{
      roleId: string;
      policyId: string;
      effect: RbacRolePolicyEffect;
    }> = [];
    for (const permission of normalizedPermissions) {
      const key = `${permission.resource}:${permission.action}`;
      const policyId = policyMap.get(key);
      if (policyId) {
        rolePolicyData.push({
          roleId,
          policyId,
          effect: permission.effect ?? 'grant',
        });
      }
    }

    if (rolePolicyData.length > 0) {
      await tx.rolePolicy.createMany({
        data: rolePolicyData,
      });
    }
  }

  private decorateRoleTranslations<T extends RoleTranslationCarrier>(role: T) {
    return {
      ...role,
      translations: this.buildRoleTranslations(role),
    };
  }

  private buildRoleTranslationPayload(
    input: {
      nameEn?: string;
      nameZh?: string | null;
      nameJa?: string | null;
      translations?: Record<string, string>;
    },
    current?: RoleTranslationCarrier | null,
  ): RoleTranslationPayload {
    const translations = input.translations !== undefined
      ? this.normalizeTranslationInput(input.translations)
      : this.buildRoleTranslations(current);

    this.applyLegacyTranslation(translations, 'en', input.nameEn);
    this.applyLegacyTranslation(translations, 'zh_HANS', input.nameZh);
    this.applyLegacyTranslation(translations, 'ja', input.nameJa);

    const nextNameEn = this.pickLegacyValue(input.nameEn, translations.en, current?.nameEn);
    if (!nextNameEn) {
      throw new BadRequestException('English role name is required');
    }

    return {
      translations,
      extraData: this.toNullableJsonInput(
        this.mergeRoleExtraData(this.asRecord(current?.extraData), translations),
      ),
      nameEn: nextNameEn,
      nameZh: this.pickLegacyValue(input.nameZh, translations.zh_HANS, current?.nameZh),
      nameJa: this.pickLegacyValue(input.nameJa, translations.ja, current?.nameJa),
    };
  }

  private buildRoleTranslations(current?: RoleTranslationCarrier | null): TranslationMap {
    if (!current) {
      return {};
    }

    const translations: TranslationMap = {};
    this.applyLegacyTranslation(translations, 'en', current.nameEn);
    this.applyLegacyTranslation(translations, 'zh_HANS', current.nameZh);
    this.applyLegacyTranslation(translations, 'ja', current.nameJa);

    const extraTranslations = this.readExtraTranslationMap(current.extraData);
    Object.entries(extraTranslations).forEach(([localeCode, value]) => {
      if (!translations[localeCode]) {
        translations[localeCode] = value;
      }
    });

    return translations;
  }

  private readExtraTranslationMap(input?: Prisma.JsonValue | null): TranslationMap {
    const extraData = this.asRecord(input);
    const candidate = extraData?.translations;

    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return {};
    }

    const result: TranslationMap = {};

    Object.entries(candidate as Record<string, unknown>).forEach(([localeCode, value]) => {
      if (typeof value !== 'string') {
        return;
      }

      const normalizedValue = value.trim();
      if (!normalizedValue) {
        return;
      }

      result[localeCode] = normalizedValue;
    });

    return result;
  }

  private normalizeTranslationInput(input: Record<string, string>): TranslationMap {
    const result: TranslationMap = {};

    Object.entries(input).forEach(([localeCode, value]) => {
      if (typeof value !== 'string') {
        return;
      }

      const normalizedValue = value.trim();
      if (!normalizedValue) {
        return;
      }

      const supportedLocale = normalizeSupportedUiLocale(localeCode);
      const normalizedLocale = supportedLocale ?? localeCode.trim().replace(/-/g, '_');

      if (!normalizedLocale) {
        return;
      }

      result[normalizedLocale] = normalizedValue;
    });

    return result;
  }

  private mergeRoleExtraData(
    current: Record<string, unknown> | null,
    translations: TranslationMap,
  ) {
    const nextExtraData = current ? { ...current } : {};
    const extraTranslations = Object.fromEntries(
      Object.entries(translations).filter(([localeCode]) => !['en', 'zh_HANS', 'ja'].includes(localeCode)),
    );

    delete nextExtraData.translations;

    if (Object.keys(extraTranslations).length > 0) {
      nextExtraData.translations = extraTranslations;
    }

    return Object.keys(nextExtraData).length > 0 ? nextExtraData : null;
  }

  private applyLegacyTranslation(
    translations: TranslationMap,
    localeCode: 'en' | 'zh_HANS' | 'ja',
    value: string | null | undefined,
  ) {
    if (value === undefined || value === null) {
      return;
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
      delete translations[localeCode];
      return;
    }

    translations[localeCode] = normalizedValue;
  }

  private pickLegacyValue(
    explicitValue: string | null | undefined,
    translationValue: string | undefined,
    currentValue?: string | null,
  ) {
    if (explicitValue !== undefined && explicitValue !== null) {
      const trimmed = explicitValue.trim();
      return trimmed || null;
    }

    if (translationValue !== undefined) {
      return translationValue;
    }

    return currentValue ?? null;
  }

  private asRecord(input?: Prisma.JsonValue | Record<string, unknown> | null) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return null;
    }

    return input as Record<string, unknown>;
  }

  private toNullableJsonInput(
    input: Record<string, unknown> | null,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
    if (!input) {
      return Prisma.DbNull;
    }

    return input as Prisma.InputJsonValue;
  }
}

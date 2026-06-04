// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  BadRequestException,
  GoneException,
  Injectable,
  MethodNotAllowedException,
} from '@nestjs/common';
import { Prisma } from '@tcrn/database';
import {
  type CreateSystemRoleInput,
  isLegacyAdminCompatibilityRoleCode,
  isRbacRoleAvailableForTenantTier,
  type LocalizedText,
  normalizeLocalizedText,
  type PartialLocalizedText,
  pickLocalizedText,
  type RbacTenantTier,
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

@Injectable()
export class SystemRoleService {
  constructor(private db: DatabaseService) {}

  async create(createDto: CreateSystemRoleInput) {
    void createDto;
    throw new GoneException({
      code: 'SYSTEM_ROLE_MUTATION_REMOVED',
      message: 'System-role mutation routes are deprecated. Use POST /roles for custom roles.',
    });
  }

  async findAll(
    filters?: { isSystem?: boolean; search?: string },
    tenantSchema?: string,
    tenantTier?: RbacTenantTier
  ) {
    // Build where clause based on filters
    const where: Prisma.RoleWhereInput = {};

    if (filters?.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }

    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { name: { path: ['en'], string_contains: filters.search } },
        { name: { path: ['zh_HANS'], string_contains: filters.search } },
        { name: { path: ['zh_HANT'], string_contains: filters.search } },
        { name: { path: ['ja'], string_contains: filters.search } },
        { name: { path: ['ko'], string_contains: filters.search } },
        { name: { path: ['fr'], string_contains: filters.search } },
      ];
    }

    // Return roles with optional filters, sorted by isSystem desc, then by code
    const roles = await this.db.getPrisma().role.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { code: 'asc' }],
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

    const userCountMap = new Map(userCounts.map((row) => [row.roleId, Number(row.userCount)]));

    return roles
      .filter((role) =>
        !isLegacyAdminCompatibilityRoleCode(role.code) &&
        (tenantTier ? isRbacRoleAvailableForTenantTier(role.code, tenantTier) : true)
      )
      .map((role) => ({
        ...this.mapRoleRecord(role),
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
                resource: true,
              },
            },
          },
        },
      },
    });

    if (!role) return null;

    if (
      isLegacyAdminCompatibilityRoleCode(role.code) ||
      (tenantTier && !isRbacRoleAvailableForTenantTier(role.code, tenantTier))
    ) {
      return null;
    }

    // Transform rolePolicies to permissions array for frontend
    const permissions = role.rolePolicies.map((rp) => ({
      resource: rp.policy.resource.code,
      action: rp.policy.action,
      effect: rp.effect,
    }));

    const scopeBindings = tenantSchema
      ? await this.db.getPrisma().$queryRawUnsafe<SystemRoleScopeBindingData[]>(
          `
          SELECT
            ur.scope_type as "scopeType",
            ur.scope_id as "scopeId",
            CASE
              WHEN ur.scope_type = 'tenant' THEN 'Tenant root'
              WHEN ur.scope_type = 'subsidiary' THEN (
                SELECT COALESCE(s.name->>'zh_HANS', s.name->>'en')
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
        `,
          id
        )
      : [];

    const assignedUsers = tenantSchema
      ? await this.db.getPrisma().$queryRawUnsafe<SystemRoleAssignedUserData[]>(
          `
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
                SELECT COALESCE(s.name->>'zh_HANS', s.name->>'en')
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
        `,
          id
        )
      : [];

    const distinctAssignedUserCount = new Set(assignedUsers.map((assignment) => assignment.userId))
      .size;

    return {
      ...this.mapRoleRecord(role),
      permissions,
      permissionCount: permissions.length,
      userCount: distinctAssignedUserCount,
      scopeBindings,
      assignedUsers,
      rolePolicies: undefined,
    };
  }

  async update(id: string, updateDto: UpdateSystemRoleInput) {
    void id;
    void updateDto;
    throw new GoneException({
      code: 'SYSTEM_ROLE_MUTATION_REMOVED',
      message: 'System-role mutation routes are deprecated. Use PATCH /roles/:id for custom roles.',
    });
  }

  async remove(id: string) {
    void id;
    throw new MethodNotAllowedException({
      code: 'ROLE_DELETE_NOT_ALLOWED',
      message:
        'Roles are kept for audit history. Remove assignments or change grant/deny/unset states instead.',
    });
  }

  private normalizeRoleName(name: PartialLocalizedText): LocalizedText {
    const normalized = normalizeLocalizedText(name);

    if (!normalized.en.trim()) {
      throw new BadRequestException('English role name is required');
    }

    return normalized;
  }

  private mapRoleRecord<T extends { name: Prisma.JsonValue; isActive?: unknown }>(role: T) {
    const name = this.normalizeRoleName(role.name as PartialLocalizedText);
    const { isActive: _isActive, ...roleWithoutStatus } = role;

    return {
      ...roleWithoutStatus,
      name,
      displayName: pickLocalizedText(name, 'en'),
    };
  }
}

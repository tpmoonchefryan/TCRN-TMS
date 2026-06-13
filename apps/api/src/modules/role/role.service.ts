// SPDX-License-Identifier: Apache-2.0
import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@tcrn/database';
import {
  ErrorCodes,
  getRbacResourceDefinition,
  INITIAL_ADMIN_ROLE_CODE,
  isCanonicalPermissionAction,
  LEGACY_ADMIN_COMPATIBILITY_ROLE_CODES,
  type LocalizedText,
  mergeRolePermissionStateInputs,
  type PartialLocalizedText,
  type PermissionActionInput,
  pickLocalizedText,
  resolveRbacPermission,
  type RoleMutationPermissionsInput,
  type RolePermission,
  type RoleRawPermissionStateInput,
} from '@tcrn/shared';

import { PermissionSnapshotService } from '../permission/permission-snapshot.service';

function stringifyJsonb(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    typeof item === 'bigint' ? item.toString() : item
  );
}

function assertTenantSchemaName(tenantSchema: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(tenantSchema)) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FIELD_INVALID,
      message: 'Invalid tenant schema',
    });
  }

  return tenantSchema;
}

export interface RoleData {
  id: string;
  code: string;
  name: LocalizedText;
  description: string | null;
  extraData?: Record<string, unknown> | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface RoleScopeBindingData {
  scopeType: string;
  scopeId: string | null;
  scopeName: string | null;
  scopePath: string | null;
  assignmentCount: number;
  userCount: number;
  inheritedAssignmentCount: number;
}

export interface RoleAssignedUserData {
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

export interface RoleDetailData extends RoleData {
  permissions: RolePermission[];
  permissionCount: number;
  userCount: number;
  scopeBindings: RoleScopeBindingData[];
  assignedUsers: RoleAssignedUserData[];
}

/**
 * Role Service
 * Manages roles and their permissions
 */
@Injectable()
export class RoleService {
  constructor(private readonly snapshotService: PermissionSnapshotService) {}

  /**
   * List roles
   */
  async list(
    tenantSchema: string,
    options: {
      search?: string;
      isSystem?: boolean;
      includeCompatibility?: boolean;
      sort?: string;
    } = {}
  ): Promise<Array<RoleData & { permissionCount: number; userCount: number }>> {
    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.search) {
      whereClause += ` AND (code ILIKE $${paramIndex} OR name::text ILIKE $${paramIndex})`;
      params.push(`%${options.search}%`);
      paramIndex++;
    }
    if (options.isSystem !== undefined) {
      whereClause += ` AND is_system = $${paramIndex}`;
      params.push(options.isSystem);
      paramIndex++;
    }
    if (!options.includeCompatibility) {
      whereClause += ` AND NOT (code = ANY($${paramIndex}::text[]))`;
      params.push([...LEGACY_ADMIN_COMPATIBILITY_ROLE_CODES]);
    }

    let orderBy = 'is_system DESC, code ASC';
    if (options.sort) {
      const isDesc = options.sort.startsWith('-');
      const field = isDesc ? options.sort.substring(1) : options.sort;
      const fieldMap: Record<string, string> = {
        code: 'code',
        name: "name->>'en'",
        createdAt: 'created_at',
      };
      const dbField = fieldMap[field] || 'code';
      orderBy = `${dbField} ${isDesc ? 'DESC' : 'ASC'}`;
    }

    const roles = await prisma.$queryRawUnsafe<RoleData[]>(
      `
      SELECT 
        id, code, name,
        description, extra_data as "extraData", is_system as "isSystem", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".role
      WHERE ${whereClause}
      ORDER BY ${orderBy}
    `,
      ...params
    );

    // Get permission and user counts
    const result = await Promise.all(
      roles.map(async (role) => {
        const [permCount, userCount] = await Promise.all([
          prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
            `
            SELECT COUNT(*) as count FROM "${tenantSchema}".role_policy WHERE role_id = $1::uuid
          `,
            role.id
          ),
          prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
            `
            SELECT COUNT(DISTINCT user_id) as count FROM "${tenantSchema}".user_role WHERE role_id = $1::uuid
          `,
            role.id
          ),
        ]);

        return {
          ...role,
          permissionCount: Number(permCount[0]?.count || 0),
          userCount: Number(userCount[0]?.count || 0),
        };
      })
    );

    return result;
  }

  /**
   * Find role by ID
   */
  async findById(id: string, tenantSchema: string): Promise<RoleData | null> {
    const results = await prisma.$queryRawUnsafe<RoleData[]>(
      `
      SELECT 
        id, code, name,
        description, extra_data as "extraData", is_system as "isSystem", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".role
      WHERE id = $1::uuid
    `,
      id
    );
    return results[0] || null;
  }

  /**
   * Find role detail by ID for the canonical /roles read path.
   */
  async findDetailById(
    id: string,
    tenantSchema: string,
    language: string = 'en'
  ): Promise<RoleDetailData | null> {
    const safeTenantSchema = assertTenantSchemaName(tenantSchema);
    const role = await this.findById(id, safeTenantSchema);

    if (!role) {
      return null;
    }

    const permissions = await this.getRolePermissions(id, safeTenantSchema, language);
    const scopeBindings = await prisma.$queryRawUnsafe<RoleScopeBindingData[]>(
      `
      SELECT
        ur.scope_type as "scopeType",
        ur.scope_id as "scopeId",
        CASE
          WHEN ur.scope_type = 'tenant' THEN 'Tenant root'
          WHEN ur.scope_type = 'subsidiary' THEN (
            SELECT COALESCE(s.name->>'zh_HANS', s.name->>'en')
            FROM "${safeTenantSchema}".subsidiary s
            WHERE s.id = ur.scope_id
          )
          WHEN ur.scope_type = 'talent' THEN (
            SELECT t.display_name
            FROM "${safeTenantSchema}".talent t
            WHERE t.id = ur.scope_id
          )
          ELSE NULL
        END as "scopeName",
        CASE
          WHEN ur.scope_type = 'subsidiary' THEN (
            SELECT s.path
            FROM "${safeTenantSchema}".subsidiary s
            WHERE s.id = ur.scope_id
          )
          WHEN ur.scope_type = 'talent' THEN (
            SELECT t.path
            FROM "${safeTenantSchema}".talent t
            WHERE t.id = ur.scope_id
          )
          ELSE NULL
        END as "scopePath",
        COUNT(*)::int as "assignmentCount",
        COUNT(DISTINCT ur.user_id)::int as "userCount",
        SUM(CASE WHEN ur.inherit THEN 1 ELSE 0 END)::int as "inheritedAssignmentCount"
      FROM "${safeTenantSchema}".user_role ur
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
    );
    const assignedUsers = await prisma.$queryRawUnsafe<RoleAssignedUserData[]>(
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
            FROM "${safeTenantSchema}".subsidiary s
            WHERE s.id = ur.scope_id
          )
          WHEN ur.scope_type = 'talent' THEN (
            SELECT t.display_name
            FROM "${safeTenantSchema}".talent t
            WHERE t.id = ur.scope_id
          )
          ELSE NULL
        END as "scopeName",
        CASE
          WHEN ur.scope_type = 'subsidiary' THEN (
            SELECT s.path
            FROM "${safeTenantSchema}".subsidiary s
            WHERE s.id = ur.scope_id
          )
          WHEN ur.scope_type = 'talent' THEN (
            SELECT t.path
            FROM "${safeTenantSchema}".talent t
            WHERE t.id = ur.scope_id
          )
          ELSE NULL
        END as "scopePath",
        ur.inherit,
        ur.granted_at as "grantedAt",
        ur.expires_at as "expiresAt"
      FROM "${safeTenantSchema}".user_role ur
      JOIN "${safeTenantSchema}".system_user su ON su.id = ur.user_id
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
    );
    const distinctAssignedUserCount = new Set(assignedUsers.map((assignment) => assignment.userId))
      .size;

    return {
      ...role,
      permissions,
      permissionCount: permissions.length,
      userCount: distinctAssignedUserCount,
      scopeBindings,
      assignedUsers,
    };
  }

  /**
   * Find role by code
   */
  async findByCode(code: string, tenantSchema: string): Promise<RoleData | null> {
    const results = await prisma.$queryRawUnsafe<RoleData[]>(
      `
      SELECT 
        id, code, name,
        description, extra_data as "extraData", is_system as "isSystem", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".role
      WHERE code = $1
    `,
      code
    );
    return results[0] || null;
  }

  /**
   * Get role permissions
   */
  async getRolePermissions(
    roleId: string,
    tenantSchema: string,
    language: string = 'en'
  ): Promise<RolePermission[]> {
    const permissions = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        resourceCode: string;
        action: string;
        effect: RolePermission['effect'];
        name: string;
      }>
    >(
      `
      SELECT 
        p.id,
        r.code as "resourceCode",
        p.action,
        rp.effect as effect,
        r.name as name
      FROM "${tenantSchema}".role_policy rp
      JOIN "${tenantSchema}".policy p ON rp.policy_id = p.id
      JOIN "${tenantSchema}".resource r ON p.resource_id = r.id
      WHERE rp.role_id = $1::uuid
      ORDER BY r.code, p.action
    `,
      roleId
    );

    return permissions.flatMap((permission) => {
      const resourceDefinition = getRbacResourceDefinition(permission.resourceCode);
      if (!resourceDefinition || !isCanonicalPermissionAction(permission.action)) {
        return [];
      }

      if (!resourceDefinition.supportedActions.includes(permission.action)) {
        return [];
      }

      return [
        {
          ...permission,
          resourceCode: resourceDefinition.code,
          action: permission.action,
          name: pickLocalizedText(resourceDefinition.name, language),
        },
      ];
    });
  }

  /**
   * Create role
   */
  async create(
    tenantSchema: string,
    data: {
      code: string;
      name: LocalizedText;
      description?: string;
      permissionIds?: string[];
      permissionStates?: RoleMutationPermissionsInput;
      permissions?: Array<{ resource: string; action: string; effect?: 'grant' | 'deny' }>;
    },
    userId: string
  ): Promise<RoleData> {
    if (data.code === INITIAL_ADMIN_ROLE_CODE) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FIELD_INVALID,
        message: 'Initial Admin is a built-in role and cannot be created through the custom role API',
      });
    }

    // Check code uniqueness
    const existing = await this.findByCode(data.code, tenantSchema);
    if (existing) {
      throw new BadRequestException({
        code: ErrorCodes.CODE_ALREADY_EXISTS,
        message: 'Role code already exists',
      });
    }

    // Create role
    const results = await prisma.$queryRawUnsafe<RoleData[]>(
      `
      INSERT INTO "${tenantSchema}".role 
        (id, code, name, description, is_system, is_active, 
         created_at, updated_at, created_by, updated_by, version)
      VALUES 
        (gen_random_uuid(), $1, $2::jsonb, $3, false, true, now(), now(), $4, $4, 1)
      RETURNING 
        id, code, name,
        description, is_system as "isSystem", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
    `,
      data.code,
      JSON.stringify(data.name),
      data.description || null,
      userId
    );

    const role = results[0];

    // Add permissions
    if ((data.permissionIds?.length ?? 0) > 0) {
      for (const permId of data.permissionIds ?? []) {
        await prisma.$executeRawUnsafe(
          `
          INSERT INTO "${tenantSchema}".role_policy (id, role_id, policy_id, created_at)
          VALUES (gen_random_uuid(), $1::uuid, $2::uuid, now())
        `,
          role.id,
          permId
        );
      }
    }

    const permissionStates = this.resolveRoleMutationPermissionStates(data);
    if (permissionStates.length > 0) {
      await this.applyPermissionStates(role.id, tenantSchema, permissionStates, false);
    }

    const hasPermissionMutation = (data.permissionIds?.length ?? 0) > 0 || permissionStates.length > 0;
    const permissionVersion = hasPermissionMutation
      ? await this.snapshotService.incrementPermissionVersion(tenantSchema)
      : await this.snapshotService.getCurrentPermissionVersion(tenantSchema);

    await this.updateRoleDefinitionRecord(tenantSchema, role.id, {
      createdBy: userId,
      createdAt: role.createdAt.toISOString(),
      lastChangedBy: userId,
      lastChangedAt: role.createdAt.toISOString(),
      assignedUserCount: 0,
      lastPermissionVersion: permissionVersion,
      lastSnapshotRefreshResult: hasPermissionMutation
        ? { status: 'not_required', affectedUsers: 0, reason: 'role_created_without_assignments' }
        : { status: 'not_required', affectedUsers: 0, reason: 'role_metadata_created' },
    });

    if (hasPermissionMutation) {
      await this.writeRolePermissionAudit(tenantSchema, {
        actorId: userId,
        roleId: role.id,
        roleCode: role.code,
        actionType: 'role_permission_change',
        beforePermissions: [],
        afterPermissions: await this.readRolePermissionAuditSnapshot(tenantSchema, role.id),
        submittedPermissionIds: data.permissionIds ?? [],
        submittedPermissionStates: permissionStates,
        affectedUsers: 0,
        permissionVersionBefore: Math.max(permissionVersion - 1, 0),
        permissionVersionAfter: permissionVersion,
        snapshotResult: { status: 'not_required', affectedUsers: 0 },
      });
    }

    return role;
  }

  /**
   * Update role
   */
  async update(
    id: string,
    tenantSchema: string,
    data: {
      name?: PartialLocalizedText;
      description?: string;
      version: number;
      permissionStates?: RoleMutationPermissionsInput;
      permissions?: Array<{ resource: string; action: string; effect?: 'grant' | 'deny' }>;
    },
    userId: string
  ): Promise<RoleData> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role not found',
      });
    }

    if (current.version !== data.version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    if (current.code === INITIAL_ADMIN_ROLE_CODE || current.isSystem) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Initial Admin is locked to prevent access loss',
      });
    }

    const updates: string[] = [];
    const params: unknown[] = [id, userId];
    let paramIndex = 3;

    if (data.name !== undefined) {
      updates.push(`name = name || $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(data.name));
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(data.description);
    }

    updates.push('updated_at = now()');
    updates.push('updated_by = $2::uuid');
    updates.push('version = version + 1');

    await prisma.$queryRawUnsafe<RoleData[]>(
      `
      UPDATE "${tenantSchema}".role
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING 
        id, code, name,
        description, is_system as "isSystem", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
    `,
      ...params
    );

    const permissionStates = this.resolveRoleMutationPermissionStates(data);
    const beforePermissions =
      permissionStates.length > 0 ? await this.readRolePermissionAuditSnapshot(tenantSchema, id) : [];
    if (permissionStates.length > 0) {
      await this.applyPermissionStates(id, tenantSchema, permissionStates, true);
      const permissionVersion = await this.snapshotService.incrementPermissionVersion(tenantSchema);
      const affectedUsers = await this.snapshotService.refreshRoleSnapshots(tenantSchema, id);
      const snapshotResult = { status: 'refreshed', affectedUsers };
      await this.updateRoleDefinitionRecord(tenantSchema, id, {
        lastChangedBy: userId,
        lastChangedAt: new Date().toISOString(),
        assignedUserCount: affectedUsers,
        lastPermissionVersion: permissionVersion,
        lastSnapshotRefreshResult: snapshotResult,
      });
      await this.writeRolePermissionAudit(tenantSchema, {
        actorId: userId,
        roleId: id,
        roleCode: current.code,
        actionType: 'role_permission_change',
        beforePermissions,
        afterPermissions: await this.readRolePermissionAuditSnapshot(tenantSchema, id),
        submittedPermissionStates: permissionStates,
        affectedUsers,
        permissionVersionBefore: Math.max(permissionVersion - 1, 0),
        permissionVersionAfter: permissionVersion,
        snapshotResult,
      });
    } else {
      await this.updateRoleDefinitionRecord(tenantSchema, id, {
        lastChangedBy: userId,
        lastChangedAt: new Date().toISOString(),
        lastSnapshotRefreshResult: { status: 'not_required', reason: 'role_metadata_only' },
      });
    }

    const updated = await this.findById(id, tenantSchema);
    if (!updated) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role not found after update',
      });
    }

    return updated;
  }

  /**
   * Set role permissions (full replace)
   */
  async setPermissions(
    roleId: string,
    tenantSchema: string,
    permissionIds: string[],
    version: number,
    userId: string
  ): Promise<{ role: RoleData; affectedUsers: number }> {
    const current = await this.findById(roleId, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role not found',
      });
    }

    if (current.code === INITIAL_ADMIN_ROLE_CODE || current.isSystem) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Initial Admin permissions are locked',
      });
    }

    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    const beforePermissions = await this.readRolePermissionAuditSnapshot(tenantSchema, roleId);

    // Delete existing permissions
    await prisma.$executeRawUnsafe(
      `
      DELETE FROM "${tenantSchema}".role_policy WHERE role_id = $1::uuid
    `,
      roleId
    );

    // Insert new permissions
    for (const permId of permissionIds) {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "${tenantSchema}".role_policy (id, role_id, policy_id, created_at)
        VALUES (gen_random_uuid(), $1::uuid, $2::uuid, now())
      `,
        roleId,
        permId
      );
    }

    const permissionVersion = await this.snapshotService.incrementPermissionVersion(tenantSchema);

    // Update role version
    await prisma.$executeRawUnsafe(
      `
      UPDATE "${tenantSchema}".role 
      SET updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1
    `,
      roleId,
      userId
    );

    // Refresh permission snapshots for affected users
    const affectedUsers = await this.snapshotService.refreshRoleSnapshots(tenantSchema, roleId);
    const snapshotResult = { status: 'refreshed', affectedUsers };
    await this.updateRoleDefinitionRecord(tenantSchema, roleId, {
      lastChangedBy: userId,
      lastChangedAt: new Date().toISOString(),
      assignedUserCount: affectedUsers,
      lastPermissionVersion: permissionVersion,
      lastSnapshotRefreshResult: snapshotResult,
    });
    await this.writeRolePermissionAudit(tenantSchema, {
      actorId: userId,
      roleId,
      roleCode: current.code,
      actionType: 'role_permission_change',
      beforePermissions,
      afterPermissions: await this.readRolePermissionAuditSnapshot(tenantSchema, roleId),
      submittedPermissionIds: permissionIds,
      affectedUsers,
      permissionVersionBefore: Math.max(permissionVersion - 1, 0),
      permissionVersionAfter: permissionVersion,
      snapshotResult,
    });

    const updatedRole = await this.findById(roleId, tenantSchema);
    if (!updatedRole) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role not found after update',
      });
    }
    return { role: updatedRole, affectedUsers };
  }

  async setPermissionStates(
    roleId: string,
    tenantSchema: string,
    permissionInput: RoleMutationPermissionsInput,
    version: number,
    userId: string
  ): Promise<{ role: RoleData; affectedUsers: number }> {
    const current = await this.findById(roleId, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role not found',
      });
    }

    if (current.code === INITIAL_ADMIN_ROLE_CODE || current.isSystem) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Initial Admin permissions are locked',
      });
    }

    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    const permissionStates = mergeRolePermissionStateInputs(permissionInput);
    const beforePermissions = await this.readRolePermissionAuditSnapshot(tenantSchema, roleId);
    await this.applyPermissionStates(roleId, tenantSchema, permissionStates, true);

    const permissionVersion = await this.snapshotService.incrementPermissionVersion(tenantSchema);

    await prisma.$executeRawUnsafe(
      `
      UPDATE "${tenantSchema}".role
      SET updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1::uuid
    `,
      roleId,
      userId
    );

    const affectedUsers = await this.snapshotService.refreshRoleSnapshots(tenantSchema, roleId);
    const snapshotResult = { status: 'refreshed', affectedUsers };
    await this.updateRoleDefinitionRecord(tenantSchema, roleId, {
      lastChangedBy: userId,
      lastChangedAt: new Date().toISOString(),
      assignedUserCount: affectedUsers,
      lastPermissionVersion: permissionVersion,
      lastSnapshotRefreshResult: snapshotResult,
    });
    await this.writeRolePermissionAudit(tenantSchema, {
      actorId: userId,
      roleId,
      roleCode: current.code,
      actionType: 'role_permission_change',
      beforePermissions,
      afterPermissions: await this.readRolePermissionAuditSnapshot(tenantSchema, roleId),
      submittedPermissionStates: permissionStates,
      affectedUsers,
      permissionVersionBefore: Math.max(permissionVersion - 1, 0),
      permissionVersionAfter: permissionVersion,
      snapshotResult,
    });
    const updatedRole = await this.findById(roleId, tenantSchema);
    if (!updatedRole) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role not found after update',
      });
    }

    return { role: updatedRole, affectedUsers };
  }

  /**
   * Deactivate role
   */
  async deactivate(
    roleId: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<RoleData> {
    void roleId;
    void tenantSchema;
    void version;
    void userId;
    throw new GoneException({
      code: 'ROLE_STATUS_MACHINE_REMOVED',
      message:
        'Roles do not have an active/inactive lifecycle. Remove assignments or change grant/deny/unset permission states.',
    });
  }

  /**
   * Reactivate role
   */
  async reactivate(
    roleId: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<RoleData> {
    void roleId;
    void tenantSchema;
    void version;
    void userId;
    throw new GoneException({
      code: 'ROLE_STATUS_MACHINE_REMOVED',
      message:
        'Roles do not have an active/inactive lifecycle. Remove assignments or change grant/deny/unset permission states.',
    });
  }

  private resolveRoleMutationPermissionStates(data: {
    permissionStates?: RoleMutationPermissionsInput;
    permissions?: Array<{ resource: string; action: string; effect?: 'grant' | 'deny' }>;
  }): RoleRawPermissionStateInput[] {
    const rawPermissionStates = data.permissions?.map((permission) => ({
      resource: permission.resource as RoleRawPermissionStateInput['resource'],
      action: permission.action as PermissionActionInput,
      state: permission.effect ?? 'grant',
    }));

    return mergeRolePermissionStateInputs({
      capabilityPackStates: data.permissionStates?.capabilityPackStates,
      rawPermissionStates: [
        ...(data.permissionStates?.rawPermissionStates ?? []),
        ...(rawPermissionStates ?? []),
      ],
    });
  }

  private async applyPermissionStates(
    roleId: string,
    tenantSchema: string,
    permissionStates: readonly RoleRawPermissionStateInput[],
    replaceAll: boolean
  ): Promise<void> {
    if (replaceAll) {
      await prisma.$executeRawUnsafe(
        `
        DELETE FROM "${tenantSchema}".role_policy WHERE role_id = $1::uuid
      `,
        roleId
      );
    }

    const uniqueStates = new Map<string, RoleRawPermissionStateInput>();
    for (const permissionState of permissionStates) {
      const resolved = resolveRbacPermission(permissionState.resource, permissionState.action);
      uniqueStates.set(`${resolved.resourceCode}:${resolved.checkedAction}`, {
        resource: resolved.resourceCode,
        action: resolved.checkedAction,
        state: permissionState.state,
      });
    }

    for (const permissionState of uniqueStates.values()) {
      const policies = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
        SELECT p.id
        FROM "${tenantSchema}".policy p
        JOIN "${tenantSchema}".resource r ON r.id = p.resource_id
        WHERE r.code = $1 AND p.action = $2 AND p.is_active = true
        LIMIT 1
      `,
        permissionState.resource,
        permissionState.action
      );

      const policyId = policies[0]?.id;
      if (!policyId) {
        throw new BadRequestException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: `Permission ${permissionState.resource}:${permissionState.action} is not available`,
        });
      }

      await prisma.$executeRawUnsafe(
        `
        DELETE FROM "${tenantSchema}".role_policy
        WHERE role_id = $1::uuid AND policy_id = $2::uuid
      `,
        roleId,
        policyId
      );

      if (permissionState.state === 'unset') {
        continue;
      }

      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "${tenantSchema}".role_policy (id, role_id, policy_id, effect, created_at)
        VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, now())
        ON CONFLICT (role_id, policy_id) DO UPDATE SET effect = EXCLUDED.effect
      `,
        roleId,
        policyId,
        permissionState.state
      );
    }
  }

  private async readRolePermissionAuditSnapshot(
    tenantSchema: string,
    roleId: string
  ): Promise<Array<{ resourceCode: string; action: string; effect: string }>> {
    const rows = await prisma.$queryRawUnsafe<Array<{ resourceCode: string; action: string; effect: string }>>(
      `
      SELECT r.code as "resourceCode", p.action, rp.effect
      FROM "${tenantSchema}".role_policy rp
      JOIN "${tenantSchema}".policy p ON p.id = rp.policy_id
      JOIN "${tenantSchema}".resource r ON r.id = p.resource_id
      WHERE rp.role_id = $1::uuid
      ORDER BY r.code, p.action
    `,
      roleId
    );

    return Array.isArray(rows) ? rows : [];
  }

  private async updateRoleDefinitionRecord(
    tenantSchema: string,
    roleId: string,
    recordPatch: Record<string, unknown>
  ): Promise<void> {
    await prisma.$executeRawUnsafe(
      `
      UPDATE "${tenantSchema}".role
      SET extra_data = jsonb_set(
        COALESCE(extra_data, '{}'::jsonb),
        '{roleDefinitionRecord}',
        COALESCE(extra_data->'roleDefinitionRecord', '{}'::jsonb) || $2::jsonb,
        true
      )
      WHERE id = $1::uuid
    `,
      roleId,
      stringifyJsonb(recordPatch)
    );
  }

  private async writeRolePermissionAudit(
    tenantSchema: string,
    input: {
      actorId: string;
      roleId: string;
      roleCode: string;
      actionType: string;
      beforePermissions: unknown;
      afterPermissions: unknown;
      submittedPermissionIds?: string[];
      submittedPermissionStates?: unknown;
      affectedUsers: number;
      permissionVersionBefore: number;
      permissionVersionAfter: number;
      snapshotResult: unknown;
    }
  ): Promise<void> {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "${tenantSchema}".change_log
        (id, operator_id, action, object_type, object_id, object_name, diff, occurred_at)
      VALUES
        (gen_random_uuid(), $1::uuid, $2, 'permission_governance_role', $3::uuid, $4, $5::jsonb, now())
    `,
      input.actorId,
      input.actionType,
      input.roleId,
      input.roleCode,
      stringifyJsonb({
        beforePermissions: input.beforePermissions,
        afterPermissions: input.afterPermissions,
        submittedPermissionIds: input.submittedPermissionIds ?? [],
        submittedPermissionStates: input.submittedPermissionStates ?? [],
        affectedUsers: input.affectedUsers,
        permissionVersionBefore: input.permissionVersionBefore,
        permissionVersionAfter: input.permissionVersionAfter,
        snapshotResult: input.snapshotResult,
      })
    );
  }
}

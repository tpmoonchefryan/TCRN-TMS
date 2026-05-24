// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { prisma } from '@tcrn/database';
import {
  ErrorCodes,
  getRbacResourceDefinition,
  isCanonicalPermissionAction,
  type LocalizedText,
  type PartialLocalizedText,
  pickLocalizedText,
  type RolePermission,
} from '@tcrn/shared';

import { PermissionSnapshotService } from '../permission/permission-snapshot.service';

export interface RoleData {
  id: string;
  code: string;
  name: LocalizedText;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
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
      isActive?: boolean;
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
      whereClause += ` AND is_system = $${paramIndex++}`;
      params.push(options.isSystem);
    }
    if (options.isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex++}`;
      params.push(options.isActive);
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
        description, is_system as "isSystem", is_active as "isActive",
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
        description, is_system as "isSystem", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".role
      WHERE id = $1::uuid
    `,
      id
    );
    return results[0] || null;
  }

  /**
   * Find role by code
   */
  async findByCode(code: string, tenantSchema: string): Promise<RoleData | null> {
    const results = await prisma.$queryRawUnsafe<RoleData[]>(
      `
      SELECT 
        id, code, name,
        description, is_system as "isSystem", is_active as "isActive",
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
      permissionIds: string[];
    },
    userId: string
  ): Promise<RoleData> {
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
    if (data.permissionIds.length > 0) {
      for (const permId of data.permissionIds) {
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

    const updates: string[] = [];
    const params: unknown[] = [id, userId];
    let paramIndex = 3;

    if (data.name !== undefined) {
      updates.push(`name = name || $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(data.name));
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }

    updates.push('updated_at = now()');
    updates.push('updated_by = $2::uuid');
    updates.push('version = version + 1');

    const results = await prisma.$queryRawUnsafe<RoleData[]>(
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

    return results[0];
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

    if (current.isSystem) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Cannot modify system role permissions',
      });
    }

    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

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
    const current = await this.findById(roleId, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role not found',
      });
    }

    if (current.isSystem) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Cannot deactivate system role',
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
      UPDATE "${tenantSchema}".role
      SET is_active = false, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1
    `,
      roleId,
      userId
    );

    // Refresh snapshots
    await this.snapshotService.refreshRoleSnapshots(tenantSchema, roleId);

    const deactivatedRole = await this.findById(roleId, tenantSchema);
    if (!deactivatedRole) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role not found after deactivation',
      });
    }
    return deactivatedRole;
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
    const current = await this.findById(roleId, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role not found',
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
      UPDATE "${tenantSchema}".role
      SET is_active = true, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1
    `,
      roleId,
      userId
    );

    // Refresh snapshots
    await this.snapshotService.refreshRoleSnapshots(tenantSchema, roleId);

    const reactivatedRole = await this.findById(roleId, tenantSchema);
    if (!reactivatedRole) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role not found after reactivation',
      });
    }
    return reactivatedRole;
  }
}

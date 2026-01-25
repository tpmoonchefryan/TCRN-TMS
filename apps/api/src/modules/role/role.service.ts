// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

import { PermissionSnapshotService } from '../permission/permission-snapshot.service';

export interface RoleData {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface RolePermission {
  id: string;
  resourceCode: string;
  action: string;
  effect: 'grant' | 'deny';
  name: string;
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
      whereClause += ` AND (code ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex} OR name_zh ILIKE $${paramIndex})`;
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
        name: 'name_en',
        createdAt: 'created_at',
      };
      const dbField = fieldMap[field] || 'code';
      orderBy = `${dbField} ${isDesc ? 'DESC' : 'ASC'}`;
    }

    const roles = await prisma.$queryRawUnsafe<RoleData[]>(`
      SELECT 
        id, code, name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description, is_system as "isSystem", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".role
      WHERE ${whereClause}
      ORDER BY ${orderBy}
    `, ...params);

    // Get permission and user counts
    const result = await Promise.all(
      roles.map(async (role) => {
        const [permCount, userCount] = await Promise.all([
          prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
            SELECT COUNT(*) as count FROM "${tenantSchema}".role_policy WHERE role_id = $1::uuid
          `, role.id),
          prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
            SELECT COUNT(DISTINCT user_id) as count FROM "${tenantSchema}".user_role WHERE role_id = $1::uuid
          `, role.id),
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
    const results = await prisma.$queryRawUnsafe<RoleData[]>(`
      SELECT 
        id, code, name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description, is_system as "isSystem", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".role
      WHERE id = $1::uuid
    `, id);
    return results[0] || null;
  }

  /**
   * Find role by code
   */
  async findByCode(code: string, tenantSchema: string): Promise<RoleData | null> {
    const results = await prisma.$queryRawUnsafe<RoleData[]>(`
      SELECT 
        id, code, name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description, is_system as "isSystem", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".role
      WHERE code = $1
    `, code);
    return results[0] || null;
  }

  /**
   * Get role permissions
   */
  async getRolePermissions(roleId: string, tenantSchema: string, language: string = 'en'): Promise<RolePermission[]> {
    const nameField = language === 'zh' ? 'name_zh' : language === 'ja' ? 'name_ja' : 'name_en';

    const permissions = await prisma.$queryRawUnsafe<RolePermission[]>(`
      SELECT 
        p.id,
        r.code as "resourceCode",
        p.action,
        p.effect,
        COALESCE(r.${nameField}, r.name_en) as name
      FROM "${tenantSchema}".role_policy rp
      JOIN "${tenantSchema}".policy p ON rp.policy_id = p.id
      JOIN "${tenantSchema}".resource r ON p.resource_id = r.id
      WHERE rp.role_id = $1::uuid
      ORDER BY r.code, p.action
    `, roleId);

    return permissions;
  }

  /**
   * Create role
   */
  async create(
    tenantSchema: string,
    data: {
      code: string;
      nameEn: string;
      nameZh?: string;
      nameJa?: string;
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
    const results = await prisma.$queryRawUnsafe<RoleData[]>(`
      INSERT INTO "${tenantSchema}".role 
        (id, code, name_en, name_zh, name_ja, description, is_system, is_active, 
         created_at, updated_at, created_by, updated_by, version)
      VALUES 
        (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, false, true, now(), now(), $6, $6, 1)
      RETURNING 
        id, code, name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description, is_system as "isSystem", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
    `, data.code, data.nameEn, data.nameZh || null, data.nameJa || null, data.description || null, userId);

    const role = results[0];

    // Add permissions
    if (data.permissionIds.length > 0) {
      for (const permId of data.permissionIds) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${tenantSchema}".role_policy (id, role_id, policy_id, created_at)
          VALUES (gen_random_uuid(), $1::uuid, $2::uuid, now())
        `, role.id, permId);
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
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
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

    if (data.nameEn !== undefined) {
      updates.push(`name_en = $${paramIndex++}`);
      params.push(data.nameEn);
    }
    if (data.nameZh !== undefined) {
      updates.push(`name_zh = $${paramIndex++}`);
      params.push(data.nameZh);
    }
    if (data.nameJa !== undefined) {
      updates.push(`name_ja = $${paramIndex++}`);
      params.push(data.nameJa);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }

    updates.push('updated_at = now()');
    updates.push('updated_by = $2::uuid');
    updates.push('version = version + 1');

    const results = await prisma.$queryRawUnsafe<RoleData[]>(`
      UPDATE "${tenantSchema}".role
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING 
        id, code, name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description, is_system as "isSystem", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
    `, ...params);

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
    await prisma.$executeRawUnsafe(`
      DELETE FROM "${tenantSchema}".role_policy WHERE role_id = $1::uuid
    `, roleId);

    // Insert new permissions
    for (const permId of permissionIds) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}".role_policy (id, role_id, policy_id, created_at)
        VALUES (gen_random_uuid(), $1::uuid, $2::uuid, now())
      `, roleId, permId);
    }

    // Update role version
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".role 
      SET updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1
    `, roleId, userId);

    // Refresh permission snapshots for affected users
    const affectedUsers = await this.snapshotService.refreshRoleSnapshots(tenantSchema, roleId);

    const updatedRole = await this.findById(roleId, tenantSchema);
    return { role: updatedRole!, affectedUsers };
  }

  /**
   * Deactivate role
   */
  async deactivate(roleId: string, tenantSchema: string, version: number, userId: string): Promise<RoleData> {
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

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".role
      SET is_active = false, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1
    `, roleId, userId);

    // Refresh snapshots
    await this.snapshotService.refreshRoleSnapshots(tenantSchema, roleId);

    return (await this.findById(roleId, tenantSchema))!;
  }

  /**
   * Reactivate role
   */
  async reactivate(roleId: string, tenantSchema: string, version: number, userId: string): Promise<RoleData> {
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

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".role
      SET is_active = true, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1
    `, roleId, userId);

    // Refresh snapshots
    await this.snapshotService.refreshRoleSnapshots(tenantSchema, roleId);

    return (await this.findById(roleId, tenantSchema))!;
  }
}

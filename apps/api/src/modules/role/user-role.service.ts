// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

import { DelegatedAdminService, DelegateScopeType } from '../delegated-admin/delegated-admin.service';
import { PermissionSnapshotService, ScopeType } from '../permission/permission-snapshot.service';

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  scopeType: ScopeType;
  scopeId: string | null;
  scopeName: string | null;
  scopePath: string | null;
  inherit: boolean;
  grantedAt: Date;
  grantedById: string | null;
  grantedByUsername: string | null;
  expiresAt: Date | null;
}

/**
 * User Role Service
 * Manages user-role assignments
 * PRD §13.3 - Includes delegation validation
 */
@Injectable()
export class UserRoleService {
  constructor(
    private readonly snapshotService: PermissionSnapshotService,
    private readonly delegatedAdminService: DelegatedAdminService,
  ) {}

  /**
   * Get user's role assignments
   */
  async getUserRoles(userId: string, tenantSchema: string, language: string = 'en'): Promise<UserRoleAssignment[]> {
    const nameField = language === 'zh' ? 'name_zh' : language === 'ja' ? 'name_ja' : 'name_en';

    const assignments = await prisma.$queryRawUnsafe<UserRoleAssignment[]>(`
      SELECT 
        ur.id,
        ur.user_id as "userId",
        ur.role_id as "roleId",
        r.code as "roleCode",
        COALESCE(r.${nameField}, r.name_en) as "roleName",
        ur.scope_type as "scopeType",
        ur.scope_id as "scopeId",
        CASE 
          WHEN ur.scope_type = 'subsidiary' THEN (
            SELECT COALESCE(s.${nameField}, s.name_en) 
            FROM "${tenantSchema}".subsidiary s WHERE s.id = ur.scope_id
          )
          WHEN ur.scope_type = 'talent' THEN (
            SELECT t.display_name FROM "${tenantSchema}".talent t WHERE t.id = ur.scope_id
          )
          ELSE NULL
        END as "scopeName",
        CASE 
          WHEN ur.scope_type = 'subsidiary' THEN (
            SELECT s.path FROM "${tenantSchema}".subsidiary s WHERE s.id = ur.scope_id
          )
          WHEN ur.scope_type = 'talent' THEN (
            SELECT t.path FROM "${tenantSchema}".talent t WHERE t.id = ur.scope_id
          )
          ELSE NULL
        END as "scopePath",
        ur.inherit,
        ur.granted_at as "grantedAt",
        ur.granted_by as "grantedById",
        (SELECT username FROM "${tenantSchema}".system_user WHERE id = ur.granted_by) as "grantedByUsername",
        ur.expires_at as "expiresAt"
      FROM "${tenantSchema}".user_role ur
      JOIN "${tenantSchema}".role r ON ur.role_id = r.id
      WHERE ur.user_id = CAST($1 AS uuid)
      ORDER BY ur.scope_type, ur.granted_at DESC
    `, userId);

    return assignments;
  }

  /**
   * Check if user can assign roles at a given scope
   * PRD §13.3 - Delegated Admin
   */
  async canAssignRoleAtScope(
    tenantSchema: string,
    grantorUserId: string,
    roleCode: string,
    scopeType: ScopeType,
    scopeId: string | null
  ): Promise<boolean> {
    // Check if grantor has admin permission at tenant level (ADMIN role at tenant scope)
    const isAdmin = await this.snapshotService.checkPermission(
      tenantSchema,
      grantorUserId,
      'system_user',
      'admin',
      'tenant',
      null,
    );

    if (isAdmin) {
      return true; // Admin at tenant level can assign any role at any scope
    }

    // Check if trying to assign high-privilege roles (ADMIN or PLATFORM_ADMIN)
    // Only admins can assign these roles
    if (roleCode === 'ADMIN' || roleCode === 'PLATFORM_ADMIN') {
      return false;
    }

    // For tenant scope, only tenant-level admin can assign (already checked above)
    if (scopeType === 'tenant') {
      return false;
    }

    // Check delegation for subsidiary/talent scope
    if ((scopeType === 'subsidiary' || scopeType === 'talent') && scopeId) {
      return this.delegatedAdminService.hasDelegationForScope(
        tenantSchema,
        grantorUserId,
        scopeType as DelegateScopeType,
        scopeId,
      );
    }

    return false;
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    tenantSchema: string,
    data: {
      roleId?: string;
      roleCode?: string;
      scopeType: ScopeType;
      scopeId?: string | null;
      inherit: boolean;
      expiresAt?: Date | null;
    },
    grantedBy: string
  ): Promise<UserRoleAssignment> {
    // Check if role exists and get role code - support both roleId and roleCode
    let roles: Array<{ id: string; code: string }>;
    
    if (data.roleCode) {
      // Prefer roleCode as it's consistent across schemas
      roles = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(`
        SELECT id, code FROM "${tenantSchema}".role WHERE code = $1 AND is_active = true
      `, data.roleCode);
    } else if (data.roleId) {
      // Fallback to roleId for backward compatibility
      roles = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(`
        SELECT id, code FROM "${tenantSchema}".role WHERE id = CAST($1 AS uuid) AND is_active = true
      `, data.roleId);
    } else {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FIELD_REQUIRED,
        message: 'Either roleId or roleCode is required',
      });
    }

    if (roles.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role not found or inactive',
      });
    }

    const roleId = roles[0].id;
    const roleCode = roles[0].code;

    // Validate permission to assign role at this scope
    const canAssign = await this.canAssignRoleAtScope(
      tenantSchema,
      grantedBy,
      roleCode,
      data.scopeType,
      data.scopeId || null,
    );

    if (!canAssign) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'You do not have permission to assign roles at this scope',
      });
    }

    // Validate scope
    if (data.scopeType === 'subsidiary' && data.scopeId) {
      const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${tenantSchema}".subsidiary WHERE id = CAST($1 AS uuid)
      `, data.scopeId);
      if (subsidiaries.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Subsidiary not found',
        });
      }
    } else if (data.scopeType === 'talent' && data.scopeId) {
      const talents = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${tenantSchema}".talent WHERE id = CAST($1 AS uuid)
      `, data.scopeId);
      if (talents.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Talent not found',
        });
      }
    }

    // Check for duplicate assignment
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${tenantSchema}".user_role
      WHERE user_id = CAST($1 AS uuid) AND role_id = CAST($2 AS uuid) AND scope_type = $3 
        AND COALESCE(scope_id, '00000000-0000-0000-0000-000000000000') = COALESCE(CAST($4 AS uuid), '00000000-0000-0000-0000-000000000000')
    `, userId, roleId, data.scopeType, data.scopeId || null);

    if (existing.length > 0) {
      throw new BadRequestException({
        code: 'ROLE_ALREADY_ASSIGNED',
        message: 'User already has this role at this scope',
      });
    }

    // Create assignment
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}".user_role 
        (id, user_id, role_id, scope_type, scope_id, inherit, granted_at, granted_by, expires_at)
      VALUES 
        (gen_random_uuid(), CAST($1 AS uuid), CAST($2 AS uuid), $3, CAST($4 AS uuid), $5, now(), CAST($6 AS uuid), $7)
    `, userId, roleId, data.scopeType, data.scopeId || null, data.inherit, grantedBy, data.expiresAt || null);

    // Refresh permission snapshot
    await this.snapshotService.refreshUserSnapshots(tenantSchema, userId);

    // Get the created assignment
    const assignments = await this.getUserRoles(userId, tenantSchema);
    return assignments[0];
  }

  /**
   * Remove role assignment
   */
  async removeAssignment(
    assignmentId: string,
    tenantSchema: string
  ): Promise<void> {
    // Get assignment to find user_id
    const assignments = await prisma.$queryRawUnsafe<Array<{ userId: string }>>(`
      SELECT user_id as "userId" FROM "${tenantSchema}".user_role WHERE id = CAST($1 AS uuid)
    `, assignmentId);

    if (assignments.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role assignment not found',
      });
    }

    const userId = assignments[0].userId;

    // Delete assignment
    await prisma.$executeRawUnsafe(`
      DELETE FROM "${tenantSchema}".user_role WHERE id = CAST($1 AS uuid)
    `, assignmentId);

    // Refresh permission snapshot
    await this.snapshotService.refreshUserSnapshots(tenantSchema, userId);
  }

  /**
   * Update role assignment
   */
  async updateAssignment(
    assignmentId: string,
    tenantSchema: string,
    data: {
      inherit?: boolean;
      expiresAt?: Date | null;
    }
  ): Promise<UserRoleAssignment> {
    // Get assignment
    const assignments = await prisma.$queryRawUnsafe<Array<{ userId: string }>>(`
      SELECT user_id as "userId" FROM "${tenantSchema}".user_role WHERE id = CAST($1 AS uuid)
    `, assignmentId);

    if (assignments.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role assignment not found',
      });
    }

    const userId = assignments[0].userId;

    const updates: string[] = [];
    const params: unknown[] = [assignmentId];
    let paramIndex = 2;

    if (data.inherit !== undefined) {
      updates.push(`inherit = $${paramIndex++}`);
      params.push(data.inherit);
    }
    if (data.expiresAt !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      params.push(data.expiresAt);
    }

    if (updates.length > 0) {
      await prisma.$executeRawUnsafe(`
        UPDATE "${tenantSchema}".user_role
        SET ${updates.join(', ')}
        WHERE id = CAST($1 AS uuid)
      `, ...params);

      // Refresh permission snapshot
      await this.snapshotService.refreshUserSnapshots(tenantSchema, userId);
    }

    const updatedAssignments = await this.getUserRoles(userId, tenantSchema);
    return updatedAssignments.find(a => a.id === assignmentId)!;
  }
}

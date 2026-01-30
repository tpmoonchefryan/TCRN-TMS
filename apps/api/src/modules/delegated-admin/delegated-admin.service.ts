// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

export type DelegateType = 'user' | 'role';
export type DelegateScopeType = 'subsidiary' | 'talent';

export interface DelegatedAdminData {
  id: string;
  scopeType: DelegateScopeType;
  scopeId: string;
  scopeName: string | null;
  delegateType: DelegateType;
  delegateId: string;
  delegateName: string | null;
  grantedAt: Date;
  grantedById: string;
  grantedByUsername: string | null;
}

/**
 * Delegated Admin Service
 * Manages delegation of admin rights to users or roles for specific scopes
 * PRD §13.3 - Delegated Admin
 */
@Injectable()
export class DelegatedAdminService {
  /**
   * List delegated admins with optional filters
   */
  async list(
    tenantSchema: string,
    options: {
      scopeType?: DelegateScopeType;
      scopeId?: string;
    } = {},
    language: string = 'en'  
  ): Promise<DelegatedAdminData[]> {
    const nameField = language === 'zh' ? 'name_zh' : language === 'ja' ? 'name_ja' : 'name_en';

    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.scopeType) {
      whereClause += ` AND da.scope_type = $${paramIndex++}`;
      params.push(options.scopeType);
    }
    if (options.scopeId) {
      whereClause += ` AND da.scope_id = $${paramIndex++}::uuid`;
      params.push(options.scopeId);
    }

    const results = await prisma.$queryRawUnsafe<Array<{
      id: string;
      scopeType: DelegateScopeType;
      scopeId: string;
      adminUserId: string | null;
      adminRoleId: string | null;
      grantedAt: Date;
      grantedBy: string;
    }>>(`
      SELECT 
        da.id,
        da.scope_type as "scopeType",
        da.scope_id as "scopeId",
        da.admin_user_id as "adminUserId",
        da.admin_role_id as "adminRoleId",
        da.granted_at as "grantedAt",
        da.granted_by as "grantedBy"
      FROM "${tenantSchema}".delegated_admin da
      WHERE ${whereClause}
      ORDER BY da.granted_at DESC
    `, ...params);

    // Enrich with names
    const enrichedResults: DelegatedAdminData[] = [];

    for (const row of results) {
      // Get scope name
      let scopeName: string | null = null;
      if (row.scopeType === 'subsidiary') {
        const subs = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`
          SELECT COALESCE(${nameField}, name_en) as name FROM "${tenantSchema}".subsidiary WHERE id = $1::uuid
        `, row.scopeId);
        scopeName = subs[0]?.name || null;
      } else if (row.scopeType === 'talent') {
        const talents = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`
          SELECT display_name as name FROM "${tenantSchema}".talent WHERE id = $1::uuid
        `, row.scopeId);
        scopeName = talents[0]?.name || null;
      }

      // Get delegate info
      let delegateType: DelegateType;
      let delegateId: string;
      let delegateName: string | null = null;

      if (row.adminUserId) {
        delegateType = 'user';
        delegateId = row.adminUserId;
        const users = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`
          SELECT COALESCE(display_name, username) as name FROM "${tenantSchema}".system_user WHERE id = $1::uuid
        `, row.adminUserId);
        delegateName = users[0]?.name || null;
      } else {
        delegateType = 'role';
        delegateId = row.adminRoleId!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
        const roles = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`
          SELECT COALESCE(${nameField}, name_en) as name FROM "${tenantSchema}".role WHERE id = $1::uuid
        `, row.adminRoleId);
        delegateName = roles[0]?.name || null;
      }

      // Get grantor name
      const grantors = await prisma.$queryRawUnsafe<Array<{ username: string }>>(`
        SELECT username FROM "${tenantSchema}".system_user WHERE id = $1::uuid
      `, row.grantedBy);

      enrichedResults.push({
        id: row.id,
        scopeType: row.scopeType,
        scopeId: row.scopeId,
        scopeName,
        delegateType,
        delegateId,
        delegateName,
        grantedAt: row.grantedAt,
        grantedById: row.grantedBy,
        grantedByUsername: grantors[0]?.username || null,
      });
    }

    return enrichedResults;
  }

  /**
   * Create a delegated admin
   */
  async create(
    tenantSchema: string,
    data: {
      scopeType: DelegateScopeType;
      scopeId: string;
      delegateType: DelegateType;
      delegateId: string;
    },
    grantedBy: string
  ): Promise<DelegatedAdminData> {
    // Validate scope exists
    if (data.scopeType === 'subsidiary') {
      const subs = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${tenantSchema}".subsidiary WHERE id = $1::uuid
      `, data.scopeId);
      if (subs.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Subsidiary not found',
        });
      }
    } else if (data.scopeType === 'talent') {
      const talents = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${tenantSchema}".talent WHERE id = $1::uuid
      `, data.scopeId);
      if (talents.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Talent not found',
        });
      }
    }

    // Validate delegate exists
    if (data.delegateType === 'user') {
      const users = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${tenantSchema}".system_user WHERE id = $1::uuid AND is_active = true
      `, data.delegateId);
      if (users.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'User not found or inactive',
        });
      }
    } else {
      const roles = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${tenantSchema}".role WHERE id = $1::uuid AND is_active = true
      `, data.delegateId);
      if (roles.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Role not found or inactive',
        });
      }
    }

    // Check for duplicate delegation
    const existingField = data.delegateType === 'user' ? 'admin_user_id' : 'admin_role_id';
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${tenantSchema}".delegated_admin
      WHERE scope_type = $1 AND scope_id = $2::uuid AND ${existingField} = $3::uuid
    `, data.scopeType, data.scopeId, data.delegateId);

    if (existing.length > 0) {
      throw new BadRequestException({
        code: 'DELEGATION_EXISTS',
        message: 'This delegation already exists',
      });
    }

    // Create delegation
    const adminUserId = data.delegateType === 'user' ? data.delegateId : null;
    const adminRoleId = data.delegateType === 'role' ? data.delegateId : null;

    const results = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      INSERT INTO "${tenantSchema}".delegated_admin 
        (id, scope_type, scope_id, admin_user_id, admin_role_id, granted_at, granted_by)
      VALUES 
        (gen_random_uuid(), $1, $2::uuid, $3::uuid, $4::uuid, now(), $5::uuid)
      RETURNING id
    `, data.scopeType, data.scopeId, adminUserId, adminRoleId, grantedBy);

    // Fetch and return the created record
    const allDelegations = await this.list(tenantSchema, { scopeId: data.scopeId });
    return allDelegations.find(d => d.id === results[0].id)!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }

  /**
   * Delete a delegated admin
   */
  async delete(id: string, tenantSchema: string): Promise<void> {
    // Check exists
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${tenantSchema}".delegated_admin WHERE id = $1::uuid
    `, id);

    if (existing.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Delegated admin not found',
      });
    }

    await prisma.$executeRawUnsafe(`
      DELETE FROM "${tenantSchema}".delegated_admin WHERE id = $1::uuid
    `, id);
  }

  /**
   * Check if a user has delegation rights for a scope
   * Used for validating role assignment permissions
   */
  async hasDelegationForScope(
    tenantSchema: string,
    userId: string,
    targetScopeType: DelegateScopeType,
    targetScopeId: string
  ): Promise<boolean> {
    // Check direct user delegation
    const directDelegation = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT da.id
      FROM "${tenantSchema}".delegated_admin da
      WHERE da.admin_user_id = $1::uuid
        AND da.scope_type = $2
        AND da.scope_id = $3::uuid
    `, userId, targetScopeType, targetScopeId);

    if (directDelegation.length > 0) {
      return true;
    }

    // Check role-based delegation (user has a role that has delegation)
    const roleDelegation = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT da.id
      FROM "${tenantSchema}".delegated_admin da
      JOIN "${tenantSchema}".user_role ur ON ur.role_id = da.admin_role_id
      WHERE ur.user_id = $1::uuid
        AND da.scope_type = $2
        AND da.scope_id = $3::uuid
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    `, userId, targetScopeType, targetScopeId);

    if (roleDelegation.length > 0) {
      return true;
    }

    // Check if user has delegation for parent scope (inheritance)
    // For talents, check if user has delegation for their subsidiary
    if (targetScopeType === 'talent') {
      const talents = await prisma.$queryRawUnsafe<Array<{ subsidiaryId: string | null }>>(`
        SELECT subsidiary_id as "subsidiaryId" FROM "${tenantSchema}".talent WHERE id = $1::uuid
      `, targetScopeId);

      if (talents.length > 0 && talents[0].subsidiaryId) {
        // Recursively check subsidiary
        return this.hasDelegationForScope(tenantSchema, userId, 'subsidiary', talents[0].subsidiaryId);
      }
    }

    // For subsidiaries, check parent subsidiaries
    if (targetScopeType === 'subsidiary') {
      const subs = await prisma.$queryRawUnsafe<Array<{ parentId: string | null }>>(`
        SELECT parent_id as "parentId" FROM "${tenantSchema}".subsidiary WHERE id = $1::uuid
      `, targetScopeId);

      if (subs.length > 0 && subs[0].parentId) {
        return this.hasDelegationForScope(tenantSchema, userId, 'subsidiary', subs[0].parentId);
      }
    }

    return false;
  }

  /**
   * Get all scopes where a user has delegation rights
   */
  async getUserDelegatedScopes(
    tenantSchema: string,
    userId: string
  ): Promise<Array<{ scopeType: DelegateScopeType; scopeId: string }>> {
    // Get direct delegations
    const directScopes = await prisma.$queryRawUnsafe<Array<{ scopeType: DelegateScopeType; scopeId: string }>>(`
      SELECT scope_type as "scopeType", scope_id as "scopeId"
      FROM "${tenantSchema}".delegated_admin
      WHERE admin_user_id = $1::uuid
    `, userId);

    // Get role-based delegations
    const roleScopes = await prisma.$queryRawUnsafe<Array<{ scopeType: DelegateScopeType; scopeId: string }>>(`
      SELECT da.scope_type as "scopeType", da.scope_id as "scopeId"
      FROM "${tenantSchema}".delegated_admin da
      JOIN "${tenantSchema}".user_role ur ON ur.role_id = da.admin_role_id
      WHERE ur.user_id = $1::uuid
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    `, userId);

    // Combine and deduplicate
    const allScopes = [...directScopes, ...roleScopes];
    const uniqueScopes = new Map<string, { scopeType: DelegateScopeType; scopeId: string }>();
    
    for (const scope of allScopes) {
      const key = `${scope.scopeType}:${scope.scopeId}`;
      if (!uniqueScopes.has(key)) {
        uniqueScopes.set(key, scope);
      }
    }

    return Array.from(uniqueScopes.values());
  }
}

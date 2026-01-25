// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import { RedisService } from '../redis/redis.service';

export type ScopeType = 'tenant' | 'subsidiary' | 'talent';

interface RoleAssignment {
  roleId: string;
  scopeType: ScopeType;
  scopeId: string | null;
  inherit: boolean;
}

interface Permission {
  resourceCode: string;
  action: string;
  effect: 'grant' | 'deny';
}

/**
 * Permission Snapshot Service
 * Manages Redis-based permission snapshots for O(1) permission checks
 * PRD §12.6: 权限快照机制
 */
@Injectable()
export class PermissionSnapshotService {
  private readonly logger = new Logger(PermissionSnapshotService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Get snapshot key for a user's permissions at a specific scope
   */
  private getSnapshotKey(tenantSchema: string, userId: string, scopeType?: ScopeType, scopeId?: string | null): string {
    if (scopeType && scopeId) {
      return `perm:${tenantSchema}:${userId}:${scopeType}:${scopeId}`;
    }
    if (scopeType) {
      return `perm:${tenantSchema}:${userId}:${scopeType}:null`;
    }
    return `perm:${tenantSchema}:${userId}`;
  }

  /**
   * Check if user has permission
   * 
   * Returns true only if permission is explicitly granted and not denied.
   * Deny takes precedence over grant.
   */
  async checkPermission(
    tenantSchema: string,
    userId: string,
    resource: string,
    action: string,
    scopeType?: ScopeType,
    scopeId?: string | null
  ): Promise<boolean> {
    // Default to tenant scope if not specified (most common case for API endpoints)
    const effectiveScopeType = scopeType || 'tenant';
    const effectiveScopeId = scopeType ? scopeId : null;
    const key = this.getSnapshotKey(tenantSchema, userId, effectiveScopeType, effectiveScopeId);
    const permKey = `${resource}:${action}`;
    
    // Check specific permission
    const value = await this.redisService.hget(key, permKey);
    
    // Deny takes precedence - if explicitly denied, return false immediately
    if (value === 'deny') {
      return false;
    }
    
    if (value === 'grant') {
      return true;
    }
    
    // Check for resource-level admin permission
    const adminKey = `${resource}:admin`;
    const adminValue = await this.redisService.hget(key, adminKey);
    
    if (adminValue === 'deny') {
      return false;
    }
    
    if (adminValue === 'grant') {
      return true;
    }
    
    // Check for global admin permission
    const globalAdminValue = await this.redisService.hget(key, '*:admin');
    
    if (globalAdminValue === 'deny') {
      return false;
    }
    
    if (globalAdminValue === 'grant') {
      return true;
    }

    return false;
  }

  /**
   * Get all permissions for a user at a scope
   */
  async getUserPermissions(
    tenantSchema: string,
    userId: string,
    scopeType?: ScopeType,
    scopeId?: string | null
  ): Promise<Record<string, 'grant' | 'deny'>> {
    const key = this.getSnapshotKey(tenantSchema, userId, scopeType, scopeId);
    const data = await this.redisService.hgetall(key);
    
    const result: Record<string, 'grant' | 'deny'> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === 'grant' || v === 'deny') {
        result[k] = v;
      }
    }
    
    return result;
  }

  /**
   * Calculate and store permission snapshot for a user
   */
  async calculateAndStoreSnapshot(
    tenantSchema: string,
    userId: string,
    scopeType: ScopeType,
    scopeId: string | null
  ): Promise<void> {
    // Get scope chain (from target scope up to tenant)
    const scopeChain = await this.getScopeChain(tenantSchema, scopeType, scopeId);
    
    // Get user's role assignments
    const assignments = await this.getUserRoleAssignments(tenantSchema, userId);
    
    // Calculate effective permissions
    const permissions = await this.calculateEffectivePermissions(
      tenantSchema,
      assignments,
      scopeChain,
      scopeType,
      scopeId
    );
    
    // Store in Redis
    const key = this.getSnapshotKey(tenantSchema, userId, scopeType, scopeId);
    await this.redisService.del(key);
    
    if (Object.keys(permissions).length > 0) {
      await this.redisService.hmset(key, permissions);
      // Set TTL of 24 hours as a safety net
      await this.redisService.expire(key, 86400);
    }
    
    this.logger.debug(`Updated permission snapshot: ${key}`);
  }

  /**
   * Get scope chain from target scope up to tenant
   */
  private async getScopeChain(
    tenantSchema: string,
    scopeType: ScopeType,
    scopeId: string | null
  ): Promise<Array<{ type: ScopeType; id: string | null; path?: string }>> {
    const chain: Array<{ type: ScopeType; id: string | null; path?: string }> = [];
    
    // Always start with tenant
    chain.push({ type: 'tenant', id: null });
    
    if (scopeType === 'tenant') {
      return chain;
    }
    
    if (scopeType === 'subsidiary' && scopeId) {
      // Get subsidiary path and traverse up
      const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string; path: string }>>(`
        SELECT id, path FROM "${tenantSchema}".subsidiary WHERE id = CAST($1 AS uuid)
      `, scopeId);
      
      if (subsidiaries.length > 0) {
        const path = subsidiaries[0].path;
        // Get all ancestors based on path
        const ancestors = await prisma.$queryRawUnsafe<Array<{ id: string; path: string }>>(`
          SELECT id, path FROM "${tenantSchema}".subsidiary 
          WHERE $1 LIKE path || '%' AND path != $1
          ORDER BY length(path)
        `, path);
        
        for (const anc of ancestors) {
          chain.push({ type: 'subsidiary', id: anc.id, path: anc.path });
        }
        chain.push({ type: 'subsidiary', id: scopeId, path });
      }
    }
    
    if (scopeType === 'talent' && scopeId) {
      // Get talent and its subsidiary chain
      const talents = await prisma.$queryRawUnsafe<Array<{ id: string; subsidiaryId: string | null; path: string }>>(`
        SELECT id, subsidiary_id as "subsidiaryId", path FROM "${tenantSchema}".talent WHERE id = CAST($1 AS uuid)
      `, scopeId);
      
      if (talents.length > 0) {
        const talent = talents[0];
        
        if (talent.subsidiaryId) {
          // Get subsidiary chain
          const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string; path: string }>>(`
            SELECT id, path FROM "${tenantSchema}".subsidiary 
            WHERE $1 LIKE path || '%'
            ORDER BY length(path)
          `, talent.path);
          
          for (const sub of subsidiaries) {
            chain.push({ type: 'subsidiary', id: sub.id, path: sub.path });
          }
        }
        
        chain.push({ type: 'talent', id: scopeId, path: talent.path });
      }
    }
    
    return chain;
  }

  /**
   * Get user's role assignments
   */
  private async getUserRoleAssignments(
    tenantSchema: string,
    userId: string
  ): Promise<RoleAssignment[]> {
    const assignments = await prisma.$queryRawUnsafe<Array<{
      roleId: string;
      scopeType: ScopeType;
      scopeId: string | null;
      inherit: boolean;
    }>>(`
      SELECT 
        role_id as "roleId",
        scope_type as "scopeType",
        scope_id as "scopeId",
        inherit
      FROM "${tenantSchema}".user_role
      WHERE user_id = CAST($1 AS uuid)
        AND (expires_at IS NULL OR expires_at > NOW())
    `, userId);
    
    return assignments;
  }

  /**
   * Get role permissions with effect from role_policy table
   * Effect is now stored in role_policy, not in policy
   */
  private async getRolePermissions(
    tenantSchema: string,
    roleId: string
  ): Promise<Permission[]> {
    const permissions = await prisma.$queryRawUnsafe<Permission[]>(`
      SELECT 
        r.code as "resourceCode",
        p.action,
        rp.effect
      FROM "${tenantSchema}".role_policy rp
      JOIN "${tenantSchema}".policy p ON rp.policy_id = p.id
      JOIN "${tenantSchema}".resource r ON p.resource_id = r.id
      WHERE rp.role_id = CAST($1 AS uuid) AND p.is_active = true
    `, roleId);
    
    return permissions;
  }

  /**
   * Calculate effective permissions for a user at a specific scope
   * 
   * Three-state permission model: Grant | Deny | Unset (no record)
   * Priority: Deny > Grant > Unset
   * 
   * - If ANY role has Deny for a permission, the final result is Deny
   * - If NO role has Deny and at least one has Grant, the final result is Grant
   * - If ALL roles have Unset (no record), the permission is not granted
   */
  private async calculateEffectivePermissions(
    tenantSchema: string,
    assignments: RoleAssignment[],
    scopeChain: Array<{ type: ScopeType; id: string | null }>,
    targetScopeType: ScopeType,
    targetScopeId: string | null
  ): Promise<Record<string, 'grant' | 'deny'>> {
    // Map scope to its index in chain (higher = closer to target)
    const scopeIndex = new Map<string, number>();
    scopeChain.forEach((scope, idx) => {
      scopeIndex.set(`${scope.type}:${scope.id}`, idx);
    });
    
    // Collect all permissions from all applicable roles
    const permissionsByKey = new Map<string, Array<{
      effect: 'grant' | 'deny';
      scopeIndex: number;
      isDirect: boolean;
    }>>();
    
    for (const assignment of assignments) {
      const assignmentScopeKey = `${assignment.scopeType}:${assignment.scopeId}`;
      const assignmentScopeIdx = scopeIndex.get(assignmentScopeKey);
      
      // Skip if assignment is not in the scope chain
      if (assignmentScopeIdx === undefined) {
        continue;
      }
      
      // Check if this assignment applies to target scope
      const isDirect = assignment.scopeType === targetScopeType && 
                       assignment.scopeId === targetScopeId;
      
      // If inherit=false, only apply to direct scope
      if (!assignment.inherit && !isDirect) {
        continue;
      }
      
      // Get role permissions
      const rolePermissions = await this.getRolePermissions(tenantSchema, assignment.roleId);
      
      for (const perm of rolePermissions) {
        const key = `${perm.resourceCode}:${perm.action}`;
        
        if (!permissionsByKey.has(key)) {
          permissionsByKey.set(key, []);
        }
        
        permissionsByKey.get(key)!.push({
          effect: perm.effect,
          scopeIndex: assignmentScopeIdx,
          isDirect,
        });
      }
    }
    
    // Resolve final permissions using three-state priority:
    // Deny > Grant > Unset
    // If ANY entry has Deny, result is Deny
    // Otherwise, if ANY entry has Grant, result is Grant
    // If no entries (all Unset), permission is not included in result
    const result: Record<string, 'grant' | 'deny'> = {};
    
    for (const [key, entries] of permissionsByKey) {
      // Check if any entry has deny (deny takes precedence regardless of scope)
      const hasDeny = entries.some(e => e.effect === 'deny');
      
      if (hasDeny) {
        result[key] = 'deny';
      } else {
        // At least one grant exists (otherwise entries would be empty)
        const hasGrant = entries.some(e => e.effect === 'grant');
        if (hasGrant) {
          result[key] = 'grant';
        }
        // If no grant (shouldn't happen as we only add records with effects),
        // the permission is not included in the result (equivalent to unset)
      }
    }
    
    return result;
  }

  /**
   * Refresh all permission snapshots for a user
   */
  async refreshUserSnapshots(tenantSchema: string, userId: string): Promise<void> {
    // Get all scopes where user has roles
    const scopes = await prisma.$queryRawUnsafe<Array<{
      scopeType: ScopeType;
      scopeId: string | null;
    }>>(`
      SELECT DISTINCT scope_type as "scopeType", scope_id as "scopeId"
      FROM "${tenantSchema}".user_role
      WHERE user_id = CAST($1 AS uuid)
    `, userId);
    
    // Calculate snapshot for tenant level
    await this.calculateAndStoreSnapshot(tenantSchema, userId, 'tenant', null);
    
    // Calculate snapshots for each specific scope
    for (const scope of scopes) {
      if (scope.scopeType !== 'tenant') {
        await this.calculateAndStoreSnapshot(tenantSchema, userId, scope.scopeType, scope.scopeId);
      }
    }
  }

  /**
   * Refresh snapshots for all users affected by a role change
   */
  async refreshRoleSnapshots(tenantSchema: string, roleId: string): Promise<number> {
    // Get all users with this role
    const users = await prisma.$queryRawUnsafe<Array<{ userId: string }>>(`
      SELECT DISTINCT user_id as "userId"
      FROM "${tenantSchema}".user_role
      WHERE role_id = CAST($1 AS uuid)
    `, roleId);
    
    for (const user of users) {
      await this.refreshUserSnapshots(tenantSchema, user.userId);
    }
    
    return users.length;
  }

  /**
   * Delete all snapshots for a user
   */
  async deleteUserSnapshots(tenantSchema: string, userId: string): Promise<void> {
    const pattern = `perm:${tenantSchema}:${userId}:*`;
    const keys = await this.redisService.keys(pattern);
    
    if (keys.length > 0) {
      for (const key of keys) {
        await this.redisService.del(key);
      }
    }
    
    // Also delete the base key
    await this.redisService.del(`perm:${tenantSchema}:${userId}`);
  }
}

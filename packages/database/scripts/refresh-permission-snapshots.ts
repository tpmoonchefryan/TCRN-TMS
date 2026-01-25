// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Script to refresh all user permission snapshots after role/permission changes

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

// Get Redis connection from environment or use default
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);

type ScopeType = 'tenant' | 'subsidiary' | 'talent';

interface Permission {
  resourceCode: string;
  action: string;
  effect: 'grant' | 'deny';
}

interface RoleAssignment {
  roleId: string;
  scopeType: ScopeType;
  scopeId: string | null;
  inherit: boolean;
}

/**
 * Get all tenant schemas
 */
async function getAllTenantSchemas(): Promise<string[]> {
  const schemas = await prisma.$queryRaw<Array<{ schema_name: string }>>`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%' AND schema_name != 'tenant_template'
    ORDER BY schema_name
  `;
  return schemas.map(s => s.schema_name);
}

/**
 * Get all users in a tenant schema
 */
async function getSchemaUsers(schema: string): Promise<Array<{ id: string; username: string }>> {
  return prisma.$queryRawUnsafe<Array<{ id: string; username: string }>>(
    `SELECT id, username FROM "${schema}".system_user WHERE is_active = true`
  );
}

/**
 * Get user role assignments
 */
async function getUserRoleAssignments(schema: string, userId: string): Promise<RoleAssignment[]> {
  return prisma.$queryRawUnsafe<RoleAssignment[]>(`
    SELECT 
      role_id as "roleId",
      scope_type as "scopeType",
      scope_id as "scopeId",
      inherit
    FROM "${schema}".user_role
    WHERE user_id = '${userId}'::uuid
      AND (expires_at IS NULL OR expires_at > NOW())
  `);
}

/**
 * Get role permissions with effect from role_policy
 */
async function getRolePermissions(schema: string, roleId: string): Promise<Permission[]> {
  // Cast roleId to uuid explicitly
  const result = await prisma.$queryRawUnsafe<Permission[]>(`
    SELECT 
      r.code as "resourceCode",
      p.action,
      COALESCE(rp.effect, 'grant') as effect
    FROM "${schema}".role_policy rp
    JOIN "${schema}".policy p ON rp.policy_id = p.id
    JOIN "${schema}".resource r ON p.resource_id = r.id
    WHERE rp.role_id = '${roleId}'::uuid AND p.is_active = true
  `);
  return result.map(r => ({
    resourceCode: r.resourceCode,
    action: r.action,
    effect: (r.effect === 'deny' ? 'deny' : 'grant') as 'grant' | 'deny',
  }));
}

/**
 * Calculate effective permissions using three-state model
 * Priority: Deny > Grant > Unset
 */
function calculateEffectivePermissions(
  allPermissions: Array<{ key: string; effect: 'grant' | 'deny' }>
): Record<string, 'grant' | 'deny'> {
  const permissionsByKey = new Map<string, Array<'grant' | 'deny'>>();
  
  for (const perm of allPermissions) {
    if (!permissionsByKey.has(perm.key)) {
      permissionsByKey.set(perm.key, []);
    }
    permissionsByKey.get(perm.key)!.push(perm.effect);
  }
  
  const result: Record<string, 'grant' | 'deny'> = {};
  
  for (const [key, effects] of permissionsByKey) {
    // Deny takes precedence
    if (effects.includes('deny')) {
      result[key] = 'deny';
    } else if (effects.includes('grant')) {
      result[key] = 'grant';
    }
  }
  
  return result;
}

/**
 * Store permission snapshot in Redis
 */
async function storeSnapshot(
  schema: string,
  userId: string,
  scopeType: ScopeType,
  scopeId: string | null,
  permissions: Record<string, 'grant' | 'deny'>
): Promise<void> {
  const key = scopeId 
    ? `perm:${schema}:${userId}:${scopeType}:${scopeId}`
    : `perm:${schema}:${userId}:${scopeType}:null`;
  
  // Delete existing and set new
  await redis.del(key);
  
  if (Object.keys(permissions).length > 0) {
    await redis.hmset(key, permissions);
    await redis.expire(key, 86400); // 24 hour TTL
  }
}

/**
 * Refresh snapshots for a single user
 */
async function refreshUserSnapshots(schema: string, userId: string): Promise<number> {
  const assignments = await getUserRoleAssignments(schema, userId);
  
  if (assignments.length === 0) {
    return 0;
  }
  
  // Group assignments by scope
  const scopeSet = new Set<string>();
  scopeSet.add('tenant:null'); // Always include tenant level
  
  for (const assignment of assignments) {
    scopeSet.add(`${assignment.scopeType}:${assignment.scopeId || 'null'}`);
  }
  
  let snapshotsCreated = 0;
  
  for (const scopeKey of scopeSet) {
    const [scopeType, scopeId] = scopeKey.split(':') as [ScopeType, string];
    const actualScopeId = scopeId === 'null' ? null : scopeId;
    
    // Collect all permissions from applicable roles
    const allPermissions: Array<{ key: string; effect: 'grant' | 'deny' }> = [];
    
    for (const assignment of assignments) {
      // Check if this assignment applies to the current scope
      const isApplicable = 
        (assignment.scopeType === scopeType && assignment.scopeId === actualScopeId) ||
        (assignment.inherit && isScopeAncestor(assignment.scopeType, scopeType));
      
      if (isApplicable) {
        const rolePerms = await getRolePermissions(schema, assignment.roleId);
        for (const perm of rolePerms) {
          allPermissions.push({
            key: `${perm.resourceCode}:${perm.action}`,
            effect: perm.effect,
          });
        }
      }
    }
    
    const effectivePerms = calculateEffectivePermissions(allPermissions);
    await storeSnapshot(schema, userId, scopeType, actualScopeId, effectivePerms);
    snapshotsCreated++;
  }
  
  return snapshotsCreated;
}

/**
 * Check if sourceScope is an ancestor of targetScope
 */
function isScopeAncestor(sourceType: ScopeType, targetType: ScopeType): boolean {
  if (sourceType === 'tenant') return true;
  if (sourceType === 'subsidiary' && targetType === 'talent') return true;
  return false;
}

/**
 * Main function to refresh all snapshots
 */
async function refreshAllSnapshots() {
  console.log('🔄 Refreshing all user permission snapshots...\n');
  
  const schemas = await getAllTenantSchemas();
  console.log(`Found ${schemas.length} tenant schema(s): ${schemas.join(', ')}\n`);
  
  let totalUsers = 0;
  let totalSnapshots = 0;
  
  for (const schema of schemas) {
    console.log(`📦 Processing: ${schema}`);
    
    const users = await getSchemaUsers(schema);
    console.log(`   Found ${users.length} active users`);
    
    for (const user of users) {
      const snapshots = await refreshUserSnapshots(schema, user.id);
      totalSnapshots += snapshots;
    }
    
    totalUsers += users.length;
    console.log(`   ✓ Created ${users.length} user snapshots`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Permission snapshot refresh complete:');
  console.log(`   - Users processed: ${totalUsers}`);
  console.log(`   - Snapshots created: ${totalSnapshots}`);
}

// Run the script
refreshAllSnapshots()
  .catch((e) => {
    console.error('Error refreshing snapshots:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

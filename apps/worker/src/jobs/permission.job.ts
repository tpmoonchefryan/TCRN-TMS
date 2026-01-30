// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Permission Calculation Job Processor (PRD §12.6)

import { PrismaClient } from '@tcrn/database';
import type { Job, Processor } from 'bullmq';
import Redis from 'ioredis';

import { permissionLogger as logger } from '../logger';

/**
 * Permission calculation job data (PRD §12.6)
 */
export interface PermissionJobData {
  eventType: 'ROLE_CHANGED' | 'ORG_STRUCTURE_CHANGED' | 'POLICY_CHANGED' | 'FULL_REFRESH';
  tenantId: string;
  tenantSchemaName: string;
  affectedUserIds?: string[];
  affectedScopeIds?: string[];
  triggeredBy: string;
}

/**
 * Permission job result
 */
export interface PermissionJobResult {
  usersProcessed: number;
  snapshotsUpdated: number;
  snapshotsRemoved: number;
  duration: number;
}

/**
 * Permission snapshot structure
 */
interface PermissionSnapshot {
  userId: string;
  scopeType: string;
  scopeId: string | null;
  permissions: Record<string, string[]>; // resource -> actions
  computedAt: string;
}

/**
 * Permission calculation job processor (PRD §12.6)
 * Calculates and stores flattened permission snapshots
 * SLA: <= 60s for snapshot generation
 */
export const permissionJobProcessor: Processor<PermissionJobData, PermissionJobResult> = async (
  job: Job<PermissionJobData, PermissionJobResult>
) => {
  const startTime = Date.now();
  const { eventType, tenantId, tenantSchemaName: _tenantSchemaName, affectedUserIds, affectedScopeIds, triggeredBy } = job.data;

  logger.info(`Processing permission job for tenant ${tenantId}`);
  logger.info(`Event: ${eventType}, Triggered by: ${triggeredBy}`);

  const prisma = new PrismaClient();
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  
  const result: PermissionJobResult = {
    usersProcessed: 0,
    snapshotsUpdated: 0,
    snapshotsRemoved: 0,
    duration: 0,
  };

  try {
    // 1. Load organization tree
    const subsidiaries = await prisma.subsidiary.findMany({
      where: { isActive: true },
      orderBy: { path: 'asc' },
    });

    const talents = await prisma.talent.findMany({
      where: { isActive: true },
      select: { id: true, subsidiaryId: true, path: true },
    });

    // Build organization tree for inheritance
    const orgTree = buildOrganizationTree(subsidiaries, talents);

    // 2. Load all roles and policies
    const roles = await prisma.role.findMany({
      where: { isActive: true },
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

    // Build role -> permissions map
    const rolePermissions = new Map<string, Map<string, string[]>>();
    for (const role of roles) {
      const permissions = new Map<string, string[]>();
      for (const rp of role.rolePolicies) {
        const resourceCode = rp.policy.resource.code;
        const action = rp.policy.action;
        const effect = rp.effect;

        if (effect === 'allow') {
          if (!permissions.has(resourceCode)) {
            permissions.set(resourceCode, []);
          }
          permissions.get(resourceCode)?.push(action);
        }
      }
      rolePermissions.set(role.id, permissions);
    }

    // 3. Determine which users to process
    let userIds: string[];
    
    if (eventType === 'FULL_REFRESH') {
      // Get all active users
      const users = await prisma.systemUser.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      userIds = users.map(u => u.id);
    } else if (affectedUserIds?.length) {
      userIds = affectedUserIds;
    } else if (affectedScopeIds?.length) {
      // Find users assigned to affected scopes
      const userRoles = await prisma.userRole.findMany({
        where: {
          scopeId: { in: affectedScopeIds },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      userIds = userRoles.map(ur => ur.userId);
    } else {
      logger.warn('No users to process');
      return result;
    }

    logger.info(`Processing ${userIds.length} users`);

    // 4. Process each user
    const pipeline = redis.pipeline();
    
    for (const userId of userIds) {
      result.usersProcessed++;

      // Get user's role assignments
      const userRoles = await prisma.userRole.findMany({
        where: {
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        select: {
          roleId: true,
          scopeType: true,
          scopeId: true,
          inherit: true,
        },
      });

      // Group by scope
      const scopePermissions = new Map<string, Map<string, Set<string>>>();

      for (const ur of userRoles) {
        const scopeKey = `${ur.scopeType}:${ur.scopeId || 'tenant'}`;
        
        if (!scopePermissions.has(scopeKey)) {
          scopePermissions.set(scopeKey, new Map());
        }

        const permissions = rolePermissions.get(ur.roleId);
        if (permissions) {
          for (const [resource, actions] of permissions) {
            const scopePerms = scopePermissions.get(scopeKey);
            if (scopePerms && !scopePerms.has(resource)) {
              scopePerms.set(resource, new Set());
            }
            actions.forEach(a => scopePerms?.get(resource)?.add(a));
          }
        }

        // Handle inheritance
        if (ur.inherit && ur.scopeId && ur.scopeType !== 'tenant') {
          // Apply permissions to child scopes
          const childScopes = getChildScopes(orgTree, ur.scopeType, ur.scopeId);
          
          for (const childScope of childScopes) {
            const childKey = `${childScope.type}:${childScope.id}`;
            
            if (!scopePermissions.has(childKey)) {
              scopePermissions.set(childKey, new Map());
            }

            const permissions = rolePermissions.get(ur.roleId);
            if (permissions) {
              for (const [resource, actions] of permissions) {
              const childScopePerms = scopePermissions.get(childKey);
              if (childScopePerms && !childScopePerms.has(resource)) {
                childScopePerms.set(resource, new Set());
              }
              actions.forEach(a => childScopePerms?.get(resource)?.add(a));
              }
            }
          }
        }
      }

      // 5. Store snapshots in Redis
      // Key format: perm:{tenant_id}:{user_id}:{scope_type}:{scope_id}
      for (const [scopeKey, permissions] of scopePermissions) {
        const [scopeType, scopeId] = scopeKey.split(':');
        const redisKey = `perm:${tenantId}:${userId}:${scopeType}:${scopeId}`;

        const snapshot: PermissionSnapshot = {
          userId,
          scopeType,
          scopeId: scopeId === 'tenant' ? null : scopeId,
          permissions: Object.fromEntries(
            Array.from(permissions.entries()).map(([r, a]) => [r, Array.from(a)])
          ),
          computedAt: new Date().toISOString(),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pipeline.hset(redisKey, snapshot as any);
        result.snapshotsUpdated++;
      }

      // Update progress
      if (result.usersProcessed % 100 === 0) {
        const progress = Math.round((result.usersProcessed / userIds.length) * 100);
        await job.updateProgress(progress);
      }
    }

    // Execute pipeline
    await pipeline.exec();

    result.duration = Date.now() - startTime;

    // PRD §12.6: SLA <= 60s
    if (result.duration > 60000) {
      logger.error(`Permission job exceeded SLA: ${result.duration}ms > 60000ms`);
    }

    logger.info(`Permission job completed in ${result.duration}ms`);
    logger.info(`Users: ${result.usersProcessed}, Snapshots: ${result.snapshotsUpdated}`);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Permission job failed: ${errorMessage}`);
    throw error;
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
};

/**
 * Build organization tree structure
 */
function buildOrganizationTree(
  subsidiaries: Array<{ id: string; parentId: string | null; path: string }>,
  talents: Array<{ id: string; subsidiaryId: string | null; path: string }>
) {
  const tree: Record<string, {
    id: string;
    type: 'subsidiary' | 'talent';
    parentId: string | null;
    path: string;
    children: string[];
  }> = {};

  // Add subsidiaries
  for (const sub of subsidiaries) {
    tree[`subsidiary:${sub.id}`] = {
      id: sub.id,
      type: 'subsidiary',
      parentId: sub.parentId,
      path: sub.path,
      children: [],
    };
  }

  // Add talents
  for (const talent of talents) {
    tree[`talent:${talent.id}`] = {
      id: talent.id,
      type: 'talent',
      parentId: talent.subsidiaryId,
      path: talent.path,
      children: [],
    };

    // Link to parent subsidiary
    if (talent.subsidiaryId && tree[`subsidiary:${talent.subsidiaryId}`]) {
      tree[`subsidiary:${talent.subsidiaryId}`].children.push(`talent:${talent.id}`);
    }
  }

  // Build subsidiary hierarchy
  for (const sub of subsidiaries) {
    if (sub.parentId && tree[`subsidiary:${sub.parentId}`]) {
      tree[`subsidiary:${sub.parentId}`].children.push(`subsidiary:${sub.id}`);
    }
  }

  return tree;
}

/**
 * Get all child scopes for inheritance
 */
function getChildScopes(
  orgTree: ReturnType<typeof buildOrganizationTree>,
  scopeType: string,
  scopeId: string
): Array<{ type: 'subsidiary' | 'talent'; id: string }> {
  const result: Array<{ type: 'subsidiary' | 'talent'; id: string }> = [];
  const key = `${scopeType}:${scopeId}`;
  
  function traverse(nodeKey: string) {
    const node = orgTree[nodeKey];
    if (!node) return;

    for (const childKey of node.children) {
      const child = orgTree[childKey];
      if (child) {
        result.push({ type: child.type, id: child.id });
        traverse(childKey);
      }
    }
  }

  traverse(key);
  return result;
}

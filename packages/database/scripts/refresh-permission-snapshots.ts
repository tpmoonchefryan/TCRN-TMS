// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Script to refresh user permission snapshots after role/permission changes.
//
// This operator CLI intentionally mirrors the runtime PermissionSnapshotService
// behavior more closely than the older broad-brush script:
// - defaults to active tenants from public.tenant
// - supports targeted --schema / --user refresh
// - aligns tenant/non-tenant scope handling with the API service

import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { fileURLToPath } from 'node:url';
import {
  getRbacResourceDefinition,
  isCanonicalPermissionAction,
} from '@tcrn/shared';

import { getSchemaSyncFailureReason } from './sync-rbac-contract';

export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export type ScopeType = 'tenant' | 'subsidiary' | 'talent';

interface CliOptions {
  schemas: string[];
  users: string[];
  json: boolean;
}

export interface Permission {
  resourceCode: string;
  action: string;
  effect: 'grant' | 'deny';
}

export interface RoleAssignment {
  roleId: string;
  scopeType: ScopeType;
  scopeId: string | null;
  inherit: boolean;
}

export interface ScopeDescriptor {
  type: ScopeType;
  id: string | null;
}

interface TargetUser {
  id: string;
  username: string;
}

interface SchemaRefreshUserResult {
  userId: string;
  username: string;
  snapshotsCreated: number;
}

interface SchemaRefreshResult {
  schemaName: string;
  usersProcessed: number;
  snapshotsCreated: number;
  users: SchemaRefreshUserResult[];
}

interface SkippedSchemaResult {
  schemaName: string;
  reason: string;
}

interface RefreshSummary {
  filters: {
    schemas: string[];
    users: string[];
  };
  schemas: SchemaRefreshResult[];
  skipped: SkippedSchemaResult[];
  totals: {
    schemasProcessed: number;
    usersProcessed: number;
    snapshotsCreated: number;
  };
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  const users: string[] = [];
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--schema') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --schema');
      }

      schemas.push(value);
      index += 1;
      continue;
    }

    if (arg === '--user') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --user');
      }

      users.push(value);
      index += 1;
      continue;
    }

    if (arg === '--json') {
      json = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    schemas: [...new Set(schemas)],
    users: [...new Set(users)],
    json,
  };
}

async function tableExists(
  prisma: PrismaClient,
  schemaName: string,
  tableName: string,
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name = $2
      ) AS exists
    `,
    schemaName,
    tableName,
  );

  return rows[0]?.exists ?? false;
}

async function getSchemaRefreshFailureReason(
  prisma: PrismaClient,
  schemaName: string,
): Promise<string | null> {
  const syncFailureReason = await getSchemaSyncFailureReason(prisma, schemaName);

  if (syncFailureReason) {
    return syncFailureReason;
  }

  if (!(await tableExists(prisma, schemaName, 'system_user'))) {
    return `Schema ${schemaName} is missing system_user.`;
  }

  if (!(await tableExists(prisma, schemaName, 'user_role'))) {
    return `Schema ${schemaName} is missing user_role.`;
  }

  return null;
}

async function getTargetSchemas(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<string[]> {
  if (options.schemas.length > 0) {
    return options.schemas;
  }

  const tenants = await prisma.$queryRaw<Array<{ schemaName: string | null }>>`
    SELECT schema_name AS "schemaName"
    FROM public.tenant
    WHERE is_active = true
      AND schema_name IS NOT NULL
      AND schema_name != ''
    ORDER BY schema_name
  `;

  return tenants
    .map((tenant) => tenant.schemaName)
    .filter((schemaName): schemaName is string => Boolean(schemaName));
}

async function getTargetUsers(
  prisma: PrismaClient,
  schemaName: string,
  options: CliOptions,
): Promise<TargetUser[]> {
  if (options.users.length > 0) {
    return prisma.$queryRawUnsafe<TargetUser[]>(
      `
        SELECT DISTINCT su.id, su.username
        FROM "${schemaName}".system_user su
        WHERE su.is_active = true
          AND (
            su.id::text = ANY($1::text[])
            OR su.username = ANY($1::text[])
          )
        ORDER BY su.username, su.id
      `,
      options.users,
    );
  }

  return prisma.$queryRawUnsafe<TargetUser[]>(
    `
      SELECT DISTINCT su.id, su.username
      FROM "${schemaName}".system_user su
      JOIN "${schemaName}".user_role ur ON ur.user_id = su.id
      WHERE su.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      ORDER BY su.username, su.id
    `,
  );
}

export async function getUserRoleAssignments(
  prisma: PrismaClient,
  schemaName: string,
  userId: string,
): Promise<RoleAssignment[]> {
  return prisma.$queryRawUnsafe<RoleAssignment[]>(
    `
      SELECT
        role_id AS "roleId",
        scope_type AS "scopeType",
        scope_id AS "scopeId",
        inherit
      FROM "${schemaName}".user_role
      WHERE user_id = CAST($1 AS uuid)
        AND (expires_at IS NULL OR expires_at > NOW())
    `,
    userId,
  );
}

export async function getUserScopes(
  prisma: PrismaClient,
  schemaName: string,
  userId: string,
): Promise<ScopeDescriptor[]> {
  return prisma.$queryRawUnsafe<ScopeDescriptor[]>(
    `
      SELECT DISTINCT
        scope_type AS type,
        scope_id AS id
      FROM "${schemaName}".user_role
      WHERE user_id = CAST($1 AS uuid)
        AND (expires_at IS NULL OR expires_at > NOW())
    `,
    userId,
  );
}

async function getRolePermissions(
  prisma: PrismaClient,
  schemaName: string,
  roleId: string,
): Promise<Permission[]> {
  const permissions = await prisma.$queryRawUnsafe<Permission[]>(
    `
      SELECT
        r.code AS "resourceCode",
        p.action AS action,
        rp.effect AS effect
      FROM "${schemaName}".role_policy rp
      JOIN "${schemaName}".policy p ON rp.policy_id = p.id
      JOIN "${schemaName}".resource r ON p.resource_id = r.id
      WHERE rp.role_id = CAST($1 AS uuid)
        AND p.is_active = true
    `,
    roleId,
  );

  return permissions.filter(shouldStoreRuntimePermission);
}

function shouldStoreRuntimePermission(permission: Permission): boolean {
  const resourceDefinition = getRbacResourceDefinition(permission.resourceCode);

  if (!resourceDefinition) {
    return true;
  }

  if (!isCanonicalPermissionAction(permission.action)) {
    return false;
  }

  return resourceDefinition.supportedActions.includes(permission.action);
}

export async function getScopeChain(
  prisma: PrismaClient,
  schemaName: string,
  scopeType: ScopeType,
  scopeId: string | null,
): Promise<ScopeDescriptor[]> {
  const chain: ScopeDescriptor[] = [{ type: 'tenant', id: null }];

  if (scopeType === 'tenant') {
    return chain;
  }

  if (scopeType === 'subsidiary' && scopeId) {
    const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string; path: string }>>(
      `
        SELECT id, path
        FROM "${schemaName}".subsidiary
        WHERE id = CAST($1 AS uuid)
      `,
      scopeId,
    );

    if (subsidiaries.length === 0) {
      return chain;
    }

    const target = subsidiaries[0];
    const ancestors = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "${schemaName}".subsidiary
        WHERE $1 LIKE path || '%'
          AND path != $1
        ORDER BY length(path)
      `,
      target.path,
    );

    for (const ancestor of ancestors) {
      chain.push({ type: 'subsidiary', id: ancestor.id });
    }

    chain.push({ type: 'subsidiary', id: scopeId });
    return chain;
  }

  if (scopeType === 'talent' && scopeId) {
    const talents = await prisma.$queryRawUnsafe<Array<{ id: string; subsidiaryId: string | null; path: string }>>(
      `
        SELECT
          id,
          subsidiary_id AS "subsidiaryId",
          path
        FROM "${schemaName}".talent
        WHERE id = CAST($1 AS uuid)
      `,
      scopeId,
    );

    if (talents.length === 0) {
      return chain;
    }

    const talent = talents[0];

    if (talent.subsidiaryId) {
      const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT id
          FROM "${schemaName}".subsidiary
          WHERE $1 LIKE path || '%'
          ORDER BY length(path)
        `,
        talent.path,
      );

      for (const subsidiary of subsidiaries) {
        chain.push({ type: 'subsidiary', id: subsidiary.id });
      }
    }

    chain.push({ type: 'talent', id: scopeId });
  }

  return chain;
}

export async function calculateEffectivePermissions(
  prisma: PrismaClient,
  schemaName: string,
  assignments: RoleAssignment[],
  scopeChain: ScopeDescriptor[],
  targetScopeType: ScopeType,
  targetScopeId: string | null,
): Promise<Record<string, 'grant' | 'deny'>> {
  const scopeIndex = new Map<string, number>();

  scopeChain.forEach((scope, index) => {
    scopeIndex.set(`${scope.type}:${scope.id}`, index);
  });

  const permissionsByKey = new Map<string, Array<{ effect: 'grant' | 'deny'; scopeIndex: number; isDirect: boolean }>>();

  for (const assignment of assignments) {
    const assignmentScopeKey = `${assignment.scopeType}:${assignment.scopeId}`;
    let assignmentScopeIndex = scopeIndex.get(assignmentScopeKey);

    if (assignmentScopeIndex === undefined && assignment.scopeType === 'tenant') {
      assignmentScopeIndex = scopeIndex.get('tenant:null');
    }

    if (assignmentScopeIndex === undefined) {
      continue;
    }

    const isTenantMatch = assignment.scopeType === 'tenant' && targetScopeType === 'tenant';
    const isDirect =
      (assignment.scopeType === targetScopeType && assignment.scopeId === targetScopeId) ||
      isTenantMatch;

    if (!assignment.inherit && !isDirect) {
      continue;
    }

    const rolePermissions = await getRolePermissions(prisma, schemaName, assignment.roleId);

    for (const permission of rolePermissions) {
      const key = `${permission.resourceCode}:${permission.action}`;

      if (!permissionsByKey.has(key)) {
        permissionsByKey.set(key, []);
      }

      permissionsByKey.get(key)?.push({
        effect: permission.effect,
        scopeIndex: assignmentScopeIndex,
        isDirect,
      });
    }
  }

  const result: Record<string, 'grant' | 'deny'> = {};

  for (const [key, entries] of permissionsByKey) {
    const hasDeny = entries.some((entry) => entry.effect === 'deny');

    if (hasDeny) {
      result[key] = 'deny';
      continue;
    }

    if (entries.some((entry) => entry.effect === 'grant')) {
      result[key] = 'grant';
    }
  }

  return result;
}

export function getSnapshotKey(
  schemaName: string,
  userId: string,
  scopeType: ScopeType,
  scopeId: string | null,
): string {
  return scopeId
    ? `perm:${schemaName}:${userId}:${scopeType}:${scopeId}`
    : `perm:${schemaName}:${userId}:${scopeType}:null`;
}

async function storeSnapshot(
  redis: Redis,
  schemaName: string,
  userId: string,
  scopeType: ScopeType,
  scopeId: string | null,
  permissions: Record<string, 'grant' | 'deny'>,
): Promise<void> {
  const key = getSnapshotKey(schemaName, userId, scopeType, scopeId);

  await redis.del(key);

  if (Object.keys(permissions).length > 0) {
    await redis.hmset(key, permissions);
    await redis.expire(key, 86400);
  }
}

async function calculateAndStoreSnapshot(
  prisma: PrismaClient,
  redis: Redis,
  schemaName: string,
  userId: string,
  scopeType: ScopeType,
  scopeId: string | null,
): Promise<void> {
  const scopeChain = await getScopeChain(prisma, schemaName, scopeType, scopeId);
  const assignments = await getUserRoleAssignments(prisma, schemaName, userId);
  const permissions = await calculateEffectivePermissions(
    prisma,
    schemaName,
    assignments,
    scopeChain,
    scopeType,
    scopeId,
  );

  await storeSnapshot(redis, schemaName, userId, scopeType, scopeId, permissions);
}

async function refreshUserSnapshots(
  prisma: PrismaClient,
  redis: Redis,
  schemaName: string,
  userId: string,
): Promise<number> {
  const scopes = await getUserScopes(prisma, schemaName, userId);
  let snapshotsCreated = 0;

  await calculateAndStoreSnapshot(prisma, redis, schemaName, userId, 'tenant', null);
  snapshotsCreated += 1;

  for (const scope of scopes) {
    if (scope.type === 'tenant') {
      continue;
    }

    await calculateAndStoreSnapshot(prisma, redis, schemaName, userId, scope.type, scope.id);
    snapshotsCreated += 1;
  }

  return snapshotsCreated;
}

async function refreshSnapshots(options: CliOptions): Promise<RefreshSummary> {
  const prisma = new PrismaClient();
  const redis = new Redis(REDIS_URL);

  try {
    const schemaNames = await getTargetSchemas(prisma, options);
    const summary: RefreshSummary = {
      filters: {
        schemas: options.schemas,
        users: options.users,
      },
      schemas: [],
      skipped: [],
      totals: {
        schemasProcessed: 0,
        usersProcessed: 0,
        snapshotsCreated: 0,
      },
    };

    for (const schemaName of schemaNames) {
      const failureReason = await getSchemaRefreshFailureReason(prisma, schemaName);

      if (failureReason) {
        summary.skipped.push({ schemaName, reason: failureReason });
        continue;
      }

      const users = await getTargetUsers(prisma, schemaName, options);
      const schemaResult: SchemaRefreshResult = {
        schemaName,
        usersProcessed: 0,
        snapshotsCreated: 0,
        users: [],
      };

      for (const user of users) {
        const snapshotsCreated = await refreshUserSnapshots(prisma, redis, schemaName, user.id);

        schemaResult.users.push({
          userId: user.id,
          username: user.username,
          snapshotsCreated,
        });
        schemaResult.usersProcessed += 1;
        schemaResult.snapshotsCreated += snapshotsCreated;
      }

      summary.schemas.push(schemaResult);
      summary.totals.schemasProcessed += 1;
      summary.totals.usersProcessed += schemaResult.usersProcessed;
      summary.totals.snapshotsCreated += schemaResult.snapshotsCreated;
    }

    return summary;
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

function printSummary(summary: RefreshSummary): void {
  console.log('🔄 Refreshing permission snapshots...\n');

  if (summary.filters.schemas.length > 0) {
    console.log(`Schema filter: ${summary.filters.schemas.join(', ')}`);
  }

  if (summary.filters.users.length > 0) {
    console.log(`User filter: ${summary.filters.users.join(', ')}`);
  }

  for (const schemaResult of summary.schemas) {
    console.log(`\nSchema: ${schemaResult.schemaName}`);
    console.log(`- users processed: ${schemaResult.usersProcessed}`);
    console.log(`- snapshots created: ${schemaResult.snapshotsCreated}`);

    for (const user of schemaResult.users) {
      console.log(
        `  - ${user.username} (${user.userId}): snapshots=${user.snapshotsCreated}`,
      );
    }
  }

  if (summary.skipped.length > 0) {
    console.log('\nSkipped schemas:');

    for (const skipped of summary.skipped) {
      console.log(`- ${skipped.schemaName}: ${skipped.reason}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Permission snapshot refresh complete:');
  console.log(`- schemas processed: ${summary.totals.schemasProcessed}`);
  console.log(`- users processed: ${summary.totals.usersProcessed}`);
  console.log(`- snapshots created: ${summary.totals.snapshotsCreated}`);
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const summary = await refreshSnapshots(options);

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  printSummary(summary);
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error('Error refreshing snapshots:', error);
    process.exit(1);
  });
}

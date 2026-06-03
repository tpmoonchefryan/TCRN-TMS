// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Non-destructive RBAC contract sync for tenant_template and existing tenant schemas

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  INITIAL_ADMIN_ROLE_CODE,
  RBAC_POLICY_DEFINITIONS,
  RBAC_RESOURCES,
  RBAC_ROLE_PERMISSION_ENTRIES,
  RBAC_ROLE_TEMPLATES,
} from '../prisma/seeds/_rbac-contract';
import { PrismaClient } from '../src/platform/prisma/client';
import { loadRepoEnvFiles } from './load-repo-env';

loadRepoEnvFiles(import.meta.url);

type RbacTableName = 'resource' | 'policy' | 'role' | 'role_policy';
type InitialAdminInvariantStatus = 'passed' | 'blocked' | 'not_applicable';

export interface CliOptions {
  schemas: string[];
  skipTemplate: boolean;
}

export interface SchemaCounts {
  resources: number;
  policies: number;
  roles: number;
  rolePolicies: number;
}

export interface RbacSchemaSyncResult {
  schemaName: string;
  before: SchemaCounts;
  after: SchemaCounts;
  initialAdminReadback: InitialAdminCompatibilityReadback;
}

export interface SkippedSchemaSync {
  schemaName: string;
  reason: string;
}

export interface SyncRbacContractSummary {
  synced: RbacSchemaSyncResult[];
  skipped: SkippedSchemaSync[];
}

const REQUIRED_RBAC_TABLES: readonly RbacTableName[] = [
  'resource',
  'policy',
  'role',
  'role_policy',
] as const;

const LEGACY_BUILT_IN_ROLE_CODES = ['PLATFORM_ADMIN', 'ADMIN', 'TENANT_ADMIN'] as const;

interface QueryRunner {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

export interface RoleDefinitionRecordReadback {
  roleCode: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  roleDefinitionRecord: unknown;
}

export interface InitialAdminCompatibilityReadback {
  schemaName: string;
  systemRoleCount: number;
  legacyBuiltInSystemRoleCount: number;
  initialAdminAssignmentCount: number;
  assignedLegacyRoleCount: number;
  legacyCompatibilityRoleCount: number;
  zeroDeletedRoleRows: boolean;
  noLastAdminInvariant: {
    status: InitialAdminInvariantStatus;
    reason: string;
  };
  roleDefinitionRecords: RoleDefinitionRecordReadback[];
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  let skipTemplate = false;

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

    if (arg === '--skip-template') {
      skipTemplate = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    schemas,
    skipTemplate,
  };
}

async function getTenantSchemasFromPublic(prisma: PrismaClient): Promise<string[]> {
  const tenants = await prisma.$queryRawUnsafe<Array<{ schema_name: string | null }>>(`
    SELECT schema_name
    FROM public.tenant
    WHERE schema_name IS NOT NULL
      AND schema_name != ''
    ORDER BY schema_name
  `);

  return tenants
    .map((tenant) => tenant.schema_name)
    .filter((schemaName): schemaName is string => Boolean(schemaName));
}

async function schemaExists(prisma: PrismaClient, schemaName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.schemata
        WHERE schema_name = $1
      ) AS exists
    `,
    schemaName,
  );

  return rows[0]?.exists ?? false;
}

async function tableExists(
  prisma: QueryRunner,
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

export async function readInitialAdminCompatibilityReadback(
  prisma: QueryRunner,
  schemaName: string,
): Promise<InitialAdminCompatibilityReadback> {
  const [systemRoles, legacyBuiltInRoles, legacyCompatibilityRoles] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${schemaName}".role WHERE is_system = true`,
    ),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*)::bigint AS count
        FROM "${schemaName}".role
        WHERE code = ANY($1::text[])
          AND is_system = true
      `,
      [...LEGACY_BUILT_IN_ROLE_CODES],
    ),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*)::bigint AS count
        FROM "${schemaName}".role
        WHERE code = ANY($1::text[])
          AND is_system = false
      `,
      [...LEGACY_BUILT_IN_ROLE_CODES],
    ),
  ]);

  const hasUserRoleTable = await tableExists(prisma, schemaName, 'user_role');
  let initialAdminAssignmentCount = 0;
  let assignedLegacyRoleCount = 0;

  if (hasUserRoleTable) {
    const [initialAdminAssignments, assignedLegacyRoles] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `
          SELECT COUNT(*)::bigint AS count
          FROM "${schemaName}".user_role ur
          JOIN "${schemaName}".role r ON r.id = ur.role_id
          WHERE r.code = $1
            AND ur.scope_type = 'tenant'
            AND (ur.expires_at IS NULL OR ur.expires_at > now())
        `,
        INITIAL_ADMIN_ROLE_CODE,
      ),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `
          SELECT COUNT(*)::bigint AS count
          FROM "${schemaName}".user_role ur
          JOIN "${schemaName}".role r ON r.id = ur.role_id
          WHERE r.code = ANY($1::text[])
        `,
        [...LEGACY_BUILT_IN_ROLE_CODES],
      ),
    ]);

    initialAdminAssignmentCount = Number(initialAdminAssignments[0]?.count ?? 0);
    assignedLegacyRoleCount = Number(assignedLegacyRoles[0]?.count ?? 0);
  }

  const legacyBuiltInSystemRoleCount = Number(legacyBuiltInRoles[0]?.count ?? 0);
  let invariantStatus: InitialAdminInvariantStatus = 'not_applicable';
  let invariantReason = 'No legacy built-in role relabeling is required.';

  if (schemaName === 'tenant_template') {
    invariantReason = 'tenant_template has no user assignments; runtime tenant readback is not applicable.';
  } else if (legacyBuiltInSystemRoleCount > 0) {
    if (!hasUserRoleTable) {
      invariantStatus = 'blocked';
      invariantReason = 'user_role table is unavailable for Initial Admin coverage readback.';
    } else if (initialAdminAssignmentCount > 0) {
      invariantStatus = 'passed';
      invariantReason = 'At least one active tenant-scope Initial Admin assignment exists.';
    } else {
      invariantStatus = 'blocked';
      invariantReason =
        'Legacy built-in role relabeling requires an active tenant-scope Initial Admin assignment.';
    }
  }

  const roleDefinitionRecords = await prisma.$queryRawUnsafe<RoleDefinitionRecordReadback[]>(
    `
      SELECT
        code as "roleCode",
        created_at as "createdAt",
        updated_at as "updatedAt",
        extra_data -> 'roleDefinitionRecord' as "roleDefinitionRecord"
      FROM "${schemaName}".role
      WHERE code = $1
         OR code = ANY($2::text[])
      ORDER BY code
    `,
    INITIAL_ADMIN_ROLE_CODE,
    [...LEGACY_BUILT_IN_ROLE_CODES],
  );

  return {
    schemaName,
    systemRoleCount: Number(systemRoles[0]?.count ?? 0),
    legacyBuiltInSystemRoleCount,
    initialAdminAssignmentCount,
    assignedLegacyRoleCount,
    legacyCompatibilityRoleCount: Number(legacyCompatibilityRoles[0]?.count ?? 0),
    zeroDeletedRoleRows: true,
    noLastAdminInvariant: {
      status: invariantStatus,
      reason: invariantReason,
    },
    roleDefinitionRecords,
  };
}

export async function assertInitialAdminCompatibilityReadback(
  prisma: QueryRunner,
  schemaName: string,
): Promise<InitialAdminCompatibilityReadback> {
  const readback = await readInitialAdminCompatibilityReadback(prisma, schemaName);

  if (readback.noLastAdminInvariant.status === 'blocked') {
    throw new Error(
      `Cannot relabel legacy RBAC roles in ${schemaName}: ${readback.noLastAdminInvariant.reason}`,
    );
  }

  return readback;
}

async function getMissingRequiredTables(
  prisma: PrismaClient,
  schemaName: string,
): Promise<RbacTableName[]> {
  const missingTables: RbacTableName[] = [];

  for (const tableName of REQUIRED_RBAC_TABLES) {
    if (!(await tableExists(prisma, schemaName, tableName))) {
      missingTables.push(tableName);
    }
  }

  return missingTables;
}

export async function getSchemaSyncFailureReason(
  prisma: PrismaClient,
  schemaName: string,
): Promise<string | null> {
  if (!(await schemaExists(prisma, schemaName))) {
    return `Schema not found: ${schemaName}`;
  }

  const missingTables = await getMissingRequiredTables(prisma, schemaName);

  if (missingTables.length > 0) {
    return `Schema ${schemaName} is missing ${missingTables.join(', ')}. Run pnpm --filter @tcrn/database db:sync-schemas first.`;
  }

  return null;
}

async function ensureSchemaIsSyncable(prisma: PrismaClient, schemaName: string): Promise<void> {
  const failureReason = await getSchemaSyncFailureReason(prisma, schemaName);

  if (failureReason) {
    throw new Error(failureReason);
  }
}

export async function getSchemaCounts(
  prisma: PrismaClient,
  schemaName: string,
): Promise<SchemaCounts> {
  const [resources, policies, roles, rolePolicies] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${schemaName}".resource`,
    ),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${schemaName}".policy`,
    ),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${schemaName}".role`,
    ),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${schemaName}".role_policy`,
    ),
  ]);

  return {
    resources: Number(resources[0]?.count ?? 0),
    policies: Number(policies[0]?.count ?? 0),
    roles: Number(roles[0]?.count ?? 0),
    rolePolicies: Number(rolePolicies[0]?.count ?? 0),
  };
}

export async function syncSchema(
  prisma: PrismaClient,
  schemaName: string,
): Promise<RbacSchemaSyncResult> {
  await ensureSchemaIsSyncable(prisma, schemaName);

  const before = await getSchemaCounts(prisma, schemaName);

  let initialAdminReadback: InitialAdminCompatibilityReadback | null = null;

  await prisma.$transaction(async (tx) => {
    for (const resource of RBAC_RESOURCES) {
      await tx.$executeRawUnsafe(`
        INSERT INTO "${schemaName}".resource (
          id, code, module, name, sort_order, is_active, created_at, updated_at
        )
        VALUES (gen_random_uuid(), $1, $2, $3::jsonb, $4, true, now(), now())
        ON CONFLICT (code) DO UPDATE
        SET module = EXCLUDED.module,
            name = EXCLUDED.name,
            sort_order = EXCLUDED.sort_order,
            is_active = true,
            updated_at = now()
      `, resource.code, resource.module, JSON.stringify(resource.name), resource.sortOrder);
    }

    for (const policy of RBAC_POLICY_DEFINITIONS) {
      await tx.$executeRawUnsafe(`
        WITH resource_lookup AS (
          SELECT id FROM "${schemaName}".resource WHERE code = $1
        )
        INSERT INTO "${schemaName}".policy (
          id, resource_id, action, is_active, created_at, updated_at
        )
        SELECT gen_random_uuid(), r.id, $2, true, now(), now()
        FROM resource_lookup r
        ON CONFLICT (resource_id, action) DO UPDATE
        SET is_active = true,
            updated_at = now()
      `, policy.resourceCode, policy.action);
    }

    for (const role of RBAC_ROLE_TEMPLATES) {
      await tx.$executeRawUnsafe(`
        INSERT INTO "${schemaName}".role (
          id, code, name, description, is_system, is_active, created_at, updated_at, version
        )
        VALUES (gen_random_uuid(), $1, $2::jsonb, $3, $4, true, now(), now(), 1)
        ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            is_system = EXCLUDED.is_system,
            is_active = true,
            updated_at = now()
      `, role.code, JSON.stringify(role.name), role.description, role.isSystem);
    }

    initialAdminReadback = await assertInitialAdminCompatibilityReadback(tx, schemaName);

    await tx.$executeRawUnsafe(`
      UPDATE "${schemaName}".role
      SET is_system = false,
          updated_at = now()
      WHERE code = ANY($1::text[])
        AND code != $2
    `, [...LEGACY_BUILT_IN_ROLE_CODES], INITIAL_ADMIN_ROLE_CODE);

    for (const entry of RBAC_ROLE_PERMISSION_ENTRIES) {
      await tx.$executeRawUnsafe(`
        WITH role_lookup AS (
          SELECT id FROM "${schemaName}".role WHERE code = $1
        ),
        policy_lookup AS (
          SELECT p.id
          FROM "${schemaName}".policy p
          JOIN "${schemaName}".resource r ON r.id = p.resource_id
          WHERE r.code = $2
            AND p.action = $3
        )
        INSERT INTO "${schemaName}".role_policy (
          id, role_id, policy_id, effect, created_at
        )
        SELECT gen_random_uuid(), rl.id, pl.id, $4, now()
        FROM role_lookup rl
        CROSS JOIN policy_lookup pl
        ON CONFLICT (role_id, policy_id) DO UPDATE
        SET effect = EXCLUDED.effect
      `, entry.roleCode, entry.resourceCode, entry.action, entry.effect);
    }
  });

  const after = await getSchemaCounts(prisma, schemaName);

  if (!initialAdminReadback) {
    throw new Error(`Missing Initial Admin compatibility readback for ${schemaName}`);
  }

  return { schemaName, before, after, initialAdminReadback };
}

export async function resolveTargetSchemas(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<string[]> {
  if (options.schemas.length > 0) {
    return [...new Set(options.schemas)];
  }

  const targetSchemas = await getTenantSchemasFromPublic(prisma);

  if (!options.skipTemplate) {
    targetSchemas.unshift('tenant_template');
  }

  return [...new Set(targetSchemas)];
}

export async function syncRbacContractSchemas(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<RbacSchemaSyncResult[]> {
  const summary = await syncRbacContractSchemasWithReport(prisma, options);
  return summary.synced;
}

export async function syncRbacContractSchemasWithReport(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<SyncRbacContractSummary> {
  const targetSchemas = await resolveTargetSchemas(prisma, options);
  const synced: RbacSchemaSyncResult[] = [];
  const skipped: SkippedSchemaSync[] = [];
  const strictSchemas = options.schemas.length > 0;

  for (const schemaName of targetSchemas) {
    const failureReason = await getSchemaSyncFailureReason(prisma, schemaName);

    if (failureReason) {
      if (strictSchemas) {
        throw new Error(failureReason);
      }

      skipped.push({
        schemaName,
        reason: failureReason,
      });
      continue;
    }

    synced.push(await syncSchema(prisma, schemaName));
  }

  return {
    synced,
    skipped,
  };
}

function printSchemaDelta(schemaName: string, before: SchemaCounts, after: SchemaCounts): void {
  console.log(`\n📦 Synced RBAC contract for ${schemaName}`);
  console.log(`   resources: ${before.resources} -> ${after.resources} (${after.resources - before.resources >= 0 ? '+' : ''}${after.resources - before.resources})`);
  console.log(`   policies: ${before.policies} -> ${after.policies} (${after.policies - before.policies >= 0 ? '+' : ''}${after.policies - before.policies})`);
  console.log(`   roles: ${before.roles} -> ${after.roles} (${after.roles - before.roles >= 0 ? '+' : ''}${after.roles - before.roles})`);
  console.log(`   role_policy: ${before.rolePolicies} -> ${after.rolePolicies} (${after.rolePolicies - before.rolePolicies >= 0 ? '+' : ''}${after.rolePolicies - before.rolePolicies})`);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const options = parseCliArgs(process.argv.slice(2));

  try {
    const targetSchemas = await resolveTargetSchemas(prisma, options);

    if (targetSchemas.length === 0) {
      console.log('No target schemas found for RBAC contract sync.');
      return;
    }

    console.log('🔄 Syncing RBAC contract to schemas...');
    console.log(`Targets: ${targetSchemas.join(', ')}`);

    const summary = await syncRbacContractSchemasWithReport(prisma, options);

    for (const result of summary.synced) {
      printSchemaDelta(result.schemaName, result.before, result.after);
    }

    if (summary.skipped.length > 0) {
      console.warn('\n⚠️  Skipped non-syncable schemas:');

      for (const skippedSchema of summary.skipped) {
        console.warn(`   - ${skippedSchema.schemaName}: ${skippedSchema.reason}`);
      }
    }

    console.log('\n✅ RBAC contract sync complete.');
    console.log('ℹ️  Run `pnpm --filter @tcrn/database db:refresh-snapshots` if active users need refreshed permission snapshots.');
  } finally {
    await prisma.$disconnect();
  }
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error('RBAC sync failed:', error);
    process.exit(1);
  });
}

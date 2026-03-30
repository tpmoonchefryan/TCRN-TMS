// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Non-destructive RBAC contract sync for tenant_template and existing tenant schemas

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

import {
  RBAC_POLICY_DEFINITIONS,
  RBAC_RESOURCES,
  RBAC_ROLE_PERMISSION_ENTRIES,
  RBAC_ROLE_TEMPLATES,
} from '../prisma/seeds/_rbac-contract';
type RbacTableName = 'resource' | 'policy' | 'role' | 'role_policy';

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
  prisma: PrismaClient,
  schemaName: string,
  tableName: RbacTableName,
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

  await prisma.$transaction(async (tx) => {
    for (const resource of RBAC_RESOURCES) {
      await tx.$executeRawUnsafe(`
        INSERT INTO "${schemaName}".resource (
          id, code, module, name_en, name_zh, name_ja, sort_order, is_active, created_at, updated_at
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, now(), now())
        ON CONFLICT (code) DO UPDATE
        SET module = EXCLUDED.module,
            name_en = EXCLUDED.name_en,
            name_zh = EXCLUDED.name_zh,
            name_ja = EXCLUDED.name_ja,
            sort_order = EXCLUDED.sort_order,
            is_active = true,
            updated_at = now()
      `, resource.code, resource.module, resource.nameEn, resource.nameZh, resource.nameJa, resource.sortOrder);
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
          id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, now(), now(), 1)
        ON CONFLICT (code) DO UPDATE
        SET name_en = EXCLUDED.name_en,
            name_zh = EXCLUDED.name_zh,
            name_ja = EXCLUDED.name_ja,
            description = EXCLUDED.description,
            is_system = EXCLUDED.is_system,
            is_active = true,
            updated_at = now()
      `, role.code, role.nameEn, role.nameZh, role.nameJa, role.description, role.isSystem);
    }

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

  return { schemaName, before, after };
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

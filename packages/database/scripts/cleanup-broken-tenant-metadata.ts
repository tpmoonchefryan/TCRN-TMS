// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Clean obviously broken tenant metadata rows left by interrupted local runs.

import { PrismaClient } from '@prisma/client';

interface CliOptions {
  apply: boolean;
}

interface BrokenTenantRecord {
  id: string;
  code: string;
  schemaName: string;
  issue: 'missing_schema' | 'empty_shell_schema';
}

function parseCliArgs(argv: string[]): CliOptions {
  let apply = false;

  for (const arg of argv) {
    if (arg === '--') {
      continue;
    }

    if (arg === '--apply') {
      apply = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { apply };
}

async function findBrokenTenantRecords(prisma: PrismaClient): Promise<BrokenTenantRecord[]> {
  return prisma.$queryRawUnsafe<BrokenTenantRecord[]>(`
    WITH tenant_rows AS (
      SELECT id, code, schema_name
      FROM public.tenant
      WHERE schema_name IS NOT NULL
        AND schema_name != ''
    ),
    schema_flags AS (
      SELECT
        tr.id,
        tr.code,
        tr.schema_name AS "schemaName",
        EXISTS (
          SELECT 1
          FROM information_schema.schemata s
          WHERE s.schema_name = tr.schema_name
        ) AS schema_exists,
        EXISTS (
          SELECT 1
          FROM information_schema.tables t
          WHERE t.table_schema = tr.schema_name
            AND t.table_name = 'resource'
        ) AS has_resource,
        EXISTS (
          SELECT 1
          FROM information_schema.tables t
          WHERE t.table_schema = tr.schema_name
            AND t.table_name = 'policy'
        ) AS has_policy,
        EXISTS (
          SELECT 1
          FROM information_schema.tables t
          WHERE t.table_schema = tr.schema_name
            AND t.table_name = 'role'
        ) AS has_role,
        EXISTS (
          SELECT 1
          FROM information_schema.tables t
          WHERE t.table_schema = tr.schema_name
            AND t.table_name = 'role_policy'
        ) AS has_role_policy
      FROM tenant_rows tr
    )
    SELECT
      id,
      code,
      "schemaName",
      CASE
        WHEN NOT schema_exists THEN 'missing_schema'
        WHEN schema_exists
          AND NOT has_resource
          AND NOT has_policy
          AND NOT has_role
          AND NOT has_role_policy THEN 'empty_shell_schema'
      END AS issue
    FROM schema_flags
    WHERE NOT schema_exists
       OR (
         schema_exists
         AND NOT has_resource
         AND NOT has_policy
         AND NOT has_role
         AND NOT has_role_policy
       )
    ORDER BY code
  `);
}

async function cleanupBrokenTenantRecord(
  prisma: PrismaClient,
  record: BrokenTenantRecord,
): Promise<void> {
  if (record.issue === 'empty_shell_schema') {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${record.schemaName}" CASCADE`);
  }

  await prisma.tenant.delete({
    where: { id: record.id },
  });
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const options = parseCliArgs(process.argv.slice(2));

  try {
    const brokenRecords = await findBrokenTenantRecords(prisma);

    if (brokenRecords.length === 0) {
      console.log('No obviously broken tenant metadata rows found.');
      return;
    }

    console.log(options.apply ? '🧹 Cleaning broken tenant metadata...' : '🔍 Broken tenant metadata candidates (dry-run)');
    console.log(JSON.stringify(brokenRecords, null, 2));

    if (!options.apply) {
      console.log('\nℹ️  Re-run with --apply to delete these tenant rows and drop any empty-shell schemas.');
      return;
    }

    for (const record of brokenRecords) {
      await cleanupBrokenTenantRecord(prisma, record);
    }

    console.log(`\n✅ Removed ${brokenRecords.length} broken tenant metadata row(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Broken tenant metadata cleanup failed:', error);
  process.exit(1);
});

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Script to manually apply SQL migrations to all tenant schemas
import * as fs from 'node:fs';
import * as path from 'node:path';

import { PrismaClient } from '@prisma/client';

import {
  countTenantMigrationSkips,
  executeTenantMigrationStatements,
  formatStatementPreview,
  formatTenantMigrationDriftWatchSkipReasonCounts,
  formatTenantMigrationSkipReasonCounts,
  mergeTenantMigrationSkipReasonCounts,
  splitSqlStatements,
  TENANT_MIGRATION_DRIFT_WATCH_SKIP_REASONS,
  type TenantMigrationExecutionSummary,
  type TenantMigrationSkipReasonCounts,
} from './apply-migrations-helpers';

const prisma = new PrismaClient();

/**
 * Get all tenant schemas (including tenant_template)
 */
async function getAllTenantSchemas(): Promise<string[]> {
  const schemas = await prisma.$queryRaw<Array<{ schema_name: string }>>`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY 
      CASE WHEN schema_name = 'tenant_template' THEN 0 ELSE 1 END,
      schema_name
  `;
  return schemas.map((s) => s.schema_name);
}

/**
 * Apply a migration SQL file to a specific schema
 * Replaces 'tenant_template' with the target schema name
 */
async function applyMigrationToSchema(
  sql: string,
  targetSchema: string,
  migrationName: string
): Promise<TenantMigrationExecutionSummary> {
  // Replace tenant_template with target schema
  const schemaSql = sql.replace(/tenant_template/g, targetSchema);

  return executeTenantMigrationStatements({
    statements: splitSqlStatements(schemaSql),
    targetSchema,
    migrationName,
    executeStatement: async (statement) => {
      await prisma.$executeRawUnsafe(statement);
    },
    onNonIgnorableError: ({ message, statementPreview }) => {
      const truncatedMessage = formatStatementPreview(message, 100);
      console.error(
        `      Error in ${migrationName} for ${targetSchema}: ${truncatedMessage} [statement: ${statementPreview}]`
      );
    },
  });
}

async function applyMigrations() {
  console.log('🔄 Applying SQL migrations to all tenant schemas...\n');

  // Get all tenant schemas
  const schemas = await getAllTenantSchemas();
  console.log(`Found ${schemas.length} tenant schema(s): ${schemas.join(', ')}\n`);

  const migrationsDir = path.join(__dirname, '../prisma/migrations');

  // Get all migration directories
  const migrations = fs
    .readdirSync(migrationsDir)
    .filter((f) => fs.statSync(path.join(migrationsDir, f)).isDirectory())
    .sort();

  console.log(`Found ${migrations.length} migration(s)\n`);

  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const totalSkippedByReason: TenantMigrationSkipReasonCounts = {};

  for (const migration of migrations) {
    const migrationPath = path.join(migrationsDir, migration, 'migration.sql');

    if (!fs.existsSync(migrationPath)) {
      console.log(`  Skipping ${migration} (no migration.sql found)`);
      continue;
    }

    console.log(`📌 Applying: ${migration}`);

    const sql = fs.readFileSync(migrationPath, 'utf-8');
    let migrationSuccess = 0;
    let migrationSkipped = 0;
    let migrationErrors = 0;
    const migrationSkippedByReason: TenantMigrationSkipReasonCounts = {};

    // Apply to each schema
    for (const schema of schemas) {
      const result = await applyMigrationToSchema(sql, schema, migration);
      totalSuccess += result.success;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
      migrationSuccess += result.success;
      migrationSkipped += result.skipped;
      migrationErrors += result.errors;
      mergeTenantMigrationSkipReasonCounts(totalSkippedByReason, result.skippedByReason);
      mergeTenantMigrationSkipReasonCounts(migrationSkippedByReason, result.skippedByReason);

      if (result.errors > 0) {
        console.log(
          `    ${schema}: ${result.success} applied, ${result.skipped} skipped, ${result.errors} errors`
        );
      }
    }

    if (migrationSkipped > 0) {
      console.log(
        `    Skip summary: ${migrationSkipped} skipped (${formatTenantMigrationSkipReasonCounts(
          migrationSkippedByReason
        )})`
      );

      const migrationDriftWatchSkipped = countTenantMigrationSkips(
        migrationSkippedByReason,
        TENANT_MIGRATION_DRIFT_WATCH_SKIP_REASONS
      );

      if (migrationDriftWatchSkipped > 0) {
        console.log(
          `    Drift-watch summary: ${migrationDriftWatchSkipped} potentially drift-sensitive skips (${formatTenantMigrationDriftWatchSkipReasonCounts(
            migrationSkippedByReason
          )})`
        );
      }
    }

    if (migrationErrors > 0) {
      console.log(
        `    Migration totals: ${migrationSuccess} applied, ${migrationSkipped} skipped, ${migrationErrors} errors`
      );
    }

    console.log(`    ✓ Applied to ${schemas.length} schema(s)`);
  }

  console.log('\n' + '='.repeat(50));
  console.log(totalErrors > 0 ? '❌ Migration completed with errors:' : '✅ Migration complete:');
  console.log(`   - Statements executed: ${totalSuccess}`);
  console.log(`   - Statements skipped (ignorable replay conflicts): ${totalSkipped}`);
  if (totalSkipped > 0) {
    console.log(
      `   - Skipped by reason: ${formatTenantMigrationSkipReasonCounts(totalSkippedByReason)}`
    );

    const totalDriftWatchSkipped = countTenantMigrationSkips(
      totalSkippedByReason,
      TENANT_MIGRATION_DRIFT_WATCH_SKIP_REASONS
    );

    if (totalDriftWatchSkipped > 0) {
      console.log(
        `   - Drift-watch skips: ${totalDriftWatchSkipped} (${formatTenantMigrationDriftWatchSkipReasonCounts(
          totalSkippedByReason
        )})`
      );
    }
  }
  if (totalErrors > 0) {
    console.log(`   - Errors: ${totalErrors}`);
    console.error('❌ Non-ignorable tenant migration errors detected; failing the process.');
    process.exitCode = 1;
  }
}

applyMigrations()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

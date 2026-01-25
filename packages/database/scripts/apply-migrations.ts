// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Script to manually apply SQL migrations to all tenant schemas

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

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
  return schemas.map(s => s.schema_name);
}

/**
 * Split SQL into statements, handling $$ delimited blocks (stored procedures)
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarBlock = false;
  let i = 0;

  while (i < sql.length) {
    // Check for $$ delimiter
    if (sql[i] === '$' && sql[i + 1] === '$') {
      current += '$$';
      i += 2;
      inDollarBlock = !inDollarBlock;
      continue;
    }

    // Check for semicolon (statement end) when not in $$ block
    if (sql[i] === ';' && !inDollarBlock) {
      current += ';';
      const trimmed = current.trim();
      // Filter out empty statements and pure comments
      if (trimmed.length > 0 && !trimmed.match(/^--.*$/)) {
        statements.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }

    current += sql[i];
    i++;
  }

  // Add any remaining content
  const trimmed = current.trim();
  if (trimmed.length > 0 && !trimmed.match(/^--.*$/)) {
    statements.push(trimmed);
  }

  return statements;
}

/**
 * Apply a migration SQL file to a specific schema
 * Replaces 'tenant_template' with the target schema name
 */
async function applyMigrationToSchema(
  sql: string,
  targetSchema: string,
  migrationName: string
): Promise<{ success: number; skipped: number; errors: number }> {
  // Replace tenant_template with target schema
  const schemaSql = sql.replace(/tenant_template/g, targetSchema);
  
  // Split into statements (handles $$ blocks for stored procedures)
  const statements = splitSqlStatements(schemaSql);

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const statement of statements) {
    // Skip pure comment lines
    if (statement.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) {
      continue;
    }

    try {
      await prisma.$executeRawUnsafe(statement);
      success++;
    } catch (error: any) {
      const msg = error.message || '';
      // Ignore "already exists" and "does not exist" errors (for IF NOT EXISTS / IF EXISTS)
      if (
        msg.includes('already exists') ||
        msg.includes('does not exist') ||
        msg.includes('duplicate key') ||
        msg.includes('relation') && msg.includes('does not exist')
      ) {
        skipped++;
      } else {
        errors++;
        console.error(`      Error in ${targetSchema}: ${msg.substring(0, 100)}`);
      }
    }
  }

  return { success, skipped, errors };
}

async function applyMigrations() {
  console.log('🔄 Applying SQL migrations to all tenant schemas...\n');

  // Get all tenant schemas
  const schemas = await getAllTenantSchemas();
  console.log(`Found ${schemas.length} tenant schema(s): ${schemas.join(', ')}\n`);

  const migrationsDir = path.join(__dirname, '../prisma/migrations');
  
  // Get all migration directories
  const migrations = fs.readdirSync(migrationsDir)
    .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
    .sort();

  console.log(`Found ${migrations.length} migration(s)\n`);

  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const migration of migrations) {
    const migrationPath = path.join(migrationsDir, migration, 'migration.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.log(`  Skipping ${migration} (no migration.sql found)`);
      continue;
    }

    console.log(`📌 Applying: ${migration}`);
    
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Apply to each schema
    for (const schema of schemas) {
      const result = await applyMigrationToSchema(sql, schema, migration);
      totalSuccess += result.success;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
      
      if (result.errors > 0) {
        console.log(`    ${schema}: ${result.success} applied, ${result.skipped} skipped, ${result.errors} errors`);
      }
    }

    console.log(`    ✓ Applied to ${schemas.length} schema(s)`);
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Migration complete:`);
  console.log(`   - Statements executed: ${totalSuccess}`);
  console.log(`   - Statements skipped (already applied): ${totalSkipped}`);
  if (totalErrors > 0) {
    console.log(`   - Errors: ${totalErrors}`);
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

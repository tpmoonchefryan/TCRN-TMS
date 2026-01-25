// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Script to synchronize all tenant schemas with tenant_template
// This ensures all tenant schemas have the same columns as tenant_template

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ColumnInfo {
  column_name: string;
  data_type: string;
  column_default: string | null;
  is_nullable: string;
  character_maximum_length: number | null;
}

async function getTenantSchemas(): Promise<string[]> {
  const schemas = await prisma.$queryRaw<Array<{ schema_name: string }>>`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%' 
      AND schema_name != 'tenant_template'
    ORDER BY schema_name
  `;
  return schemas.map(s => s.schema_name);
}

async function getTableColumns(schema: string, table: string): Promise<ColumnInfo[]> {
  const columns = await prisma.$queryRaw<ColumnInfo[]>`
    SELECT 
      column_name,
      data_type,
      column_default,
      is_nullable,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = ${schema}
      AND table_name = ${table}
    ORDER BY ordinal_position
  `;
  return columns;
}

async function syncTableColumns(
  tenantSchema: string,
  tableName: string,
  templateColumns: ColumnInfo[],
  tenantColumns: ColumnInfo[]
): Promise<number> {
  const tenantColumnNames = new Set(tenantColumns.map(c => c.column_name));
  let addedCount = 0;

  for (const col of templateColumns) {
    if (!tenantColumnNames.has(col.column_name)) {
      // Column exists in template but not in tenant schema
      console.log(`    Adding column: ${tableName}.${col.column_name}`);
      
      // Build column type
      let colType = col.data_type.toUpperCase();
      if (col.character_maximum_length) {
        colType = `VARCHAR(${col.character_maximum_length})`;
      }
      if (col.data_type === 'uuid') {
        colType = 'UUID';
      }
      if (col.data_type === 'text') {
        colType = 'TEXT';
      }
      if (col.data_type === 'integer') {
        colType = 'INT';
      }
      if (col.data_type === 'boolean') {
        colType = 'BOOLEAN';
      }
      if (col.data_type === 'timestamp with time zone') {
        colType = 'TIMESTAMPTZ';
      }
      if (col.data_type === 'jsonb') {
        colType = 'JSONB';
      }
      if (col.data_type === 'ARRAY') {
        colType = 'TEXT[]';
      }
      if (col.data_type === 'inet') {
        colType = 'INET';
      }

      // Build default value
      let defaultClause = '';
      if (col.column_default !== null) {
        // Clean up default value
        let defaultVal = col.column_default;
        // Remove type casts like ::text
        if (defaultVal.includes('::')) {
          defaultVal = defaultVal.split('::')[0];
        }
        defaultClause = ` DEFAULT ${defaultVal}`;
      }

      // Build nullable clause
      const nullableClause = col.is_nullable === 'YES' ? '' : ' NOT NULL';

      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "${tenantSchema}"."${tableName}"
          ADD COLUMN IF NOT EXISTS "${col.column_name}" ${colType}${defaultClause}${nullableClause}
        `);
        addedCount++;
      } catch (error: any) {
        // Handle specific errors
        if (error.message?.includes('already exists')) {
          // Column already exists, skip
        } else {
          console.error(`      Error adding ${col.column_name}: ${error.message}`);
        }
      }
    }
  }

  return addedCount;
}

async function syncSchema(tenantSchema: string): Promise<{ tables: number; columns: number }> {
  console.log(`\n📦 Syncing schema: ${tenantSchema}`);
  
  // Get all tables from tenant_template
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'tenant_template'
    ORDER BY tablename
  `;

  let totalColumns = 0;
  let tablesWithChanges = 0;

  for (const { tablename } of tables) {
    // Check if table exists in tenant schema
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = ${tenantSchema} AND tablename = ${tablename}
      ) as exists
    `;

    if (!tableExists[0]?.exists) {
      // Create table if it doesn't exist
      console.log(`  Creating table: ${tablename}`);
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${tenantSchema}"."${tablename}" 
          (LIKE tenant_template."${tablename}" INCLUDING ALL)
        `);
        tablesWithChanges++;
      } catch (error: any) {
        console.error(`    Error creating table ${tablename}: ${error.message}`);
      }
      continue;
    }

    // Get columns from both schemas
    const templateColumns = await getTableColumns('tenant_template', tablename);
    const tenantColumns = await getTableColumns(tenantSchema, tablename);

    // Sync columns
    const added = await syncTableColumns(tenantSchema, tablename, templateColumns, tenantColumns);
    if (added > 0) {
      totalColumns += added;
      tablesWithChanges++;
    }
  }

  return { tables: tablesWithChanges, columns: totalColumns };
}

async function main() {
  console.log('🔄 Synchronizing tenant schemas with tenant_template...\n');

  // Get all tenant schemas
  const tenantSchemas = await getTenantSchemas();
  
  if (tenantSchemas.length === 0) {
    console.log('No tenant schemas found (excluding tenant_template)');
    return;
  }

  console.log(`Found ${tenantSchemas.length} tenant schema(s): ${tenantSchemas.join(', ')}`);

  let totalTables = 0;
  let totalColumns = 0;

  for (const schema of tenantSchemas) {
    const result = await syncSchema(schema);
    totalTables += result.tables;
    totalColumns += result.columns;
  }

  console.log('\n' + '='.repeat(50));
  if (totalColumns > 0 || totalTables > 0) {
    console.log(`✅ Sync complete: ${totalTables} table(s) updated, ${totalColumns} column(s) added`);
  } else {
    console.log('✅ All tenant schemas are already in sync with tenant_template');
  }
}

main()
  .catch((e) => {
    console.error('Sync error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

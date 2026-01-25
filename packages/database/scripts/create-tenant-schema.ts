// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Script to create a new tenant schema by copying from tenant_template

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTenantSchema(tenantCode: string) {
  console.log(`Creating schema for tenant: ${tenantCode}`);

  // 1. Get tenant info
  const tenant = await prisma.tenant.findUnique({
    where: { code: tenantCode },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantCode}`);
  }

  const schemaName = tenant.schemaName;
  console.log(`  Schema name: ${schemaName}`);

  // 2. Check if schema already exists
  const schemaExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata 
      WHERE schema_name = ${schemaName}
    ) as exists
  `;

  if (schemaExists[0]?.exists) {
    console.log(`  Schema ${schemaName} already exists, skipping creation`);
    return;
  }

  // 3. Create schema
  console.log(`  Creating schema ${schemaName}...`);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

  // 4. Get all tables from tenant_template
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'tenant_template'
    ORDER BY tablename
  `;

  console.log(`  Found ${tables.length} tables to copy`);

  // 5. Copy table structures (without data for now)
  for (const { tablename } of tables) {
    console.log(`    Copying table: ${tablename}`);
    
    // Create table like the template
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."${tablename}" 
      (LIKE tenant_template."${tablename}" INCLUDING ALL)
    `);
  }

  // 6. Copy constraints and foreign keys
  // Note: This is a simplified version. In production, you would need to
  // handle foreign keys more carefully to ensure they reference the new schema
  const foreignKeys = await prisma.$queryRaw<Array<{
    constraint_name: string;
    table_name: string;
    column_name: string;
    foreign_table_name: string;
    foreign_column_name: string;
  }>>`
    SELECT 
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'tenant_template'
  `;

  console.log(`  Adding ${foreignKeys.length} foreign key constraints`);

  for (const fk of foreignKeys) {
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${schemaName}"."${fk.table_name}"
        ADD CONSTRAINT "${fk.constraint_name}_${schemaName}"
        FOREIGN KEY ("${fk.column_name}")
        REFERENCES "${schemaName}"."${fk.foreign_table_name}"("${fk.foreign_column_name}")
      `);
    } catch (error) {
      // Constraint might already exist from LIKE INCLUDING ALL
      console.log(`    Skipping existing constraint: ${fk.constraint_name}`);
    }
  }

  console.log(`  Schema ${schemaName} created successfully`);
}

async function main() {
  const tenantCode = process.argv[2];

  if (!tenantCode) {
    console.log('Usage: npx tsx scripts/create-tenant-schema.ts <TENANT_CODE>');
    console.log('\nAvailable tenants:');
    const tenants = await prisma.tenant.findMany({
      select: { code: true, schemaName: true },
    });
    for (const t of tenants) {
      console.log(`  - ${t.code} (${t.schemaName})`);
    }
    process.exit(1);
  }

  await createTenantSchema(tenantCode);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Script to create a new tenant schema by copying from tenant_template

import { PrismaClient } from '@prisma/client';

import {
  alignTenantTemplateConstraintNames,
  alignTenantTemplateIndexNames,
  copyTenantTemplateForeignKeys,
  copyTenantTemplateSeedData,
} from '../src/tenant-bootstrap';

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

  await copyTenantTemplateSeedData(
    prisma,
    schemaName,
    tables.map(({ tablename }) => tablename)
  );
  await copyTenantTemplateForeignKeys(
    prisma,
    schemaName,
    tables.map(({ tablename }) => tablename)
  );
  await alignTenantTemplateConstraintNames(
    prisma,
    schemaName,
    tables.map(({ tablename }) => tablename)
  );
  await alignTenantTemplateIndexNames(
    prisma,
    schemaName,
    tables.map(({ tablename }) => tablename)
  );

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

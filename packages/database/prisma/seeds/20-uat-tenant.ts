// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT Test Tenants - Creates test tenants for user acceptance testing

import { PrismaClient, Tenant } from '@prisma/client';

export interface UatTenantResult {
  corpTenant: Tenant;
  soloTenant: Tenant;
  corpSchemaName: string;
  soloSchemaName: string;
}

/**
 * Create tenant schema by copying from tenant_template
 */
async function ensureTenantSchema(prisma: PrismaClient, schemaName: string): Promise<void> {
  const schemaExists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = $1) as exists`,
    schemaName
  );

  if (!schemaExists[0]?.exists) {
    console.log(`    → Creating schema ${schemaName}...`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  }

  const tableExists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'system_user') as exists`,
    schemaName
  );

  if (!tableExists[0]?.exists) {
    console.log(`    → Copying tables from tenant_template to ${schemaName}...`);
    
    const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'tenant_template' ORDER BY tablename`
    );

    for (const { tablename } of tables) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schemaName}"."${tablename}" 
          (LIKE tenant_template."${tablename}" INCLUDING ALL)
        `);
      } catch {
        // Ignore if table already exists
      }
    }
    console.log(`    ✓ Created ${tables.length} tables in ${schemaName}`);
  }
}

export async function seedUatTenants(prisma: PrismaClient): Promise<UatTenantResult> {
  console.log('  → Creating UAT test tenants...');

  // UAT_CORP: Enterprise tenant with multiple subsidiaries and talents
  const corpTenantCode = 'UAT_CORP';
  const corpSchemaName = 'tenant_uat_corp';

  const corpTenant = await prisma.tenant.upsert({
    where: { code: corpTenantCode },
    update: {
      name: 'UAT Corporation',
      tier: 'enterprise',
      isActive: true,
      settings: {
        timezone: 'Asia/Tokyo',
        defaultLanguage: 'ja',
        features: {
          multiSubsidiary: true,
          advancedReports: true,
          apiIntegration: true,
        },
      },
    },
    create: {
      code: corpTenantCode,
      name: 'UAT Corporation',
      schemaName: corpSchemaName,
      tier: 'enterprise',
      isActive: true,
      settings: {
        timezone: 'Asia/Tokyo',
        defaultLanguage: 'ja',
        features: {
          multiSubsidiary: true,
          advancedReports: true,
          apiIntegration: true,
        },
      },
    },
  });

  await ensureTenantSchema(prisma, corpSchemaName);
  console.log(`    ✓ UAT_CORP tenant created: ${corpTenant.code} (${corpSchemaName})`);

  // UAT_SOLO: Solo creator tenant with single talent
  const soloTenantCode = 'UAT_SOLO';
  const soloSchemaName = 'tenant_uat_solo';

  const soloTenant = await prisma.tenant.upsert({
    where: { code: soloTenantCode },
    update: {
      name: 'UAT Solo Creator',
      tier: 'starter',
      isActive: true,
      settings: {
        timezone: 'Asia/Shanghai',
        defaultLanguage: 'zh',
        features: {
          multiSubsidiary: false,
          advancedReports: false,
          apiIntegration: false,
        },
      },
    },
    create: {
      code: soloTenantCode,
      name: 'UAT Solo Creator',
      schemaName: soloSchemaName,
      tier: 'starter',
      isActive: true,
      settings: {
        timezone: 'Asia/Shanghai',
        defaultLanguage: 'zh',
        features: {
          multiSubsidiary: false,
          advancedReports: false,
          apiIntegration: false,
        },
      },
    },
  });

  await ensureTenantSchema(prisma, soloSchemaName);
  console.log(`    ✓ UAT_SOLO tenant created: ${soloTenant.code} (${soloSchemaName})`);

  // Copy roles and resources from public schema to tenant schemas
  await copyRolesToTenantSchema(prisma, corpSchemaName);
  await copyRolesToTenantSchema(prisma, soloSchemaName);

  // Copy blocklist entries from tenant_template to UAT schemas
  await copyBlocklistToTenantSchema(prisma, corpSchemaName);
  await copyBlocklistToTenantSchema(prisma, soloSchemaName);
  
  // Copy external blocklist patterns from tenant_template to UAT schemas
  await copyExternalBlocklistToTenantSchema(prisma, corpSchemaName);
  await copyExternalBlocklistToTenantSchema(prisma, soloSchemaName);

  console.log('    ✓ UAT tenants ready');

  return { corpTenant, soloTenant, corpSchemaName, soloSchemaName };
}

async function copyRolesToTenantSchema(prisma: PrismaClient, schemaName: string): Promise<void> {
  // Copy only active roles from tenant_template
  const activeRoles = await prisma.role.findMany({
    where: { isActive: true },
  });
  
  for (const role of activeRoles) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}".role (id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version)
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, now(), now(), 1)
      ON CONFLICT (code) DO UPDATE SET 
        name_en = EXCLUDED.name_en, 
        name_zh = EXCLUDED.name_zh, 
        name_ja = EXCLUDED.name_ja,
        description = EXCLUDED.description,
        is_active = EXCLUDED.is_active
    `, role.id, role.code, role.nameEn, role.nameZh || null, role.nameJa || null, role.description || null, role.isSystem, role.isActive);
  }
  
  console.log(`    ✓ Copied ${activeRoles.length} active roles to ${schemaName}`);
}

async function copyBlocklistToTenantSchema(prisma: PrismaClient, schemaName: string): Promise<void> {
  // Check if blocklist entries already exist in tenant schema
  const existingCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM "${schemaName}".blocklist_entry WHERE is_system = true`
  );
  
  if (existingCount[0]?.count && existingCount[0].count > 0n) {
    console.log(`    ✓ Blocklist entries already exist in ${schemaName} (${existingCount[0].count} system entries)`);
    return;
  }

  // Copy blocklist entries from tenant_template
  const result = await prisma.$executeRawUnsafe(`
    INSERT INTO "${schemaName}".blocklist_entry 
      (id, owner_type, owner_id, pattern, pattern_type, name_en, name_zh, name_ja, 
       category, severity, action, scope, inherit, sort_order, is_force_use, is_system, 
       is_active, match_count, created_at, updated_at, version)
    SELECT 
      gen_random_uuid(), owner_type, owner_id, pattern, pattern_type, name_en, name_zh, name_ja,
      category, severity, action, scope, inherit, sort_order, is_force_use, is_system,
      is_active, 0, now(), now(), 1
    FROM tenant_template.blocklist_entry
    WHERE is_system = true
    ON CONFLICT DO NOTHING
  `);
  
  console.log(`    ✓ Copied blocklist entries to ${schemaName} (${result} entries)`);
}

async function copyExternalBlocklistToTenantSchema(prisma: PrismaClient, schemaName: string): Promise<void> {
  // Check if external blocklist patterns already exist in tenant schema
  const existingCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM "${schemaName}".external_blocklist_pattern WHERE is_system = true`
  );
  
  if (existingCount[0]?.count && existingCount[0].count > 0n) {
    console.log(`    ✓ External blocklist patterns already exist in ${schemaName}`);
    return;
  }

  // Copy external blocklist patterns from tenant_template
  const result = await prisma.$executeRawUnsafe(`
    INSERT INTO "${schemaName}".external_blocklist_pattern 
      (id, owner_type, owner_id, pattern, pattern_type, name_en, name_zh, name_ja, description,
       category, severity, action, replacement, inherit, sort_order, is_force_use, is_system, 
       is_active, created_at, updated_at, version)
    SELECT 
      gen_random_uuid(), owner_type, owner_id, pattern, pattern_type, name_en, name_zh, name_ja, description,
      category, severity, action, replacement, inherit, sort_order, is_force_use, is_system,
      is_active, now(), now(), 1
    FROM tenant_template.external_blocklist_pattern
    WHERE is_system = true
    ON CONFLICT DO NOTHING
  `);
  
  console.log(`    ✓ Copied external blocklist patterns to ${schemaName} (${result} entries)`);
}

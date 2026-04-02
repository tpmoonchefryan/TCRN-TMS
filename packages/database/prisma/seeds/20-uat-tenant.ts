// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// UAT Test Tenants - Creates test tenants for user acceptance testing

import { PrismaClient, Tenant } from '@prisma/client';

export interface UatTenantResult {
  corpTenant: Tenant;
  soloTenant: Tenant;
  corpSchemaName: string;
  soloSchemaName: string;
}

async function normalizePlatformIdentityPlatformIds(
  prisma: PrismaClient,
  schemaName: string
): Promise<void> {
  const result = await prisma.$queryRawUnsafe<Array<{ repaired_count: bigint }>>(`
    WITH candidate AS (
      SELECT
        pi.id,
        sp.id AS normalized_platform_id
      FROM "${schemaName}".platform_identity pi
      LEFT JOIN "${schemaName}".social_platform current_sp
        ON current_sp.id = pi.platform_id
      JOIN "${schemaName}".social_platform sp
        ON sp.code = upper(split_part(pi.platform_uid, '_', 2))
      WHERE current_sp.id IS NULL
        AND lower(split_part(pi.platform_uid, '_', 1)) IN ('uat', 'solo')
    ),
    updated AS (
      UPDATE "${schemaName}".platform_identity pi
      SET
        platform_id = candidate.normalized_platform_id,
        updated_at = now()
      FROM candidate
      WHERE pi.id = candidate.id
        AND pi.platform_id <> candidate.normalized_platform_id
      RETURNING 1
    )
    SELECT COUNT(*)::bigint AS repaired_count
    FROM updated
  `);

  const repairedCount = Number(result[0]?.repaired_count ?? 0n);

  console.log(
    `    ✓ Normalized orphan platform identities in ${schemaName} (${repairedCount} rows)`
  );
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

  // Copy social platforms from tenant_template so later UAT customer seeds
  // can safely reference tenant-local platform IDs.
  await copySocialPlatformsToTenantSchema(prisma, corpSchemaName);
  await copySocialPlatformsToTenantSchema(prisma, soloSchemaName);
  await copyMembershipConfigsToTenantSchema(prisma, corpSchemaName);
  await copyMembershipConfigsToTenantSchema(prisma, soloSchemaName);
  await normalizePlatformIdentityPlatformIds(prisma, corpSchemaName);
  await normalizePlatformIdentityPlatformIds(prisma, soloSchemaName);

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

async function copySocialPlatformsToTenantSchema(
  prisma: PrismaClient,
  schemaName: string
): Promise<void> {
  const existingCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM "${schemaName}".social_platform`
  );

  if (existingCount[0]?.count && existingCount[0].count > 0n) {
    console.log(
      `    ✓ Social platforms already exist in ${schemaName} (${existingCount[0].count} rows)`
    );
    return;
  }

  const result = await prisma.$executeRawUnsafe(`
    INSERT INTO "${schemaName}".social_platform
      (id, code, name_en, name_zh, name_ja, display_name, icon_url, base_url,
       profile_url_template, color, sort_order, is_active, created_at, updated_at,
       version, is_force_use, is_system)
    SELECT
      id, code, name_en, name_zh, name_ja, display_name, icon_url, base_url,
      profile_url_template, color, sort_order, is_active, created_at, updated_at,
      version, is_force_use, is_system
    FROM tenant_template.social_platform
    ON CONFLICT DO NOTHING
  `);

  console.log(`    ✓ Copied social platforms to ${schemaName} (${result} rows)`);
}

async function copyMembershipConfigsToTenantSchema(
  prisma: PrismaClient,
  schemaName: string
): Promise<void> {
  const classResult = await prisma.$executeRawUnsafe(`
    INSERT INTO "${schemaName}".membership_class
      (id, owner_type, owner_id, code, name_en, name_zh, name_ja,
       description_en, description_zh, description_ja, sort_order,
       is_active, is_force_use, is_system, created_at, updated_at,
       created_by, updated_by, version)
    SELECT
      gen_random_uuid(), owner_type, owner_id, code, name_en, name_zh, name_ja,
      description_en, description_zh, description_ja, sort_order,
      is_active, is_force_use, is_system, created_at, updated_at,
      created_by, updated_by, version
    FROM tenant_template.membership_class
    ON CONFLICT (code) DO UPDATE SET
      owner_type = EXCLUDED.owner_type,
      owner_id = EXCLUDED.owner_id,
      name_en = EXCLUDED.name_en,
      name_zh = EXCLUDED.name_zh,
      name_ja = EXCLUDED.name_ja,
      description_en = EXCLUDED.description_en,
      description_zh = EXCLUDED.description_zh,
      description_ja = EXCLUDED.description_ja,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      is_force_use = EXCLUDED.is_force_use,
      is_system = EXCLUDED.is_system,
      updated_at = now(),
      updated_by = EXCLUDED.updated_by,
      version = EXCLUDED.version
  `);

  const typeResult = await prisma.$executeRawUnsafe(`
    INSERT INTO "${schemaName}".membership_type
      (id, membership_class_id, code, name_en, name_zh, name_ja,
       description_en, description_zh, description_ja, external_control,
       default_renewal_days, sort_order, is_active, is_force_use, is_system,
       created_at, updated_at, created_by, updated_by, version)
    SELECT
      gen_random_uuid(),
      target_class.id,
      template_type.code,
      template_type.name_en,
      template_type.name_zh,
      template_type.name_ja,
      template_type.description_en,
      template_type.description_zh,
      template_type.description_ja,
      template_type.external_control,
      template_type.default_renewal_days,
      template_type.sort_order,
      template_type.is_active,
      template_type.is_force_use,
      template_type.is_system,
      template_type.created_at,
      template_type.updated_at,
      template_type.created_by,
      template_type.updated_by,
      template_type.version
    FROM tenant_template.membership_type template_type
    JOIN tenant_template.membership_class template_class
      ON template_class.id = template_type.membership_class_id
    JOIN "${schemaName}".membership_class target_class
      ON target_class.code = template_class.code
    ON CONFLICT (code) DO UPDATE SET
      membership_class_id = EXCLUDED.membership_class_id,
      name_en = EXCLUDED.name_en,
      name_zh = EXCLUDED.name_zh,
      name_ja = EXCLUDED.name_ja,
      description_en = EXCLUDED.description_en,
      description_zh = EXCLUDED.description_zh,
      description_ja = EXCLUDED.description_ja,
      external_control = EXCLUDED.external_control,
      default_renewal_days = EXCLUDED.default_renewal_days,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      is_force_use = EXCLUDED.is_force_use,
      is_system = EXCLUDED.is_system,
      updated_at = now(),
      updated_by = EXCLUDED.updated_by,
      version = EXCLUDED.version
  `);

  const levelResult = await prisma.$executeRawUnsafe(`
    INSERT INTO "${schemaName}".membership_level
      (id, membership_type_id, code, name_en, name_zh, name_ja,
       description_en, description_zh, description_ja, rank, color,
       badge_url, sort_order, is_active, is_force_use, is_system,
       created_at, updated_at, created_by, updated_by, version)
    SELECT
      gen_random_uuid(),
      target_type.id,
      template_level.code,
      template_level.name_en,
      template_level.name_zh,
      template_level.name_ja,
      template_level.description_en,
      template_level.description_zh,
      template_level.description_ja,
      template_level.rank,
      template_level.color,
      template_level.badge_url,
      template_level.sort_order,
      template_level.is_active,
      template_level.is_force_use,
      template_level.is_system,
      template_level.created_at,
      template_level.updated_at,
      template_level.created_by,
      template_level.updated_by,
      template_level.version
    FROM tenant_template.membership_level template_level
    JOIN tenant_template.membership_type template_type
      ON template_type.id = template_level.membership_type_id
    JOIN "${schemaName}".membership_type target_type
      ON target_type.code = template_type.code
    ON CONFLICT (code) DO UPDATE SET
      membership_type_id = EXCLUDED.membership_type_id,
      name_en = EXCLUDED.name_en,
      name_zh = EXCLUDED.name_zh,
      name_ja = EXCLUDED.name_ja,
      description_en = EXCLUDED.description_en,
      description_zh = EXCLUDED.description_zh,
      description_ja = EXCLUDED.description_ja,
      rank = EXCLUDED.rank,
      color = EXCLUDED.color,
      badge_url = EXCLUDED.badge_url,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      is_force_use = EXCLUDED.is_force_use,
      is_system = EXCLUDED.is_system,
      updated_at = now(),
      updated_by = EXCLUDED.updated_by,
      version = EXCLUDED.version
  `);

  console.log(
    `    ✓ Upserted membership configs in ${schemaName} (classes=${classResult}, types=${typeResult}, levels=${levelResult})`
  );
}

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Database seed script - Creates initial data for development

import { PrismaClient } from '@prisma/client';
import { seedAcAdminUser, seedAcTenant } from './seeds/00-ac-tenant';
import {
  RBAC_POLICY_DEFINITIONS,
  RBAC_RESOURCES,
  RBAC_ROLE_PERMISSION_ENTRIES,
  RBAC_ROLE_TEMPLATES,
} from './seeds/_rbac-contract';
import { seedSystemDictionary } from './seeds/07-system-dictionary';

const prisma = new PrismaClient();

// Social platforms (PRD §10.3)
const SOCIAL_PLATFORMS = [
  {
    code: 'BILIBILI',
    displayName: 'Bilibili',
    nameEn: 'Bilibili',
    nameZh: 'B站',
    nameJa: 'ビリビリ',
    baseUrl: 'https://www.bilibili.com',
    profileUrlTemplate: 'https://space.bilibili.com/{uid}',
    color: '#00A1D6',
    sortOrder: 1,
  },
  {
    code: 'YOUTUBE',
    displayName: 'YouTube',
    nameEn: 'YouTube',
    nameZh: 'YouTube',
    nameJa: 'YouTube',
    baseUrl: 'https://www.youtube.com',
    profileUrlTemplate: 'https://www.youtube.com/channel/{uid}',
    color: '#FF0000',
    sortOrder: 2,
  },
  {
    code: 'TWITCH',
    displayName: 'Twitch',
    nameEn: 'Twitch',
    nameZh: 'Twitch',
    nameJa: 'Twitch',
    baseUrl: 'https://www.twitch.tv',
    profileUrlTemplate: 'https://www.twitch.tv/{uid}',
    color: '#9146FF',
    sortOrder: 3,
  },
  {
    code: 'TWITTER',
    displayName: 'X (Twitter)',
    nameEn: 'X (Twitter)',
    nameZh: 'X (推特)',
    nameJa: 'X (Twitter)',
    baseUrl: 'https://x.com',
    profileUrlTemplate: 'https://x.com/{uid}',
    color: '#000000',
    sortOrder: 4,
  },
  {
    code: 'TIKTOK',
    displayName: 'TikTok',
    nameEn: 'TikTok',
    nameZh: '抖音国际版',
    nameJa: 'TikTok',
    baseUrl: 'https://www.tiktok.com',
    profileUrlTemplate: 'https://www.tiktok.com/@{uid}',
    color: '#010101',
    sortOrder: 5,
  },
  {
    code: 'DOUYIN',
    displayName: '抖音',
    nameEn: 'Douyin',
    nameZh: '抖音',
    nameJa: 'Douyin',
    baseUrl: 'https://www.douyin.com',
    profileUrlTemplate: 'https://www.douyin.com/user/{uid}',
    color: '#000000',
    sortOrder: 6,
  },
];

/**
 * Clone schema from tenant_template if needed
 */
async function ensureSchemaExists(schemaName: string): Promise<void> {
  // Check if schema exists
  const schemaExists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata 
      WHERE schema_name = $1
    ) as exists
  `, schemaName);

  if (!schemaExists[0]?.exists) {
    console.log(`    Creating schema ${schemaName}...`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  }

  // Check if tables exist in this schema
  const tableExists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name = 'system_user'
    ) as exists
  `, schemaName);

  if (!tableExists[0]?.exists && schemaName !== 'tenant_template') {
    console.log(`    Copying tables from tenant_template to ${schemaName}...`);
    
    // Get all tables from tenant_template
    const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'tenant_template' ORDER BY tablename
    `);

    for (const { tablename } of tables) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schemaName}"."${tablename}" 
          (LIKE tenant_template."${tablename}" INCLUDING ALL)
        `);
      } catch (e) {
        // Ignore if table already exists
      }
    }
    console.log(`    Created ${tables.length} tables in ${schemaName}`);
  }
}

async function seedTenantSchema(schemaName: string) {
  console.log(`  Seeding schema: ${schemaName}`);
  
  // Ensure schema and tables exist
  await ensureSchemaExists(schemaName);
  
  // Set schema for subsequent operations
  await prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

  // Create resources
  console.log('  Creating resources...');
  for (const resource of RBAC_RESOURCES) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}".resource (id, code, module, name_en, name_zh, name_ja, sort_order, is_active, created_at, updated_at)
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

  console.log('  Creating RBAC policies...');
  for (const policy of RBAC_POLICY_DEFINITIONS) {
    await prisma.$executeRawUnsafe(`
      WITH resource_lookup AS (
        SELECT id FROM "${schemaName}".resource WHERE code = $1
      )
      INSERT INTO "${schemaName}".policy (id, resource_id, action, is_active, created_at, updated_at)
      SELECT gen_random_uuid(), r.id, $2, true, now(), now()
      FROM resource_lookup r
      ON CONFLICT (resource_id, action) DO UPDATE
      SET is_active = true,
          updated_at = now()
    `, policy.resourceCode, policy.action);
  }

  // Create social platforms
  console.log('  Creating social platforms...');
  for (const platform of SOCIAL_PLATFORMS) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}".social_platform (id, code, display_name, name_en, name_zh, name_ja, base_url, profile_url_template, color, sort_order, is_active, created_at, updated_at, version)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true, now(), now(), 1)
      ON CONFLICT (code) DO NOTHING
    `, platform.code, platform.displayName, platform.nameEn, platform.nameZh, platform.nameJa, platform.baseUrl, platform.profileUrlTemplate, platform.color, platform.sortOrder);
  }

  // Create roles and policies
  console.log('  Creating roles and policies...');
  for (const role of RBAC_ROLE_TEMPLATES) {
    // Create role
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}".role (id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version)
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
    await prisma.$executeRawUnsafe(`
      WITH role_lookup AS (
        SELECT id FROM "${schemaName}".role WHERE code = $1
      ),
      policy_lookup AS (
        SELECT p.id
        FROM "${schemaName}".policy p
        JOIN "${schemaName}".resource r ON r.id = p.resource_id
        WHERE r.code = $2 AND p.action = $3
      )
      INSERT INTO "${schemaName}".role_policy (id, role_id, policy_id, effect, created_at)
      SELECT gen_random_uuid(), rl.id, pl.id, $4, now()
      FROM role_lookup rl
      CROSS JOIN policy_lookup pl
      ON CONFLICT (role_id, policy_id) DO UPDATE SET effect = EXCLUDED.effect
    `, entry.roleCode, entry.resourceCode, entry.action, entry.effect);
  }

  console.log(`  Schema ${schemaName} seeded successfully`);
}

async function main() {
  console.log('Starting database seed...');

  // Phase 1: Create AC (Admin Console) tenant
  console.log('\n📌 Phase 1: AC Tenant');
  const acTenantResult = await seedAcTenant(prisma);
  console.log(`  AC tenant created: ${acTenantResult.tenant.id}`);

  // Phase 2: Seed schemas with roles and resources
  console.log('\n📌 Phase 2: Seeding Schemas');
  
  // Seed tenant_template schema (used as template for new tenants)
  await seedTenantSchema('tenant_template');
  
  // Seed AC tenant schema
  await seedTenantSchema(acTenantResult.schemaName);

  // Phase 3: Seed system dictionaries to public schema
  console.log('\n📌 Phase 3: System Dictionaries');
  await seedSystemDictionary(prisma);

  // Phase 4: Create AC Admin user
  console.log('\n📌 Phase 4: AC Admin User');
  await seedAcAdminUser(prisma, acTenantResult);

  console.log('\n✅ Database seed completed successfully!');
}



main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Database seed script - Creates initial data for development

import { PrismaClient } from '@prisma/client';
import { seedAcAdminUser, seedAcTenant } from './seeds/00-ac-tenant';
import { seedSystemDictionary } from './seeds/07-system-dictionary';

const prisma = new PrismaClient();



// System-defined resources (PRD §12.5)
const RESOURCES = [
  // Customer Management
  { code: 'customer.profile', module: 'customer', nameEn: 'Customer Profile', nameZh: '客户档案', nameJa: '顧客プロファイル' },
  { code: 'customer.membership', module: 'customer', nameEn: 'Membership Management', nameZh: '会员管理', nameJa: '会員管理' },
  { code: 'customer.import', module: 'customer', nameEn: 'Customer Import', nameZh: '客户导入', nameJa: '顧客インポート' },
  
  // Organization
  { code: 'org.subsidiary', module: 'organization', nameEn: 'Subsidiary Management', nameZh: '分级目录管理', nameJa: '組織管理' },
  { code: 'org.talent', module: 'organization', nameEn: 'Talent Management', nameZh: '艺人管理', nameJa: 'タレント管理' },
  
  // User & Role
  { code: 'system_user.manage', module: 'user', nameEn: 'User Management', nameZh: '用户管理', nameJa: 'ユーザー管理' },
  { code: 'system_user.self', module: 'user', nameEn: 'Personal Profile', nameZh: '个人资料', nameJa: '個人設定' },
  { code: 'role.manage', module: 'user', nameEn: 'Role Management', nameZh: '角色管理', nameJa: 'ロール管理' },
  
  // Configuration
  { code: 'config.entity', module: 'config', nameEn: 'Configuration Entity', nameZh: '配置实体', nameJa: '設定エンティティ' },
  { code: 'config.blocklist', module: 'config', nameEn: 'Blocklist Management', nameZh: '屏蔽词管理', nameJa: 'ブロックリスト管理' },
  
  // External Pages
  { code: 'talent.homepage', module: 'page', nameEn: 'Homepage Management', nameZh: '主页管理', nameJa: 'ホームページ管理' },
  { code: 'talent.marshmallow', module: 'page', nameEn: 'Marshmallow Management', nameZh: '棉花糖管理', nameJa: 'マシュマロ管理' },
  
  // Reports (PRD §20)
  { code: 'report.mfr', module: 'report', nameEn: 'Membership Feedback Report', nameZh: '会员回馈报表', nameJa: '会員フィードバックレポート' },
  
  // Integration
  { code: 'integration.adapter', module: 'integration', nameEn: 'Integration Adapter', nameZh: '接口适配器', nameJa: '連携アダプター' },
  { code: 'integration.webhook', module: 'integration', nameEn: 'Webhook Management', nameZh: 'Webhook管理', nameJa: 'Webhook管理' },
  
  // Log (PRD §15)
  { code: 'log.change_log', module: 'log', nameEn: 'Change Log', nameZh: '变更日志', nameJa: '変更ログ' },
  { code: 'log.tech_log', module: 'log', nameEn: 'Technical Event Log', nameZh: '技术事件日志', nameJa: '技術イベントログ' },
  { code: 'log.integration_log', module: 'log', nameEn: 'Integration Log', nameZh: '集成日志', nameJa: '連携ログ' },
  { code: 'log.search', module: 'log', nameEn: 'Log Search', nameZh: '日志搜索', nameJa: 'ログ検索' },
  
  // PII Config (PRD §4.4)
  { code: 'config.pii_service', module: 'config', nameEn: 'PII Service Config', nameZh: 'PII服务配置', nameJa: 'PIIサービス設定' },
  { code: 'config.profile_store', module: 'config', nameEn: 'Profile Store', nameZh: '档案存储', nameJa: 'プロファイルストア' },
];

// System-defined roles (PRD §12.4)
const ROLES = [
  {
    code: 'TENANT_ADMIN',
    nameEn: 'Tenant Administrator',
    nameZh: '租户管理员',
    nameJa: 'テナント管理者',
    description: 'Full access to all tenant resources',
    isSystem: true,
    policies: RESOURCES.map(r => ({ resource: r.code, action: 'admin' })),
  },
  {
    code: 'TENANT_READONLY',
    nameEn: 'Tenant Read-Only',
    nameZh: '租户只读',
    nameJa: 'テナント読み取り専用',
    description: 'Read-only access to all tenant resources',
    isSystem: true,
    policies: RESOURCES.map(r => ({ resource: r.code, action: 'read' })),
  },
  {
    code: 'TALENT_MANAGER',
    nameEn: 'Talent Manager',
    nameZh: '艺人管理员',
    nameJa: 'タレントマネージャー',
    description: 'Can manage assigned talent and their customers',
    isSystem: true,
    policies: [
      { resource: 'customer.profile', action: 'admin' },
      { resource: 'customer.membership', action: 'admin' },
      { resource: 'customer.import', action: 'execute' },
      { resource: 'talent.homepage', action: 'admin' },
      { resource: 'talent.marshmallow', action: 'admin' },
      { resource: 'report.mfr', action: 'read' },
      { resource: 'report.mfr', action: 'execute' },
    ],
  },
  {
    code: 'SUBSIDIARY_MANAGER',
    nameEn: 'Subsidiary Manager',
    nameZh: '分级目录管理员',
    nameJa: '組織管理者',
    description: 'Can manage subsidiary and all talents within',
    isSystem: true,
    policies: [
      { resource: 'org.subsidiary', action: 'read' },
      { resource: 'org.talent', action: 'admin' },
      { resource: 'customer.profile', action: 'admin' },
      { resource: 'customer.membership', action: 'admin' },
      { resource: 'customer.import', action: 'execute' },
      { resource: 'config.entity', action: 'read' },
      { resource: 'report.mfr', action: 'admin' },
    ],
  },
  {
    code: 'REPORT_VIEWER',
    nameEn: 'Report Viewer',
    nameZh: '报表查看者',
    nameJa: 'レポート閲覧者',
    description: 'Can view reports',
    isSystem: true,
    policies: [
      { resource: 'report.mfr', action: 'read' },
    ],
  },
  {
    code: 'REPORT_OPERATOR',
    nameEn: 'Report Operator',
    nameZh: '报表操作员',
    nameJa: 'レポートオペレーター',
    description: 'Can generate and export reports',
    isSystem: true,
    policies: [
      { resource: 'report.mfr', action: 'read' },
      { resource: 'report.mfr', action: 'execute' },
    ],
  },
];

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
  for (const resource of RESOURCES) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}".resource (id, code, module, name_en, name_zh, name_ja, sort_order, is_active, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 0, true, now(), now())
      ON CONFLICT (code) DO NOTHING
    `, resource.code, resource.module, resource.nameEn, resource.nameZh, resource.nameJa);
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
  for (const role of ROLES) {
    // Create role
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}".role (id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, now(), now(), 1)
      ON CONFLICT (code) DO NOTHING
    `, role.code, role.nameEn, role.nameZh, role.nameJa, role.description, role.isSystem);

    // Create policies and link to role
    for (const policy of role.policies) {
      await prisma.$executeRawUnsafe(`
        WITH resource_lookup AS (
          SELECT id FROM "${schemaName}".resource WHERE code = $1
        ),
        inserted_policy AS (
          INSERT INTO "${schemaName}".policy (id, resource_id, action, effect, is_active, created_at, updated_at)
          SELECT gen_random_uuid(), r.id, $2, 'allow', true, now(), now()
          FROM resource_lookup r
          ON CONFLICT (resource_id, action, effect) DO UPDATE SET updated_at = now()
          RETURNING id
        ),
        role_lookup AS (
          SELECT id FROM "${schemaName}".role WHERE code = $3
        )
        INSERT INTO "${schemaName}".role_policy (id, role_id, policy_id, created_at)
        SELECT gen_random_uuid(), rl.id, ip.id, now()
        FROM inserted_policy ip, role_lookup rl
        ON CONFLICT DO NOTHING
      `, policy.resource, policy.action, role.code);
    }
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

  // Phase 4: Create PLATFORM_ADMIN role in public schema (for AC)
  console.log('\n📌 Phase 4: Creating PLATFORM_ADMIN Role');
  await prisma.role.upsert({
    where: { code: 'PLATFORM_ADMIN' },
    update: {},
    create: {
      code: 'PLATFORM_ADMIN',
      nameEn: 'Platform Administrator',
      nameZh: '平台管理员',
      nameJa: 'プラットフォーム管理者',
      description: 'Full platform-level administrative access',
      isSystem: true,
      isActive: true,
    },
  });
  console.log('  PLATFORM_ADMIN role created');

  // Phase 5: Create AC Admin user
  console.log('\n📌 Phase 5: AC Admin User');
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

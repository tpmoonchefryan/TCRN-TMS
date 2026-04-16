// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Profile Store and consumer seed data

import { PrismaClient } from '@prisma/client';

export async function seedPiiConfig(prisma: PrismaClient) {
  console.log('  → Creating profile store and consumer defaults...');

  // Get admin user
  const adminUser = await prisma.systemUser.findUnique({
    where: { username: 'admin' },
  });

  // =========================================================================
  // Profile Store
  // =========================================================================
  const profileStore = await prisma.profileStore.upsert({
    where: { code: 'DEFAULT_STORE' },
    update: {
      nameEn: 'Default Profile Store',
      nameZh: '默认档案存储',
      nameJa: 'デフォルトプロファイルストア',
      descriptionEn: 'Default customer archive boundary',
      descriptionZh: '默认客户档案边界',
      descriptionJa: 'デフォルト顧客アーカイブ境界',
      piiServiceConfigId: null,
      isDefault: true,
      isActive: true,
      updatedBy: adminUser?.id,
    },
    create: {
      code: 'DEFAULT_STORE',
      nameEn: 'Default Profile Store',
      nameZh: '默认档案存储',
      nameJa: 'デフォルトプロファイルストア',
      descriptionEn: 'Default customer archive boundary',
      descriptionZh: '默认客户档案边界',
      descriptionJa: 'デフォルト顧客アーカイブ境界',
      piiServiceConfigId: null,
      isDefault: true,
      isActive: true,
      createdBy: adminUser?.id,
      updatedBy: adminUser?.id,
    },
  });

  console.log(`    ✓ Created profile store: ${profileStore.code}`);

  // Create a Profile Store without PII service (for talents that don't need PII)
  const localOnlyStore = await prisma.$executeRawUnsafe(`
    INSERT INTO tenant_template.profile_store 
      (id, code, name_en, name_zh, name_ja, description_en, description_zh, description_ja, 
       pii_proxy_url, pii_service_config_id, is_default, is_active, sort_order,
       created_at, updated_at, created_by, updated_by, version)
    VALUES 
      (gen_random_uuid(), 'LOCAL_ONLY', 'Local Only (No PII)', '本地存储（无PII）', 'ローカルのみ（PIIなし)',
       'Profile store without PII service - customer PII fields will be disabled',
       '无PII服务的档案存储 - 客户PII字段将被禁用',
       'PIIサービスなしのプロファイルストア - 顧客PIIフィールドは無効になります',
       NULL, NULL, false, true, 10, now(), now(), $1::uuid, $1::uuid, 1)
    ON CONFLICT (code) DO UPDATE SET
      name_en = EXCLUDED.name_en,
      description_en = EXCLUDED.description_en,
      updated_at = now()
  `, adminUser?.id || null);

  console.log('    ✓ Created local-only profile store (no PII)');

  // =========================================================================
  // Consumer (API Consumer for external integrations)
  // =========================================================================
  const consumers = [
    {
      code: 'INTERNAL_SYSTEM',
      nameEn: 'Internal System',
      nameZh: '内部系统',
      nameJa: '内部システム',
      consumerCategory: 'internal',
      rateLimit: 10000,
    },
    {
      code: 'BILIBILI_SYNC',
      nameEn: 'Bilibili Sync Service',
      nameZh: 'B站同步服务',
      nameJa: 'ビリビリ同期サービス',
      consumerCategory: 'partner',
      rateLimit: 1000,
    },
    {
      code: 'YOUTUBE_SYNC',
      nameEn: 'YouTube Sync Service',
      nameZh: 'YouTube同步服务',
      nameJa: 'YouTube同期サービス',
      consumerCategory: 'partner',
      rateLimit: 1000,
    },
    {
      code: 'EXTERNAL_CRM',
      nameEn: 'External CRM',
      nameZh: '外部CRM',
      nameJa: '外部CRM',
      consumerCategory: 'external',
      rateLimit: 500,
    },
  ];

  for (const consumer of consumers) {
    await prisma.consumer.upsert({
      where: { code: consumer.code },
      update: {
        ...consumer,
        updatedBy: adminUser?.id,
      },
      create: {
        ...consumer,
        createdBy: adminUser?.id,
        updatedBy: adminUser?.id,
      },
    });
  }

  console.log(`    ✓ Created ${consumers.length} consumers`);
}

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Profile Store and consumer seed data

import { PrismaClient } from '../../src/platform/prisma/client';

import { createLocalizedText } from '../../../shared/src/constants/locale';

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
      name: createLocalizedText({
        en: 'Default Profile Store',
        zh_HANS: '默认档案存储',
        zh_HANT: '默认档案存储',
        ja: 'デフォルトプロファイルストア',
        ko: 'Default Profile Store',
        fr: 'Default Profile Store',
      }),
      description: createLocalizedText({
        en: 'Default customer archive boundary',
        zh_HANS: '默认客户档案边界',
        zh_HANT: '默认客户档案边界',
        ja: 'デフォルト顧客アーカイブ境界',
        ko: 'Default customer archive boundary',
        fr: 'Default customer archive boundary',
      }),
      piiServiceConfigId: null,
      isDefault: true,
      isActive: true,
      updatedBy: adminUser?.id,
    },
    create: {
      code: 'DEFAULT_STORE',
      name: createLocalizedText({
        en: 'Default Profile Store',
        zh_HANS: '默认档案存储',
        zh_HANT: '默认档案存储',
        ja: 'デフォルトプロファイルストア',
        ko: 'Default Profile Store',
        fr: 'Default Profile Store',
      }),
      description: createLocalizedText({
        en: 'Default customer archive boundary',
        zh_HANS: '默认客户档案边界',
        zh_HANT: '默认客户档案边界',
        ja: 'デフォルト顧客アーカイブ境界',
        ko: 'Default customer archive boundary',
        fr: 'Default customer archive boundary',
      }),
      piiServiceConfigId: null,
      isDefault: true,
      isActive: true,
      createdBy: adminUser?.id,
      updatedBy: adminUser?.id,
    },
  });

  console.log(`    ✓ Created profile store: ${profileStore.code}`);

  // Create a Profile Store without PII service (for talents that don't need PII)
  await prisma.$executeRawUnsafe(`
    INSERT INTO tenant_template.profile_store 
      (id, code, name, description, 
       pii_proxy_url, pii_service_config_id, is_default, is_active, sort_order,
       created_at, updated_at, created_by, updated_by, version)
    VALUES 
      (gen_random_uuid(), 'LOCAL_ONLY', $1::jsonb, $2::jsonb,
       NULL, NULL, false, true, 10, now(), now(), $3::uuid, $3::uuid, 1)
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      updated_at = now()
  `,
    JSON.stringify(createLocalizedText({
      en: 'Local Only (No PII)',
      zh_HANS: '本地存储（无PII）',
      zh_HANT: '本地存储（无PII）',
      ja: 'ローカルのみ（PIIなし）',
      ko: 'Local Only (No PII)',
      fr: 'Local Only (No PII)',
    })),
    JSON.stringify(createLocalizedText({
      en: 'Profile store without PII service - customer PII fields will be disabled',
      zh_HANS: '无PII服务的档案存储 - 客户PII字段将被禁用',
      zh_HANT: '无PII服务的档案存储 - 客户PII字段将被禁用',
      ja: 'PIIサービスなしのプロファイルストア - 顧客PIIフィールドは無効になります',
      ko: 'Profile store without PII service - customer PII fields will be disabled',
      fr: 'Profile store without PII service - customer PII fields will be disabled',
    })),
    adminUser?.id || null,
  );

  console.log('    ✓ Created local-only profile store (no PII)');

  // =========================================================================
  // Consumer (API Consumer for external integrations)
  // =========================================================================
  const consumers = [
    {
      code: 'INTERNAL_SYSTEM',
      name: createLocalizedText({
        en: 'Internal System',
        zh_HANS: '内部系统',
        zh_HANT: '内部系统',
        ja: '内部システム',
        ko: 'Internal System',
        fr: 'Internal System',
      }),
      consumerCategory: 'internal',
      rateLimit: 10000,
    },
    {
      code: 'BILIBILI_SYNC',
      name: createLocalizedText({
        en: 'Bilibili Sync Service',
        zh_HANS: 'B站同步服务',
        zh_HANT: 'B站同步服务',
        ja: 'ビリビリ同期サービス',
        ko: 'Bilibili Sync Service',
        fr: 'Bilibili Sync Service',
      }),
      consumerCategory: 'partner',
      rateLimit: 1000,
    },
    {
      code: 'YOUTUBE_SYNC',
      name: createLocalizedText({
        en: 'YouTube Sync Service',
        zh_HANS: 'YouTube同步服务',
        zh_HANT: 'YouTube同步服务',
        ja: 'YouTube同期サービス',
        ko: 'YouTube Sync Service',
        fr: 'YouTube Sync Service',
      }),
      consumerCategory: 'partner',
      rateLimit: 1000,
    },
    {
      code: 'EXTERNAL_CRM',
      name: createLocalizedText({
        en: 'External CRM',
        zh_HANS: '外部CRM',
        zh_HANT: '外部CRM',
        ja: '外部CRM',
        ko: 'External CRM',
        fr: 'External CRM',
      }),
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

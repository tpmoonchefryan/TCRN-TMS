// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// PII Service configuration and Profile Store seed data

import { PrismaClient } from '@prisma/client';

import { getDefaultPiiSeedConfig } from './_pii-seed-config';

export async function seedPiiConfig(prisma: PrismaClient) {
  console.log('  → Creating PII service configuration...');

  // Get admin user
  const adminUser = await prisma.systemUser.findUnique({
    where: { username: 'admin' },
  });

  // =========================================================================
  // PII Service Config
  // =========================================================================
  const defaultPiiSeedConfig = getDefaultPiiSeedConfig();
  const existingDefaultPiiConfig = await prisma.piiServiceConfig.findUnique({
    where: { code: 'DEFAULT_PII' },
    select: { id: true },
  });

  let piiServiceConfigId: string | null = null;

  if (defaultPiiSeedConfig) {
    const piiServiceConfig = await prisma.piiServiceConfig.upsert({
      where: { code: 'DEFAULT_PII' },
      update: {
        nameEn: 'Default PII Service',
        nameZh: '默认PII服务',
        nameJa: 'デフォルトPIIサービス',
        descriptionEn: 'Default PII service configured from environment',
        descriptionZh: '从环境变量配置的默认PII服务',
        descriptionJa: '環境変数から設定されたデフォルトPIIサービス',
        apiUrl: defaultPiiSeedConfig.apiUrl,
        authType: 'mtls',
        healthCheckUrl: defaultPiiSeedConfig.healthCheckUrl,
        healthCheckIntervalSec: 60,
        isHealthy: false,
        isActive: true,
        updatedBy: adminUser?.id,
      },
      create: {
        code: 'DEFAULT_PII',
        nameEn: 'Default PII Service',
        nameZh: '默认PII服务',
        nameJa: 'デフォルトPIIサービス',
        descriptionEn: 'Default PII service configured from environment',
        descriptionZh: '从环境变量配置的默认PII服务',
        descriptionJa: '環境変数から設定されたデフォルトPIIサービス',
        apiUrl: defaultPiiSeedConfig.apiUrl,
        authType: 'mtls',
        healthCheckUrl: defaultPiiSeedConfig.healthCheckUrl,
        healthCheckIntervalSec: 60,
        isHealthy: false,
        isActive: true,
        createdBy: adminUser?.id,
        updatedBy: adminUser?.id,
      },
    });

    piiServiceConfigId = piiServiceConfig.id;
    console.log(`    ✓ Upserted PII service config: ${piiServiceConfig.code} -> ${defaultPiiSeedConfig.apiUrl}`);
  } else if (existingDefaultPiiConfig) {
    await prisma.piiServiceConfig.update({
      where: { id: existingDefaultPiiConfig.id },
      data: {
        isActive: false,
        isHealthy: false,
        updatedBy: adminUser?.id,
      },
    });

    console.log('    ✓ Deactivated DEFAULT_PII because PII_SERVICE_URL is not configured');
  } else {
    console.log('    ✓ Skipped DEFAULT_PII because PII_SERVICE_URL is not configured');
  }

  // =========================================================================
  // Profile Store
  // =========================================================================
  const profileStore = await prisma.profileStore.upsert({
    where: { code: 'DEFAULT_STORE' },
    update: {
      nameEn: 'Default Profile Store',
      nameZh: '默认档案存储',
      nameJa: 'デフォルトプロファイルストア',
      descriptionEn: 'Default profile store for customer PII data',
      descriptionZh: '客户PII数据的默认存储',
      descriptionJa: '顧客PIIデータのデフォルトストア',
      piiServiceConfigId,
      isDefault: true,
      isActive: true,
      updatedBy: adminUser?.id,
    },
    create: {
      code: 'DEFAULT_STORE',
      nameEn: 'Default Profile Store',
      nameZh: '默认档案存储',
      nameJa: 'デフォルトプロファイルストア',
      descriptionEn: 'Default profile store for customer PII data',
      descriptionZh: '客户PII数据的默认存储',
      descriptionJa: '顧客PIIデータのデフォルトストア',
      piiServiceConfigId,
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

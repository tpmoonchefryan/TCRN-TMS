// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Channel Category seed data

import { PrismaClient } from '@prisma/client';

export async function seedChannelCategories(prisma: PrismaClient) {
  console.log('  → Seeding channel categories...');

  const channelCategories = [
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'PHONE',
      nameEn: 'Phone',
      nameZh: '电话',
      nameJa: '電話',
      descriptionEn: 'Phone-based communication channels',
      descriptionZh: '基于电话的沟通渠道',
      descriptionJa: '電話ベースのコミュニケーションチャネル',
      sortOrder: 1,
      isSystem: true,
      isForceUse: false,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'EMAIL',
      nameEn: 'Email',
      nameZh: '邮件',
      nameJa: 'メール',
      descriptionEn: 'Email-based communication channels',
      descriptionZh: '基于邮件的沟通渠道',
      descriptionJa: 'メールベースのコミュニケーションチャネル',
      sortOrder: 2,
      isSystem: true,
      isForceUse: false,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'SNS',
      nameEn: 'Social Media',
      nameZh: '社交媒体',
      nameJa: 'SNS',
      descriptionEn: 'Social media communication channels',
      descriptionZh: '社交媒体沟通渠道',
      descriptionJa: 'ソーシャルメディアコミュニケーションチャネル',
      sortOrder: 3,
      isSystem: true,
      isForceUse: false,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'MESSAGING',
      nameEn: 'Messaging',
      nameZh: '即时通讯',
      nameJa: 'メッセージング',
      descriptionEn: 'Instant messaging communication channels',
      descriptionZh: '即时通讯沟通渠道',
      descriptionJa: 'インスタントメッセージングチャネル',
      sortOrder: 4,
      isSystem: true,
      isForceUse: false,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'OTHER',
      nameEn: 'Other',
      nameZh: '其他',
      nameJa: 'その他',
      descriptionEn: 'Other communication channels',
      descriptionZh: '其他沟通渠道',
      descriptionJa: 'その他のコミュニケーションチャネル',
      sortOrder: 99,
      isSystem: true,
      isForceUse: false,
    },
  ];

  await prisma.channelCategory.createMany({
    data: channelCategories,
    skipDuplicates: true,
  });

  console.log(`    ✓ Created ${channelCategories.length} channel categories`);
}

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Channel Category seed data

import { PrismaClient } from '@prisma/client';

import { createLocalizedText } from '../../../shared/src/constants/locale';

export async function seedChannelCategories(prisma: PrismaClient) {
  console.log('  → Seeding channel categories...');

  const channelCategories = [
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'PHONE',
      name: createLocalizedText({
        en: 'Phone',
        zh_HANS: '电话',
        zh_HANT: '电话',
        ja: '電話',
        ko: 'Phone',
        fr: 'Phone',
      }),
      description: createLocalizedText({
        en: 'Phone-based communication channels',
        zh_HANS: '基于电话的沟通渠道',
        zh_HANT: '基于电话的沟通渠道',
        ja: '電話ベースのコミュニケーションチャネル',
        ko: 'Phone-based communication channels',
        fr: 'Phone-based communication channels',
      }),
      sortOrder: 1,
      isSystem: true,
      isForceUse: false,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'EMAIL',
      name: createLocalizedText({
        en: 'Email',
        zh_HANS: '邮件',
        zh_HANT: '邮件',
        ja: 'メール',
        ko: 'Email',
        fr: 'Email',
      }),
      description: createLocalizedText({
        en: 'Email-based communication channels',
        zh_HANS: '基于邮件的沟通渠道',
        zh_HANT: '基于邮件的沟通渠道',
        ja: 'メールベースのコミュニケーションチャネル',
        ko: 'Email-based communication channels',
        fr: 'Email-based communication channels',
      }),
      sortOrder: 2,
      isSystem: true,
      isForceUse: false,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'SNS',
      name: createLocalizedText({
        en: 'Social Media',
        zh_HANS: '社交媒体',
        zh_HANT: '社交媒体',
        ja: 'SNS',
        ko: 'Social Media',
        fr: 'Social Media',
      }),
      description: createLocalizedText({
        en: 'Social media communication channels',
        zh_HANS: '社交媒体沟通渠道',
        zh_HANT: '社交媒体沟通渠道',
        ja: 'ソーシャルメディアコミュニケーションチャネル',
        ko: 'Social media communication channels',
        fr: 'Social media communication channels',
      }),
      sortOrder: 3,
      isSystem: true,
      isForceUse: false,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'MESSAGING',
      name: createLocalizedText({
        en: 'Messaging',
        zh_HANS: '即时通讯',
        zh_HANT: '即时通讯',
        ja: 'メッセージング',
        ko: 'Messaging',
        fr: 'Messaging',
      }),
      description: createLocalizedText({
        en: 'Instant messaging communication channels',
        zh_HANS: '即时通讯沟通渠道',
        zh_HANT: '即时通讯沟通渠道',
        ja: 'インスタントメッセージングチャネル',
        ko: 'Instant messaging communication channels',
        fr: 'Instant messaging communication channels',
      }),
      sortOrder: 4,
      isSystem: true,
      isForceUse: false,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'OTHER',
      name: createLocalizedText({
        en: 'Other',
        zh_HANS: '其他',
        zh_HANT: '其他',
        ja: 'その他',
        ko: 'Other',
        fr: 'Other',
      }),
      description: createLocalizedText({
        en: 'Other communication channels',
        zh_HANS: '其他沟通渠道',
        zh_HANT: '其他沟通渠道',
        ja: 'その他のコミュニケーションチャネル',
        ko: 'Other communication channels',
        fr: 'Other communication channels',
      }),
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

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Membership configuration seed data

import { PrismaClient } from '../../src/generated/prisma/client';

import { createLocalizedText } from '../../../shared/src/constants/locale';

export async function seedMembershipConfigs(prisma: PrismaClient) {
  console.log('  → Seeding membership configurations...');

  // =========================================================================
  // Membership Classes
  // =========================================================================
  const membershipClasses = [
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'SUBSCRIPTION',
      name: createLocalizedText({
        en: 'Subscription',
        zh_HANS: '订阅',
        zh_HANT: '订阅',
        ja: 'サブスクリプション',
        ko: 'Subscription',
        fr: 'Subscription',
      }),
      description: createLocalizedText({
        en: 'Monthly or yearly subscription memberships',
        zh_HANS: '月度或年度订阅会员',
        zh_HANT: '月度或年度订阅会员',
        ja: '月額または年額のサブスクリプション',
        ko: 'Monthly or yearly subscription memberships',
        fr: 'Monthly or yearly subscription memberships',
      }),
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'FANCLUB',
      name: createLocalizedText({
        en: 'Fan Club',
        zh_HANS: '粉丝俱乐部',
        zh_HANT: '粉丝俱乐部',
        ja: 'ファンクラブ',
        ko: 'Fan Club',
        fr: 'Fan Club',
      }),
      description: createLocalizedText({
        en: 'Fan club memberships',
        zh_HANS: '粉丝俱乐部会员',
        zh_HANT: '粉丝俱乐部会员',
        ja: 'ファンクラブメンバーシップ',
        ko: 'Fan club memberships',
        fr: 'Fan club memberships',
      }),
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'SUPPORTER',
      name: createLocalizedText({
        en: 'Supporter',
        zh_HANS: '支持者',
        zh_HANT: '支持者',
        ja: 'サポーター',
        ko: 'Supporter',
        fr: 'Supporter',
      }),
      description: createLocalizedText({
        en: 'Supporter/Patron memberships',
        zh_HANS: '赞助/支持者会员',
        zh_HANT: '赞助/支持者会员',
        ja: 'サポーター/パトロンメンバーシップ',
        ko: 'Supporter/Patron memberships',
        fr: 'Supporter/Patron memberships',
      }),
    },
  ];

  await prisma.membershipClass.createMany({
    data: membershipClasses,
    skipDuplicates: true,
  });

  // Fetch created classes to get their IDs
  const fetchedClasses = await prisma.membershipClass.findMany({
    where: { ownerType: 'tenant', ownerId: null },
  });
  const createdClasses: Record<string, string> = {};
  for (const cls of fetchedClasses) {
    createdClasses[cls.code] = cls.id;
  }

  console.log(`    ✓ Created ${membershipClasses.length} membership classes`);

  // =========================================================================
  // Membership Types
  // =========================================================================
  const membershipTypes = [
    // YouTube Memberships
    {
      membershipClassId: createdClasses['SUBSCRIPTION'],
      code: 'YOUTUBE_MEMBER',
      name: createLocalizedText({
        en: 'YouTube Channel Membership',
        zh_HANS: 'YouTube频道会员',
        zh_HANT: 'YouTube频道会员',
        ja: 'YouTubeチャンネルメンバーシップ',
        ko: 'YouTube Channel Membership',
        fr: 'YouTube Channel Membership',
      }),
      externalControl: true,
      defaultRenewalDays: 30,
    },
    // Bilibili Memberships
    {
      membershipClassId: createdClasses['SUBSCRIPTION'],
      code: 'BILIBILI_DAREN',
      name: createLocalizedText({
        en: 'Bilibili Captain (大航海)',
        zh_HANS: 'B站大航海',
        zh_HANT: 'B站大航海',
        ja: 'ビリビリ大航海',
        ko: 'Bilibili Captain (大航海)',
        fr: 'Bilibili Captain (大航海)',
      }),
      externalControl: true,
      defaultRenewalDays: 30,
    },
    // Fan Club Types
    {
      membershipClassId: createdClasses['FANCLUB'],
      code: 'FANBOX',
      name: createLocalizedText({
        en: 'pixivFANBOX',
        zh_HANS: 'pixivFANBOX',
        zh_HANT: 'pixivFANBOX',
        ja: 'pixivFANBOX',
        ko: 'pixivFANBOX',
        fr: 'pixivFANBOX',
      }),
      externalControl: true,
      defaultRenewalDays: 30,
    },
    {
      membershipClassId: createdClasses['FANCLUB'],
      code: 'PATREON',
      name: createLocalizedText({
        en: 'Patreon',
        zh_HANS: 'Patreon',
        zh_HANT: 'Patreon',
        ja: 'Patreon',
        ko: 'Patreon',
        fr: 'Patreon',
      }),
      externalControl: true,
      defaultRenewalDays: 30,
    },
    // Supporter Types
    {
      membershipClassId: createdClasses['SUPPORTER'],
      code: 'AFDIAN',
      name: createLocalizedText({
        en: 'Afdian (爱发电)',
        zh_HANS: '爱发电',
        zh_HANT: '爱发电',
        ja: '愛発電',
        ko: 'Afdian (爱发电)',
        fr: 'Afdian (爱发电)',
      }),
      externalControl: true,
      defaultRenewalDays: 30,
    },
    {
      membershipClassId: createdClasses['SUPPORTER'],
      code: 'MANUAL_SUPPORT',
      name: createLocalizedText({
        en: 'Manual Support',
        zh_HANS: '手动支持',
        zh_HANT: '手动支持',
        ja: '手動サポート',
        ko: 'Manual Support',
        fr: 'Manual Support',
      }),
      externalControl: false,
      defaultRenewalDays: 365,
    },
  ];

  const createdTypes: Record<string, string> = {};

  for (const membershipType of membershipTypes) {
    const created = await prisma.membershipType.upsert({
      where: {
        code: membershipType.code,
      },
      update: membershipType,
      create: membershipType,
    });
    createdTypes[membershipType.code] = created.id;
  }

  console.log(`    ✓ Created ${membershipTypes.length} membership types`);

  // =========================================================================
  // Membership Levels
  // =========================================================================
  const membershipLevels = [
    // YouTube Levels
    {
      membershipTypeId: createdTypes['YOUTUBE_MEMBER'],
      code: 'YT_LEVEL_1',
      name: createLocalizedText({
        en: 'Level 1',
        zh_HANS: '等级1',
        zh_HANT: '等级1',
        ja: 'レベル1',
        ko: 'Level 1',
        fr: 'Level 1',
      }),
      rank: 1,
      color: '#00C853',
    },
    {
      membershipTypeId: createdTypes['YOUTUBE_MEMBER'],
      code: 'YT_LEVEL_2',
      name: createLocalizedText({
        en: 'Level 2',
        zh_HANS: '等级2',
        zh_HANT: '等级2',
        ja: 'レベル2',
        ko: 'Level 2',
        fr: 'Level 2',
      }),
      rank: 2,
      color: '#0091EA',
    },
    {
      membershipTypeId: createdTypes['YOUTUBE_MEMBER'],
      code: 'YT_LEVEL_3',
      name: createLocalizedText({
        en: 'Level 3',
        zh_HANS: '等级3',
        zh_HANT: '等级3',
        ja: 'レベル3',
        ko: 'Level 3',
        fr: 'Level 3',
      }),
      rank: 3,
      color: '#6200EA',
    },
    // Bilibili 大航海 Levels
    {
      membershipTypeId: createdTypes['BILIBILI_DAREN'],
      code: 'BILI_JIANZHANG',
      name: createLocalizedText({
        en: 'Captain (舰长)',
        zh_HANS: '舰长',
        zh_HANT: '舰长',
        ja: '艦長',
        ko: 'Captain (舰长)',
        fr: 'Captain (舰长)',
      }),
      rank: 1,
      color: '#66CCFF',
    },
    {
      membershipTypeId: createdTypes['BILIBILI_DAREN'],
      code: 'BILI_TIDU',
      name: createLocalizedText({
        en: 'Admiral (提督)',
        zh_HANS: '提督',
        zh_HANT: '提督',
        ja: '提督',
        ko: 'Admiral (提督)',
        fr: 'Admiral (提督)',
      }),
      rank: 2,
      color: '#FF6699',
    },
    {
      membershipTypeId: createdTypes['BILIBILI_DAREN'],
      code: 'BILI_ZONGDU',
      name: createLocalizedText({
        en: 'Governor (总督)',
        zh_HANS: '总督',
        zh_HANT: '总督',
        ja: '総督',
        ko: 'Governor (总督)',
        fr: 'Governor (总督)',
      }),
      rank: 3,
      color: '#FFD700',
    },
    // FANBOX Levels
    {
      membershipTypeId: createdTypes['FANBOX'],
      code: 'FANBOX_100',
      name: createLocalizedText({
        en: '¥100 Plan',
        zh_HANS: '100日元档',
        zh_HANT: '100日元档',
        ja: '100円プラン',
        ko: '¥100 Plan',
        fr: '¥100 Plan',
      }),
      rank: 1,
      color: '#0096FA',
    },
    {
      membershipTypeId: createdTypes['FANBOX'],
      code: 'FANBOX_500',
      name: createLocalizedText({
        en: '¥500 Plan',
        zh_HANS: '500日元档',
        zh_HANT: '500日元档',
        ja: '500円プラン',
        ko: '¥500 Plan',
        fr: '¥500 Plan',
      }),
      rank: 2,
      color: '#0096FA',
    },
    {
      membershipTypeId: createdTypes['FANBOX'],
      code: 'FANBOX_1000',
      name: createLocalizedText({
        en: '¥1000 Plan',
        zh_HANS: '1000日元档',
        zh_HANT: '1000日元档',
        ja: '1000円プラン',
        ko: '¥1000 Plan',
        fr: '¥1000 Plan',
      }),
      rank: 3,
      color: '#0096FA',
    },
    // Patreon Levels
    {
      membershipTypeId: createdTypes['PATREON'],
      code: 'PATREON_BASIC',
      name: createLocalizedText({
        en: 'Basic Supporter',
        zh_HANS: '基础支持者',
        zh_HANT: '基础支持者',
        ja: 'ベーシック',
        ko: 'Basic Supporter',
        fr: 'Basic Supporter',
      }),
      rank: 1,
      color: '#FF424D',
    },
    {
      membershipTypeId: createdTypes['PATREON'],
      code: 'PATREON_PREMIUM',
      name: createLocalizedText({
        en: 'Premium Supporter',
        zh_HANS: '高级支持者',
        zh_HANT: '高级支持者',
        ja: 'プレミアム',
        ko: 'Premium Supporter',
        fr: 'Premium Supporter',
      }),
      rank: 2,
      color: '#FF424D',
    },
    // Afdian Levels
    {
      membershipTypeId: createdTypes['AFDIAN'],
      code: 'AFDIAN_BASIC',
      name: createLocalizedText({
        en: 'Basic (发电)',
        zh_HANS: '发电',
        zh_HANT: '发电',
        ja: '発電',
        ko: 'Basic (发电)',
        fr: 'Basic (发电)',
      }),
      rank: 1,
      color: '#946CE6',
    },
    {
      membershipTypeId: createdTypes['AFDIAN'],
      code: 'AFDIAN_PREMIUM',
      name: createLocalizedText({
        en: 'Premium (充电)',
        zh_HANS: '充电',
        zh_HANT: '充电',
        ja: '充電',
        ko: 'Premium (充电)',
        fr: 'Premium (充电)',
      }),
      rank: 2,
      color: '#946CE6',
    },
    // Manual Support
    {
      membershipTypeId: createdTypes['MANUAL_SUPPORT'],
      code: 'MANUAL_STANDARD',
      name: createLocalizedText({
        en: 'Standard Supporter',
        zh_HANS: '标准支持者',
        zh_HANT: '标准支持者',
        ja: 'スタンダードサポーター',
        ko: 'Standard Supporter',
        fr: 'Standard Supporter',
      }),
      rank: 1,
      color: '#808080',
    },
    {
      membershipTypeId: createdTypes['MANUAL_SUPPORT'],
      code: 'MANUAL_VIP',
      name: createLocalizedText({
        en: 'VIP Supporter',
        zh_HANS: 'VIP支持者',
        zh_HANT: 'VIP支持者',
        ja: 'VIPサポーター',
        ko: 'VIP Supporter',
        fr: 'VIP Supporter',
      }),
      rank: 2,
      color: '#FFD700',
    },
  ];

  for (const level of membershipLevels) {
    await prisma.membershipLevel.upsert({
      where: {
        code: level.code,
      },
      update: level,
      create: level,
    });
  }

  console.log(`    ✓ Created ${membershipLevels.length} membership levels`);
}

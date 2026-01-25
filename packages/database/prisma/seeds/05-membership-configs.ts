// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Membership configuration seed data

import { PrismaClient } from '@prisma/client';

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
      nameEn: 'Subscription',
      nameZh: '订阅',
      nameJa: 'サブスクリプション',
      descriptionEn: 'Monthly or yearly subscription memberships',
      descriptionZh: '月度或年度订阅会员',
      descriptionJa: '月額または年額のサブスクリプション',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'FANCLUB',
      nameEn: 'Fan Club',
      nameZh: '粉丝俱乐部',
      nameJa: 'ファンクラブ',
      descriptionEn: 'Fan club memberships',
      descriptionZh: '粉丝俱乐部会员',
      descriptionJa: 'ファンクラブメンバーシップ',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'SUPPORTER',
      nameEn: 'Supporter',
      nameZh: '支持者',
      nameJa: 'サポーター',
      descriptionEn: 'Supporter/Patron memberships',
      descriptionZh: '赞助/支持者会员',
      descriptionJa: 'サポーター/パトロンメンバーシップ',
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
      nameEn: 'YouTube Channel Membership',
      nameZh: 'YouTube频道会员',
      nameJa: 'YouTubeチャンネルメンバーシップ',
      externalControl: true,
      defaultRenewalDays: 30,
    },
    // Bilibili Memberships
    {
      membershipClassId: createdClasses['SUBSCRIPTION'],
      code: 'BILIBILI_DAREN',
      nameEn: 'Bilibili Captain (大航海)',
      nameZh: 'B站大航海',
      nameJa: 'ビリビリ大航海',
      externalControl: true,
      defaultRenewalDays: 30,
    },
    // Fan Club Types
    {
      membershipClassId: createdClasses['FANCLUB'],
      code: 'FANBOX',
      nameEn: 'pixivFANBOX',
      nameZh: 'pixivFANBOX',
      nameJa: 'pixivFANBOX',
      externalControl: true,
      defaultRenewalDays: 30,
    },
    {
      membershipClassId: createdClasses['FANCLUB'],
      code: 'PATREON',
      nameEn: 'Patreon',
      nameZh: 'Patreon',
      nameJa: 'Patreon',
      externalControl: true,
      defaultRenewalDays: 30,
    },
    // Supporter Types
    {
      membershipClassId: createdClasses['SUPPORTER'],
      code: 'AFDIAN',
      nameEn: 'Afdian (爱发电)',
      nameZh: '爱发电',
      nameJa: '愛発電',
      externalControl: true,
      defaultRenewalDays: 30,
    },
    {
      membershipClassId: createdClasses['SUPPORTER'],
      code: 'MANUAL_SUPPORT',
      nameEn: 'Manual Support',
      nameZh: '手动支持',
      nameJa: '手動サポート',
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
      nameEn: 'Level 1',
      nameZh: '等级1',
      nameJa: 'レベル1',
      rank: 1,
      color: '#00C853',
    },
    {
      membershipTypeId: createdTypes['YOUTUBE_MEMBER'],
      code: 'YT_LEVEL_2',
      nameEn: 'Level 2',
      nameZh: '等级2',
      nameJa: 'レベル2',
      rank: 2,
      color: '#0091EA',
    },
    {
      membershipTypeId: createdTypes['YOUTUBE_MEMBER'],
      code: 'YT_LEVEL_3',
      nameEn: 'Level 3',
      nameZh: '等级3',
      nameJa: 'レベル3',
      rank: 3,
      color: '#6200EA',
    },
    // Bilibili 大航海 Levels
    {
      membershipTypeId: createdTypes['BILIBILI_DAREN'],
      code: 'BILI_JIANZHANG',
      nameEn: 'Captain (舰长)',
      nameZh: '舰长',
      nameJa: '艦長',
      rank: 1,
      color: '#66CCFF',
    },
    {
      membershipTypeId: createdTypes['BILIBILI_DAREN'],
      code: 'BILI_TIDU',
      nameEn: 'Admiral (提督)',
      nameZh: '提督',
      nameJa: '提督',
      rank: 2,
      color: '#FF6699',
    },
    {
      membershipTypeId: createdTypes['BILIBILI_DAREN'],
      code: 'BILI_ZONGDU',
      nameEn: 'Governor (总督)',
      nameZh: '总督',
      nameJa: '総督',
      rank: 3,
      color: '#FFD700',
    },
    // FANBOX Levels
    {
      membershipTypeId: createdTypes['FANBOX'],
      code: 'FANBOX_100',
      nameEn: '¥100 Plan',
      nameZh: '100日元档',
      nameJa: '100円プラン',
      rank: 1,
      color: '#0096FA',
    },
    {
      membershipTypeId: createdTypes['FANBOX'],
      code: 'FANBOX_500',
      nameEn: '¥500 Plan',
      nameZh: '500日元档',
      nameJa: '500円プラン',
      rank: 2,
      color: '#0096FA',
    },
    {
      membershipTypeId: createdTypes['FANBOX'],
      code: 'FANBOX_1000',
      nameEn: '¥1000 Plan',
      nameZh: '1000日元档',
      nameJa: '1000円プラン',
      rank: 3,
      color: '#0096FA',
    },
    // Patreon Levels
    {
      membershipTypeId: createdTypes['PATREON'],
      code: 'PATREON_BASIC',
      nameEn: 'Basic Supporter',
      nameZh: '基础支持者',
      nameJa: 'ベーシック',
      rank: 1,
      color: '#FF424D',
    },
    {
      membershipTypeId: createdTypes['PATREON'],
      code: 'PATREON_PREMIUM',
      nameEn: 'Premium Supporter',
      nameZh: '高级支持者',
      nameJa: 'プレミアム',
      rank: 2,
      color: '#FF424D',
    },
    // Afdian Levels
    {
      membershipTypeId: createdTypes['AFDIAN'],
      code: 'AFDIAN_BASIC',
      nameEn: 'Basic (发电)',
      nameZh: '发电',
      nameJa: '発電',
      rank: 1,
      color: '#946CE6',
    },
    {
      membershipTypeId: createdTypes['AFDIAN'],
      code: 'AFDIAN_PREMIUM',
      nameEn: 'Premium (充电)',
      nameZh: '充电',
      nameJa: '充電',
      rank: 2,
      color: '#946CE6',
    },
    // Manual Support
    {
      membershipTypeId: createdTypes['MANUAL_SUPPORT'],
      code: 'MANUAL_STANDARD',
      nameEn: 'Standard Supporter',
      nameZh: '标准支持者',
      nameJa: 'スタンダードサポーター',
      rank: 1,
      color: '#808080',
    },
    {
      membershipTypeId: createdTypes['MANUAL_SUPPORT'],
      code: 'MANUAL_VIP',
      nameEn: 'VIP Supporter',
      nameZh: 'VIP支持者',
      nameJa: 'VIPサポーター',
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

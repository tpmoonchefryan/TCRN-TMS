// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Customer configuration seed data

import { PrismaClient } from '../../src/platform/prisma/client';

import { createLocalizedText } from '../../../shared/src/constants/locale';

export async function seedCustomerConfigs(prisma: PrismaClient) {
  console.log('  → Seeding customer configurations...');

  // =========================================================================
  // Customer Status
  // =========================================================================
  const customerStatuses = [
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'ACTIVE',
      name: createLocalizedText({
        en: 'Active',
        zh_HANS: '活跃',
        zh_HANT: '活跃',
        ja: 'アクティブ',
        ko: 'Active',
        fr: 'Active',
      }),
      color: '#22C55E',
      sortOrder: 1,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'INACTIVE',
      name: createLocalizedText({
        en: 'Inactive',
        zh_HANS: '非活跃',
        zh_HANT: '非活跃',
        ja: '非アクティブ',
        ko: 'Inactive',
        fr: 'Inactive',
      }),
      color: '#6B7280',
      sortOrder: 2,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'VIP',
      name: createLocalizedText({
        en: 'VIP',
        zh_HANS: 'VIP',
        zh_HANT: 'VIP',
        ja: 'VIP',
        ko: 'VIP',
        fr: 'VIP',
      }),
      color: '#EAB308',
      sortOrder: 3,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'BLOCKED',
      name: createLocalizedText({
        en: 'Blocked',
        zh_HANS: '已拉黑',
        zh_HANT: '已拉黑',
        ja: 'ブロック済',
        ko: 'Blocked',
        fr: 'Blocked',
      }),
      color: '#EF4444',
      sortOrder: 4,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'PENDING',
      name: createLocalizedText({
        en: 'Pending',
        zh_HANS: '待审核',
        zh_HANT: '待审核',
        ja: '保留中',
        ko: 'Pending',
        fr: 'Pending',
      }),
      color: '#F97316',
      sortOrder: 5,
    },
  ];

  // Use createMany with skipDuplicates to handle null ownerId
  await prisma.customerStatus.createMany({
    data: customerStatuses,
    skipDuplicates: true,
  });

  console.log(`    ✓ Created ${customerStatuses.length} customer statuses`);

  // =========================================================================
  // Reason Categories
  // =========================================================================
  const reasonCategories = [
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'USER_REQUEST',
      name: createLocalizedText({
        en: 'User Request',
        zh_HANS: '用户请求',
        zh_HANT: '用户请求',
        ja: 'ユーザーリクエスト',
        ko: 'User Request',
        fr: 'User Request',
      }),
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'POLICY_VIOLATION',
      name: createLocalizedText({
        en: 'Policy Violation',
        zh_HANS: '违反规定',
        zh_HANT: '违反规定',
        ja: 'ポリシー違反',
        ko: 'Policy Violation',
        fr: 'Policy Violation',
      }),
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'INACTIVITY',
      name: createLocalizedText({
        en: 'Inactivity',
        zh_HANS: '长期不活跃',
        zh_HANT: '长期不活跃',
        ja: '非アクティブ',
        ko: 'Inactivity',
        fr: 'Inactivity',
      }),
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
    },
  ];

  await prisma.reasonCategory.createMany({
    data: reasonCategories,
    skipDuplicates: true,
  });

  // Fetch created categories to get their IDs
  const createdCategories = await prisma.reasonCategory.findMany({
    where: { ownerType: 'tenant', ownerId: null },
  });
  const categoryMap: Record<string, string> = {};
  for (const cat of createdCategories) {
    categoryMap[cat.code] = cat.id;
  }

  console.log(`    ✓ Created ${reasonCategories.length} reason categories`);

  // =========================================================================
  // Inactivation Reasons
  // =========================================================================
  const inactivationReasons = [
    {
      ownerType: 'tenant',
      ownerId: null,
      reasonCategoryId: categoryMap['USER_REQUEST'],
      code: 'USER_UNSUBSCRIBE',
      name: createLocalizedText({
        en: 'User Unsubscribed',
        zh_HANS: '用户退订',
        zh_HANT: '用户退订',
        ja: '退会',
        ko: 'User Unsubscribed',
        fr: 'User Unsubscribed',
      }),
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      reasonCategoryId: categoryMap['USER_REQUEST'],
      code: 'USER_DATA_DELETION',
      name: createLocalizedText({
        en: 'Data Deletion Request',
        zh_HANS: '数据删除请求',
        zh_HANT: '数据删除请求',
        ja: 'データ削除リクエスト',
        ko: 'Data Deletion Request',
        fr: 'Data Deletion Request',
      }),
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      reasonCategoryId: categoryMap['POLICY_VIOLATION'],
      code: 'SPAM_BEHAVIOR',
      name: createLocalizedText({
        en: 'Spam Behavior',
        zh_HANS: '垃圾信息行为',
        zh_HANT: '垃圾信息行为',
        ja: 'スパム行為',
        ko: 'Spam Behavior',
        fr: 'Spam Behavior',
      }),
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      reasonCategoryId: categoryMap['POLICY_VIOLATION'],
      code: 'HARASSMENT',
      name: createLocalizedText({
        en: 'Harassment',
        zh_HANS: '骚扰行为',
        zh_HANT: '骚扰行为',
        ja: 'ハラスメント',
        ko: 'Harassment',
        fr: 'Harassment',
      }),
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      reasonCategoryId: categoryMap['INACTIVITY'],
      code: 'NO_ACTIVITY_1Y',
      name: createLocalizedText({
        en: 'No Activity for 1 Year',
        zh_HANS: '一年无活动',
        zh_HANT: '一年无活动',
        ja: '1年間アクティビティなし',
        ko: 'No Activity for 1 Year',
        fr: 'No Activity for 1 Year',
      }),
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      reasonCategoryId: categoryMap['OTHER'],
      code: 'OTHER_REASON',
      name: createLocalizedText({
        en: 'Other Reason',
        zh_HANS: '其他原因',
        zh_HANT: '其他原因',
        ja: 'その他の理由',
        ko: 'Other Reason',
        fr: 'Other Reason',
      }),
    },
  ];

  await prisma.inactivationReason.createMany({
    data: inactivationReasons,
    skipDuplicates: true,
  });

  console.log(`    ✓ Created ${inactivationReasons.length} inactivation reasons`);

  // =========================================================================
  // Business Segments
  // =========================================================================
  const businessSegments = [
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'ENTERTAINMENT',
      name: createLocalizedText({
        en: 'Entertainment',
        zh_HANS: '娱乐',
        zh_HANT: '娱乐',
        ja: 'エンターテインメント',
        ko: 'Entertainment',
        fr: 'Entertainment',
      }),
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'TECHNOLOGY',
      name: createLocalizedText({
        en: 'Technology',
        zh_HANS: '科技',
        zh_HANT: '科技',
        ja: 'テクノロジー',
        ko: 'Technology',
        fr: 'Technology',
      }),
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'MEDIA',
      name: createLocalizedText({
        en: 'Media',
        zh_HANS: '媒体',
        zh_HANT: '媒体',
        ja: 'メディア',
        ko: 'Media',
        fr: 'Media',
      }),
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'GAMING',
      name: createLocalizedText({
        en: 'Gaming',
        zh_HANS: '游戏',
        zh_HANT: '游戏',
        ja: 'ゲーム',
        ko: 'Gaming',
        fr: 'Gaming',
      }),
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
    },
  ];

  await prisma.businessSegment.createMany({
    data: businessSegments,
    skipDuplicates: true,
  });

  console.log(`    ✓ Created ${businessSegments.length} business segments`);

  // =========================================================================
  // Address Types
  // =========================================================================
  const addressTypes = [
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'HOME',
      name: createLocalizedText({
        en: 'Home Address',
        zh_HANS: '家庭住址',
        zh_HANT: '家庭住址',
        ja: '自宅住所',
        ko: 'Home Address',
        fr: 'Home Address',
      }),
      description: createLocalizedText({
        en: 'Primary residential address',
        zh_HANS: '主要居住地址',
        zh_HANT: '主要居住地址',
        ja: '主な居住地住所',
        ko: 'Primary residential address',
        fr: 'Primary residential address',
      }),
      sortOrder: 1,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'WORK',
      name: createLocalizedText({
        en: 'Work Address',
        zh_HANS: '工作地址',
        zh_HANT: '工作地址',
        ja: '勤務先住所',
        ko: 'Work Address',
        fr: 'Work Address',
      }),
      description: createLocalizedText({
        en: 'Business or work address',
        zh_HANS: '工作或办公地址',
        zh_HANT: '工作或办公地址',
        ja: '勤務先または事務所の住所',
        ko: 'Business or work address',
        fr: 'Business or work address',
      }),
      sortOrder: 2,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'BILLING',
      name: createLocalizedText({
        en: 'Billing Address',
        zh_HANS: '账单地址',
        zh_HANT: '账单地址',
        ja: '請求先住所',
        ko: 'Billing Address',
        fr: 'Billing Address',
      }),
      description: createLocalizedText({
        en: 'Address for billing and invoices',
        zh_HANS: '用于账单和发票的地址',
        zh_HANT: '用于账单和发票的地址',
        ja: '請求書および請求の住所',
        ko: 'Address for billing and invoices',
        fr: 'Address for billing and invoices',
      }),
      sortOrder: 3,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'SHIPPING',
      name: createLocalizedText({
        en: 'Shipping Address',
        zh_HANS: '收货地址',
        zh_HANT: '收货地址',
        ja: '配送先住所',
        ko: 'Shipping Address',
        fr: 'Shipping Address',
      }),
      description: createLocalizedText({
        en: 'Address for deliveries and shipments',
        zh_HANS: '用于配送和发货的地址',
        zh_HANT: '用于配送和发货的地址',
        ja: '配送および発送の住所',
        ko: 'Address for deliveries and shipments',
        fr: 'Address for deliveries and shipments',
      }),
      sortOrder: 4,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'OTHER',
      name: createLocalizedText({
        en: 'Other Address',
        zh_HANS: '其他地址',
        zh_HANT: '其他地址',
        ja: 'その他の住所',
        ko: 'Other Address',
        fr: 'Other Address',
      }),
      description: createLocalizedText({
        en: 'Other address type',
        zh_HANS: '其他类型地址',
        zh_HANT: '其他类型地址',
        ja: 'その他の住所タイプ',
        ko: 'Other address type',
        fr: 'Other address type',
      }),
      sortOrder: 99,
      isSystem: true,
    },
  ];

  await prisma.addressType.createMany({
    data: addressTypes,
    skipDuplicates: true,
  });

  console.log(`    ✓ Created ${addressTypes.length} address types`);

  // =========================================================================
  // Communication Types (requires Channel Categories to be seeded first)
  // =========================================================================
  // Fetch channel categories to get their IDs
  const channelCategories = await prisma.channelCategory.findMany({
    where: { ownerType: 'tenant', ownerId: null },
  });
  const channelCategoryMap: Record<string, string> = {};
  for (const cat of channelCategories) {
    channelCategoryMap[cat.code] = cat.id;
  }

  // Only seed communication types if channel categories exist
  if (Object.keys(channelCategoryMap).length > 0) {
    const communicationTypes = [
      // Phone types
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'phone',
        channelCategoryId: channelCategoryMap['PHONE'] || null,
        code: 'MOBILE',
        name: createLocalizedText({
          en: 'Mobile Phone',
          zh_HANS: '手机',
          zh_HANT: '手机',
          ja: '携帯電話',
          ko: 'Mobile Phone',
          fr: 'Mobile Phone',
        }),
        description: createLocalizedText({
          en: 'Mobile phone number',
          zh_HANS: '手机号码',
          zh_HANT: '手机号码',
          ja: '携帯電話番号',
          ko: 'Mobile phone number',
          fr: 'Mobile phone number',
        }),
        sortOrder: 1,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'phone',
        channelCategoryId: channelCategoryMap['PHONE'] || null,
        code: 'LANDLINE',
        name: createLocalizedText({
          en: 'Landline',
          zh_HANS: '座机',
          zh_HANT: '座机',
          ja: '固定電話',
          ko: 'Landline',
          fr: 'Landline',
        }),
        description: createLocalizedText({
          en: 'Landline phone number',
          zh_HANS: '固定电话号码',
          zh_HANT: '固定电话号码',
          ja: '固定電話番号',
          ko: 'Landline phone number',
          fr: 'Landline phone number',
        }),
        sortOrder: 2,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'phone',
        channelCategoryId: channelCategoryMap['PHONE'] || null,
        code: 'FAX',
        name: createLocalizedText({
          en: 'Fax',
          zh_HANS: '传真',
          zh_HANT: '传真',
          ja: 'FAX',
          ko: 'Fax',
          fr: 'Fax',
        }),
        description: createLocalizedText({
          en: 'Fax number',
          zh_HANS: '传真号码',
          zh_HANT: '传真号码',
          ja: 'FAX番号',
          ko: 'Fax number',
          fr: 'Fax number',
        }),
        sortOrder: 3,
        isSystem: true,
      },
      // Email types
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'email',
        channelCategoryId: channelCategoryMap['EMAIL'] || null,
        code: 'PERSONAL_EMAIL',
        name: createLocalizedText({
          en: 'Personal Email',
          zh_HANS: '个人邮箱',
          zh_HANT: '个人邮箱',
          ja: '個人メール',
          ko: 'Personal Email',
          fr: 'Personal Email',
        }),
        description: createLocalizedText({
          en: 'Personal email address',
          zh_HANS: '个人电子邮箱地址',
          zh_HANT: '个人电子邮箱地址',
          ja: '個人用メールアドレス',
          ko: 'Personal email address',
          fr: 'Personal email address',
        }),
        sortOrder: 1,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'email',
        channelCategoryId: channelCategoryMap['EMAIL'] || null,
        code: 'BUSINESS_EMAIL',
        name: createLocalizedText({
          en: 'Business Email',
          zh_HANS: '工作邮箱',
          zh_HANT: '工作邮箱',
          ja: 'ビジネスメール',
          ko: 'Business Email',
          fr: 'Business Email',
        }),
        description: createLocalizedText({
          en: 'Business or work email address',
          zh_HANS: '工作或商务电子邮箱地址',
          zh_HANT: '工作或商务电子邮箱地址',
          ja: '仕事用メールアドレス',
          ko: 'Business or work email address',
          fr: 'Business or work email address',
        }),
        sortOrder: 2,
        isSystem: true,
      },
      // SNS types
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'sns',
        channelCategoryId: channelCategoryMap['SNS'] || null,
        code: 'TWITTER_DM',
        name: createLocalizedText({
          en: 'X (Twitter) DM',
          zh_HANS: 'X (推特) 私信',
          zh_HANT: 'X (推特) 私信',
          ja: 'X (Twitter) DM',
          ko: 'X (Twitter) DM',
          fr: 'X (Twitter) DM',
        }),
        description: createLocalizedText({
          en: 'X (Twitter) direct message',
          zh_HANS: 'X (推特) 私信联系方式',
          zh_HANT: 'X (推特) 私信联系方式',
          ja: 'X (Twitter) ダイレクトメッセージ',
          ko: 'X (Twitter) direct message',
          fr: 'X (Twitter) direct message',
        }),
        sortOrder: 1,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'sns',
        channelCategoryId: channelCategoryMap['SNS'] || null,
        code: 'INSTAGRAM_DM',
        name: createLocalizedText({
          en: 'Instagram DM',
          zh_HANS: 'Instagram 私信',
          zh_HANT: 'Instagram 私信',
          ja: 'Instagram DM',
          ko: 'Instagram DM',
          fr: 'Instagram DM',
        }),
        description: createLocalizedText({
          en: 'Instagram direct message',
          zh_HANS: 'Instagram 私信联系方式',
          zh_HANT: 'Instagram 私信联系方式',
          ja: 'Instagram ダイレクトメッセージ',
          ko: 'Instagram direct message',
          fr: 'Instagram direct message',
        }),
        sortOrder: 2,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'sns',
        channelCategoryId: channelCategoryMap['SNS'] || null,
        code: 'DISCORD',
        name: createLocalizedText({
          en: 'Discord',
          zh_HANS: 'Discord',
          zh_HANT: 'Discord',
          ja: 'Discord',
          ko: 'Discord',
          fr: 'Discord',
        }),
        description: createLocalizedText({
          en: 'Discord username or server',
          zh_HANS: 'Discord 用户名或服务器',
          zh_HANT: 'Discord 用户名或服务器',
          ja: 'Discord ユーザー名またはサーバー',
          ko: 'Discord username or server',
          fr: 'Discord username or server',
        }),
        sortOrder: 3,
        isSystem: true,
      },
      // Messaging types
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'sns',
        channelCategoryId: channelCategoryMap['MESSAGING'] || null,
        code: 'LINE',
        name: createLocalizedText({
          en: 'LINE',
          zh_HANS: 'LINE',
          zh_HANT: 'LINE',
          ja: 'LINE',
          ko: 'LINE',
          fr: 'LINE',
        }),
        description: createLocalizedText({
          en: 'LINE messenger ID',
          zh_HANS: 'LINE 账号',
          zh_HANT: 'LINE 账号',
          ja: 'LINE ID',
          ko: 'LINE messenger ID',
          fr: 'LINE messenger ID',
        }),
        sortOrder: 1,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'sns',
        channelCategoryId: channelCategoryMap['MESSAGING'] || null,
        code: 'WECHAT',
        name: createLocalizedText({
          en: 'WeChat',
          zh_HANS: '微信',
          zh_HANT: '微信',
          ja: 'WeChat',
          ko: 'WeChat',
          fr: 'WeChat',
        }),
        description: createLocalizedText({
          en: 'WeChat ID',
          zh_HANS: '微信号',
          zh_HANT: '微信号',
          ja: 'WeChat ID',
          ko: 'WeChat ID',
          fr: 'WeChat ID',
        }),
        sortOrder: 2,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'sns',
        channelCategoryId: channelCategoryMap['MESSAGING'] || null,
        code: 'WHATSAPP',
        name: createLocalizedText({
          en: 'WhatsApp',
          zh_HANS: 'WhatsApp',
          zh_HANT: 'WhatsApp',
          ja: 'WhatsApp',
          ko: 'WhatsApp',
          fr: 'WhatsApp',
        }),
        description: createLocalizedText({
          en: 'WhatsApp number',
          zh_HANS: 'WhatsApp 号码',
          zh_HANT: 'WhatsApp 号码',
          ja: 'WhatsApp 番号',
          ko: 'WhatsApp number',
          fr: 'WhatsApp number',
        }),
        sortOrder: 3,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'sns',
        channelCategoryId: channelCategoryMap['MESSAGING'] || null,
        code: 'TELEGRAM',
        name: createLocalizedText({
          en: 'Telegram',
          zh_HANS: 'Telegram',
          zh_HANT: 'Telegram',
          ja: 'Telegram',
          ko: 'Telegram',
          fr: 'Telegram',
        }),
        description: createLocalizedText({
          en: 'Telegram username',
          zh_HANS: 'Telegram 用户名',
          zh_HANT: 'Telegram 用户名',
          ja: 'Telegram ユーザー名',
          ko: 'Telegram username',
          fr: 'Telegram username',
        }),
        sortOrder: 4,
        isSystem: true,
      },
      // Other
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'other',
        channelCategoryId: channelCategoryMap['OTHER'] || null,
        code: 'OTHER_COMM',
        name: createLocalizedText({
          en: 'Other',
          zh_HANS: '其他',
          zh_HANT: '其他',
          ja: 'その他',
          ko: 'Other',
          fr: 'Other',
        }),
        description: createLocalizedText({
          en: 'Other communication method',
          zh_HANS: '其他联系方式',
          zh_HANT: '其他联系方式',
          ja: 'その他の連絡方法',
          ko: 'Other communication method',
          fr: 'Other communication method',
        }),
        sortOrder: 99,
        isSystem: true,
      },
    ];

    await prisma.communicationType.createMany({
      data: communicationTypes,
      skipDuplicates: true,
    });

    console.log(`    ✓ Created ${communicationTypes.length} communication types`);
  } else {
    console.log('    ⚠ Skipped communication types (channel categories not found)');
  }
}

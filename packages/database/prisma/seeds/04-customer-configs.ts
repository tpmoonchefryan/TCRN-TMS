// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Customer configuration seed data

import { PrismaClient } from '@prisma/client';

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
      nameEn: 'Active',
      nameZh: '活跃',
      nameJa: 'アクティブ',
      color: '#22C55E',
      sortOrder: 1,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'INACTIVE',
      nameEn: 'Inactive',
      nameZh: '非活跃',
      nameJa: '非アクティブ',
      color: '#6B7280',
      sortOrder: 2,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'VIP',
      nameEn: 'VIP',
      nameZh: 'VIP',
      nameJa: 'VIP',
      color: '#EAB308',
      sortOrder: 3,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'BLOCKED',
      nameEn: 'Blocked',
      nameZh: '已拉黑',
      nameJa: 'ブロック済',
      color: '#EF4444',
      sortOrder: 4,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'PENDING',
      nameEn: 'Pending',
      nameZh: '待审核',
      nameJa: '保留中',
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
      nameEn: 'User Request',
      nameZh: '用户请求',
      nameJa: 'ユーザーリクエスト',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'POLICY_VIOLATION',
      nameEn: 'Policy Violation',
      nameZh: '违反规定',
      nameJa: 'ポリシー違反',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'INACTIVITY',
      nameEn: 'Inactivity',
      nameZh: '长期不活跃',
      nameJa: '非アクティブ',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'OTHER',
      nameEn: 'Other',
      nameZh: '其他',
      nameJa: 'その他',
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
      nameEn: 'User Unsubscribed',
      nameZh: '用户退订',
      nameJa: '退会',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      reasonCategoryId: categoryMap['USER_REQUEST'],
      code: 'USER_DATA_DELETION',
      nameEn: 'Data Deletion Request',
      nameZh: '数据删除请求',
      nameJa: 'データ削除リクエスト',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      reasonCategoryId: categoryMap['POLICY_VIOLATION'],
      code: 'SPAM_BEHAVIOR',
      nameEn: 'Spam Behavior',
      nameZh: '垃圾信息行为',
      nameJa: 'スパム行為',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      reasonCategoryId: categoryMap['POLICY_VIOLATION'],
      code: 'HARASSMENT',
      nameEn: 'Harassment',
      nameZh: '骚扰行为',
      nameJa: 'ハラスメント',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      reasonCategoryId: categoryMap['INACTIVITY'],
      code: 'NO_ACTIVITY_1Y',
      nameEn: 'No Activity for 1 Year',
      nameZh: '一年无活动',
      nameJa: '1年間アクティビティなし',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      reasonCategoryId: categoryMap['OTHER'],
      code: 'OTHER_REASON',
      nameEn: 'Other Reason',
      nameZh: '其他原因',
      nameJa: 'その他の理由',
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
      nameEn: 'Entertainment',
      nameZh: '娱乐',
      nameJa: 'エンターテインメント',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'TECHNOLOGY',
      nameEn: 'Technology',
      nameZh: '科技',
      nameJa: 'テクノロジー',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'MEDIA',
      nameEn: 'Media',
      nameZh: '媒体',
      nameJa: 'メディア',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'GAMING',
      nameEn: 'Gaming',
      nameZh: '游戏',
      nameJa: 'ゲーム',
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'OTHER',
      nameEn: 'Other',
      nameZh: '其他',
      nameJa: 'その他',
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
      nameEn: 'Home Address',
      nameZh: '家庭住址',
      nameJa: '自宅住所',
      descriptionEn: 'Primary residential address',
      descriptionZh: '主要居住地址',
      descriptionJa: '主な居住地住所',
      sortOrder: 1,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'WORK',
      nameEn: 'Work Address',
      nameZh: '工作地址',
      nameJa: '勤務先住所',
      descriptionEn: 'Business or work address',
      descriptionZh: '工作或办公地址',
      descriptionJa: '勤務先または事務所の住所',
      sortOrder: 2,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'BILLING',
      nameEn: 'Billing Address',
      nameZh: '账单地址',
      nameJa: '請求先住所',
      descriptionEn: 'Address for billing and invoices',
      descriptionZh: '用于账单和发票的地址',
      descriptionJa: '請求書および請求の住所',
      sortOrder: 3,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'SHIPPING',
      nameEn: 'Shipping Address',
      nameZh: '收货地址',
      nameJa: '配送先住所',
      descriptionEn: 'Address for deliveries and shipments',
      descriptionZh: '用于配送和发货的地址',
      descriptionJa: '配送および発送の住所',
      sortOrder: 4,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      code: 'OTHER',
      nameEn: 'Other Address',
      nameZh: '其他地址',
      nameJa: 'その他の住所',
      descriptionEn: 'Other address type',
      descriptionZh: '其他类型地址',
      descriptionJa: 'その他の住所タイプ',
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
        nameEn: 'Mobile Phone',
        nameZh: '手机',
        nameJa: '携帯電話',
        descriptionEn: 'Mobile phone number',
        descriptionZh: '手机号码',
        descriptionJa: '携帯電話番号',
        sortOrder: 1,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'phone',
        channelCategoryId: channelCategoryMap['PHONE'] || null,
        code: 'LANDLINE',
        nameEn: 'Landline',
        nameZh: '座机',
        nameJa: '固定電話',
        descriptionEn: 'Landline phone number',
        descriptionZh: '固定电话号码',
        descriptionJa: '固定電話番号',
        sortOrder: 2,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'phone',
        channelCategoryId: channelCategoryMap['PHONE'] || null,
        code: 'FAX',
        nameEn: 'Fax',
        nameZh: '传真',
        nameJa: 'FAX',
        descriptionEn: 'Fax number',
        descriptionZh: '传真号码',
        descriptionJa: 'FAX番号',
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
        nameEn: 'Personal Email',
        nameZh: '个人邮箱',
        nameJa: '個人メール',
        descriptionEn: 'Personal email address',
        descriptionZh: '个人电子邮箱地址',
        descriptionJa: '個人用メールアドレス',
        sortOrder: 1,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'email',
        channelCategoryId: channelCategoryMap['EMAIL'] || null,
        code: 'BUSINESS_EMAIL',
        nameEn: 'Business Email',
        nameZh: '工作邮箱',
        nameJa: 'ビジネスメール',
        descriptionEn: 'Business or work email address',
        descriptionZh: '工作或商务电子邮箱地址',
        descriptionJa: '仕事用メールアドレス',
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
        nameEn: 'X (Twitter) DM',
        nameZh: 'X (推特) 私信',
        nameJa: 'X (Twitter) DM',
        descriptionEn: 'X (Twitter) direct message',
        descriptionZh: 'X (推特) 私信联系方式',
        descriptionJa: 'X (Twitter) ダイレクトメッセージ',
        sortOrder: 1,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'sns',
        channelCategoryId: channelCategoryMap['SNS'] || null,
        code: 'INSTAGRAM_DM',
        nameEn: 'Instagram DM',
        nameZh: 'Instagram 私信',
        nameJa: 'Instagram DM',
        descriptionEn: 'Instagram direct message',
        descriptionZh: 'Instagram 私信联系方式',
        descriptionJa: 'Instagram ダイレクトメッセージ',
        sortOrder: 2,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'sns',
        channelCategoryId: channelCategoryMap['SNS'] || null,
        code: 'DISCORD',
        nameEn: 'Discord',
        nameZh: 'Discord',
        nameJa: 'Discord',
        descriptionEn: 'Discord username or server',
        descriptionZh: 'Discord 用户名或服务器',
        descriptionJa: 'Discord ユーザー名またはサーバー',
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
        nameEn: 'LINE',
        nameZh: 'LINE',
        nameJa: 'LINE',
        descriptionEn: 'LINE messenger ID',
        descriptionZh: 'LINE 账号',
        descriptionJa: 'LINE ID',
        sortOrder: 1,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'sns',
        channelCategoryId: channelCategoryMap['MESSAGING'] || null,
        code: 'WECHAT',
        nameEn: 'WeChat',
        nameZh: '微信',
        nameJa: 'WeChat',
        descriptionEn: 'WeChat ID',
        descriptionZh: '微信号',
        descriptionJa: 'WeChat ID',
        sortOrder: 2,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'sns',
        channelCategoryId: channelCategoryMap['MESSAGING'] || null,
        code: 'WHATSAPP',
        nameEn: 'WhatsApp',
        nameZh: 'WhatsApp',
        nameJa: 'WhatsApp',
        descriptionEn: 'WhatsApp number',
        descriptionZh: 'WhatsApp 号码',
        descriptionJa: 'WhatsApp 番号',
        sortOrder: 3,
        isSystem: true,
      },
      {
        ownerType: 'tenant',
        ownerId: null,
        channelCategory: 'sns',
        channelCategoryId: channelCategoryMap['MESSAGING'] || null,
        code: 'TELEGRAM',
        nameEn: 'Telegram',
        nameZh: 'Telegram',
        nameJa: 'Telegram',
        descriptionEn: 'Telegram username',
        descriptionZh: 'Telegram 用户名',
        descriptionJa: 'Telegram ユーザー名',
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
        nameEn: 'Other',
        nameZh: '其他',
        nameJa: 'その他',
        descriptionEn: 'Other communication method',
        descriptionZh: '其他联系方式',
        descriptionJa: 'その他の連絡方法',
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

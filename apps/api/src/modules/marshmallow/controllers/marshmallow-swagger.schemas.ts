// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { ErrorCodes, SUPPORTED_UI_LOCALES, type LocalizedText } from '@tcrn/shared';

const createErrorEnvelopeSchema = (code: string, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: { code, message },
  },
});

const createLocalizedTextSchema = (examples: LocalizedText) => ({
  type: 'object',
  properties: Object.fromEntries(
    SUPPORTED_UI_LOCALES.map((locale) => [
      locale,
      { type: 'string', nullable: true, example: examples[locale] },
    ])
  ),
  required: [...SUPPORTED_UI_LOCALES],
});

const createSuccessEnvelopeSchema = (
  dataSchema: Record<string, unknown>,
  exampleData: unknown,
  metaSchema?: Record<string, unknown>,
  exampleMeta?: unknown
) => {
  const properties: Record<string, unknown> = {
    success: { type: 'boolean', example: true },
    data: dataSchema,
  };
  const required = ['success', 'data'];
  const example: Record<string, unknown> = {
    success: true,
    data: exampleData,
  };

  if (metaSchema) {
    properties.meta = metaSchema;
    required.push('meta');
    example.meta = exampleMeta;
  }

  return {
    type: 'object',
    properties,
    required,
    example,
  };
};

const MESSAGE_STATS_SCHEMA = {
  type: 'object',
  properties: {
    totalMessages: { type: 'integer', example: 128 },
    pendingCount: { type: 'integer', example: 12 },
    approvedCount: { type: 'integer', example: 102 },
    rejectedCount: { type: 'integer', example: 14 },
    unreadCount: { type: 'integer', example: 9 },
  },
  required: ['totalMessages', 'pendingCount', 'approvedCount', 'rejectedCount', 'unreadCount'],
};

const TURNSTILE_CONFIG_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    environment: { type: 'string', example: 'staging' },
    siteKeyConfigured: { type: 'boolean', example: true },
    secretKeyConfigured: { type: 'boolean', example: true },
    providerReady: { type: 'boolean', example: true },
    runtimeBypass: { type: 'boolean', example: false },
    ready: { type: 'boolean', example: true },
    siteKey: { type: 'string', nullable: true, example: '0x4AAAAAAABBBBBBBBBBBBBB' },
    source: { type: 'string', enum: ['tenant', 'environment', 'none'], example: 'tenant' },
  },
  required: [
    'environment',
    'siteKeyConfigured',
    'secretKeyConfigured',
    'providerReady',
    'runtimeBypass',
    'ready',
  ],
};

export const MARSHMALLOW_CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440910' },
    talentId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440001' },
    isEnabled: { type: 'boolean', example: true },
    title: { type: 'string', nullable: true, example: 'Aki Mailbox' },
    welcomeText: { type: 'string', nullable: true, example: 'Leave your message here.' },
    placeholderText: { type: 'string', nullable: true, example: 'Write your message...' },
    thankYouText: { type: 'string', nullable: true, example: 'Thanks for your message!' },
    allowAnonymous: { type: 'boolean', example: true },
    captchaMode: { type: 'string', example: 'auto' },
    moderationEnabled: { type: 'boolean', example: true },
    autoApprove: { type: 'boolean', example: false },
    profanityFilterEnabled: { type: 'boolean', example: true },
    externalBlocklistEnabled: { type: 'boolean', example: true },
    maxMessageLength: { type: 'integer', example: 500 },
    minMessageLength: { type: 'integer', example: 1 },
    rateLimitPerIp: { type: 'integer', example: 5 },
    rateLimitWindowHours: { type: 'integer', example: 1 },
    reactionsEnabled: { type: 'boolean', example: true },
    allowedReactions: {
      type: 'array',
      items: { type: 'string' },
      example: ['heart', 'star', 'fire'],
    },
    theme: {
      type: 'object',
      additionalProperties: true,
      example: {
        accentColor: '#ff6b6b',
        backgroundColor: '#fff7f7',
      },
    },
    avatarUrl: {
      type: 'string',
      nullable: true,
      example: 'https://cdn.example.com/avatars/aki.png',
    },
    termsContent: createLocalizedTextSchema({
      en: 'Be respectful.',
      zh_HANS: '请保持礼貌。',
      zh_HANT: '請保持禮貌。',
      ja: '礼儀を守ってください。',
      ko: 'Be respectful.',
      fr: 'Be respectful.',
    }),
    privacyContent: createLocalizedTextSchema({
      en: 'We only keep moderation metadata.',
      zh_HANS: '我们仅保存审核所需元数据。',
      zh_HANT: '我們僅保存審核所需中繼資料。',
      ja: '審査に必要なメタデータのみ保存します。',
      ko: 'We only keep moderation metadata.',
      fr: 'We only keep moderation metadata.',
    }),
    stats: MESSAGE_STATS_SCHEMA,
    turnstile: TURNSTILE_CONFIG_STATUS_SCHEMA,
    marshmallowUrl: {
      type: 'string',
      example: 'https://app.example.com/m/aki-mailbox',
    },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T12:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T12:30:00.000Z' },
    version: { type: 'integer', example: 3 },
  },
  required: [
    'id',
    'talentId',
    'isEnabled',
    'allowAnonymous',
    'captchaMode',
    'moderationEnabled',
    'autoApprove',
    'profanityFilterEnabled',
    'externalBlocklistEnabled',
    'maxMessageLength',
    'minMessageLength',
    'rateLimitPerIp',
    'rateLimitWindowHours',
    'reactionsEnabled',
    'allowedReactions',
    'theme',
    'stats',
    'turnstile',
    'marshmallowUrl',
    'createdAt',
    'updatedAt',
    'version',
  ],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440910',
    talentId: '550e8400-e29b-41d4-a716-446655440001',
    isEnabled: true,
    title: 'Aki Mailbox',
    welcomeText: 'Leave your message here.',
    placeholderText: 'Write your message...',
    thankYouText: 'Thanks for your message!',
    allowAnonymous: true,
    captchaMode: 'auto',
    moderationEnabled: true,
    autoApprove: false,
    profanityFilterEnabled: true,
    externalBlocklistEnabled: true,
    maxMessageLength: 500,
    minMessageLength: 1,
    rateLimitPerIp: 5,
    rateLimitWindowHours: 1,
    reactionsEnabled: true,
    allowedReactions: ['heart', 'star', 'fire'],
    theme: {
      accentColor: '#ff6b6b',
      backgroundColor: '#fff7f7',
    },
    avatarUrl: 'https://cdn.example.com/avatars/aki.png',
    termsContent: {
      en: 'Be respectful.',
      zh_HANS: '请保持礼貌。',
      zh_HANT: '請保持禮貌。',
      ja: '礼儀を守ってください。',
      ko: 'Be respectful.',
      fr: 'Be respectful.',
    },
    privacyContent: {
      en: 'We only keep moderation metadata.',
      zh_HANS: '我们仅保存审核所需元数据。',
      zh_HANT: '我們僅保存審核所需中繼資料。',
      ja: '審査に必要なメタデータのみ保存します。',
      ko: 'We only keep moderation metadata.',
      fr: 'We only keep moderation metadata.',
    },
    stats: {
      totalMessages: 128,
      pendingCount: 12,
      approvedCount: 102,
      rejectedCount: 14,
      unreadCount: 9,
    },
    turnstile: {
      siteKeyConfigured: true,
      secretKeyConfigured: true,
      ready: true,
    },
    marshmallowUrl: 'https://app.example.com/m/aki-mailbox',
    createdAt: '2026-04-13T12:00:00.000Z',
    updatedAt: '2026-04-13T12:30:00.000Z',
    version: 3,
  },
};

export const MARSHMALLOW_AVATAR_UPLOAD_SCHEMA = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      example: 'https://cdn.example.com/avatars/tenant_001/talent_001/avatar-1713012300.webp',
    },
  },
  required: ['url'],
  example: {
    url: 'https://cdn.example.com/avatars/tenant_001/talent_001/avatar-1713012300.webp',
  },
};

export const MARSHMALLOW_CUSTOM_DOMAIN_SCHEMA = {
  type: 'object',
  properties: {
    customDomain: { type: 'string', nullable: true, example: 'mail.aki.example.com' },
    token: {
      type: 'string',
      nullable: true,
      example: 'secret-ref:custom-domain-verification-token',
    },
    txtRecord: {
      type: 'string',
      nullable: true,
      example: 'tcrn-verify=secret-ref:custom-domain-verification-token',
    },
  },
  required: ['customDomain', 'token', 'txtRecord'],
  example: {
    customDomain: 'mail.aki.example.com',
    token: 'secret-ref:custom-domain-verification-token',
    txtRecord: 'tcrn-verify=secret-ref:custom-domain-verification-token',
  },
};

export const MARSHMALLOW_VERIFY_DOMAIN_SCHEMA = {
  type: 'object',
  properties: {
    verified: { type: 'boolean', example: true },
    message: { type: 'string', example: 'Domain verified successfully' },
  },
  required: ['verified', 'message'],
  example: {
    verified: true,
    message: 'Domain verified successfully',
  },
};

export const MARSHMALLOW_SSO_TOKEN_SCHEMA = {
  type: 'object',
  properties: {
    token: { type: 'string', example: 'secret-ref:sso-token' },
    expiresIn: { type: 'integer', example: 3600 },
    expiresAt: { type: 'string', format: 'date-time', example: '2026-04-13T13:30:00.000Z' },
  },
  required: ['token', 'expiresIn', 'expiresAt'],
  example: {
    token: 'secret-ref:sso-token',
    expiresIn: 3600,
    expiresAt: '2026-04-13T13:30:00.000Z',
  },
};

const MESSAGE_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440020' },
    content: { type: 'string', example: 'Happy birthday, Aki!' },
    senderName: { type: 'string', nullable: true, example: 'Aki Fan' },
    isAnonymous: { type: 'boolean', example: false },
    status: { type: 'string', example: 'approved' },
    rejectionReason: { type: 'string', nullable: true, example: null },
    isRead: { type: 'boolean', example: false },
    isStarred: { type: 'boolean', example: true },
    isPinned: { type: 'boolean', example: false },
    replyContent: { type: 'string', nullable: true, example: 'Thank you for watching!' },
    repliedAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-04-13T12:10:00.000Z',
    },
    repliedBy: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
        username: { type: 'string', example: 'moderator_aki' },
      },
      required: ['id', 'username'],
    },
    reactionCounts: {
      type: 'object',
      additionalProperties: { type: 'integer' },
      example: { heart: 12, fire: 4 },
    },
    profanityFlags: {
      type: 'array',
      items: { type: 'string' },
      example: [],
    },
    imageUrl: { type: 'string', nullable: true, example: null },
    imageUrls: {
      type: 'array',
      items: { type: 'string' },
      example: [],
    },
    socialLink: { type: 'string', nullable: true, example: null },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T12:00:00.000Z' },
  },
  required: [
    'id',
    'content',
    'isAnonymous',
    'status',
    'isRead',
    'isStarred',
    'isPinned',
    'reactionCounts',
    'profanityFlags',
    'imageUrls',
    'createdAt',
  ],
};

export const MARSHMALLOW_MESSAGE_LIST_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: MESSAGE_ITEM_SCHEMA,
    },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'integer', example: 1 },
        stats: {
          type: 'object',
          properties: {
            pendingCount: { type: 'integer', example: 0 },
            approvedCount: { type: 'integer', example: 1 },
            rejectedCount: { type: 'integer', example: 0 },
            unreadCount: { type: 'integer', example: 1 },
          },
          required: ['pendingCount', 'approvedCount', 'rejectedCount', 'unreadCount'],
        },
      },
      required: ['total', 'stats'],
    },
  },
  required: ['items', 'meta'],
  example: {
    items: [
      {
        id: '550e8400-e29b-41d4-a716-446655440020',
        content: 'Happy birthday, Aki!',
        senderName: 'Aki Fan',
        isAnonymous: false,
        status: 'approved',
        rejectionReason: null,
        isRead: false,
        isStarred: true,
        isPinned: false,
        replyContent: 'Thank you for watching!',
        repliedAt: '2026-04-13T12:10:00.000Z',
        repliedBy: {
          id: '550e8400-e29b-41d4-a716-446655440100',
          username: 'moderator_aki',
        },
        reactionCounts: { heart: 12, fire: 4 },
        profanityFlags: [],
        imageUrl: null,
        imageUrls: [],
        socialLink: null,
        createdAt: '2026-04-13T12:00:00.000Z',
      },
    ],
    meta: {
      total: 1,
      stats: {
        pendingCount: 0,
        approvedCount: 1,
        rejectedCount: 0,
        unreadCount: 1,
      },
    },
  },
};

export const MARSHMALLOW_MESSAGE_MODERATION_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440020' },
    status: { type: 'string', example: 'approved' },
    moderatedAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-04-13T12:15:00.000Z',
    },
  },
  required: ['id', 'status'],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440020',
    status: 'approved',
    moderatedAt: '2026-04-13T12:15:00.000Z',
  },
};

export const MARSHMALLOW_MESSAGE_REPLY_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440020' },
    replyContent: { type: 'string', example: 'Thank you for your message!' },
    repliedAt: { type: 'string', format: 'date-time', example: '2026-04-13T12:20:00.000Z' },
    repliedBy: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
        username: { type: 'string', example: 'moderator_aki' },
      },
      required: ['id', 'username'],
    },
  },
  required: ['id', 'replyContent', 'repliedAt', 'repliedBy'],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440020',
    replyContent: 'Thank you for your message!',
    repliedAt: '2026-04-13T12:20:00.000Z',
    repliedBy: {
      id: '550e8400-e29b-41d4-a716-446655440100',
      username: 'moderator_aki',
    },
  },
};

export const MARSHMALLOW_MESSAGE_BATCH_SCHEMA = {
  type: 'object',
  properties: {
    processed: { type: 'integer', example: 3 },
    action: { type: 'string', example: 'approve' },
  },
  required: ['processed', 'action'],
  example: {
    processed: 3,
    action: 'approve',
  },
};

export const MARSHMALLOW_MESSAGE_UPDATE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440020' },
    isRead: { type: 'boolean', example: true },
    isStarred: { type: 'boolean', example: false },
    isPinned: { type: 'boolean', example: true },
  },
  required: ['id', 'isRead', 'isStarred', 'isPinned'],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440020',
    isRead: true,
    isStarred: false,
    isPinned: true,
  },
};

export const MARSHMALLOW_EXPORT_JOB_CREATE_SCHEMA = {
  type: 'object',
  properties: {
    jobId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440400' },
    status: { type: 'string', example: 'pending' },
  },
  required: ['jobId', 'status'],
  example: {
    jobId: '550e8400-e29b-41d4-a716-446655440400',
    status: 'pending',
  },
};

export const MARSHMALLOW_EXPORT_JOB_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440400' },
    status: { type: 'string', example: 'success' },
    format: { type: 'string', example: 'csv' },
    fileName: { type: 'string', nullable: true, example: 'marshmallow-export-20260413.csv' },
    totalRecords: { type: 'integer', example: 120 },
    processedRecords: { type: 'integer', example: 120 },
    downloadUrl: {
      type: 'string',
      nullable: true,
      example: 'https://minio.example.com/temp-reports/marshmallow-export-20260413.csv',
    },
    expiresAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-04-20T12:00:00.000Z',
    },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T12:00:00.000Z' },
    completedAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-04-13T12:05:00.000Z',
    },
  },
  required: [
    'id',
    'status',
    'format',
    'fileName',
    'totalRecords',
    'processedRecords',
    'downloadUrl',
    'expiresAt',
    'createdAt',
    'completedAt',
  ],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440400',
    status: 'success',
    format: 'csv',
    fileName: 'marshmallow-export-20260413.csv',
    totalRecords: 120,
    processedRecords: 120,
    downloadUrl: 'https://minio.example.com/temp-reports/marshmallow-export-20260413.csv',
    expiresAt: '2026-04-20T12:00:00.000Z',
    createdAt: '2026-04-13T12:00:00.000Z',
    completedAt: '2026-04-13T12:05:00.000Z',
  },
};

export const MARSHMALLOW_EXPORT_DOWNLOAD_SCHEMA = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      example:
        'https://minio.example.com/temp-reports/marshmallow-export-20260413.csv?X-Amz-Signature=...',
    },
  },
  required: ['url'],
  example: {
    url: 'https://minio.example.com/temp-reports/marshmallow-export-20260413.csv?X-Amz-Signature=...',
  },
};

const EXTERNAL_BLOCKLIST_NAME_EXAMPLE: LocalizedText = {
  en: 'Discord Invite Filter',
  zh_HANS: 'Discord 邀请过滤',
  zh_HANT: 'Discord 邀請過濾',
  ja: 'Discord 招待フィルター',
  ko: 'Discord 초대 차단',
  fr: 'Filtre invitations Discord',
};

const EXTERNAL_BLOCKLIST_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440700' },
    ownerType: { type: 'string', example: 'tenant' },
    ownerId: { type: 'string', format: 'uuid', nullable: true, example: null },
    pattern: { type: 'string', example: 'discord.gg/' },
    patternType: { type: 'string', example: 'url_regex' },
    name: createLocalizedTextSchema(EXTERNAL_BLOCKLIST_NAME_EXAMPLE),
    description: {
      type: 'string',
      nullable: true,
      example: 'Reject external Discord invite links',
    },
    category: { type: 'string', nullable: true, example: 'spam' },
    severity: { type: 'string', example: 'high' },
    action: { type: 'string', example: 'reject' },
    replacement: { type: 'string', example: '[filtered]' },
    inherit: { type: 'boolean', example: true },
    sortOrder: { type: 'integer', example: 0 },
    isActive: { type: 'boolean', example: true },
    isForceUse: { type: 'boolean', example: false },
    isSystem: { type: 'boolean', example: false },
    isInherited: { type: 'boolean', example: false },
    isDisabledHere: { type: 'boolean', example: false },
    canDisable: { type: 'boolean', example: false },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T12:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T12:05:00.000Z' },
    version: { type: 'integer', example: 2 },
  },
  required: [
    'id',
    'ownerType',
    'pattern',
    'patternType',
    'name',
    'severity',
    'action',
    'replacement',
    'inherit',
    'isActive',
    'createdAt',
    'updatedAt',
    'version',
  ],
};

export const EXTERNAL_BLOCKLIST_LIST_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: {
      type: 'array',
      items: EXTERNAL_BLOCKLIST_ITEM_SCHEMA,
    },
    meta: {
      type: 'object',
      properties: {
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 20 },
            totalCount: { type: 'integer', example: 1 },
            totalPages: { type: 'integer', example: 1 },
          },
          required: ['page', 'pageSize', 'totalCount', 'totalPages'],
        },
      },
      required: ['pagination'],
    },
  },
  required: ['success', 'data', 'meta'],
  example: {
    success: true,
    data: [
      {
        id: '550e8400-e29b-41d4-a716-446655440700',
        ownerType: 'tenant',
        ownerId: null,
        pattern: 'discord.gg/',
        patternType: 'url_regex',
        name: EXTERNAL_BLOCKLIST_NAME_EXAMPLE,
        description: 'Reject external Discord invite links',
        category: 'spam',
        severity: 'high',
        action: 'reject',
        replacement: '[filtered]',
        inherit: true,
        sortOrder: 0,
        isActive: true,
        isForceUse: false,
        isSystem: false,
        isInherited: false,
        isDisabledHere: false,
        canDisable: false,
        createdAt: '2026-04-13T12:00:00.000Z',
        updatedAt: '2026-04-13T12:05:00.000Z',
        version: 2,
      },
    ],
    meta: {
      pagination: {
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      },
    },
  },
};

export const EXTERNAL_BLOCKLIST_SCOPE_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'array',
    items: EXTERNAL_BLOCKLIST_ITEM_SCHEMA,
  },
  [
    {
      id: '550e8400-e29b-41d4-a716-446655440700',
      ownerType: 'tenant',
      ownerId: null,
      pattern: 'discord.gg/',
      patternType: 'url_regex',
      name: EXTERNAL_BLOCKLIST_NAME_EXAMPLE,
      description: 'Reject external Discord invite links',
      category: 'spam',
      severity: 'high',
      action: 'reject',
      replacement: '[filtered]',
      inherit: true,
      sortOrder: 0,
      isActive: true,
      isForceUse: false,
      isSystem: false,
      isInherited: true,
      isDisabledHere: false,
      canDisable: true,
      createdAt: '2026-04-13T12:00:00.000Z',
      updatedAt: '2026-04-13T12:05:00.000Z',
      version: 2,
    },
  ]
);

export const EXTERNAL_BLOCKLIST_ITEM_ENVELOPE_SCHEMA = createSuccessEnvelopeSchema(
  EXTERNAL_BLOCKLIST_ITEM_SCHEMA,
  {
    id: '550e8400-e29b-41d4-a716-446655440700',
    ownerType: 'tenant',
    ownerId: null,
    pattern: 'discord.gg/',
    patternType: 'url_regex',
    name: EXTERNAL_BLOCKLIST_NAME_EXAMPLE,
    description: 'Reject external Discord invite links',
    category: 'spam',
    severity: 'high',
    action: 'reject',
    replacement: '[filtered]',
    inherit: true,
    sortOrder: 0,
    isActive: true,
    isForceUse: false,
    isSystem: false,
    isInherited: false,
    isDisabledHere: false,
    canDisable: false,
    createdAt: '2026-04-13T12:00:00.000Z',
    updatedAt: '2026-04-13T12:05:00.000Z',
    version: 2,
  }
);

export const EXTERNAL_BLOCKLIST_DELETE_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: 'Pattern deleted' },
  },
  required: ['success', 'message'],
  example: {
    success: true,
    message: 'Pattern deleted',
  },
};

export const EXTERNAL_BLOCKLIST_DISABLE_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440700' },
      disabled: { type: 'boolean', example: true },
    },
    required: ['id', 'disabled'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440700',
    disabled: true,
  }
);

export const EXTERNAL_BLOCKLIST_ENABLE_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440700' },
      enabled: { type: 'boolean', example: true },
    },
    required: ['id', 'enabled'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440700',
    enabled: true,
  }
);

export const EXTERNAL_BLOCKLIST_BATCH_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      updated: { type: 'integer', example: 3 },
    },
    required: ['updated'],
  },
  {
    updated: 3,
  }
);

export const PUBLIC_MARSHMALLOW_CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    talent: {
      type: 'object',
      properties: {
        displayName: { type: 'string', example: 'Aki Rosenthal' },
        avatarUrl: {
          type: 'string',
          nullable: true,
          example: 'https://cdn.example.com/avatars/aki.png',
        },
      },
      required: ['displayName', 'avatarUrl'],
    },
    title: { type: 'string', nullable: true, example: 'Aki Mailbox' },
    welcomeText: { type: 'string', nullable: true, example: 'Leave your message here.' },
    placeholderText: { type: 'string', nullable: true, example: 'Write your message...' },
    allowAnonymous: { type: 'boolean', example: true },
    captchaMode: { type: 'string', example: 'auto' },
    turnstile: TURNSTILE_CONFIG_STATUS_SCHEMA,
    maxMessageLength: { type: 'integer', example: 500 },
    minMessageLength: { type: 'integer', example: 1 },
    reactionsEnabled: { type: 'boolean', example: true },
    allowedReactions: {
      type: 'array',
      items: { type: 'string' },
      example: ['heart', 'star', 'fire'],
    },
    theme: {
      type: 'object',
      additionalProperties: true,
      example: {
        accentColor: '#ff6b6b',
        backgroundColor: '#fff7f7',
      },
    },
    terms: createLocalizedTextSchema({
      en: 'Be respectful.',
      zh_HANS: '请保持礼貌。',
      zh_HANT: '請保持禮貌。',
      ja: '礼儀を守ってください。',
      ko: 'Be respectful.',
      fr: 'Be respectful.',
    }),
    privacy: createLocalizedTextSchema({
      en: 'We only keep moderation metadata.',
      zh_HANS: '我们仅保存审核所需元数据。',
      zh_HANT: '我們僅保存審核所需中繼資料。',
      ja: '審査に必要なメタデータのみ保存します。',
      ko: 'We only keep moderation metadata.',
      fr: 'We only keep moderation metadata.',
    }),
  },
  required: [
    'talent',
    'title',
    'welcomeText',
    'placeholderText',
    'allowAnonymous',
    'captchaMode',
    'turnstile',
    'maxMessageLength',
    'minMessageLength',
    'reactionsEnabled',
    'allowedReactions',
    'theme',
    'terms',
    'privacy',
  ],
  example: {
    talent: {
      displayName: 'Aki Rosenthal',
      avatarUrl: 'https://cdn.example.com/avatars/aki.png',
    },
    title: 'Aki Mailbox',
    welcomeText: 'Leave your message here.',
    placeholderText: 'Write your message...',
    allowAnonymous: true,
    captchaMode: 'auto',
    turnstile: {
      siteKeyConfigured: true,
      secretKeyConfigured: true,
      ready: true,
    },
    maxMessageLength: 500,
    minMessageLength: 1,
    reactionsEnabled: true,
    allowedReactions: ['heart', 'star', 'fire'],
    theme: {
      accentColor: '#ff6b6b',
      backgroundColor: '#fff7f7',
    },
    terms: {
      en: 'Be respectful.',
      zh_HANS: '请保持礼貌。',
      zh_HANT: '請保持禮貌。',
      ja: '礼儀を守ってください。',
      ko: 'Be respectful.',
      fr: 'Be respectful.',
    },
    privacy: {
      en: 'We only keep moderation metadata.',
      zh_HANS: '我们仅保存审核所需元数据。',
      zh_HANT: '我們僅保存審核所需中繼資料。',
      ja: '審査に必要なメタデータのみ保存します。',
      ko: 'We only keep moderation metadata.',
      fr: 'We only keep moderation metadata.',
    },
  },
};

const PUBLIC_MESSAGE_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440020' },
    content: { type: 'string', example: 'Happy birthday, Aki!' },
    senderName: { type: 'string', nullable: true, example: 'Aki Fan' },
    isAnonymous: { type: 'boolean', example: false },
    isRead: { type: 'boolean', example: false },
    replyContent: { type: 'string', nullable: true, example: 'Thank you!' },
    repliedAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-04-13T12:10:00.000Z',
    },
    repliedBy: {
      type: 'object',
      nullable: true,
      properties: {
        displayName: { type: 'string', example: 'Aki Rosenthal' },
        avatarUrl: {
          type: 'string',
          nullable: true,
          example: 'https://cdn.example.com/avatars/aki.png',
        },
      },
      required: ['displayName', 'avatarUrl'],
    },
    reactionCounts: {
      type: 'object',
      additionalProperties: { type: 'integer' },
      example: { heart: 12, fire: 4 },
    },
    userReactions: {
      type: 'array',
      items: { type: 'string' },
      example: ['heart'],
    },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T12:00:00.000Z' },
    imageUrl: { type: 'string', nullable: true, example: null },
    imageUrls: {
      type: 'array',
      items: { type: 'string' },
      example: [],
    },
  },
  required: [
    'id',
    'content',
    'isAnonymous',
    'isRead',
    'replyContent',
    'repliedAt',
    'repliedBy',
    'reactionCounts',
    'userReactions',
    'createdAt',
    'imageUrl',
    'imageUrls',
  ],
};

export const PUBLIC_MARSHMALLOW_MESSAGES_SCHEMA = {
  type: 'object',
  properties: {
    messages: {
      type: 'array',
      items: PUBLIC_MESSAGE_ITEM_SCHEMA,
    },
    cursor: { type: 'string', nullable: true, example: '2026-04-13T12:00:00.000Z' },
    hasMore: { type: 'boolean', example: false },
  },
  required: ['messages', 'cursor', 'hasMore'],
  example: {
    messages: [
      {
        id: '550e8400-e29b-41d4-a716-446655440020',
        content: 'Happy birthday, Aki!',
        senderName: 'Aki Fan',
        isAnonymous: false,
        isRead: false,
        replyContent: 'Thank you!',
        repliedAt: '2026-04-13T12:10:00.000Z',
        repliedBy: {
          displayName: 'Aki Rosenthal',
          avatarUrl: 'https://cdn.example.com/avatars/aki.png',
        },
        reactionCounts: { heart: 12, fire: 4 },
        userReactions: ['heart'],
        createdAt: '2026-04-13T12:00:00.000Z',
        imageUrl: null,
        imageUrls: [],
      },
    ],
    cursor: '2026-04-13T12:00:00.000Z',
    hasMore: false,
  },
};

export const PUBLIC_MARSHMALLOW_SUBMIT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440020' },
    status: { type: 'string', example: 'pending' },
    message: { type: 'string', example: 'Thanks for your message!' },
  },
  required: ['id', 'status', 'message'],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440020',
    status: 'pending',
    message: 'Thanks for your message!',
  },
};

export const PUBLIC_MARSHMALLOW_PREVIEW_IMAGE_SCHEMA = {
  type: 'object',
  properties: {
    images: {
      type: 'array',
      items: { type: 'string' },
      example: ['https://i0.hdslb.com/bfs/new_dyn/example.webp'],
    },
    error: { type: 'string', nullable: true, example: null },
  },
  required: ['images'],
  example: {
    images: ['https://i0.hdslb.com/bfs/new_dyn/example.webp'],
    error: null,
  },
};

export const PUBLIC_MARSHMALLOW_REACTION_SCHEMA = {
  type: 'object',
  properties: {
    added: { type: 'boolean', example: true },
    counts: {
      type: 'object',
      additionalProperties: { type: 'integer' },
      example: { heart: 13, fire: 4 },
    },
  },
  required: ['added', 'counts'],
  example: {
    added: true,
    counts: { heart: 13, fire: 4 },
  },
};

export const PUBLIC_MARSHMALLOW_MARK_READ_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    isRead: { type: 'boolean', example: true },
  },
  required: ['success', 'isRead'],
  example: {
    success: true,
    isRead: true,
  },
};

export const PUBLIC_MARSHMALLOW_VALIDATE_SSO_SCHEMA = {
  type: 'object',
  properties: {
    valid: { type: 'boolean', example: true },
    user: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
        displayName: { type: 'string', example: 'Aki Rosenthal' },
        email: { type: 'string', example: 'aki@example.com' },
        talentId: {
          type: 'string',
          format: 'uuid',
          example: '550e8400-e29b-41d4-a716-446655440001',
        },
      },
      required: ['id', 'displayName', 'email', 'talentId'],
    },
  },
  required: ['valid', 'user'],
  example: {
    valid: true,
    user: {
      id: '550e8400-e29b-41d4-a716-446655440100',
      displayName: 'Aki Rosenthal',
      email: 'aki@example.com',
      talentId: '550e8400-e29b-41d4-a716-446655440001',
    },
  },
};

export const PUBLIC_MARSHMALLOW_REPLY_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    replyContent: { type: 'string', example: 'Thank you for your message!' },
    repliedAt: { type: 'string', format: 'date-time', example: '2026-04-13T12:20:00.000Z' },
    repliedBy: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
        displayName: { type: 'string', example: 'Aki Rosenthal' },
      },
      required: ['id', 'displayName'],
    },
  },
  required: ['success', 'replyContent', 'repliedAt', 'repliedBy'],
  example: {
    success: true,
    replyContent: 'Thank you for your message!',
    repliedAt: '2026-04-13T12:20:00.000Z',
    repliedBy: {
      id: '550e8400-e29b-41d4-a716-446655440100',
      displayName: 'Aki Rosenthal',
    },
  },
};

export const MARSHMALLOW_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.VALIDATION_FAILED,
  'Marshmallow request is invalid'
);

export const MARSHMALLOW_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required'
);

export const MARSHMALLOW_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Access denied'
);

export const MARSHMALLOW_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Marshmallow resource not found'
);

export const MARSHMALLOW_CONFLICT_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_CONFLICT,
  'Current resource state conflicts with this request'
);

export const MARSHMALLOW_VERSION_CONFLICT_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_VERSION_MISMATCH,
  'Data has been modified by another user'
);

export const MARSHMALLOW_ALREADY_EXISTS_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_ALREADY_EXISTS,
  'Resource already exists'
);

export const PUBLIC_MARSHMALLOW_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.VALIDATION_FAILED,
  'Public marshmallow request is invalid'
);

export const PUBLIC_MARSHMALLOW_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Public marshmallow action is not allowed'
);

export const PUBLIC_MARSHMALLOW_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Public marshmallow resource not found'
);

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ErrorCodes } from '@tcrn/shared';

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

const createSuccessEnvelopeSchema = (
  dataSchema: Record<string, unknown>,
  exampleData: unknown,
  metaSchema?: Record<string, unknown>,
  exampleMeta?: unknown,
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

const PAGINATION_SCHEMA = {
  type: 'object',
  properties: {
    page: { type: 'integer', example: 1 },
    pageSize: { type: 'integer', example: 20 },
    totalCount: { type: 'integer', example: 1 },
    totalPages: { type: 'integer', example: 1 },
    hasNext: { type: 'boolean', example: false },
    hasPrev: { type: 'boolean', example: false },
  },
  required: ['page', 'pageSize', 'totalCount', 'totalPages', 'hasNext', 'hasPrev'],
};

export const CUSTOMER_LIST_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
    profileType: { type: 'string', example: 'individual' },
    nickname: { type: 'string', example: 'Aki' },
    primaryLanguage: { type: 'string', nullable: true, example: 'ja' },
    status: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440120' },
        code: { type: 'string', example: 'active' },
        name: { type: 'string', example: 'Active' },
        color: { type: 'string', nullable: true, example: '#16a34a' },
      },
      required: ['id', 'code', 'name'],
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      example: ['VIP', 'Premium'],
    },
    isActive: { type: 'boolean', example: true },
    companyShortName: { type: 'string', nullable: true, example: null },
    originTalent: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440200' },
        displayName: { type: 'string', example: 'Main Talent' },
      },
      required: ['id', 'displayName'],
    },
    membershipSummary: {
      type: 'object',
      nullable: true,
      properties: {
        highestLevel: {
          type: 'object',
          properties: {
            platformCode: { type: 'string', example: 'youtube' },
            platformName: { type: 'string', example: 'YouTube' },
            levelCode: { type: 'string', example: 'GOLD' },
            levelName: { type: 'string', example: 'Gold' },
            color: { type: 'string', nullable: true, example: '#f59e0b' },
          },
          required: ['platformCode', 'platformName', 'levelCode', 'levelName'],
        },
        activeCount: { type: 'integer', example: 1 },
        totalCount: { type: 'integer', example: 2 },
      },
      required: ['highestLevel', 'activeCount', 'totalCount'],
    },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:30:00.000Z' },
  },
  required: ['id', 'profileType', 'nickname', 'tags', 'isActive', 'createdAt', 'updatedAt'],
};

export const CUSTOMER_LIST_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'array',
    items: CUSTOMER_LIST_ITEM_SCHEMA,
  },
  [
    {
      id: '550e8400-e29b-41d4-a716-446655440100',
      profileType: 'individual',
      nickname: 'Aki',
      primaryLanguage: 'ja',
      status: {
        id: '550e8400-e29b-41d4-a716-446655440120',
        code: 'active',
        name: 'Active',
        color: '#16a34a',
      },
      tags: ['VIP', 'Premium'],
      isActive: true,
      companyShortName: null,
      originTalent: {
        id: '550e8400-e29b-41d4-a716-446655440200',
        displayName: 'Main Talent',
      },
      membershipSummary: {
        highestLevel: {
          platformCode: 'youtube',
          platformName: 'YouTube',
          levelCode: 'GOLD',
          levelName: 'Gold',
          color: '#f59e0b',
        },
        activeCount: 1,
        totalCount: 2,
      },
      createdAt: '2026-04-13T10:00:00.000Z',
      updatedAt: '2026-04-13T10:30:00.000Z',
    },
  ],
  {
    type: 'object',
    properties: {
      pagination: PAGINATION_SCHEMA,
    },
    required: ['pagination'],
  },
  {
    pagination: {
      page: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  },
);

export const CUSTOMER_DETAIL_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
    profileType: { type: 'string', example: 'individual' },
    talentId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440200' },
    nickname: { type: 'string', example: 'Aki' },
    primaryLanguage: { type: 'string', nullable: true, example: 'ja' },
    status: CUSTOMER_LIST_ITEM_SCHEMA.properties.status,
    inactivationReason: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440130' },
        code: { type: 'string', example: 'user_request' },
        name: { type: 'string', example: 'User Request' },
      },
      required: ['id', 'code', 'name'],
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      example: ['VIP', 'Premium'],
    },
    source: { type: 'string', nullable: true, example: 'Twitter' },
    notes: { type: 'string', nullable: true, example: 'Important fan profile' },
    isActive: { type: 'boolean', example: true },
    inactivatedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
    profileStore: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440300' },
        code: { type: 'string', example: 'DEFAULT_STORE' },
        name: { type: 'string', example: 'Default Profile Store' },
      },
      required: ['id', 'code', 'name'],
    },
    originTalent: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440200' },
        code: { type: 'string', example: 'AKI_MAIN' },
        displayName: { type: 'string', example: 'Main Talent' },
      },
      required: ['id', 'code', 'displayName'],
    },
    lastModifiedTalent: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440200' },
        code: { type: 'string', example: 'AKI_MAIN' },
        displayName: { type: 'string', example: 'Main Talent' },
      },
      required: ['id', 'code', 'displayName'],
    },
    membershipSummary: CUSTOMER_LIST_ITEM_SCHEMA.properties.membershipSummary,
    platformIdentityCount: { type: 'integer', example: 2 },
    recentAccessHistory: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          talent: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440200' },
              displayName: { type: 'string', example: 'Main Talent' },
            },
            required: ['id', 'displayName'],
          },
          action: { type: 'string', example: 'pii_view' },
          operator: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440010' },
              username: { type: 'string', example: 'admin' },
            },
            required: ['id', 'username'],
          },
          occurredAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:40:00.000Z' },
        },
        required: ['talent', 'action', 'occurredAt'],
      },
    },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:30:00.000Z' },
    version: { type: 'integer', example: 2 },
    individual: {
      type: 'object',
      nullable: true,
      properties: {
        piiReadbackEnabled: { type: 'boolean', example: false },
      },
      required: ['piiReadbackEnabled'],
    },
    company: {
      type: 'object',
      nullable: true,
      properties: {
        companyLegalName: { type: 'string', example: 'Acme Corporation Ltd.' },
        companyShortName: { type: 'string', nullable: true, example: 'Acme' },
        registrationNumber: { type: 'string', nullable: true, example: '1234-5678' },
        vatId: { type: 'string', nullable: true, example: 'JP1234567890' },
        establishmentDate: { type: 'string', format: 'date-time', nullable: true, example: '2010-04-01T00:00:00.000Z' },
        website: { type: 'string', nullable: true, example: 'https://www.acme.com' },
        businessSegment: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440140' },
            code: { type: 'string', example: 'TECH' },
            name: { type: 'string', example: 'Technology' },
          },
          required: ['id', 'code', 'name'],
        },
      },
      required: ['companyLegalName'],
    },
  },
  required: [
    'id',
    'profileType',
    'talentId',
    'nickname',
    'tags',
    'isActive',
    'profileStore',
    'originTalent',
    'platformIdentityCount',
    'recentAccessHistory',
    'createdAt',
    'updatedAt',
    'version',
  ],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440100',
    profileType: 'individual',
    talentId: '550e8400-e29b-41d4-a716-446655440200',
    nickname: 'Aki',
    primaryLanguage: 'ja',
    status: {
      id: '550e8400-e29b-41d4-a716-446655440120',
      code: 'active',
      name: 'Active',
      color: '#16a34a',
    },
    inactivationReason: null,
    tags: ['VIP', 'Premium'],
    source: 'Twitter',
    notes: 'Important fan profile',
    isActive: true,
    inactivatedAt: null,
    profileStore: {
      id: '550e8400-e29b-41d4-a716-446655440300',
      code: 'DEFAULT_STORE',
      name: 'Default Profile Store',
    },
    originTalent: {
      id: '550e8400-e29b-41d4-a716-446655440200',
      code: 'AKI_MAIN',
      displayName: 'Main Talent',
    },
    lastModifiedTalent: {
      id: '550e8400-e29b-41d4-a716-446655440200',
      code: 'AKI_MAIN',
      displayName: 'Main Talent',
    },
    membershipSummary: {
      highestLevel: {
        platformCode: 'youtube',
        platformName: 'YouTube',
        levelCode: 'GOLD',
        levelName: 'Gold',
        color: '#f59e0b',
      },
      activeCount: 1,
      totalCount: 2,
    },
    platformIdentityCount: 2,
    recentAccessHistory: [
      {
        talent: { id: '550e8400-e29b-41d4-a716-446655440200', displayName: 'Main Talent' },
        action: 'pii_view',
        operator: { id: '550e8400-e29b-41d4-a716-446655440010', username: 'admin' },
        occurredAt: '2026-04-13T10:40:00.000Z',
      },
    ],
    createdAt: '2026-04-13T10:00:00.000Z',
    updatedAt: '2026-04-13T10:30:00.000Z',
    version: 2,
    individual: {
      piiReadbackEnabled: false,
    },
    company: null,
  },
};

export const CUSTOMER_INDIVIDUAL_CREATE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
    profileType: { type: 'string', example: 'individual' },
    nickname: { type: 'string', example: 'Aki' },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:00:00.000Z' },
  },
  required: ['id', 'profileType', 'nickname', 'createdAt'],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440100',
    profileType: 'individual',
    nickname: 'Aki',
    createdAt: '2026-04-13T10:00:00.000Z',
  },
};

export const CUSTOMER_COMPANY_CREATE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440101' },
    profileType: { type: 'string', example: 'company' },
    nickname: { type: 'string', example: 'Acme' },
    company: {
      type: 'object',
      properties: {
        companyLegalName: { type: 'string', example: 'Acme Corporation Ltd.' },
        companyShortName: { type: 'string', nullable: true, example: 'Acme' },
      },
      required: ['companyLegalName'],
    },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:05:00.000Z' },
  },
  required: ['id', 'profileType', 'nickname', 'company', 'createdAt'],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440101',
    profileType: 'company',
    nickname: 'Acme',
    company: {
      companyLegalName: 'Acme Corporation Ltd.',
      companyShortName: 'Acme',
    },
    createdAt: '2026-04-13T10:05:00.000Z',
  },
};

export const CUSTOMER_UPDATE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
    nickname: { type: 'string', example: 'Aki Fanclub' },
    version: { type: 'integer', example: 2 },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:30:00.000Z' },
  },
  required: ['id', 'nickname', 'version', 'updatedAt'],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440100',
    nickname: 'Aki Fanclub',
    version: 2,
    updatedAt: '2026-04-13T10:30:00.000Z',
  },
};

export const CUSTOMER_PII_PORTAL_SESSION_SCHEMA = {
  type: 'object',
  properties: {
    redirectUrl: { type: 'string', example: 'https://pii-platform.example.cn/portal/session/abc123' },
    expiresAt: { type: 'string', format: 'date-time', example: '2026-04-14T15:00:00.000Z' },
  },
  required: ['redirectUrl', 'expiresAt'],
  example: {
    redirectUrl: 'https://pii-platform.example.cn/portal/session/abc123',
    expiresAt: '2026-04-14T15:00:00.000Z',
  },
};

export const CUSTOMER_PII_UPDATE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
    message: { type: 'string', example: 'PII data synchronized to TCRN PII Platform' },
  },
  required: ['id', 'message'],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440100',
    message: 'PII data synchronized to TCRN PII Platform',
  },
};

export const CUSTOMER_ACTIVATION_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440100' },
    isActive: { type: 'boolean', example: true },
  },
  required: ['id', 'isActive'],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440100',
    isActive: true,
  },
};

export const CUSTOMER_BATCH_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    total: { type: 'integer', example: 2 },
    success: { type: 'integer', example: 2 },
    failed: { type: 'integer', example: 0 },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          customerId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440101' },
          error: { type: 'string', example: 'Membership level not found' },
        },
        required: ['customerId', 'error'],
      },
      example: [],
    },
  },
  required: ['total', 'success', 'failed', 'errors'],
  example: {
    total: 2,
    success: 2,
    failed: 0,
    errors: [],
  },
};

export const CUSTOMER_BATCH_QUEUED_SCHEMA = {
  type: 'object',
  properties: {
    jobId: { type: 'string', example: 'job_12345' },
    message: { type: 'string', example: 'Batch operation queued for 80 customers. Check job status for progress.' },
  },
  required: ['jobId', 'message'],
  example: {
    jobId: 'job_12345',
    message: 'Batch operation queued for 80 customers. Check job status for progress.',
  },
};

export const CUSTOMER_EXTERNAL_ID_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440400' },
    consumer: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440401' },
        code: { type: 'string', example: 'CRM' },
        name: { type: 'string', example: 'CRM Integration' },
      },
      required: ['id', 'code', 'name'],
    },
    externalId: { type: 'string', example: 'CRM-1001' },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:10:00.000Z' },
    createdBy: { type: 'string', nullable: true, example: '550e8400-e29b-41d4-a716-446655440010' },
  },
  required: ['id', 'consumer', 'externalId', 'createdAt'],
};

export const CUSTOMER_EXTERNAL_ID_LIST_SCHEMA = {
  type: 'array',
  items: CUSTOMER_EXTERNAL_ID_ITEM_SCHEMA,
  example: [
    {
      id: '550e8400-e29b-41d4-a716-446655440400',
      consumer: {
        id: '550e8400-e29b-41d4-a716-446655440401',
        code: 'CRM',
        name: 'CRM Integration',
      },
      externalId: 'CRM-1001',
      createdAt: '2026-04-13T10:10:00.000Z',
      createdBy: '550e8400-e29b-41d4-a716-446655440010',
    },
  ],
};

export const CUSTOMER_EXTERNAL_ID_DELETE_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string', example: 'External ID deleted' },
  },
  required: ['message'],
  example: {
    message: 'External ID deleted',
  },
};

export const MEMBERSHIP_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440500' },
    platform: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'youtube' },
        name: { type: 'string', example: 'YouTube' },
      },
      required: ['code', 'name'],
    },
    membershipClass: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'FANCLUB' },
        name: { type: 'string', example: 'Fanclub' },
      },
      required: ['code', 'name'],
    },
    membershipType: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'PAID' },
        name: { type: 'string', example: 'Paid' },
      },
      required: ['code', 'name'],
    },
    membershipLevel: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'GOLD' },
        name: { type: 'string', example: 'Gold' },
        rank: { type: 'integer', example: 2 },
        color: { type: 'string', nullable: true, example: '#f59e0b' },
        badgeUrl: { type: 'string', nullable: true, example: 'https://cdn.tcrn.app/badges/gold.png' },
      },
      required: ['code', 'name', 'rank'],
    },
    validFrom: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00.000Z' },
    validTo: { type: 'string', format: 'date-time', nullable: true, example: '2026-12-31T23:59:59.000Z' },
    autoRenew: { type: 'boolean', example: true },
    isExpired: { type: 'boolean', example: false },
    note: { type: 'string', nullable: true, example: 'Primary supporter membership' },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:15:00.000Z' },
  },
  required: [
    'id',
    'platform',
    'membershipClass',
    'membershipType',
    'membershipLevel',
    'validFrom',
    'autoRenew',
    'isExpired',
    'createdAt',
  ],
};

export const MEMBERSHIP_LIST_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: MEMBERSHIP_ITEM_SCHEMA,
    },
    meta: {
      type: 'object',
      properties: {
        pagination: PAGINATION_SCHEMA,
        summary: {
          type: 'object',
          properties: {
            activeCount: { type: 'integer', example: 1 },
            expiredCount: { type: 'integer', example: 0 },
            totalCount: { type: 'integer', example: 1 },
          },
          required: ['activeCount', 'expiredCount', 'totalCount'],
        },
      },
      required: ['pagination', 'summary'],
    },
  },
  required: ['items', 'meta'],
  example: {
    items: [
      {
        id: '550e8400-e29b-41d4-a716-446655440500',
        platform: { code: 'youtube', name: 'YouTube' },
        membershipClass: { code: 'FANCLUB', name: 'Fanclub' },
        membershipType: { code: 'PAID', name: 'Paid' },
        membershipLevel: {
          code: 'GOLD',
          name: 'Gold',
          rank: 2,
          color: '#f59e0b',
          badgeUrl: 'https://cdn.tcrn.app/badges/gold.png',
        },
        validFrom: '2026-01-01T00:00:00.000Z',
        validTo: '2026-12-31T23:59:59.000Z',
        autoRenew: true,
        isExpired: false,
        note: 'Primary supporter membership',
        createdAt: '2026-04-13T10:15:00.000Z',
      },
    ],
    meta: {
      pagination: {
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
      summary: {
        activeCount: 1,
        expiredCount: 0,
        totalCount: 1,
      },
    },
  },
};

export const MEMBERSHIP_CREATE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440500' },
    platform: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'youtube' },
        name: { type: 'string', example: 'YouTube' },
      },
      required: ['code', 'name'],
    },
    membershipLevel: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'GOLD' },
        name: { type: 'string', example: 'Gold' },
      },
      required: ['code', 'name'],
    },
    validFrom: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00.000Z' },
    validTo: { type: 'string', format: 'date-time', nullable: true, example: '2026-12-31T23:59:59.000Z' },
    autoRenew: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:15:00.000Z' },
  },
  required: ['id', 'platform', 'membershipLevel', 'validFrom', 'autoRenew', 'createdAt'],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440500',
    platform: { code: 'youtube', name: 'YouTube' },
    membershipLevel: { code: 'GOLD', name: 'Gold' },
    validFrom: '2026-01-01T00:00:00.000Z',
    validTo: '2026-12-31T23:59:59.000Z',
    autoRenew: true,
    createdAt: '2026-04-13T10:15:00.000Z',
  },
};

export const PLATFORM_IDENTITY_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440600' },
    platform: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440601' },
        code: { type: 'string', example: 'youtube' },
        name: { type: 'string', example: 'YouTube' },
        iconUrl: { type: 'string', nullable: true, example: 'https://cdn.tcrn.app/platforms/youtube.svg' },
        color: { type: 'string', nullable: true, example: '#ff0000' },
      },
      required: ['id', 'code', 'name'],
    },
    platformUid: { type: 'string', example: 'UC123456' },
    platformNickname: { type: 'string', nullable: true, example: 'AkiChannel' },
    platformAvatarUrl: { type: 'string', nullable: true, example: 'https://cdn.tcrn.app/avatars/aki.jpg' },
    profileUrl: { type: 'string', nullable: true, example: 'https://youtube.com/@AkiChannel' },
    isVerified: { type: 'boolean', example: true },
    isCurrent: { type: 'boolean', example: true },
    capturedAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:20:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:25:00.000Z' },
  },
  required: ['id', 'platform', 'platformUid', 'isVerified', 'isCurrent', 'capturedAt', 'updatedAt'],
};

export const PLATFORM_IDENTITY_LIST_SCHEMA = {
  type: 'array',
  items: PLATFORM_IDENTITY_ITEM_SCHEMA,
  example: [
    {
      id: '550e8400-e29b-41d4-a716-446655440600',
      platform: {
        id: '550e8400-e29b-41d4-a716-446655440601',
        code: 'youtube',
        name: 'YouTube',
        iconUrl: 'https://cdn.tcrn.app/platforms/youtube.svg',
        color: '#ff0000',
      },
      platformUid: 'UC123456',
      platformNickname: 'AkiChannel',
      platformAvatarUrl: 'https://cdn.tcrn.app/avatars/aki.jpg',
      profileUrl: 'https://youtube.com/@AkiChannel',
      isVerified: true,
      isCurrent: true,
      capturedAt: '2026-04-13T10:20:00.000Z',
      updatedAt: '2026-04-13T10:25:00.000Z',
    },
  ],
};

export const PLATFORM_IDENTITY_CREATE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440600' },
    platform: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440601' },
        code: { type: 'string', example: 'youtube' },
        name: { type: 'string', example: 'YouTube' },
      },
      required: ['id', 'code', 'name'],
    },
    platformUid: { type: 'string', example: 'UC123456' },
    platformNickname: { type: 'string', nullable: true, example: 'AkiChannel' },
    profileUrl: { type: 'string', nullable: true, example: 'https://youtube.com/@AkiChannel' },
    isVerified: { type: 'boolean', example: true },
    isCurrent: { type: 'boolean', example: true },
    capturedAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:20:00.000Z' },
  },
  required: ['id', 'platform', 'platformUid', 'isVerified', 'isCurrent', 'capturedAt'],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440600',
    platform: {
      id: '550e8400-e29b-41d4-a716-446655440601',
      code: 'youtube',
      name: 'YouTube',
    },
    platformUid: 'UC123456',
    platformNickname: 'AkiChannel',
    profileUrl: 'https://youtube.com/@AkiChannel',
    isVerified: true,
    isCurrent: true,
    capturedAt: '2026-04-13T10:20:00.000Z',
  },
};

export const PLATFORM_IDENTITY_UPDATE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440600' },
    platformUid: { type: 'string', example: 'UC123456' },
    platformNickname: { type: 'string', nullable: true, example: 'AkiOfficial' },
    profileUrl: { type: 'string', nullable: true, example: 'https://youtube.com/@AkiOfficial' },
    isVerified: { type: 'boolean', example: true },
    isCurrent: { type: 'boolean', example: true },
    capturedAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:35:00.000Z' },
  },
  required: ['id', 'platformUid', 'isVerified', 'isCurrent', 'capturedAt'],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440600',
    platformUid: 'UC123456',
    platformNickname: 'AkiOfficial',
    profileUrl: 'https://youtube.com/@AkiOfficial',
    isVerified: true,
    isCurrent: true,
    capturedAt: '2026-04-13T10:35:00.000Z',
  },
};

export const PLATFORM_IDENTITY_HISTORY_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440650' },
          identityId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440600' },
          platform: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'youtube' },
              name: { type: 'string', example: 'YouTube' },
            },
            required: ['code', 'name'],
          },
          changeType: { type: 'string', example: 'nickname_changed' },
          oldValue: { type: 'string', nullable: true, example: 'AkiChannel' },
          newValue: { type: 'string', nullable: true, example: 'AkiOfficial' },
          capturedAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:35:00.000Z' },
          capturedBy: { type: 'string', nullable: true, example: '550e8400-e29b-41d4-a716-446655440010' },
        },
        required: ['id', 'identityId', 'platform', 'changeType', 'capturedAt'],
      },
    },
    meta: {
      type: 'object',
      properties: {
        pagination: PAGINATION_SCHEMA,
      },
      required: ['pagination'],
    },
  },
  required: ['items', 'meta'],
  example: {
    items: [
      {
        id: '550e8400-e29b-41d4-a716-446655440650',
        identityId: '550e8400-e29b-41d4-a716-446655440600',
        platform: { code: 'youtube', name: 'YouTube' },
        changeType: 'nickname_changed',
        oldValue: 'AkiChannel',
        newValue: 'AkiOfficial',
        capturedAt: '2026-04-13T10:35:00.000Z',
        capturedBy: '550e8400-e29b-41d4-a716-446655440010',
      },
    ],
    meta: {
      pagination: {
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
  },
};

export const CUSTOMER_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.VALIDATION_FAILED,
  'Request validation failed',
);

export const CUSTOMER_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

export const CUSTOMER_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Access denied',
);

export const CUSTOMER_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Customer not found',
);

export const CUSTOMER_CONFLICT_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_VERSION_MISMATCH,
  'Data has been modified by another user',
);

export const CUSTOMER_ALREADY_EXISTS_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_ALREADY_EXISTS,
  'Resource already exists',
);

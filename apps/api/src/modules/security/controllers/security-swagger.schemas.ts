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

const BLOCKLIST_ENTRY_EXAMPLE = {
  id: '550e8400-e29b-41d4-a716-446655440700',
  ownerType: 'tenant',
  ownerId: null,
  pattern: 'badword',
  patternType: 'keyword',
  nameEn: 'Profanity Filter',
  nameZh: '脏话过滤',
  nameJa: '不適切語フィルター',
  description: 'Masks prohibited words in public messages',
  category: 'profanity',
  severity: 'medium',
  action: 'mask',
  replacement: '***',
  scope: ['marshmallow'],
  inherit: true,
  sortOrder: 0,
  isActive: true,
  isForceUse: false,
  isSystem: false,
  matchCount: 12,
  lastMatchedAt: '2026-04-13T10:20:00.000Z',
  createdAt: '2026-04-13T10:00:00.000Z',
  createdBy: '550e8400-e29b-41d4-a716-446655440010',
  version: 2,
  isInherited: false,
  isDisabledHere: false,
  canDisable: false,
};

const BLOCKLIST_ENTRY_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: BLOCKLIST_ENTRY_EXAMPLE.id },
    ownerType: { type: 'string', example: BLOCKLIST_ENTRY_EXAMPLE.ownerType },
    ownerId: { type: 'string', format: 'uuid', nullable: true, example: BLOCKLIST_ENTRY_EXAMPLE.ownerId },
    pattern: { type: 'string', example: BLOCKLIST_ENTRY_EXAMPLE.pattern },
    patternType: { type: 'string', example: BLOCKLIST_ENTRY_EXAMPLE.patternType },
    nameEn: { type: 'string', example: BLOCKLIST_ENTRY_EXAMPLE.nameEn },
    nameZh: { type: 'string', nullable: true, example: BLOCKLIST_ENTRY_EXAMPLE.nameZh },
    nameJa: { type: 'string', nullable: true, example: BLOCKLIST_ENTRY_EXAMPLE.nameJa },
    description: { type: 'string', nullable: true, example: BLOCKLIST_ENTRY_EXAMPLE.description },
    category: { type: 'string', nullable: true, example: BLOCKLIST_ENTRY_EXAMPLE.category },
    severity: { type: 'string', example: BLOCKLIST_ENTRY_EXAMPLE.severity },
    action: { type: 'string', example: BLOCKLIST_ENTRY_EXAMPLE.action },
    replacement: { type: 'string', example: BLOCKLIST_ENTRY_EXAMPLE.replacement },
    scope: { type: 'array', items: { type: 'string' }, example: BLOCKLIST_ENTRY_EXAMPLE.scope },
    inherit: { type: 'boolean', example: BLOCKLIST_ENTRY_EXAMPLE.inherit },
    sortOrder: { type: 'integer', example: BLOCKLIST_ENTRY_EXAMPLE.sortOrder },
    isActive: { type: 'boolean', example: BLOCKLIST_ENTRY_EXAMPLE.isActive },
    isForceUse: { type: 'boolean', example: BLOCKLIST_ENTRY_EXAMPLE.isForceUse },
    isSystem: { type: 'boolean', example: BLOCKLIST_ENTRY_EXAMPLE.isSystem },
    matchCount: { type: 'integer', example: BLOCKLIST_ENTRY_EXAMPLE.matchCount },
    lastMatchedAt: { type: 'string', format: 'date-time', nullable: true, example: BLOCKLIST_ENTRY_EXAMPLE.lastMatchedAt },
    createdAt: { type: 'string', format: 'date-time', example: BLOCKLIST_ENTRY_EXAMPLE.createdAt },
    createdBy: { type: 'string', nullable: true, example: BLOCKLIST_ENTRY_EXAMPLE.createdBy },
    updatedAt: { type: 'string', format: 'date-time', nullable: true, example: '2026-04-13T10:10:00.000Z' },
    version: { type: 'integer', example: BLOCKLIST_ENTRY_EXAMPLE.version },
    isInherited: { type: 'boolean', example: BLOCKLIST_ENTRY_EXAMPLE.isInherited },
    isDisabledHere: { type: 'boolean', example: BLOCKLIST_ENTRY_EXAMPLE.isDisabledHere },
    canDisable: { type: 'boolean', example: BLOCKLIST_ENTRY_EXAMPLE.canDisable },
  },
  required: [
    'id',
    'ownerType',
    'pattern',
    'patternType',
    'nameEn',
    'severity',
    'action',
    'replacement',
    'scope',
    'inherit',
    'sortOrder',
    'isActive',
    'isForceUse',
    'isSystem',
    'matchCount',
    'createdAt',
    'version',
  ],
};

const BLOCKLIST_LIST_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: BLOCKLIST_ENTRY_SCHEMA,
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 1 },
          },
          required: ['total'],
        },
      },
      required: ['items', 'meta'],
    },
  },
  required: ['success', 'data'],
  example: {
    success: true,
    data: {
      items: [BLOCKLIST_ENTRY_EXAMPLE],
      meta: {
        total: 1,
      },
    },
  },
};

const BLOCKLIST_TEST_SCHEMA = {
  type: 'object',
  properties: {
    matched: { type: 'boolean', example: true },
    positions: {
      type: 'array',
      items: { type: 'integer' },
      example: [6],
    },
    highlightedContent: { type: 'string', example: 'Hello <mark>bad</mark> World' },
  },
  required: ['matched', 'positions', 'highlightedContent'],
  example: {
    matched: true,
    positions: [6],
    highlightedContent: 'Hello <mark>bad</mark> World',
  },
};

const BLOCKLIST_MUTATION_RESULT_SCHEMA = (
  key: 'deleted' | 'disabled' | 'enabled',
  value: boolean,
) => ({
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440700' },
    [key]: { type: 'boolean', example: value },
  },
  required: ['id', key],
  example: {
    id: '550e8400-e29b-41d4-a716-446655440700',
    [key]: value,
  },
});

const IP_RULE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440800' },
    ruleType: { type: 'string', example: 'blacklist' },
    ipPattern: { type: 'string', example: '203.0.113.0/24' },
    scope: { type: 'string', example: 'public' },
    reason: { type: 'string', nullable: true, example: 'Repeated abuse' },
    source: { type: 'string', nullable: true, example: 'manual' },
    expiresAt: { type: 'string', format: 'date-time', nullable: true, example: null },
    hitCount: { type: 'integer', example: 12 },
    lastHitAt: { type: 'string', format: 'date-time', nullable: true, example: '2026-04-13T10:30:00.000Z' },
    isActive: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:00:00.000Z' },
    createdBy: { type: 'string', nullable: true, example: '550e8400-e29b-41d4-a716-446655440010' },
  },
  required: ['id', 'ruleType', 'ipPattern', 'scope', 'hitCount', 'isActive', 'createdAt'],
};

const IP_RULE_LIST_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: IP_RULE_SCHEMA,
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 1 },
          },
          required: ['total'],
        },
      },
      required: ['items', 'meta'],
    },
  },
  required: ['success', 'data'],
  example: {
    success: true,
    data: {
      items: [
        {
          id: '550e8400-e29b-41d4-a716-446655440800',
          ruleType: 'blacklist',
          ipPattern: '203.0.113.0/24',
          scope: 'public',
          reason: 'Repeated abuse',
          source: 'manual',
          expiresAt: null,
          hitCount: 12,
          lastHitAt: '2026-04-13T10:30:00.000Z',
          isActive: true,
          createdAt: '2026-04-13T10:00:00.000Z',
          createdBy: '550e8400-e29b-41d4-a716-446655440010',
        },
      ],
      meta: {
        total: 1,
      },
    },
  },
};

const CHECK_IP_ACCESS_SCHEMA = {
  type: 'object',
  properties: {
    allowed: { type: 'boolean', example: false },
    reason: { type: 'string', nullable: true, example: 'Repeated abuse' },
    matchedRule: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440800' },
        ruleType: { type: 'string', example: 'blacklist' },
        ipPattern: { type: 'string', example: '203.0.113.0/24' },
        scope: { type: 'string', example: 'public' },
        reason: { type: 'string', nullable: true, example: 'Repeated abuse' },
      },
      required: ['id', 'ruleType', 'ipPattern', 'scope'],
    },
  },
  required: ['allowed'],
  example: {
    allowed: false,
    reason: 'Repeated abuse',
    matchedRule: {
      id: '550e8400-e29b-41d4-a716-446655440800',
      ruleType: 'blacklist',
      ipPattern: '203.0.113.0/24',
      scope: 'public',
      reason: 'Repeated abuse',
    },
  },
};

export const SECURITY_FINGERPRINT_SCHEMA = {
  type: 'object',
  properties: {
    fingerprint: { type: 'string', example: 'b8b9c4d5e6f71234567890abcdef1234567890abcdef1234567890abcdef1234' },
    shortFingerprint: { type: 'string', example: 'b8b9c4d5e6f71234' },
    version: { type: 'string', example: 'v1' },
    generatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:35:00.000Z' },
  },
  required: ['fingerprint', 'shortFingerprint', 'version', 'generatedAt'],
  example: {
    fingerprint: 'b8b9c4d5e6f71234567890abcdef1234567890abcdef1234567890abcdef1234',
    shortFingerprint: 'b8b9c4d5e6f71234',
    version: 'v1',
    generatedAt: '2026-04-13T10:35:00.000Z',
  },
};

export const SECURITY_BLOCKLIST_LIST_SCHEMA = BLOCKLIST_LIST_SCHEMA;
export const SECURITY_BLOCKLIST_ITEM_SCHEMA = {
  ...BLOCKLIST_ENTRY_SCHEMA,
  example: BLOCKLIST_ENTRY_EXAMPLE,
};
export const SECURITY_BLOCKLIST_TEST_SCHEMA = BLOCKLIST_TEST_SCHEMA;
export const SECURITY_BLOCKLIST_DELETE_SCHEMA = BLOCKLIST_MUTATION_RESULT_SCHEMA('deleted', true);
export const SECURITY_BLOCKLIST_DISABLE_SCHEMA = BLOCKLIST_MUTATION_RESULT_SCHEMA('disabled', true);
export const SECURITY_BLOCKLIST_ENABLE_SCHEMA = BLOCKLIST_MUTATION_RESULT_SCHEMA('enabled', true);
export const SECURITY_IP_RULE_LIST_SCHEMA = IP_RULE_LIST_SCHEMA;
export const SECURITY_IP_RULE_ITEM_SCHEMA = {
  ...IP_RULE_SCHEMA,
  example: {
    id: '550e8400-e29b-41d4-a716-446655440800',
    ruleType: 'blacklist',
    ipPattern: '203.0.113.0/24',
    scope: 'public',
    reason: 'Repeated abuse',
    createdAt: '2026-04-13T10:00:00.000Z',
  },
};
export const SECURITY_IP_CHECK_SCHEMA = CHECK_IP_ACCESS_SCHEMA;
export const SECURITY_IP_RULE_DELETE_SCHEMA = BLOCKLIST_MUTATION_RESULT_SCHEMA('deleted', true);

export const SECURITY_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.VALIDATION_FAILED,
  'Security request is invalid',
);
export const SECURITY_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);
export const SECURITY_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Access denied',
);
export const SECURITY_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Security resource not found',
);
export const SECURITY_CONFLICT_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_VERSION_MISMATCH,
  'Data has been modified by another user',
);
export const SECURITY_ALREADY_EXISTS_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_ALREADY_EXISTS,
  'Resource already exists',
);

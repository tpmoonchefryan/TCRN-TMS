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
    error: {
      code,
      message,
    },
  },
});

const createPaginatedCollectionSchema = (
  itemSchema: Record<string, unknown>,
  exampleItem: Record<string, unknown>,
) => ({
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: itemSchema,
    },
    total: { type: 'integer', example: 1 },
    page: { type: 'integer', example: 1 },
    pageSize: { type: 'integer', example: 20 },
    totalPages: { type: 'integer', example: 1 },
  },
  required: ['items', 'total', 'page', 'pageSize', 'totalPages'],
  example: {
    items: [exampleItem],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  },
});

const createArraySchema = (
  itemSchema: Record<string, unknown>,
  exampleItem: Record<string, unknown>,
) => ({
  type: 'array',
  items: itemSchema,
  example: [exampleItem],
});

const CHANGE_LOG_ENTRY_EXAMPLE = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  occurredAt: '2026-04-13T10:20:00.000Z',
  operatorId: '550e8400-e29b-41d4-a716-446655440010',
  operatorName: 'System Administrator',
  action: 'update',
  objectType: 'customer_profile',
  objectId: '550e8400-e29b-41d4-a716-446655440100',
  objectName: 'Aki',
  diff: {
    nickname: {
      old: 'Aki',
      new: 'Aki Fanclub',
    },
  },
  ipAddress: '203.0.113.10',
  userAgent: 'Mozilla/5.0',
  requestId: 'req_change_001',
};

const INTEGRATION_LOG_ENTRY_EXAMPLE = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  occurredAt: '2026-04-13T10:25:00.000Z',
  consumerId: '550e8400-e29b-41d4-a716-446655440011',
  consumerCode: 'CRM',
  direction: 'outbound',
  endpoint: 'https://crm.example.com/customers',
  method: 'POST',
  requestHeaders: {
    authorization: '***',
  },
  requestBody: {
    customerId: '550e8400-e29b-41d4-a716-446655440100',
  },
  responseStatus: 201,
  responseBody: {
    externalId: 'CRM-1001',
  },
  latencyMs: 220,
  errorMessage: null,
  traceId: 'trace_001',
};

const TECH_EVENT_LOG_ENTRY_EXAMPLE = {
  id: '550e8400-e29b-41d4-a716-446655440003',
  occurredAt: '2026-04-13T10:30:00.000Z',
  severity: 'info',
  eventType: 'permission_snapshot_refreshed',
  scope: 'permission',
  traceId: 'trace_001',
  spanId: 'span_001',
  source: 'api',
  message: 'Permission snapshot refreshed',
  payloadJson: {
    tenantId: '550e8400-e29b-41d4-a716-446655440000',
  },
  errorCode: null,
  errorStack: null,
};

export const CHANGE_LOG_ENTRY_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: CHANGE_LOG_ENTRY_EXAMPLE.id },
    occurredAt: { type: 'string', format: 'date-time', example: CHANGE_LOG_ENTRY_EXAMPLE.occurredAt },
    operatorId: { type: 'string', format: 'uuid', nullable: true, example: CHANGE_LOG_ENTRY_EXAMPLE.operatorId },
    operatorName: { type: 'string', nullable: true, example: CHANGE_LOG_ENTRY_EXAMPLE.operatorName },
    action: { type: 'string', example: CHANGE_LOG_ENTRY_EXAMPLE.action },
    objectType: { type: 'string', example: CHANGE_LOG_ENTRY_EXAMPLE.objectType },
    objectId: { type: 'string', format: 'uuid', example: CHANGE_LOG_ENTRY_EXAMPLE.objectId },
    objectName: { type: 'string', nullable: true, example: CHANGE_LOG_ENTRY_EXAMPLE.objectName },
    diff: { type: 'object', nullable: true, additionalProperties: true, example: CHANGE_LOG_ENTRY_EXAMPLE.diff },
    ipAddress: { type: 'string', nullable: true, example: CHANGE_LOG_ENTRY_EXAMPLE.ipAddress },
    userAgent: { type: 'string', nullable: true, example: CHANGE_LOG_ENTRY_EXAMPLE.userAgent },
    requestId: { type: 'string', nullable: true, example: CHANGE_LOG_ENTRY_EXAMPLE.requestId },
  },
  required: ['id', 'occurredAt', 'action', 'objectType', 'objectId'],
};

export const CHANGE_LOG_LIST_SCHEMA = createPaginatedCollectionSchema(
  CHANGE_LOG_ENTRY_SCHEMA,
  CHANGE_LOG_ENTRY_EXAMPLE,
);

export const INTEGRATION_LOG_ENTRY_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: INTEGRATION_LOG_ENTRY_EXAMPLE.id },
    occurredAt: { type: 'string', format: 'date-time', example: INTEGRATION_LOG_ENTRY_EXAMPLE.occurredAt },
    consumerId: { type: 'string', format: 'uuid', nullable: true, example: INTEGRATION_LOG_ENTRY_EXAMPLE.consumerId },
    consumerCode: { type: 'string', nullable: true, example: INTEGRATION_LOG_ENTRY_EXAMPLE.consumerCode },
    direction: { type: 'string', example: INTEGRATION_LOG_ENTRY_EXAMPLE.direction },
    endpoint: { type: 'string', example: INTEGRATION_LOG_ENTRY_EXAMPLE.endpoint },
    method: { type: 'string', example: INTEGRATION_LOG_ENTRY_EXAMPLE.method },
    requestHeaders: { type: 'object', nullable: true, additionalProperties: true, example: INTEGRATION_LOG_ENTRY_EXAMPLE.requestHeaders },
    requestBody: { type: 'object', nullable: true, additionalProperties: true, example: INTEGRATION_LOG_ENTRY_EXAMPLE.requestBody },
    responseStatus: { type: 'integer', nullable: true, example: INTEGRATION_LOG_ENTRY_EXAMPLE.responseStatus },
    responseBody: { type: 'object', nullable: true, additionalProperties: true, example: INTEGRATION_LOG_ENTRY_EXAMPLE.responseBody },
    latencyMs: { type: 'integer', nullable: true, example: INTEGRATION_LOG_ENTRY_EXAMPLE.latencyMs },
    errorMessage: { type: 'string', nullable: true, example: INTEGRATION_LOG_ENTRY_EXAMPLE.errorMessage },
    traceId: { type: 'string', nullable: true, example: INTEGRATION_LOG_ENTRY_EXAMPLE.traceId },
  },
  required: ['id', 'occurredAt', 'direction', 'endpoint', 'method'],
};

export const INTEGRATION_LOG_LIST_SCHEMA = createPaginatedCollectionSchema(
  INTEGRATION_LOG_ENTRY_SCHEMA,
  INTEGRATION_LOG_ENTRY_EXAMPLE,
);

export const INTEGRATION_LOG_TRACE_SCHEMA = createArraySchema(
  INTEGRATION_LOG_ENTRY_SCHEMA,
  INTEGRATION_LOG_ENTRY_EXAMPLE,
);

export const TECH_EVENT_LOG_ENTRY_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: TECH_EVENT_LOG_ENTRY_EXAMPLE.id },
    occurredAt: { type: 'string', format: 'date-time', example: TECH_EVENT_LOG_ENTRY_EXAMPLE.occurredAt },
    severity: { type: 'string', example: TECH_EVENT_LOG_ENTRY_EXAMPLE.severity },
    eventType: { type: 'string', example: TECH_EVENT_LOG_ENTRY_EXAMPLE.eventType },
    scope: { type: 'string', example: TECH_EVENT_LOG_ENTRY_EXAMPLE.scope },
    traceId: { type: 'string', nullable: true, example: TECH_EVENT_LOG_ENTRY_EXAMPLE.traceId },
    spanId: { type: 'string', nullable: true, example: TECH_EVENT_LOG_ENTRY_EXAMPLE.spanId },
    source: { type: 'string', nullable: true, example: TECH_EVENT_LOG_ENTRY_EXAMPLE.source },
    message: { type: 'string', nullable: true, example: TECH_EVENT_LOG_ENTRY_EXAMPLE.message },
    payloadJson: { type: 'object', nullable: true, additionalProperties: true, example: TECH_EVENT_LOG_ENTRY_EXAMPLE.payloadJson },
    errorCode: { type: 'string', nullable: true, example: TECH_EVENT_LOG_ENTRY_EXAMPLE.errorCode },
    errorStack: { type: 'string', nullable: true, example: TECH_EVENT_LOG_ENTRY_EXAMPLE.errorStack },
  },
  required: ['id', 'occurredAt', 'severity', 'eventType', 'scope'],
};

export const TECH_EVENT_LOG_LIST_SCHEMA = createPaginatedCollectionSchema(
  TECH_EVENT_LOG_ENTRY_SCHEMA,
  TECH_EVENT_LOG_ENTRY_EXAMPLE,
);

export const TECH_EVENT_TRACE_SCHEMA = createArraySchema(
  TECH_EVENT_LOG_ENTRY_SCHEMA,
  TECH_EVENT_LOG_ENTRY_EXAMPLE,
);

export const COMPLIANCE_REPORT_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    reportPeriod: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00.000Z' },
        endDate: { type: 'string', format: 'date-time', example: '2026-01-31T23:59:59.000Z' },
      },
      required: ['startDate', 'endDate'],
    },
    auditMetrics: {
      type: 'object',
      properties: {
        totalChangeLogEntries: { type: 'integer', example: 120 },
        totalTechEventEntries: { type: 'integer', example: 42 },
        totalIntegrationLogEntries: { type: 'integer', example: 86 },
      },
      required: ['totalChangeLogEntries', 'totalTechEventEntries', 'totalIntegrationLogEntries'],
    },
    securityMetrics: {
      type: 'object',
      properties: {
        authEvents: { type: 'integer', example: 0 },
        rateLimitEvents: { type: 'integer', example: 0 },
        blockedRequests: { type: 'integer', example: 0 },
      },
      required: ['authEvents', 'rateLimitEvents', 'blockedRequests'],
    },
    integrationMetrics: {
      type: 'object',
      properties: {
        totalApiCalls: { type: 'integer', example: 86 },
        successRate: { type: 'integer', example: 97 },
        avgLatencyMs: { type: 'integer', example: 180 },
      },
      required: ['totalApiCalls', 'successRate', 'avgLatencyMs'],
    },
    generatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T10:45:00.000Z' },
  },
  required: ['reportPeriod', 'auditMetrics', 'securityMetrics', 'integrationMetrics', 'generatedAt'],
  example: {
    reportPeriod: {
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-31T23:59:59.000Z',
    },
    auditMetrics: {
      totalChangeLogEntries: 120,
      totalTechEventEntries: 42,
      totalIntegrationLogEntries: 86,
    },
    securityMetrics: {
      authEvents: 0,
      rateLimitEvents: 0,
      blockedRequests: 0,
    },
    integrationMetrics: {
      totalApiCalls: 86,
      successRate: 97,
      avgLatencyMs: 180,
    },
    generatedAt: '2026-04-13T10:45:00.000Z',
  },
};

export const LOG_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

export const LOG_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Access denied',
);

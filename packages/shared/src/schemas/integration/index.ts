// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Integration Module Zod Schemas

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================
export const AdapterTypeSchema = z.enum(['oauth', 'api_key', 'webhook']);
export const IntegrationOwnerTypeSchema = z.enum(['tenant', 'subsidiary', 'talent']);
export const WebhookEventTypeSchema = z.enum([
  'customer.created', 'customer.updated', 'customer.deactivated',
  'membership.created', 'membership.expired', 'membership.renewed',
  'marshmallow.received', 'marshmallow.approved',
  'report.completed', 'report.failed',
  'import.completed', 'import.failed',
]);
export const IntegrationDirectionSchema = z.enum(['inbound', 'outbound']);

export type IntegrationAdapterType = z.infer<typeof AdapterTypeSchema>;
export type IntegrationOwnerType = z.infer<typeof IntegrationOwnerTypeSchema>;
export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

// ============================================================================
// Adapter Schemas
// ============================================================================
export const AdapterListQuerySchema = z.object({
  scopeType: IntegrationOwnerTypeSchema.optional(),
  scopeId: z.string().uuid().optional(),
  platformId: z.string().uuid().optional(),
  adapterType: AdapterTypeSchema.optional(),
  includeInherited: z.coerce.boolean().optional().default(true),
  includeDisabled: z.coerce.boolean().optional().default(false),
  ownerOnly: z.coerce.boolean().optional().default(false),
});

export const AdapterConfigItemSchema = z.object({
  configKey: z.string().max(64),
  configValue: z.string().max(2048),
});

export const CreateAdapterSchema = z.object({
  platformId: z.string().uuid(),
  code: z.string().regex(/^[A-Z0-9_]{3,32}$/, 'Code must be 3-32 uppercase alphanumeric with underscores'),
  nameEn: z.string().max(128),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  adapterType: AdapterTypeSchema,
  inherit: z.boolean().optional().default(true),
  ownerType: IntegrationOwnerTypeSchema.optional(),
  ownerId: z.string().uuid().optional(),
  configs: z.array(AdapterConfigItemSchema).optional(),
});

export const UpdateAdapterSchema = z.object({
  nameEn: z.string().max(128).optional(),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  inherit: z.boolean().optional(),
  version: z.number().int(),
});

export const UpdateAdapterConfigsSchema = z.object({
  configs: z.array(AdapterConfigItemSchema),
  adapterVersion: z.number().int(),
});

export const DisableAdapterSchema = z.object({
  scopeType: IntegrationOwnerTypeSchema,
  scopeId: z.string().uuid(),
});

export type AdapterListQueryInput = z.infer<typeof AdapterListQuerySchema>;
export type CreateAdapterInput = z.infer<typeof CreateAdapterSchema>;
export type UpdateAdapterInput = z.infer<typeof UpdateAdapterSchema>;

// ============================================================================
// Webhook Schemas
// ============================================================================
export const RetryPolicySchema = z.object({
  maxRetries: z.coerce.number().int().min(1).max(10).optional().default(3),
  backoffMs: z.coerce.number().int().min(100).max(60000).optional().default(1000),
});

export const CreateWebhookSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{3,32}$/),
  nameEn: z.string().max(128),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  url: z.string().url().max(512),
  secret: z.string().max(128).optional(),
  events: z.array(WebhookEventTypeSchema).min(1),
  headers: z.record(z.string(), z.string()).optional(),
  retryPolicy: RetryPolicySchema.optional(),
});

export const UpdateWebhookSchema = z.object({
  nameEn: z.string().max(128).optional(),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  url: z.string().url().max(512).optional(),
  secret: z.string().max(128).optional(),
  events: z.array(WebhookEventTypeSchema).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  retryPolicy: RetryPolicySchema.optional(),
  version: z.number().int(),
});

export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;

// ============================================================================
// Integration Log Schemas
// ============================================================================
export const IntegrationLogQuerySchema = z.object({
  consumerId: z.string().uuid().optional(),
  consumerCode: z.string().optional(),
  direction: IntegrationDirectionSchema.optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  traceId: z.string().optional(),
  endpoint: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type IntegrationLogQueryInput = z.infer<typeof IntegrationLogQuerySchema>;

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Integration Module Zod Schemas

import { z } from 'zod';

const TranslationMapSchema = z.record(z.string(), z.string().max(128));

// ============================================================================
// Enums
// ============================================================================
export const AdapterTypeSchema = z.enum(['oauth', 'api_key', 'webhook', 'ai']);
export const AiProviderSchema = z.enum(['OPENAI', 'ANTHROPIC', 'GEMINI']);
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
export type AiProvider = z.infer<typeof AiProviderSchema>;
export type IntegrationOwnerType = z.infer<typeof IntegrationOwnerTypeSchema>;
export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

// ============================================================================
// Adapter Schemas
// ============================================================================
export const AdapterListQuerySchema = z.object({
  platformId: z.string().uuid().optional(),
  adapterType: AdapterTypeSchema.optional(),
  includeInherited: z.coerce.boolean().optional().default(true),
  includeDisabled: z.coerce.boolean().optional().default(false),
});

export const AdapterConfigItemSchema = z.object({
  configKey: z.string().max(64),
  configValue: z.string().max(2048),
});

export const AdapterConfigMutationSchema = z.enum(['keep', 'replace', 'clear']);

export const AdapterConfigMutationItemSchema = z.object({
  configKey: z.string().max(64),
  mutation: AdapterConfigMutationSchema.optional(),
  configValue: z.string().max(2048).optional(),
}).superRefine((value, ctx) => {
  const mutation = value.mutation ?? 'replace';

  if (mutation === 'replace') {
    if (value.configValue === undefined || value.configValue.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['configValue'],
        message: 'Replacement config value is required',
      });
    }
    return;
  }

  if (value.configValue !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['configValue'],
      message: 'Config value is only allowed for replace mutations',
    });
  }
});

export const CreateAdapterSchema = z.object({
  definitionKey: z.string().max(64).optional(),
  platformId: z.string().uuid().optional(),
  code: z.string().regex(/^[A-Z0-9_]{3,32}$/, 'Code must be 3-32 uppercase alphanumeric with underscores').optional(),
  nameEn: z.string().max(128).optional(),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  translations: TranslationMapSchema.optional(),
  adapterType: AdapterTypeSchema.optional(),
  inherit: z.boolean().optional().default(true),
  configs: z.array(AdapterConfigItemSchema).optional(),
}).superRefine((value, ctx) => {
  if (value.definitionKey) {
    const lockedDefinitionFields = [
      ['platformId', value.platformId],
      ['adapterType', value.adapterType],
      ['code', value.code],
      ['nameEn', value.nameEn],
      ['nameZh', value.nameZh],
      ['nameJa', value.nameJa],
      ['translations', value.translations],
    ] as const;

    lockedDefinitionFields.forEach(([field, fieldValue]) => {
      if (fieldValue !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: 'Adapter definition-backed creation does not accept free platform, type, code, or name fields',
        });
      }
    });
  }

  if (!value.definitionKey && !value.platformId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['platformId'],
      message: 'Platform ID is required for legacy adapter creation without a definition key',
    });
  }

  if (!value.definitionKey && !value.adapterType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['adapterType'],
      message: 'Adapter type is required for legacy adapter creation without a definition key',
    });
  }

  if (!value.definitionKey && !value.code) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['code'],
      message: 'Adapter code is required for legacy adapter creation without a definition key',
    });
  }

  if (!value.definitionKey && !value.nameEn) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nameEn'],
      message: 'English adapter name is required for legacy adapter creation without a definition key',
    });
  }
});

export const UpdateAdapterSchema = z.object({
  nameEn: z.string().max(128).optional(),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  translations: TranslationMapSchema.optional(),
  inherit: z.boolean().optional(),
  version: z.number().int(),
});

export const UpdateAdapterConfigsSchema = z.object({
  configs: z.array(AdapterConfigMutationItemSchema),
  adapterVersion: z.number().int(),
});

export type AdapterListQueryInput = z.infer<typeof AdapterListQuerySchema>;
export type CreateAdapterInput = z.infer<typeof CreateAdapterSchema>;
export type UpdateAdapterInput = z.infer<typeof UpdateAdapterSchema>;
export type AdapterConfigMutation = z.infer<typeof AdapterConfigMutationSchema>;
export type AdapterConfigMutationInput = z.infer<typeof AdapterConfigMutationItemSchema>;

// ============================================================================
// Webhook Schemas
// ============================================================================
export const RetryPolicySchema = z.object({
  maxRetries: z.coerce.number().int().min(1).max(10).optional().default(3),
  backoffMs: z.coerce.number().int().min(100).max(60000).optional().default(1000),
});

const MonitoredTalentIdsSchema = z.array(z.string().uuid()).optional();

export const CreateWebhookSchema = z.object({
  definitionKey: z.string().max(64).optional(),
  code: z.string().regex(/^[A-Z0-9_]{3,32}$/).optional(),
  nameEn: z.string().max(128).optional(),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  translations: TranslationMapSchema.optional(),
  url: z.string().url().max(512),
  secret: z.string().max(128).optional(),
  events: z.array(WebhookEventTypeSchema).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  retryPolicy: RetryPolicySchema.optional(),
  monitoredTalentIds: MonitoredTalentIdsSchema,
}).superRefine((value, ctx) => {
  if (value.definitionKey) {
    const lockedDefinitionFields = [
      ['code', value.code],
      ['nameEn', value.nameEn],
      ['nameZh', value.nameZh],
      ['nameJa', value.nameJa],
      ['translations', value.translations],
      ['events', value.events],
    ] as const;

    lockedDefinitionFields.forEach(([field, fieldValue]) => {
      if (fieldValue !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: 'Webhook definition-backed creation does not accept free code, name, or event fields',
        });
      }
    });
  }

  if (!value.definitionKey && !value.code) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['code'],
      message: 'Webhook code is required without a definition key',
    });
  }

  if (!value.definitionKey && !value.nameEn) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nameEn'],
      message: 'English webhook name is required without a definition key',
    });
  }

  if (!value.definitionKey && (!value.events || value.events.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['events'],
      message: 'Webhook events are required without a definition key',
    });
  }
});

export const UpdateWebhookSchema = z.object({
  nameEn: z.string().max(128).optional(),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  translations: TranslationMapSchema.optional(),
  url: z.string().url().max(512).optional(),
  secret: z.string().max(128).optional(),
  events: z.array(WebhookEventTypeSchema).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  retryPolicy: RetryPolicySchema.optional(),
  monitoredTalentIds: MonitoredTalentIdsSchema,
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

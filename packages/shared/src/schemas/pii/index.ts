// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// PII Config Module Zod Schemas

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================
export const PiiAuthTypeSchema = z.enum(['mtls', 'api_key']);

export type PiiServiceAuthType = z.infer<typeof PiiAuthTypeSchema>;

// ============================================================================
// PII Service Config Schemas
// ============================================================================
export const CreatePiiServiceConfigSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{3,32}$/, 'Code must be 3-32 uppercase alphanumeric with underscores'),
  nameEn: z.string().max(255),
  nameZh: z.string().max(255).optional(),
  nameJa: z.string().max(255).optional(),
  descriptionEn: z.string().optional(),
  descriptionZh: z.string().optional(),
  descriptionJa: z.string().optional(),
  apiUrl: z.string().url().max(512),
  authType: PiiAuthTypeSchema,
  mtlsClientCert: z.string().optional(),
  mtlsClientKey: z.string().optional(),
  mtlsCaCert: z.string().optional(),
  apiKey: z.string().optional(),
  healthCheckUrl: z.string().url().max(512).optional(),
  healthCheckIntervalSec: z.coerce.number().int().min(10).max(3600).optional(),
});

export const UpdatePiiServiceConfigSchema = z.object({
  nameEn: z.string().max(255).optional(),
  nameZh: z.string().max(255).optional(),
  nameJa: z.string().max(255).optional(),
  descriptionEn: z.string().optional(),
  descriptionZh: z.string().optional(),
  descriptionJa: z.string().optional(),
  apiUrl: z.string().url().max(512).optional(),
  authType: PiiAuthTypeSchema.optional(),
  mtlsClientCert: z.string().optional(),
  mtlsClientKey: z.string().optional(),
  mtlsCaCert: z.string().optional(),
  apiKey: z.string().optional(),
  healthCheckUrl: z.string().url().max(512).optional(),
  healthCheckIntervalSec: z.coerce.number().int().min(10).max(3600).optional(),
  isActive: z.boolean().optional(),
  version: z.number().int(),
});

export type CreatePiiServiceConfigInput = z.infer<typeof CreatePiiServiceConfigSchema>;
export type UpdatePiiServiceConfigInput = z.infer<typeof UpdatePiiServiceConfigSchema>;

// ============================================================================
// Profile Store Schemas
// ============================================================================
export const CreateProfileStoreSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{3,32}$/),
  nameEn: z.string().max(255),
  nameZh: z.string().max(255).optional(),
  nameJa: z.string().max(255).optional(),
  descriptionEn: z.string().optional(),
  descriptionZh: z.string().optional(),
  descriptionJa: z.string().optional(),
  piiServiceConfigCode: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const UpdateProfileStoreSchema = z.object({
  nameEn: z.string().max(255).optional(),
  nameZh: z.string().max(255).optional(),
  nameJa: z.string().max(255).optional(),
  descriptionEn: z.string().optional(),
  descriptionZh: z.string().optional(),
  descriptionJa: z.string().optional(),
  piiServiceConfigCode: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  version: z.number().int(),
});

export type CreateProfileStoreInput = z.infer<typeof CreateProfileStoreSchema>;
export type UpdateProfileStoreInput = z.infer<typeof UpdateProfileStoreSchema>;

// ============================================================================
// Query Schemas
// ============================================================================
export const PiiConfigQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  includeInactive: z.coerce.boolean().optional(),
});

export type PiiConfigQueryInput = z.infer<typeof PiiConfigQuerySchema>;

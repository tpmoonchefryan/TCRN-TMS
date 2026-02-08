// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Security Module Zod Schemas

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================
export const SecurityPatternTypeSchema = z.enum(['keyword', 'regex', 'wildcard']);
export const SecuritySeveritySchema = z.enum(['low', 'medium', 'high']);
export const SecurityActionSchema = z.enum(['reject', 'flag', 'replace']);
export const SecurityScopeTypeSchema = z.enum(['tenant', 'subsidiary', 'talent']);
export const IpRuleTypeSchema = z.enum(['whitelist', 'blacklist']);
export const IpRuleScopeSchema = z.enum(['global', 'admin', 'public', 'api']);

// ============================================================================
// Blocklist Schemas
// ============================================================================
export const BlocklistListQuerySchema = z.object({
  scopeType: SecurityScopeTypeSchema.optional().default('tenant'),
  scopeId: z.string().uuid().optional(),
  category: z.string().optional(),
  patternType: SecurityPatternTypeSchema.optional(),
  scope: z.string().optional(),
  includeInherited: z.coerce.boolean().optional().default(true),
  includeDisabled: z.coerce.boolean().optional().default(false),
  includeInactive: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const DisableScopeSchema = z.object({
  scopeType: SecurityScopeTypeSchema,
  scopeId: z.string().uuid().optional(),
});

export const CreateBlocklistSchema = z.object({
  ownerType: SecurityScopeTypeSchema,
  ownerId: z.string().uuid().optional(),
  pattern: z.string().max(512),
  patternType: SecurityPatternTypeSchema,
  nameEn: z.string().max(128),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(64).optional(),
  severity: SecuritySeveritySchema.optional().default('medium'),
  action: SecurityActionSchema.optional().default('reject'),
  replacement: z.string().max(255).optional().default('***'),
  scope: z.array(z.string()).optional().default(['marshmallow']),
  inherit: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  isForceUse: z.boolean().optional().default(false),
});

export const UpdateBlocklistSchema = z.object({
  pattern: z.string().max(512).optional(),
  patternType: SecurityPatternTypeSchema.optional(),
  nameEn: z.string().max(128).optional(),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(64).optional(),
  severity: SecuritySeveritySchema.optional(),
  action: SecurityActionSchema.optional(),
  replacement: z.string().max(255).optional(),
  scope: z.array(z.string()).optional(),
  inherit: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isForceUse: z.boolean().optional(),
  version: z.number().int(),
});

export const TestBlocklistSchema = z.object({
  testContent: z.string().max(2000),
  pattern: z.string().max(512),
  patternType: SecurityPatternTypeSchema,
});

export type BlocklistListQueryInput = z.infer<typeof BlocklistListQuerySchema>;
export type CreateBlocklistInput = z.infer<typeof CreateBlocklistSchema>;
export type UpdateBlocklistInput = z.infer<typeof UpdateBlocklistSchema>;

// ============================================================================
// IP Access Rule Schemas
// ============================================================================
export const IpRuleListQuerySchema = z.object({
  ruleType: IpRuleTypeSchema.optional(),
  scope: IpRuleScopeSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const CreateIpRuleSchema = z.object({
  ruleType: IpRuleTypeSchema,
  ipPattern: z.string().regex(/^[\d.:/]+$/).max(64),
  scope: IpRuleScopeSchema,
  reason: z.string().max(255).optional(),
  expiresAt: z.string().optional(),
});

export const CheckIpSchema = z.object({
  ip: z.string().max(64),
  scope: IpRuleScopeSchema.optional().default('global'),
});

export type IpRuleListQueryInput = z.infer<typeof IpRuleListQuerySchema>;
export type CreateIpRuleInput = z.infer<typeof CreateIpRuleSchema>;

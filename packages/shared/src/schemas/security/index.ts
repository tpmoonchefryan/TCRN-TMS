// SPDX-License-Identifier: Apache-2.0
// Security Module Zod Schemas
import { z } from 'zod';

import { LocalizedTextSchema, PartialLocalizedTextSchema } from '../common.schema';

// ============================================================================
// Enums
// ============================================================================
export const SecurityPatternTypeSchema = z.enum(['keyword', 'regex', 'wildcard']);
export const SecuritySeveritySchema = z.enum(['low', 'medium', 'high']);
export const SecurityActionSchema = z.enum(['reject', 'flag', 'replace']);
export const SecurityScopeTypeSchema = z.enum(['tenant', 'subsidiary', 'talent']);
export const IpRuleTypeSchema = z.enum(['whitelist', 'blacklist']);
export const IpRuleScopeSchema = z.enum(['global', 'admin', 'public', 'api']);

export const BLOCKLIST_SURFACE_SCOPE_VALUES = ['marshmallow'] as const;
export const DEFAULT_BLOCKLIST_SCOPE = ['marshmallow'] as const;

export const BlocklistScopeTokenSchema = z.string().trim().min(1).max(64);
export const BlocklistScopeCategorySchema = z.enum([
  'tenant',
  'subsidiary',
  'talent',
  'profile-store',
  'surface',
]);
export const BLOCKLIST_STRUCTURED_SCOPE_CATEGORY_VALUES = [
  'tenant',
  'subsidiary',
  'talent',
  'profile-store',
] as const;
export const BlocklistSurfaceScopeSchema = z.enum(BLOCKLIST_SURFACE_SCOPE_VALUES);
export const BlocklistStructuredScopeEntrySchema = z.discriminatedUnion('category', [
  z.object({ category: z.literal('tenant') }),
  z.object({ category: z.literal('subsidiary') }),
  z.object({ category: z.literal('talent') }),
  z.object({ category: z.literal('profile-store') }),
  z.object({
    category: z.literal('surface'),
    value: BlocklistSurfaceScopeSchema,
  }),
]);
export const BlocklistStructuredScopeSchema = z.object({
  entries: z.array(BlocklistStructuredScopeEntrySchema),
});
export const BlocklistScopeSummarySchema = z.object({
  tokens: z.array(BlocklistScopeTokenSchema),
  structuredScope: BlocklistStructuredScopeSchema,
  unsupported: z.array(BlocklistScopeTokenSchema),
});

export type BlocklistScopeCategory = z.infer<typeof BlocklistScopeCategorySchema>;
export type BlocklistSurfaceScope = z.infer<typeof BlocklistSurfaceScopeSchema>;
export type BlocklistStructuredScopeEntry = z.infer<typeof BlocklistStructuredScopeEntrySchema>;
export type BlocklistStructuredScopeInput = z.infer<typeof BlocklistStructuredScopeSchema>;
export type BlocklistScopeSummary = z.infer<typeof BlocklistScopeSummarySchema>;

const isBlocklistSurfaceScope = (value: string): value is BlocklistSurfaceScope =>
  (BLOCKLIST_SURFACE_SCOPE_VALUES as readonly string[]).includes(value);

const isBlocklistStructuredCategoryToken = (
  value: string
): value is Exclude<BlocklistScopeCategory, 'surface'> =>
  (BLOCKLIST_STRUCTURED_SCOPE_CATEGORY_VALUES as readonly string[]).includes(value);

const dedupeScopeTokens = (tokens: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const token of tokens) {
    const parsed = BlocklistScopeTokenSchema.safeParse(token);

    if (!parsed.success || seen.has(parsed.data)) {
      continue;
    }

    seen.add(parsed.data);
    result.push(parsed.data);
  }

  return result;
};

export const normalizeBlocklistScopeInput = ({
  scope,
  structuredScope,
}: {
  scope?: string[] | null;
  structuredScope?: BlocklistStructuredScopeInput | null;
}): string[] => {
  const rawTokens = dedupeScopeTokens(scope ?? []);
  const structuredEntries = structuredScope
    ? BlocklistStructuredScopeSchema.parse(structuredScope).entries
    : [];
  const structuredRuntimeTokens = structuredEntries
    .filter(
      (entry): entry is Extract<BlocklistStructuredScopeEntry, { category: 'surface' }> =>
        entry.category === 'surface'
    )
    .map((entry) => entry.value);
  const structuredCategoryTokens = structuredEntries
    .filter(
      (entry): entry is Exclude<BlocklistStructuredScopeEntry, { category: 'surface' }> =>
        entry.category !== 'surface'
    )
    .map((entry) => entry.category);
  if (structuredScope && structuredRuntimeTokens.length === 0 && rawTokens.length === 0) {
    throw new Error('At least one runtime surface scope is required');
  }

  const normalized = dedupeScopeTokens([
    ...structuredCategoryTokens,
    ...structuredRuntimeTokens,
    ...rawTokens,
  ]);

  return normalized.length > 0 ? normalized : [...DEFAULT_BLOCKLIST_SCOPE];
};

export const summarizeBlocklistScopes = (
  scope: readonly string[] | null | undefined
): BlocklistScopeSummary => {
  const tokens = dedupeScopeTokens([...(scope ?? [])]);
  const categoryTokens = tokens.filter(isBlocklistStructuredCategoryToken);
  const surfaceTokens = tokens.filter(isBlocklistSurfaceScope);
  const unsupported = tokens.filter(
    (token) => !isBlocklistSurfaceScope(token) && !isBlocklistStructuredCategoryToken(token)
  );

  return {
    tokens,
    structuredScope: {
      entries: [
        ...categoryTokens.map((category) => ({ category })),
        ...surfaceTokens.map((value) => ({
          category: 'surface' as const,
          value,
        })),
      ],
    },
    unsupported,
  };
};

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
  name: LocalizedTextSchema,
  description: z.string().max(500).optional(),
  category: z.string().max(64).optional(),
  severity: SecuritySeveritySchema.optional().default('medium'),
  action: SecurityActionSchema.optional().default('reject'),
  replacement: z.string().max(255).optional().default('***'),
  scope: z.array(BlocklistScopeTokenSchema).optional(),
  structuredScope: BlocklistStructuredScopeSchema.optional(),
  inherit: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  isForceUse: z.boolean().optional().default(false),
});

export const UpdateBlocklistSchema = z.object({
  pattern: z.string().max(512).optional(),
  patternType: SecurityPatternTypeSchema.optional(),
  name: PartialLocalizedTextSchema.optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(64).optional(),
  severity: SecuritySeveritySchema.optional(),
  action: SecurityActionSchema.optional(),
  replacement: z.string().max(255).optional(),
  scope: z.array(BlocklistScopeTokenSchema).optional(),
  structuredScope: BlocklistStructuredScopeSchema.optional(),
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
  ipPattern: z
    .string()
    .regex(/^[\d.:/]+$/)
    .max(64),
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

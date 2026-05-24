// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Report Module Zod Schemas
import { z } from 'zod';

import { SUPPORTED_UI_LOCALES, type LocalizedText } from '../../constants/locale';

// ============================================================================
// Enums
// ============================================================================
export const ReportJobStatusSchema = z.enum([
  'pending',
  'running',
  'success',
  'consumed',
  'expired',
  'failed',
  'retrying',
  'cancelled',
]);
export const ReportTypeSchema = z.enum(['mfr']);
export const ReportFormatSchema = z.enum(['xlsx', 'csv']);
export const ReportArtifactKindSchema = z.enum(['xlsx', 'csv', 'pii_platform_portal']);

export type ReportJobStatus = z.infer<typeof ReportJobStatusSchema>;
export type ReportType = z.infer<typeof ReportTypeSchema>;
export type ReportFormat = z.infer<typeof ReportFormatSchema>;
export type ReportArtifactKind = z.infer<typeof ReportArtifactKindSchema>;

// ============================================================================
// Catalog Schemas
// ============================================================================
export const ReportLocalizedTextSchema = z.object({
  en: z.string().min(1),
  zh_HANS: z.string().min(1),
  zh_HANT: z.string().min(1),
  ja: z.string().min(1),
  ko: z.string().min(1),
  fr: z.string().min(1),
});

export const ReportPermissionRequirementSchema = z.object({
  resource: z.string().min(1),
  actions: z.array(z.string().min(1)).min(1),
});

export const ReportCatalogAvailabilitySchema = z.object({
  status: z.enum(['available', 'unavailable']),
  reason: ReportLocalizedTextSchema.optional(),
  requiredPermissions: z.array(ReportPermissionRequirementSchema).optional(),
});

export const ReportFilterOptionSourceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('config-entity'),
    entityType: z.enum([
      'social-platform',
      'membership-class',
      'membership-type',
      'membership-level',
      'customer-status',
    ]),
  }),
  z.object({
    kind: z.literal('system-dictionary'),
    dictionaryCode: z.string().min(1),
  }),
]);

export const ReportConfigFilterOptionSourceSchema = z.object({
  kind: z.literal('config-entity'),
  entityType: z.enum([
    'social-platform',
    'membership-class',
    'membership-type',
    'membership-level',
    'customer-status',
  ]),
});

export const ReportDictionaryFilterOptionSourceSchema = z.object({
  kind: z.literal('system-dictionary'),
  dictionaryCode: z.string().min(1),
});

const ReportFilterFieldBaseSchema = z.object({
  id: z.string().min(1),
  targetField: z.string().min(1),
  label: ReportLocalizedTextSchema,
  description: ReportLocalizedTextSchema.optional(),
  required: z.boolean().optional(),
  advanced: z.boolean().optional(),
});

export const ReportConfigMultiSelectFilterFieldSchema = ReportFilterFieldBaseSchema.extend({
  type: z.literal('config-multi-select'),
  source: ReportConfigFilterOptionSourceSchema,
});

export const ReportDictionaryMultiSelectFilterFieldSchema = ReportFilterFieldBaseSchema.extend({
  type: z.literal('dictionary-multi-select'),
  source: ReportDictionaryFilterOptionSourceSchema,
});

export const ReportEnumSelectFilterFieldSchema = ReportFilterFieldBaseSchema.extend({
  type: z.literal('enum-select'),
  options: z
    .array(
      z.object({
        value: z.string().min(1),
        label: ReportLocalizedTextSchema,
      })
    )
    .min(1),
});

export const ReportDateRangeFilterFieldSchema = ReportFilterFieldBaseSchema.omit({
  targetField: true,
}).extend({
  type: z.literal('date-range'),
  fromField: z.string().min(1),
  toField: z.string().min(1),
});

export const ReportBooleanFilterFieldSchema = ReportFilterFieldBaseSchema.extend({
  type: z.literal('boolean'),
  defaultValue: z.boolean().optional(),
});

export const ReportRawCodeListFilterFieldSchema = ReportFilterFieldBaseSchema.extend({
  type: z.literal('raw-code-list'),
  codeFormat: z.string().min(1).optional(),
  fallbackForFieldId: z.string().min(1).optional(),
  advanced: z.literal(true),
});

export const ReportFilterFieldSchema = z.discriminatedUnion('type', [
  ReportConfigMultiSelectFilterFieldSchema,
  ReportDictionaryMultiSelectFilterFieldSchema,
  ReportEnumSelectFilterFieldSchema,
  ReportDateRangeFilterFieldSchema,
  ReportBooleanFilterFieldSchema,
  ReportRawCodeListFilterFieldSchema,
]);

export const ReportFilterSchemaSchema = z.object({
  version: z.literal(1),
  fields: z.array(ReportFilterFieldSchema),
});

export const ReportCatalogItemSchema = z.object({
  id: ReportTypeSchema,
  name: ReportLocalizedTextSchema,
  description: ReportLocalizedTextSchema,
  icon: z.string().min(1),
  availability: ReportCatalogAvailabilitySchema,
  artifactKinds: z.array(ReportArtifactKindSchema).min(1),
  filterSchema: ReportFilterSchemaSchema,
});

export const ReportCatalogSchema = z.array(ReportCatalogItemSchema);

export type ReportLocalizedText = LocalizedText;
export type ReportPermissionRequirement = z.infer<typeof ReportPermissionRequirementSchema>;
export type ReportCatalogAvailability = z.infer<typeof ReportCatalogAvailabilitySchema>;
export type ReportFilterOptionSource = z.infer<typeof ReportFilterOptionSourceSchema>;
export type ReportConfigFilterOptionSource = z.infer<typeof ReportConfigFilterOptionSourceSchema>;
export type ReportDictionaryFilterOptionSource = z.infer<
  typeof ReportDictionaryFilterOptionSourceSchema
>;
export type ReportFilterField = z.infer<typeof ReportFilterFieldSchema>;
export type ReportFilterSchema = z.infer<typeof ReportFilterSchemaSchema>;
export type ReportCatalogItem = z.infer<typeof ReportCatalogItemSchema>;

// ============================================================================
// Filter Schemas
// ============================================================================
export const MfrFilterCriteriaSchema = z.object({
  platformCodes: z.array(z.string()).optional(),
  membershipClassCodes: z.array(z.string()).optional(),
  membershipTypeCodes: z.array(z.string()).optional(),
  membershipLevelCodes: z.array(z.string()).optional(),
  statusCodes: z.array(z.string()).optional(),
  validFromStart: z.string().optional(),
  validFromEnd: z.string().optional(),
  validToStart: z.string().optional(),
  validToEnd: z.string().optional(),
  includeExpired: z.boolean().optional(),
  includeInactive: z.boolean().optional(),
});
export type MfrFilterCriteria = z.infer<typeof MfrFilterCriteriaSchema>;

// ============================================================================
// Request Schemas
// ============================================================================
export const MfrSearchRequestSchema = z.object({
  talentId: z.string().uuid('Invalid talent ID'),
  filters: MfrFilterCriteriaSchema.optional(),
  previewLimit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const CreateMfrJobSchema = z.object({
  talentId: z.string().uuid('Invalid talent ID'),
  filters: MfrFilterCriteriaSchema.optional(),
  format: ReportFormatSchema.optional().default('xlsx'),
});

export const LocalReportJobCreateResponseSchema = z.object({
  deliveryMode: z.literal('tms_job'),
  jobId: z.string(),
  status: ReportJobStatusSchema,
  estimatedRows: z.number().int().min(0),
  createdAt: z.string(),
});

export const PiiPlatformReportCreateResponseSchema = z.object({
  deliveryMode: z.literal('pii_platform_portal'),
  requestId: z.string(),
  redirectUrl: z.string().url(),
  expiresAt: z.string(),
  estimatedRows: z.number().int().min(0),
  customerCount: z.number().int().min(0),
});

export const ReportCreateResponseSchema = z.discriminatedUnion('deliveryMode', [
  LocalReportJobCreateResponseSchema,
  PiiPlatformReportCreateResponseSchema,
]);

export const ReportJobListQuerySchema = z.object({
  talentId: z.string().uuid('Invalid talent ID'),
  status: z.string().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type MfrSearchRequestInput = z.infer<typeof MfrSearchRequestSchema>;
export type CreateMfrJobInput = z.infer<typeof CreateMfrJobSchema>;
export type LocalReportJobCreateResponse = z.infer<typeof LocalReportJobCreateResponseSchema>;
export type PiiPlatformReportCreateResponse = z.infer<typeof PiiPlatformReportCreateResponseSchema>;
export type ReportCreateResponse = z.infer<typeof ReportCreateResponseSchema>;
export type ReportJobListQueryInput = z.infer<typeof ReportJobListQuerySchema>;

export const SUPPORTED_REPORT_CATALOG_LOCALES = SUPPORTED_UI_LOCALES;

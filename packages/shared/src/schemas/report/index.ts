// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Report Module Zod Schemas

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================
export const ReportJobStatusSchema = z.enum([
  'pending', 'running', 'success', 'consumed', 'expired', 'failed', 'retrying', 'cancelled'
]);
export const ReportTypeSchema = z.enum(['mfr']);
export const ReportFormatSchema = z.enum(['xlsx', 'csv']);

export type ReportJobStatus = z.infer<typeof ReportJobStatusSchema>;
export type ReportType = z.infer<typeof ReportTypeSchema>;
export type ReportFormat = z.infer<typeof ReportFormatSchema>;

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
export type ReportJobListQueryInput = z.infer<typeof ReportJobListQuerySchema>;

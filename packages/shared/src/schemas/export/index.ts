// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Export Module Zod Schemas

import { z } from 'zod';

import { PaginationSchema } from '../common.schema';

// ============================================================================
// Enums
// ============================================================================
export const ExportJobTypeSchema = z.enum([
  'customer_export', 'membership_export', 'report_export', 'marshmallow_export'
]);
export const DataExportFormatSchema = z.enum(['csv', 'xlsx', 'json']);
export const ExportJobStatusSchema = z.enum([
  'pending', 'running', 'success', 'failed', 'cancelled'
]);

export type ExportJobType = z.infer<typeof ExportJobTypeSchema>;
export type DataExportFormat = z.infer<typeof DataExportFormatSchema>;
export type ExportJobStatus = z.infer<typeof ExportJobStatusSchema>;

// ============================================================================
// Request Schemas
// ============================================================================
export const CreateExportJobSchema = z.object({
  jobType: ExportJobTypeSchema,
  format: DataExportFormatSchema.optional().default('csv'),
  customerIds: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
  membershipClassCode: z.string().optional(),
  includePii: z.boolean().optional().default(false),
  fields: z.array(z.string()).optional(),
  // Marshmallow specific
  messageStatus: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  includeRejected: z.boolean().optional().default(false),
});

export const ExportJobQuerySchema = PaginationSchema.pick({ page: true }).extend({
  status: ExportJobStatusSchema.optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type CreateExportJobInput = z.infer<typeof CreateExportJobSchema>;
export type ExportJobQueryInput = z.infer<typeof ExportJobQuerySchema>;

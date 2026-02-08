// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Import Module Zod Schemas

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================
export const ImportJobTypeSchema = z.enum(['individual_import', 'company_import']);
export const ImportJobStatusSchema = z.enum([
  'pending', 'running', 'success', 'partial', 'failed', 'cancelled'
]);

export type ImportJobType = z.infer<typeof ImportJobTypeSchema>;
export type ImportJobStatus = z.infer<typeof ImportJobStatusSchema>;

// ============================================================================
// Request Schemas
// ============================================================================
export const CreateImportJobSchema = z.object({
  talentId: z.string().uuid('Invalid talent ID'),
  consumerCode: z.string().optional(),
});

export const ImportJobQuerySchema = z.object({
  status: ImportJobStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type CreateImportJobInput = z.infer<typeof CreateImportJobSchema>;
export type ImportJobQueryInput = z.infer<typeof ImportJobQuerySchema>;

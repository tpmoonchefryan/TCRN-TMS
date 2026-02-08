// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Log Module Zod Schemas

import { z } from 'zod';

// ============================================================================
// Enums (re-exported from shared types)
// ============================================================================
export const ChangeActionSchema = z.enum(['create', 'update', 'delete', 'activate', 'deactivate']);
export const LogSeveritySchema = z.enum(['debug', 'info', 'warning', 'error', 'critical']);
export const LogIntegrationDirectionSchema = z.enum(['inbound', 'outbound']);
export const LogTypeSchema = z.enum(['change', 'tech', 'integration']);

// ============================================================================
// Query Schemas
// ============================================================================
export const ChangeLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  objectType: z.string().optional(),
  objectId: z.string().uuid().optional(),
  operatorId: z.string().uuid().optional(),
  action: ChangeActionSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  requestId: z.string().optional(),
});

export const TechEventLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  severity: LogSeveritySchema.optional(),
  eventType: z.string().optional(),
  scope: z.string().optional(),
  traceId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const LogIntegrationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  consumerId: z.string().uuid().optional(),
  consumerCode: z.string().optional(),
  direction: LogIntegrationDirectionSchema.optional(),
  responseStatus: z.coerce.number().int().optional(),
  traceId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const LogSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  keyword: z.string().min(1, 'Keyword is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  logType: LogTypeSchema.optional(),
});

export type ChangeLogQueryInput = z.infer<typeof ChangeLogQuerySchema>;
export type TechEventLogQueryInput = z.infer<typeof TechEventLogQuerySchema>;
export type LogSearchInput = z.infer<typeof LogSearchSchema>;

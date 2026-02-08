// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Common Zod Schemas - Shared validation rules for frontend and backend

import { z } from 'zod';

// ============================================================================
// Pagination Schema
// ============================================================================
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

// ============================================================================
// ID Schemas
// ============================================================================
export const UUIDSchema = z.string().uuid('Invalid UUID format');
export const CUIDSchema = z.string().cuid('Invalid CUID format');
export const IDSchema = z.string().min(1, 'ID is required');

// Params with ID
export const IdParamSchema = z.object({
  id: IDSchema,
});

export type IdParam = z.infer<typeof IdParamSchema>;

// ============================================================================
// Date Range Schema
// ============================================================================
export const DateRangeSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['endDate'],
    }
  );

export type DateRangeInput = z.infer<typeof DateRangeSchema>;

// ============================================================================
// Search Schema
// ============================================================================
export const SearchSchema = z.object({
  query: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export type SearchInput = z.infer<typeof SearchSchema>;

// ============================================================================
// Contact Info Schema
// ============================================================================
export const EmailSchema = z.string().email('Invalid email address');

export const PhoneSchema = z
  .string()
  .regex(/^[+]?[\d\s-()]+$/, 'Invalid phone number format')
  .optional();

export const ContactInfoSchema = z.object({
  email: EmailSchema.optional(),
  phone: PhoneSchema,
  alternateEmail: EmailSchema.optional(),
  alternatePhone: PhoneSchema,
});

export type ContactInfoInput = z.infer<typeof ContactInfoSchema>;

// ============================================================================
// Address Schema
// ============================================================================
export const AddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export type AddressInput = z.infer<typeof AddressSchema>;

// ============================================================================
// Money Schema (for financial values)
// ============================================================================
export const MoneySchema = z.object({
  amount: z.coerce.number().min(0, 'Amount must be non-negative'),
  currency: z.string().length(3, 'Currency must be 3-letter ISO code').default('CNY'),
});

export type MoneyInput = z.infer<typeof MoneySchema>;

// ============================================================================
// Sorting Schema
// ============================================================================
export const SortSchema = z.object({
  field: z.string(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type SortInput = z.infer<typeof SortSchema>;

// ============================================================================
// Bulk Operation Schema
// ============================================================================
export const BulkOperationSchema = z.object({
  ids: z.array(IDSchema).min(1, 'At least one ID is required'),
});

export type BulkOperationInput = z.infer<typeof BulkOperationSchema>;

// ============================================================================
// Tenant Context Schema
// ============================================================================
export const TenantContextSchema = z.object({
  tenantId: IDSchema,
  tenantCode: z.string().optional(),
});

export type TenantContextInput = z.infer<typeof TenantContextSchema>;

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Customer Module Zod Schemas - Validation rules for customer management

import { z } from 'zod';

import { PaginationSchema, UUIDSchema } from '../common.schema';

// ============================================================================
// Enums
// ============================================================================
export const CustomerProfileTypeSchema = z.enum(['individual', 'company']);
export const CustomerActionSchema = z.enum(['create', 'update', 'deactivate', 'reactivate', 'pii_view', 'pii_update']);
export const BatchActionSchema = z.enum(['deactivate', 'reactivate', 'add_tags', 'remove_tags', 'update_membership']);
export const GenderSchema = z.enum(['male', 'female', 'other', 'undisclosed']);

export type CustomerProfileType = z.infer<typeof CustomerProfileTypeSchema>;
export type CustomerAction = z.infer<typeof CustomerActionSchema>;
export type BatchAction = z.infer<typeof BatchActionSchema>;
export type Gender = z.infer<typeof GenderSchema>;

// ============================================================================
// Customer Query Schema
// ============================================================================
export const CustomerListQuerySchema = PaginationSchema.extend({
  talentId: UUIDSchema,
  profileType: CustomerProfileTypeSchema.optional(),
  statusId: UUIDSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  hasMembership: z.coerce.boolean().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  sort: z.string().optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CustomerListQueryInput = z.infer<typeof CustomerListQuerySchema>;

// ============================================================================
// PII Related Schemas
// ============================================================================
export const PhoneNumberSchema = z.object({
  typeCode: z.string().min(1, 'Phone type code is required'),
  number: z.string().min(1, 'Phone number is required'),
  isPrimary: z.boolean().optional(),
});

export const EmailItemSchema = z.object({
  typeCode: z.string().min(1, 'Email type code is required'),
  address: z.string().email('Invalid email address'),
  isPrimary: z.boolean().optional(),
});

export const CustomerAddressSchema = z.object({
  typeCode: z.string().min(1, 'Address type code is required'),
  countryCode: z.string().min(1, 'Country code is required'),
  province: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  street: z.string().optional(),
  postalCode: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const PiiDataSchema = z.object({
  givenName: z.string().max(64).optional(),
  familyName: z.string().max(64).optional(),
  gender: GenderSchema.optional(),
  birthDate: z.string().optional(),
  phoneNumbers: z.array(PhoneNumberSchema).optional(),
  emails: z.array(EmailItemSchema).optional(),
  addresses: z.array(CustomerAddressSchema).optional(),
});

export type PhoneNumberInput = z.infer<typeof PhoneNumberSchema>;
export type EmailItemInput = z.infer<typeof EmailItemSchema>;
export type CustomerAddressInput = z.infer<typeof CustomerAddressSchema>;
export type PiiDataInput = z.infer<typeof PiiDataSchema>;

// ============================================================================
// Individual Customer Schemas
// ============================================================================
export const CreateIndividualCustomerSchema = z.object({
  talentId: UUIDSchema,
  nickname: z.string().min(1, 'Nickname is required').max(128),
  primaryLanguage: z.string().max(5).optional(),
  statusCode: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().max(64).optional(),
  notes: z.string().max(2000).optional(),
  externalId: z.string().max(128).optional(),
  consumerCode: z.string().optional(),
  pii: PiiDataSchema.optional(),
});

export const UpdateIndividualCustomerSchema = z.object({
  nickname: z.string().max(128).optional(),
  primaryLanguage: z.string().max(5).optional(),
  statusCode: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
  version: z.number().int(),
});

export const UpdateIndividualPiiSchema = z.object({
  pii: PiiDataSchema,
  version: z.number().int(),
});

export type CreateIndividualCustomerInput = z.infer<typeof CreateIndividualCustomerSchema>;
export type UpdateIndividualCustomerInput = z.infer<typeof UpdateIndividualCustomerSchema>;
export type UpdateIndividualPiiInput = z.infer<typeof UpdateIndividualPiiSchema>;

// ============================================================================
// Company Customer Schemas
// ============================================================================
export const CreateCompanyCustomerSchema = z.object({
  talentId: UUIDSchema,
  nickname: z.string().min(1, 'Nickname is required').max(128),
  primaryLanguage: z.string().max(5).optional(),
  statusCode: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().max(64).optional(),
  notes: z.string().max(2000).optional(),
  externalId: z.string().max(128).optional(),
  consumerCode: z.string().optional(),
  // Company-specific
  companyLegalName: z.string().min(1, 'Company legal name is required').max(255),
  companyShortName: z.string().max(128).optional(),
  registrationNumber: z.string().max(64).optional(),
  vatId: z.string().max(64).optional(),
  establishmentDate: z.string().optional(),
  businessSegmentCode: z.string().optional(),
  website: z.string().url('Invalid website URL').max(512).optional().or(z.literal('')),
  contactName: z.string().max(128).optional(),
  contactPhone: z.string().max(32).optional(),
  contactEmail: z.string().email('Invalid contact email').max(255).optional().or(z.literal('')),
  contactDepartment: z.string().max(128).optional(),
});

export const UpdateCompanyCustomerSchema = z.object({
  nickname: z.string().max(128).optional(),
  primaryLanguage: z.string().max(5).optional(),
  statusCode: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
  // Company-specific
  companyLegalName: z.string().max(255).optional(),
  companyShortName: z.string().max(128).optional(),
  registrationNumber: z.string().max(64).optional(),
  vatId: z.string().max(64).optional(),
  establishmentDate: z.string().optional(),
  businessSegmentCode: z.string().optional(),
  website: z.string().url('Invalid website URL').max(512).optional().or(z.literal('')),
  contactName: z.string().max(128).optional(),
  contactPhone: z.string().max(32).optional(),
  contactEmail: z.string().email('Invalid contact email').max(255).optional().or(z.literal('')),
  contactDepartment: z.string().max(128).optional(),
  version: z.number().int(),
});

export type CreateCompanyCustomerInput = z.infer<typeof CreateCompanyCustomerSchema>;
export type UpdateCompanyCustomerInput = z.infer<typeof UpdateCompanyCustomerSchema>;

// ============================================================================
// Deactivation Schema
// ============================================================================
export const DeactivateCustomerSchema = z.object({
  reasonCode: z.string().optional(),
  version: z.number().int(),
});

export type DeactivateCustomerInput = z.infer<typeof DeactivateCustomerSchema>;

// ============================================================================
// Platform Identity Schemas
// ============================================================================
export const CreatePlatformIdentitySchema = z.object({
  platformCode: z.string().min(1, 'Platform code is required'),
  platformUid: z.string().min(1, 'Platform UID is required').max(128),
  platformNickname: z.string().max(128).optional(),
  platformAvatarUrl: z.string().url('Invalid avatar URL').max(512).optional().or(z.literal('')),
  isVerified: z.boolean().optional(),
});

export const UpdatePlatformIdentitySchema = z.object({
  platformUid: z.string().max(128).optional(),
  platformNickname: z.string().max(128).optional(),
  platformAvatarUrl: z.string().url('Invalid avatar URL').max(512).optional().or(z.literal('')),
  isVerified: z.boolean().optional(),
  isCurrent: z.boolean().optional(),
});

export const PlatformIdentityHistoryQuerySchema = PaginationSchema.extend({
  platformCode: z.string().optional(),
  changeType: z.string().optional(),
});

export type CreatePlatformIdentityInput = z.infer<typeof CreatePlatformIdentitySchema>;
export type UpdatePlatformIdentityInput = z.infer<typeof UpdatePlatformIdentitySchema>;
export type PlatformIdentityHistoryQueryInput = z.infer<typeof PlatformIdentityHistoryQuerySchema>;

// ============================================================================
// Membership Schemas
// ============================================================================
export const MembershipListQuerySchema = PaginationSchema.extend({
  platformCode: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  includeExpired: z.coerce.boolean().optional(),
  sort: z.string().optional().default('validFrom'),
});

export const CreateMembershipSchema = z.object({
  platformCode: z.string().min(1, 'Platform code is required'),
  membershipLevelCode: z.string().min(1, 'Membership level code is required'),
  validFrom: z.string().min(1, 'Valid from date is required'),
  validTo: z.string().optional(),
  autoRenew: z.boolean().optional(),
  note: z.string().max(500).optional(),
});

export const UpdateMembershipSchema = z.object({
  validTo: z.string().optional(),
  autoRenew: z.boolean().optional(),
  note: z.string().max(500).optional(),
});

export type MembershipListQueryInput = z.infer<typeof MembershipListQuerySchema>;
export type CreateMembershipInput = z.infer<typeof CreateMembershipSchema>;
export type UpdateMembershipInput = z.infer<typeof UpdateMembershipSchema>;

// ============================================================================
// External ID Schema
// ============================================================================
export const CreateExternalIdSchema = z.object({
  consumerCode: z.string().min(1, 'Consumer code is required'),
  externalId: z.string().min(1, 'External ID is required').max(128),
});

export type CreateExternalIdInput = z.infer<typeof CreateExternalIdSchema>;

// ============================================================================
// Batch Operation Schema
// ============================================================================
export const BatchOperationSchema = z.object({
  customerIds: z.array(UUIDSchema).min(1, 'At least one customer ID is required'),
  action: BatchActionSchema,
  tags: z.array(z.string()).optional(),
  membershipClassCode: z.string().optional(),
  membershipTypeCode: z.string().optional(),
  membershipLevelCode: z.string().optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export type BatchOperationInput = z.infer<typeof BatchOperationSchema>;

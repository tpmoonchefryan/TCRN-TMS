// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEmail,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUrl,
    IsUUID,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';

// ============================================================================
// Enums
// ============================================================================

export enum ProfileType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
}

export enum CustomerAction {
  CREATE = 'create',
  UPDATE = 'update',
  DEACTIVATE = 'deactivate',
  REACTIVATE = 'reactivate',
  PII_VIEW = 'pii_view',
  PII_UPDATE = 'pii_update',
}

// ============================================================================
// Base DTOs
// ============================================================================

export class PaginationDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

// ============================================================================
// Customer Query DTOs
// ============================================================================

export class CustomerListQueryDto extends PaginationDto {
  @ApiProperty({ description: 'Talent ID to filter customers', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  talentId!: string;

  @ApiPropertyOptional({ description: 'Filter by profile type', enum: ProfileType, example: ProfileType.INDIVIDUAL })
  @IsOptional()
  @IsEnum(ProfileType)
  profileType?: ProfileType;

  @ApiPropertyOptional({ description: 'Filter by status ID', example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @ApiPropertyOptional({ description: 'Filter by active status', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search keyword for nickname or other fields', example: 'John' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by tags', example: ['VIP', 'Premium'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter customers with membership', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasMembership?: boolean;

  @ApiPropertyOptional({ description: 'Filter by creation date (from)', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by creation date (to)', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({ description: 'Sort field', example: 'createdAt', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sort?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

// ============================================================================
// Individual Customer DTOs
// ============================================================================

export class PhoneNumberDto {
  @ApiProperty({ description: 'Phone type code', example: 'mobile' })
  @IsString()
  typeCode!: string;

  @ApiProperty({ description: 'Phone number', example: '+81-90-1234-5678' })
  @IsString()
  number!: string;

  @ApiPropertyOptional({ description: 'Whether this is the primary phone', example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class EmailDto {
  @ApiProperty({ description: 'Email type code', example: 'personal' })
  @IsString()
  typeCode!: string;

  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  @IsEmail()
  address!: string;

  @ApiPropertyOptional({ description: 'Whether this is the primary email', example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class AddressDto {
  @ApiProperty({ description: 'Address type code', example: 'home' })
  @IsString()
  typeCode!: string;

  @ApiProperty({ description: 'Country code (ISO 3166-1 alpha-2)', example: 'JP' })
  @IsString()
  countryCode!: string;

  @ApiPropertyOptional({ description: 'Province/State', example: 'Tokyo' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Shibuya' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'District', example: 'Jingumae' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Street address', example: '1-2-3' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ description: 'Postal code', example: '150-0001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Whether this is the primary address', example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class PiiDataDto {
  @ApiPropertyOptional({ description: 'Given name (first name)', example: 'Taro', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  givenName?: string;

  @ApiPropertyOptional({ description: 'Family name (last name)', example: 'Yamada', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  familyName?: string;

  @ApiPropertyOptional({ description: 'Gender', enum: ['male', 'female', 'other', 'undisclosed'], example: 'male' })
  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'undisclosed'])
  gender?: string;

  @ApiPropertyOptional({ description: 'Birth date', example: '1990-01-15' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Phone numbers', type: [PhoneNumberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneNumberDto)
  phoneNumbers?: PhoneNumberDto[];

  @ApiPropertyOptional({ description: 'Email addresses', type: [EmailDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailDto)
  emails?: EmailDto[];

  @ApiPropertyOptional({ description: 'Physical addresses', type: [AddressDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];
}

export class CreateIndividualCustomerDto {
  @ApiProperty({ description: 'Talent ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  talentId!: string;

  @ApiProperty({ description: 'Customer nickname/display name', example: 'John Doe', maxLength: 128 })
  @IsString()
  @MaxLength(128)
  nickname!: string;

  @ApiPropertyOptional({ description: 'Primary language code', example: 'ja', maxLength: 5 })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  primaryLanguage?: string;

  @ApiPropertyOptional({ description: 'Status code', example: 'active' })
  @IsOptional()
  @IsString()
  statusCode?: string;

  @ApiPropertyOptional({ description: 'Customer tags', example: ['VIP', 'Premium'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Customer acquisition source', example: 'Twitter', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  source?: string;

  @ApiPropertyOptional({ description: 'Additional notes', example: 'Important customer', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'External system ID', example: 'EXT-12345', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalId?: string;

  @ApiPropertyOptional({ description: 'Consumer code for external ID', example: 'CRM' })
  @IsOptional()
  @IsString()
  consumerCode?: string;

  @ApiPropertyOptional({ description: 'Personal Identifiable Information', type: PiiDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PiiDataDto)
  pii?: PiiDataDto;
}

export class UpdateIndividualCustomerDto {
  @ApiPropertyOptional({ description: 'Customer nickname/display name', example: 'John Doe', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nickname?: string;

  @ApiPropertyOptional({ description: 'Primary language code', example: 'ja', maxLength: 5 })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  primaryLanguage?: string;

  @ApiPropertyOptional({ description: 'Status code', example: 'active' })
  @IsOptional()
  @IsString()
  statusCode?: string;

  @ApiPropertyOptional({ description: 'Customer tags', example: ['VIP', 'Premium'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional notes', example: 'Important customer', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ description: 'Optimistic lock version', example: 1 })
  @IsInt()
  version!: number;
}

export class UpdateIndividualPiiDto {
  @ApiProperty({ description: 'Personal Identifiable Information', type: PiiDataDto })
  @ValidateNested()
  @Type(() => PiiDataDto)
  pii!: PiiDataDto;

  @ApiProperty({ description: 'Optimistic lock version', example: 1 })
  @IsInt()
  version!: number;
}

// ============================================================================
// Company Customer DTOs
// ============================================================================

export class CreateCompanyCustomerDto {
  @ApiProperty({ description: 'Talent ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  talentId!: string;

  @ApiProperty({ description: 'Company nickname/display name', example: 'Acme Corp', maxLength: 128 })
  @IsString()
  @MaxLength(128)
  nickname!: string;

  @ApiPropertyOptional({ description: 'Primary language code', example: 'ja', maxLength: 5 })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  primaryLanguage?: string;

  @ApiPropertyOptional({ description: 'Status code', example: 'active' })
  @IsOptional()
  @IsString()
  statusCode?: string;

  @ApiPropertyOptional({ description: 'Customer tags', example: ['B2B', 'Enterprise'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Customer acquisition source', example: 'Trade Show', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  source?: string;

  @ApiPropertyOptional({ description: 'Additional notes', example: 'Key enterprise client', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'External system ID', example: 'CRM-CORP-12345', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalId?: string;

  @ApiPropertyOptional({ description: 'Consumer code for external ID', example: 'CRM' })
  @IsOptional()
  @IsString()
  consumerCode?: string;

  // Company-specific fields
  @ApiProperty({ description: 'Company legal name', example: 'Acme Corporation Ltd.', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  companyLegalName!: string;

  @ApiPropertyOptional({ description: 'Company short name', example: 'Acme', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  companyShortName?: string;

  @ApiPropertyOptional({ description: 'Business registration number', example: '1234-5678-9012', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  registrationNumber?: string;

  @ApiPropertyOptional({ description: 'VAT/Tax ID', example: 'JP1234567890', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  vatId?: string;

  @ApiPropertyOptional({ description: 'Company establishment date', example: '2010-04-01' })
  @IsOptional()
  @IsDateString()
  establishmentDate?: string;

  @ApiPropertyOptional({ description: 'Business segment code', example: 'TECH' })
  @IsOptional()
  @IsString()
  businessSegmentCode?: string;

  @ApiPropertyOptional({ description: 'Company website URL', example: 'https://www.acme.com', maxLength: 512 })
  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  website?: string;

  @ApiPropertyOptional({ description: 'Primary contact name', example: 'John Smith', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  contactName?: string;

  @ApiPropertyOptional({ description: 'Primary contact phone', example: '+81-3-1234-5678', maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Primary contact email', example: 'contact@acme.com', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Contact department', example: 'Sales', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  contactDepartment?: string;
}

export class UpdateCompanyCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  primaryLanguage?: string;

  @IsOptional()
  @IsString()
  statusCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // Company-specific fields
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyLegalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  companyShortName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  vatId?: string;

  @IsOptional()
  @IsDateString()
  establishmentDate?: string;

  @IsOptional()
  @IsString()
  businessSegmentCode?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  contactDepartment?: string;

  @IsInt()
  version!: number;
}

// ============================================================================
// Deactivation DTOs
// ============================================================================

export class DeactivateCustomerDto {
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @IsInt()
  version!: number;
}

// ============================================================================
// Platform Identity DTOs
// ============================================================================

export class CreatePlatformIdentityDto {
  @IsString()
  platformCode!: string;

  @IsString()
  @MaxLength(128)
  platformUid!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  platformNickname?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  platformAvatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

export class UpdatePlatformIdentityDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  platformUid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  platformNickname?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  platformAvatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

export class PlatformIdentityHistoryQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  platformCode?: string;

  @IsOptional()
  @IsString()
  changeType?: string;
}

// ============================================================================
// Membership Record DTOs
// ============================================================================

export class MembershipListQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  platformCode?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeExpired?: boolean;

  @IsOptional()
  @IsString()
  sort?: string = 'validFrom';
}

export class CreateMembershipDto {
  @IsString()
  platformCode!: string;

  @IsString()
  membershipLevelCode!: string;

  @IsDateString()
  validFrom!: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateMembershipDto {
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

// ============================================================================
// External ID DTOs
// ============================================================================

export class CreateExternalIdDto {
  @IsString()
  consumerCode!: string;

  @IsString()
  @MaxLength(128)
  externalId!: string;
}

// ============================================================================
// Batch Operation DTOs (PRD §11.7)
// ============================================================================

export enum BatchAction {
  DEACTIVATE = 'deactivate',
  REACTIVATE = 'reactivate',
  ADD_TAGS = 'add_tags',
  REMOVE_TAGS = 'remove_tags',
  UPDATE_MEMBERSHIP = 'update_membership',
}

export class BatchOperationDto {
  @IsArray()
  @IsUUID('4', { each: true })
  customerIds!: string[];

  @IsEnum(BatchAction)
  action!: BatchAction;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  membershipClassCode?: string;

  @IsOptional()
  @IsString()
  membershipTypeCode?: string;

  @IsOptional()
  @IsString()
  membershipLevelCode?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class BatchOperationResultDto {
  total: number;
  success: number;
  failed: number;
  errors: Array<{
    customerId: string;
    error: string;
  }>;
}

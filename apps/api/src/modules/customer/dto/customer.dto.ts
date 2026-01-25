// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
  IsDateString,
  ValidateNested,
  MaxLength,
  IsEmail,
  IsUrl,
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
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

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
  @IsUUID()
  talentId!: string;

  @IsOptional()
  @IsEnum(ProfileType)
  profileType?: ProfileType;

  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasMembership?: boolean;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @IsOptional()
  @IsString()
  sort?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

// ============================================================================
// Individual Customer DTOs
// ============================================================================

export class PhoneNumberDto {
  @IsString()
  typeCode!: string;

  @IsString()
  number!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class EmailDto {
  @IsString()
  typeCode!: string;

  @IsEmail()
  address!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class AddressDto {
  @IsString()
  typeCode!: string;

  @IsString()
  countryCode!: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class PiiDataDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  givenName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  familyName?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'undisclosed'])
  gender?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneNumberDto)
  phoneNumbers?: PhoneNumberDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailDto)
  emails?: EmailDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];
}

export class CreateIndividualCustomerDto {
  @IsUUID()
  talentId!: string;

  @IsString()
  @MaxLength(128)
  nickname!: string;

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
  @MaxLength(64)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalId?: string;

  @IsOptional()
  @IsString()
  consumerCode?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PiiDataDto)
  pii?: PiiDataDto;
}

export class UpdateIndividualCustomerDto {
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

  @IsInt()
  version!: number;
}

export class UpdateIndividualPiiDto {
  @ValidateNested()
  @Type(() => PiiDataDto)
  pii!: PiiDataDto;

  @IsInt()
  version!: number;
}

// ============================================================================
// Company Customer DTOs
// ============================================================================

export class CreateCompanyCustomerDto {
  @IsUUID()
  talentId!: string;

  @IsString()
  @MaxLength(128)
  nickname!: string;

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
  @MaxLength(64)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalId?: string;

  @IsOptional()
  @IsString()
  consumerCode?: string;

  // Company-specific fields
  @IsString()
  @MaxLength(255)
  companyLegalName!: string;

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

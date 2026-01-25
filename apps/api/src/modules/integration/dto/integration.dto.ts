// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsEnum,
  IsUUID,
  IsUrl,
  IsObject,
  Min,
  Max,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// =============================================================================
// Enums
// =============================================================================

export enum AdapterType {
  OAUTH = 'oauth',
  API_KEY = 'api_key',
  WEBHOOK = 'webhook',
}

export enum OwnerType {
  TENANT = 'tenant',
  SUBSIDIARY = 'subsidiary',
  TALENT = 'talent',
}

export enum WebhookEventType {
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DEACTIVATED = 'customer.deactivated',
  MEMBERSHIP_CREATED = 'membership.created',
  MEMBERSHIP_EXPIRED = 'membership.expired',
  MEMBERSHIP_RENEWED = 'membership.renewed',
  MARSHMALLOW_RECEIVED = 'marshmallow.received',
  MARSHMALLOW_APPROVED = 'marshmallow.approved',
  REPORT_COMPLETED = 'report.completed',
  REPORT_FAILED = 'report.failed',
  IMPORT_COMPLETED = 'import.completed',
  IMPORT_FAILED = 'import.failed',
}

// =============================================================================
// Adapter DTOs
// =============================================================================

export class AdapterListQueryDto {
  @IsOptional()
  @IsEnum(OwnerType)
  scopeType?: OwnerType;

  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @IsOptional()
  @IsUUID()
  platformId?: string;

  @IsOptional()
  @IsEnum(AdapterType)
  adapterType?: AdapterType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInherited?: boolean = true;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDisabled?: boolean = false;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ownerOnly?: boolean = false;
}

export class AdapterConfigItemDto {
  @IsString()
  @MaxLength(64)
  configKey!: string;

  @IsString()
  @MaxLength(2048)
  configValue!: string;
}

export class CreateAdapterDto {
  @IsUUID()
  platformId!: string;

  @IsString()
  @Matches(/^[A-Z0-9_]{3,32}$/)
  code!: string;

  @IsString()
  @MaxLength(128)
  nameEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameJa?: string;

  @IsEnum(AdapterType)
  adapterType!: AdapterType;

  @IsOptional()
  @IsBoolean()
  inherit?: boolean = true;

  @IsOptional()
  @IsEnum(OwnerType)
  ownerType?: OwnerType;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdapterConfigItemDto)
  configs?: AdapterConfigItemDto[];
}

export class UpdateAdapterDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameJa?: string;

  @IsOptional()
  @IsBoolean()
  inherit?: boolean;

  @IsInt()
  version!: number;
}

export class UpdateAdapterConfigsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdapterConfigItemDto)
  configs!: AdapterConfigItemDto[];

  @IsInt()
  adapterVersion!: number;
}

export class DisableAdapterDto {
  @IsEnum(OwnerType)
  scopeType!: OwnerType;

  @IsUUID()
  scopeId!: string;
}

// =============================================================================
// Webhook DTOs
// =============================================================================

export class RetryPolicyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxRetries?: number = 3;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(60000)
  backoffMs?: number = 1000;
}

export class CreateWebhookDto {
  @IsString()
  @Matches(/^[A-Z0-9_]{3,32}$/)
  code!: string;

  @IsString()
  @MaxLength(128)
  nameEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameJa?: string;

  @IsUrl()
  @MaxLength(512)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  secret?: string;

  @IsArray()
  @IsEnum(WebhookEventType, { each: true })
  events!: WebhookEventType[];

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @ValidateNested()
  @Type(() => RetryPolicyDto)
  retryPolicy?: RetryPolicyDto;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameJa?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  secret?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(WebhookEventType, { each: true })
  events?: WebhookEventType[];

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @ValidateNested()
  @Type(() => RetryPolicyDto)
  retryPolicy?: RetryPolicyDto;

  @IsInt()
  version!: number;
}

// =============================================================================
// Integration Log DTOs
// =============================================================================

export class IntegrationLogQueryDto {
  @IsOptional()
  @IsUUID()
  consumerId?: string;

  @IsOptional()
  @IsString()
  consumerCode?: string;

  @IsOptional()
  @IsEnum(['inbound', 'outbound'])
  direction?: 'inbound' | 'outbound';

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  traceId?: string;

  @IsOptional()
  @IsString()
  endpoint?: string;

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

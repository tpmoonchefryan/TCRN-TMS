// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { LocalizedText, PartialLocalizedText } from '@tcrn/shared';

// =============================================================================
// Enums
// =============================================================================

export enum AdapterType {
  OAUTH = 'oauth',
  API_KEY = 'api_key',
  WEBHOOK = 'webhook',
  AI = 'ai',
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

function toBooleanQueryValue(value: unknown): unknown {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true' || normalized === '1') {
      return true;
    }

    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  return value;
}

// =============================================================================
// Adapter DTOs
// =============================================================================

export class AdapterListQueryDto {
  @IsOptional()
  @IsUUID()
  platformId?: string;

  @IsOptional()
  @IsEnum(AdapterType)
  adapterType?: AdapterType;

  @IsOptional()
  @Transform(({ value }) => toBooleanQueryValue(value))
  @IsBoolean()
  includeInherited?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => toBooleanQueryValue(value))
  @IsBoolean()
  includeDisabled?: boolean = false;
}

export class AdapterConfigItemDto {
  @IsString()
  @MaxLength(64)
  configKey!: string;

  @IsString()
  @MaxLength(2048)
  configValue!: string;
}

export class AdapterConfigMutationItemDto {
  @IsString()
  @MaxLength(64)
  configKey!: string;

  @IsOptional()
  @IsIn(['keep', 'replace', 'clear'])
  mutation?: 'keep' | 'replace' | 'clear';

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  configValue?: string;
}

export class CreateAdapterDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  definitionKey?: string;

  @IsOptional()
  @IsUUID()
  platformId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_]{3,32}$/)
  code?: string;

  @IsOptional()
  @IsObject()
  name?: LocalizedText;

  @IsOptional()
  @IsEnum(AdapterType)
  adapterType?: AdapterType;

  @IsOptional()
  @IsBoolean()
  inherit?: boolean = true;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdapterConfigItemDto)
  configs?: AdapterConfigItemDto[];
}

export class UpdateAdapterDto {
  @IsOptional()
  @IsObject()
  name?: PartialLocalizedText;

  @IsOptional()
  @IsBoolean()
  inherit?: boolean;

  @IsInt()
  version!: number;
}

export class UpdateAdapterConfigsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdapterConfigMutationItemDto)
  configs!: AdapterConfigMutationItemDto[];

  @IsInt()
  adapterVersion!: number;
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
  @IsOptional()
  @IsString()
  @MaxLength(64)
  definitionKey?: string;

  @ValidateIf((dto: CreateWebhookDto) => !dto.definitionKey)
  @IsString()
  @Matches(/^[A-Z0-9_]{3,32}$/)
  code?: string;

  @ValidateIf((dto: CreateWebhookDto) => !dto.definitionKey)
  @IsObject()
  name?: LocalizedText;

  @IsUrl()
  @MaxLength(512)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  secret?: string;

  @ValidateIf((dto: CreateWebhookDto) => !dto.definitionKey)
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

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  monitoredTalentIds?: string[];
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsObject()
  name?: PartialLocalizedText;

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

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  monitoredTalentIds?: string[];

  @IsInt()
  version!: number;
}

export class WebhookDeliveryAttemptQueryDto {
  @IsOptional()
  @IsIn([
    'dry_run',
    'pending',
    'delivered',
    'failed',
    'retry_scheduled',
    'dead_lettered',
    'replayed',
    'blocked',
  ])
  status?: string;

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

export class WebhookDeliveryOperationDto {
  @ApiProperty({
    description: 'Operator-entered audit reason for a webhook test delivery or replay.',
    example: 'Validate endpoint readiness after rotating the receiver secret.',
  })
  @IsString()
  @MaxLength(512)
  reason!: string;

  @ApiPropertyOptional({
    description: 'When true, records outbox and attempt state without outbound HTTP dispatch.',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => toBooleanQueryValue(value))
  @IsBoolean()
  dryRun?: boolean = true;

  @ApiPropertyOptional({
    description: 'TCRN-owned event code used for a dry-run test payload.',
    enum: WebhookEventType,
  })
  @IsOptional()
  @IsEnum(WebhookEventType)
  sampleEventCode?: WebhookEventType;

  @ApiPropertyOptional({
    description:
      'Optional idempotency key. Duplicate keys for the same operation return the existing outbox result; keys already used for a different operation return 409 RES_CONFLICT.',
    example: 'TEST_P7_WEBHOOK_IDEMPOTENCY',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
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

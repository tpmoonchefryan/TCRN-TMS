// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUrl,
    Matches,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export enum AuthType {
  MTLS = 'mtls',
  API_KEY = 'api_key',
}

// ============================================================================
// PII Service Config DTOs
// ============================================================================

export class CreatePiiServiceConfigDto {
  @ApiProperty({ description: 'PII service config code', example: 'DEFAULT_PII', pattern: '^[A-Z0-9_]{3,32}$' })
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Z0-9_]{3,32}$/, {
    message: 'Code must be 3-32 uppercase alphanumeric characters or underscores',
  })
  code!: string;

  @ApiProperty({ description: 'Name in English', example: 'Default PII Service' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiPropertyOptional({ description: 'Name in Chinese', example: '默认 PII 服务' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Name in Japanese', example: 'デフォルト PII サービス' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameJa?: string;

  @ApiPropertyOptional({ description: 'Description in English', example: 'Primary PII relay service' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Chinese', example: '主 PII 转发服务' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ description: 'Description in Japanese', example: '主要な PII リレーサービス' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiProperty({ description: 'Base API URL for the PII service', example: 'https://pii.internal.tcrn.app' })
  @IsUrl()
  @MaxLength(512)
  apiUrl!: string;

  @ApiProperty({ description: 'Authentication mode used to reach the PII service', enum: AuthType, example: AuthType.MTLS })
  @IsEnum(AuthType)
  authType!: AuthType;

  // mTLS authentication (Base64 encoded)
  @ApiPropertyOptional({ description: 'mTLS client certificate (PEM/Base64)', example: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t' })
  @IsOptional()
  @IsString()
  mtlsClientCert?: string;

  @ApiPropertyOptional({ description: 'mTLS client private key (PEM/Base64)', example: 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t' })
  @IsOptional()
  @IsString()
  mtlsClientKey?: string;

  @ApiPropertyOptional({ description: 'mTLS CA certificate (PEM/Base64)', example: 'LS0tLS1CRUdJTiBDQSBCRUdJTi0tLS0t' })
  @IsOptional()
  @IsString()
  mtlsCaCert?: string;

  // API Key authentication
  @ApiPropertyOptional({ description: 'API key used when authType is `api_key`', example: 'pii_live_secret_key' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'Health-check endpoint override', example: 'https://pii.internal.tcrn.app/health' })
  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  healthCheckUrl?: string;

  @ApiPropertyOptional({ description: 'Health-check interval in seconds', example: 60, minimum: 10, maximum: 3600 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(3600)
  healthCheckIntervalSec?: number;
}

export class UpdatePiiServiceConfigDto {
  @ApiPropertyOptional({ description: 'Name in English', example: 'Default PII Service' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Name in Chinese', example: '默认 PII 服务' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Name in Japanese', example: 'デフォルト PII サービス' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameJa?: string;

  @ApiPropertyOptional({ description: 'Description in English', example: 'Primary PII relay service' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Chinese', example: '主 PII 转发服务' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ description: 'Description in Japanese', example: '主要な PII リレーサービス' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiPropertyOptional({ description: 'Base API URL for the PII service', example: 'https://pii.internal.tcrn.app' })
  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  apiUrl?: string;

  @ApiPropertyOptional({ description: 'Authentication mode used to reach the PII service', enum: AuthType, example: AuthType.API_KEY })
  @IsOptional()
  @IsEnum(AuthType)
  authType?: AuthType;

  @ApiPropertyOptional({ description: 'mTLS client certificate (PEM/Base64)' })
  @IsOptional()
  @IsString()
  mtlsClientCert?: string;

  @ApiPropertyOptional({ description: 'mTLS client private key (PEM/Base64)' })
  @IsOptional()
  @IsString()
  mtlsClientKey?: string;

  @ApiPropertyOptional({ description: 'mTLS CA certificate (PEM/Base64)' })
  @IsOptional()
  @IsString()
  mtlsCaCert?: string;

  @ApiPropertyOptional({ description: 'API key used when authType is `api_key`', example: 'pii_live_secret_key' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'Health-check endpoint override', example: 'https://pii.internal.tcrn.app/health' })
  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  healthCheckUrl?: string;

  @ApiPropertyOptional({ description: 'Health-check interval in seconds', example: 60, minimum: 10, maximum: 3600 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(3600)
  healthCheckIntervalSec?: number;

  @ApiPropertyOptional({ description: 'Whether the config is active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  version!: number;
}

// ============================================================================
// Profile Store DTOs
// ============================================================================

export class CreateProfileStoreDto {
  @ApiProperty({ description: 'Profile-store code', example: 'DEFAULT_STORE', pattern: '^[A-Z0-9_]{3,32}$' })
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Z0-9_]{3,32}$/, {
    message: 'Code must be 3-32 uppercase alphanumeric characters or underscores',
  })
  code!: string;

  @ApiProperty({ description: 'Name in English', example: 'Default Profile Store' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiPropertyOptional({ description: 'Name in Chinese', example: '默认档案库' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Name in Japanese', example: 'デフォルトプロフィールストア' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameJa?: string;

  @ApiPropertyOptional({ description: 'Description in English', example: 'Primary customer profile store' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Chinese', example: '主要客户档案库' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ description: 'Description in Japanese', example: '主要な顧客プロフィールストア' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiPropertyOptional({ description: 'Whether this store becomes the default store', example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateProfileStoreDto {
  @ApiPropertyOptional({ description: 'Name in English', example: 'Default Profile Store' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Name in Chinese', example: '默认档案库' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Name in Japanese', example: 'デフォルトプロフィールストア' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameJa?: string;

  @ApiPropertyOptional({ description: 'Description in English', example: 'Primary customer profile store' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Chinese', example: '主要客户档案库' })
  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @ApiPropertyOptional({ description: 'Description in Japanese', example: '主要な顧客プロフィールストア' })
  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @ApiPropertyOptional({ description: 'Whether this store should be the default store', example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Whether this store is active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  version!: number;
}

// ============================================================================
// Query DTOs
// ============================================================================

export class PaginationQueryDto {
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

  @ApiPropertyOptional({ description: 'Include inactive records in the list', example: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean;
}

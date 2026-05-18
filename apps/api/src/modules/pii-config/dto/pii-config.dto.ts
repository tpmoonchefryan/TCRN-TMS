// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { LocalizedText, PartialLocalizedText } from '@tcrn/shared';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsObject,
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

const PII_SERVICE_NAME_EXAMPLE: LocalizedText = {
  en: 'Default PII Service',
  zh_HANS: '默认 PII 服务',
  zh_HANT: '預設 PII 服務',
  ja: 'デフォルト PII サービス',
  ko: '기본 PII 서비스',
  fr: 'Service PII par defaut',
};

const PII_SERVICE_DESCRIPTION_EXAMPLE: LocalizedText = {
  en: 'Primary PII relay service',
  zh_HANS: '主 PII 转发服务',
  zh_HANT: '主 PII 轉發服務',
  ja: '主要な PII リレーサービス',
  ko: '주요 PII 릴레이 서비스',
  fr: 'Service relais PII principal',
};

const PROFILE_STORE_NAME_EXAMPLE: LocalizedText = {
  en: 'Default Profile Store',
  zh_HANS: '默认档案库',
  zh_HANT: '預設檔案庫',
  ja: 'デフォルトプロフィールストア',
  ko: '기본 프로필 저장소',
  fr: 'Magasin de profils par defaut',
};

const PROFILE_STORE_DESCRIPTION_EXAMPLE: LocalizedText = {
  en: 'Primary customer profile store',
  zh_HANS: '主要客户档案库',
  zh_HANT: '主要客戶檔案庫',
  ja: '主要な顧客プロフィールストア',
  ko: '주요 고객 프로필 저장소',
  fr: 'Magasin principal des profils clients',
};

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

  @ApiProperty({
    description: 'Localized PII service name keyed by SupportedUiLocale',
    additionalProperties: { type: 'string' },
    example: PII_SERVICE_NAME_EXAMPLE,
  })
  @IsObject()
  name!: LocalizedText;

  @ApiPropertyOptional({
    description: 'Localized PII service description keyed by SupportedUiLocale',
    additionalProperties: { type: 'string' },
    example: PII_SERVICE_DESCRIPTION_EXAMPLE,
  })
  @IsOptional()
  @IsObject()
  description?: PartialLocalizedText;

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
  @ApiPropertyOptional({
    description: 'Localized PII service name patch keyed by SupportedUiLocale',
    additionalProperties: { type: 'string' },
    example: { en: 'Default PII Service' },
  })
  @IsOptional()
  @IsObject()
  name?: PartialLocalizedText;

  @ApiPropertyOptional({
    description: 'Localized PII service description patch keyed by SupportedUiLocale',
    additionalProperties: { type: 'string' },
    example: { en: 'Primary PII relay service' },
  })
  @IsOptional()
  @IsObject()
  description?: PartialLocalizedText;

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

  @ApiProperty({
    description: 'Localized profile-store name keyed by SupportedUiLocale',
    additionalProperties: { type: 'string' },
    example: PROFILE_STORE_NAME_EXAMPLE,
  })
  @IsObject()
  name!: LocalizedText;

  @ApiPropertyOptional({
    description: 'Localized profile-store description keyed by SupportedUiLocale',
    additionalProperties: { type: 'string' },
    example: PROFILE_STORE_DESCRIPTION_EXAMPLE,
  })
  @IsOptional()
  @IsObject()
  description?: PartialLocalizedText;

  @ApiPropertyOptional({ description: 'Whether this store becomes the default store', example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateProfileStoreDto {
  @ApiPropertyOptional({
    description: 'Localized profile-store name patch keyed by SupportedUiLocale',
    additionalProperties: { type: 'string' },
    example: { en: 'Default Profile Store' },
  })
  @IsOptional()
  @IsObject()
  name?: PartialLocalizedText;

  @ApiPropertyOptional({
    description: 'Localized profile-store description patch keyed by SupportedUiLocale',
    additionalProperties: { type: 'string' },
    example: { en: 'Primary customer profile store' },
  })
  @IsOptional()
  @IsObject()
  description?: PartialLocalizedText;

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
  @ApiPropertyOptional({ description: 'Search keyword', example: 'DEFAULT' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

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

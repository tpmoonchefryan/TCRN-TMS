// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsUrl,
  MaxLength,
  Matches,
  Min,
  Max,
} from 'class-validator';

export enum AuthType {
  MTLS = 'mtls',
  API_KEY = 'api_key',
}

// ============================================================================
// PII Service Config DTOs
// ============================================================================

export class CreatePiiServiceConfigDto {
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Z0-9_]{3,32}$/, {
    message: 'Code must be 3-32 uppercase alphanumeric characters or underscores',
  })
  code!: string;

  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameJa?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @IsUrl()
  @MaxLength(512)
  apiUrl!: string;

  @IsEnum(AuthType)
  authType!: AuthType;

  // mTLS authentication (Base64 encoded)
  @IsOptional()
  @IsString()
  mtlsClientCert?: string;

  @IsOptional()
  @IsString()
  mtlsClientKey?: string;

  @IsOptional()
  @IsString()
  mtlsCaCert?: string;

  // API Key authentication
  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  healthCheckUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(3600)
  healthCheckIntervalSec?: number;
}

export class UpdatePiiServiceConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameJa?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  apiUrl?: string;

  @IsOptional()
  @IsEnum(AuthType)
  authType?: AuthType;

  @IsOptional()
  @IsString()
  mtlsClientCert?: string;

  @IsOptional()
  @IsString()
  mtlsClientKey?: string;

  @IsOptional()
  @IsString()
  mtlsCaCert?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  healthCheckUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(3600)
  healthCheckIntervalSec?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsInt()
  version!: number;
}

// ============================================================================
// Profile Store DTOs
// ============================================================================

export class CreateProfileStoreDto {
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Z0-9_]{3,32}$/, {
    message: 'Code must be 3-32 uppercase alphanumeric characters or underscores',
  })
  code!: string;

  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameJa?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @IsOptional()
  @IsString()
  piiServiceConfigCode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateProfileStoreDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameJa?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @IsOptional()
  @IsString()
  descriptionJa?: string;

  @IsOptional()
  @IsString()
  piiServiceConfigCode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsInt()
  version!: number;
}

// ============================================================================
// Query DTOs
// ============================================================================

export class PaginationQueryDto {
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

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean;
}

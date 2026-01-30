// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

// =============================================================================
// Enums
// =============================================================================

export enum PatternType {
  DOMAIN = 'domain',
  URL_REGEX = 'url_regex',
  KEYWORD = 'keyword',
}

export enum BlocklistSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum BlocklistAction {
  REJECT = 'reject',
  FLAG = 'flag',
  REPLACE = 'replace',
}

export enum OwnerType {
  TENANT = 'tenant',
  SUBSIDIARY = 'subsidiary',
  TALENT = 'talent',
}

// =============================================================================
// Query DTOs
// =============================================================================

export class ExternalBlocklistQueryDto {
  @IsOptional()
  @IsEnum(OwnerType)
  scopeType?: OwnerType = OwnerType.TENANT;

  @IsOptional()
  @IsString()
  scopeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

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
  includeInactive?: boolean = false;

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

export class DisableExternalBlocklistDto {
  @IsEnum(OwnerType)
  scopeType!: OwnerType;

  @IsOptional()
  @IsString()
  scopeId?: string;
}

// =============================================================================
// Create/Update DTOs
// =============================================================================

export class CreateExternalBlocklistDto {
  @IsEnum(OwnerType)
  ownerType!: OwnerType;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  pattern!: string;

  @IsEnum(PatternType)
  patternType!: PatternType;

  @IsString()
  @MinLength(1)
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

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsEnum(BlocklistSeverity)
  severity?: BlocklistSeverity = BlocklistSeverity.MEDIUM;

  @IsOptional()
  @IsEnum(BlocklistAction)
  action?: BlocklistAction = BlocklistAction.REJECT;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  replacement?: string;

  @IsOptional()
  @IsBoolean()
  inherit?: boolean = true;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;

  @IsOptional()
  @IsBoolean()
  isForceUse?: boolean = false;
}

export class UpdateExternalBlocklistDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  pattern?: string;

  @IsOptional()
  @IsEnum(PatternType)
  patternType?: PatternType;

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
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsEnum(BlocklistSeverity)
  severity?: BlocklistSeverity;

  @IsOptional()
  @IsEnum(BlocklistAction)
  action?: BlocklistAction;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  replacement?: string;

  @IsOptional()
  @IsBoolean()
  inherit?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isForceUse?: boolean;

  @IsInt()
  version!: number;
}

export class BatchToggleDto {
  @IsString({ each: true })
  ids!: string[];

  @IsBoolean()
  isActive!: boolean;
}

// =============================================================================
// Response Types
// =============================================================================

export interface ExternalBlocklistItem {
  id: string;
  ownerType: string;
  ownerId: string | null;
  pattern: string;
  patternType: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  description: string | null;
  category: string | null;
  severity: string;
  action: string;
  replacement: string;
  inherit: boolean;
  sortOrder?: number;
  isActive: boolean;
  isForceUse?: boolean;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  // Inheritance metadata
  isInherited?: boolean;
  isDisabledHere?: boolean;
  canDisable?: boolean;
}

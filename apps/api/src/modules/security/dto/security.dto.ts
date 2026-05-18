// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { LocalizedText, PartialLocalizedText } from '@tcrn/shared';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';

// =============================================================================
// Enums
// =============================================================================

export enum BlocklistPatternType {
  KEYWORD = 'keyword',
  REGEX = 'regex',
  WILDCARD = 'wildcard',
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

export enum IpRuleType {
  WHITELIST = 'whitelist',
  BLACKLIST = 'blacklist',
}

export enum IpRuleScope {
  GLOBAL = 'global',
  ADMIN = 'admin',
  PUBLIC = 'public',
  API = 'api',
}

export enum BlocklistScopeCategory {
  TENANT = 'tenant',
  SUBSIDIARY = 'subsidiary',
  TALENT = 'talent',
  PROFILE_STORE = 'profile-store',
  SURFACE = 'surface',
}

export enum BlocklistSurfaceScope {
  MARSHMALLOW = 'marshmallow',
}

export class BlocklistStructuredScopeEntryDto {
  @ApiProperty({
    description: 'Structured scope category. Only surface entries affect the current runtime matcher.',
    enum: BlocklistScopeCategory,
    example: BlocklistScopeCategory.SURFACE,
  })
  @IsEnum(BlocklistScopeCategory)
  category!: BlocklistScopeCategory;

  @ApiPropertyOptional({
    description: 'Runtime surface token. Required when category=surface.',
    enum: BlocklistSurfaceScope,
    example: BlocklistSurfaceScope.MARSHMALLOW,
  })
  @IsOptional()
  @IsEnum(BlocklistSurfaceScope)
  value?: BlocklistSurfaceScope;
}

export class BlocklistStructuredScopeDto {
  @ApiProperty({
    description: 'Allow-list structured scope entries. Owner categories are descriptive; surface entries normalize to scope[].',
    type: [BlocklistStructuredScopeEntryDto],
    example: [
      { category: BlocklistScopeCategory.TENANT },
      { category: BlocklistScopeCategory.SURFACE, value: BlocklistSurfaceScope.MARSHMALLOW },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlocklistStructuredScopeEntryDto)
  entries!: BlocklistStructuredScopeEntryDto[];
}

// =============================================================================
// Blocklist DTOs
// =============================================================================

export class BlocklistListQueryDto {
  @ApiPropertyOptional({ description: 'Scope type', enum: ['tenant', 'subsidiary', 'talent'], example: 'tenant' })
  @IsOptional()
  @IsEnum(['tenant', 'subsidiary', 'talent'])
  scopeType?: 'tenant' | 'subsidiary' | 'talent' = 'tenant';

  @ApiPropertyOptional({ description: 'Scope ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @ApiPropertyOptional({ description: 'Filter by category', example: 'profanity' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by pattern type', enum: BlocklistPatternType })
  @IsOptional()
  @IsEnum(BlocklistPatternType)
  patternType?: BlocklistPatternType;

  @ApiPropertyOptional({ description: 'Filter by scope', example: 'marshmallow' })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({ description: 'Include inherited entries', example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInherited?: boolean = true;

  @ApiPropertyOptional({ description: 'Include disabled entries', example: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDisabled?: boolean = false;

  @ApiPropertyOptional({ description: 'Include inactive entries', example: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean = false;

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

export class DisableScopeDto {
  @ApiProperty({ description: 'Scope type', enum: ['tenant', 'subsidiary', 'talent'] })
  @IsEnum(['tenant', 'subsidiary', 'talent'])
  scopeType!: 'tenant' | 'subsidiary' | 'talent';

  @ApiPropertyOptional({ description: 'Scope ID (UUID)' })
  @IsOptional()
  @IsUUID()
  scopeId?: string;
}

export class CreateBlocklistDto {
  @ApiProperty({ description: 'Owner type', enum: ['tenant', 'subsidiary', 'talent'] })
  @IsEnum(['tenant', 'subsidiary', 'talent'])
  ownerType!: 'tenant' | 'subsidiary' | 'talent';

  @ApiPropertyOptional({ description: 'Owner ID (UUID)' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiProperty({ description: 'Blocklist pattern', example: 'badword', maxLength: 512 })
  @IsString()
  @MaxLength(512)
  pattern!: string;

  @ApiProperty({ description: 'Pattern type', enum: BlocklistPatternType })
  @IsEnum(BlocklistPatternType)
  patternType!: BlocklistPatternType;

  @ApiProperty({
    description: 'Localized blocklist name keyed by SupportedUiLocale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      en: 'Profanity Filter',
      zh_HANS: '脏话过滤',
      zh_HANT: '髒話過濾',
      ja: '不適切語フィルター',
      ko: '비속어 필터',
      fr: 'Filtre de grossieretes',
    },
  })
  @IsObject()
  name!: LocalizedText;

  @IsOptional()
  @IsString()
  @MaxLength(500)
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
  replacement?: string = '***';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scope?: string[];

  @ApiPropertyOptional({
    description: 'Structured allow-list scope payload. Normalized to the legacy scope[] runtime tokens before persistence.',
    type: BlocklistStructuredScopeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BlocklistStructuredScopeDto)
  structuredScope?: BlocklistStructuredScopeDto;

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

export class UpdateBlocklistDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  pattern?: string;

  @IsOptional()
  @IsEnum(BlocklistPatternType)
  patternType?: BlocklistPatternType;

  @ApiPropertyOptional({
    description: 'Localized blocklist name patch keyed by SupportedUiLocale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      en: 'Profanity Filter',
      zh_HANS: '脏话过滤',
    },
  })
  @IsOptional()
  @IsObject()
  name?: PartialLocalizedText;

  @IsOptional()
  @IsString()
  @MaxLength(500)
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
  @IsArray()
  @IsString({ each: true })
  scope?: string[];

  @ApiPropertyOptional({
    description: 'Structured allow-list scope payload. Normalized to the legacy scope[] runtime tokens before persistence.',
    type: BlocklistStructuredScopeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BlocklistStructuredScopeDto)
  structuredScope?: BlocklistStructuredScopeDto;

  @IsOptional()
  @IsBoolean()
  inherit?: boolean;

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

export class TestBlocklistDto {
  @IsString()
  @MaxLength(2000)
  testContent!: string;

  @IsString()
  @MaxLength(512)
  pattern!: string;

  @IsEnum(BlocklistPatternType)
  patternType!: BlocklistPatternType;
}

// =============================================================================
// IP Access Rule DTOs
// =============================================================================

export class IpRuleListQueryDto {
  @IsOptional()
  @IsEnum(IpRuleType)
  ruleType?: IpRuleType;

  @IsOptional()
  @IsEnum(IpRuleScope)
  scope?: IpRuleScope;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

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

export class CreateIpRuleDto {
  @IsEnum(IpRuleType)
  ruleType!: IpRuleType;

  @IsString()
  @Matches(/^[\d.:/]+$/)
  @MaxLength(64)
  ipPattern!: string;

  @IsEnum(IpRuleScope)
  scope!: IpRuleScope;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class CheckIpDto {
  @IsString()
  @MaxLength(64)
  ip!: string;

  @IsOptional()
  @IsEnum(IpRuleScope)
  scope?: IpRuleScope = IpRuleScope.GLOBAL;
}

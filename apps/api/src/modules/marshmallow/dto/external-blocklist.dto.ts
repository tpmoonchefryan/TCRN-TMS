// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsObject,
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
  @ApiPropertyOptional({ description: 'Scope type for the query', enum: OwnerType, example: OwnerType.TENANT, default: OwnerType.TENANT })
  @IsOptional()
  @IsEnum(OwnerType)
  scopeType?: OwnerType = OwnerType.TENANT;

  @ApiPropertyOptional({ description: 'Scope identifier when querying subsidiary/talent scope', example: '550e8400-e29b-41d4-a716-446655440010' })
  @IsOptional()
  @IsString()
  scopeId?: string;

  @ApiPropertyOptional({ description: 'Category filter', example: 'spam' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({ description: 'Include inherited patterns', example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInherited?: boolean = true;

  @ApiPropertyOptional({ description: 'Include disabled patterns', example: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDisabled?: boolean = false;

  @ApiPropertyOptional({ description: 'Include inactive patterns', example: false, default: false })
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

export class DisableExternalBlocklistDto {
  @ApiProperty({ description: 'Scope type where the inherited pattern is being toggled', enum: OwnerType, example: OwnerType.TALENT })
  @IsEnum(OwnerType)
  scopeType!: OwnerType;

  @ApiPropertyOptional({ description: 'Scope identifier for subsidiary/talent-level toggle', example: '550e8400-e29b-41d4-a716-446655440010' })
  @IsOptional()
  @IsString()
  scopeId?: string;
}

// =============================================================================
// Create/Update DTOs
// =============================================================================

export class CreateExternalBlocklistDto {
  @ApiProperty({ description: 'Owner type for the blocklist pattern', enum: OwnerType, example: OwnerType.TENANT })
  @IsEnum(OwnerType)
  ownerType!: OwnerType;

  @ApiPropertyOptional({ description: 'Owner identifier for subsidiary/talent scope', example: '550e8400-e29b-41d4-a716-446655440010' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ description: 'Blocked pattern', example: 'discord.gg/', maxLength: 512 })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  pattern!: string;

  @ApiProperty({ description: 'Pattern interpretation mode', enum: PatternType, example: PatternType.URL_REGEX })
  @IsEnum(PatternType)
  patternType!: PatternType;

  @ApiProperty({ description: 'Pattern name in English', example: 'Discord Invite Filter', maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  nameEn!: string;

  @ApiPropertyOptional({ description: 'Pattern name in Chinese', example: 'Discord 邀请过滤', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Pattern name in Japanese', example: 'Discord 招待フィルター', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameJa?: string;

  @ApiPropertyOptional({
    description: 'Additional locale values keyed by locale code',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      zh_HANT: 'Discord 邀請過濾',
      ko: 'Discord 초대 차단',
    },
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Pattern description', example: 'Reject external Discord invite links', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Pattern category', example: 'spam', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({ description: 'Pattern severity', enum: BlocklistSeverity, example: BlocklistSeverity.HIGH, default: BlocklistSeverity.MEDIUM })
  @IsOptional()
  @IsEnum(BlocklistSeverity)
  severity?: BlocklistSeverity = BlocklistSeverity.MEDIUM;

  @ApiPropertyOptional({ description: 'Action taken when the pattern matches', enum: BlocklistAction, example: BlocklistAction.REJECT, default: BlocklistAction.REJECT })
  @IsOptional()
  @IsEnum(BlocklistAction)
  action?: BlocklistAction = BlocklistAction.REJECT;

  @ApiPropertyOptional({ description: 'Replacement text when action=replace', example: '[filtered]', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  replacement?: string;

  @ApiPropertyOptional({ description: 'Whether child scopes inherit this pattern', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  inherit?: boolean = true;

  @ApiPropertyOptional({ description: 'Sort order within the scope', example: 0, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;

  @ApiPropertyOptional({ description: 'Whether this pattern is force-enforced in child scopes', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isForceUse?: boolean = false;
}

export class UpdateExternalBlocklistDto {
  @ApiPropertyOptional({ description: 'Blocked pattern', example: 'discord.gg/', maxLength: 512 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  pattern?: string;

  @ApiPropertyOptional({ description: 'Pattern interpretation mode', enum: PatternType, example: PatternType.URL_REGEX })
  @IsOptional()
  @IsEnum(PatternType)
  patternType?: PatternType;

  @ApiPropertyOptional({ description: 'Pattern name in English', example: 'Discord Invite Filter', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Pattern name in Chinese', example: 'Discord 邀请过滤', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Pattern name in Japanese', example: 'Discord 招待フィルター', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameJa?: string;

  @ApiPropertyOptional({
    description: 'Additional locale values keyed by locale code',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      zh_HANT: 'Discord 邀請過濾',
      ko: 'Discord 초대 차단',
    },
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Pattern description', example: 'Reject external Discord invite links', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Pattern category', example: 'spam', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({ description: 'Pattern severity', enum: BlocklistSeverity, example: BlocklistSeverity.HIGH })
  @IsOptional()
  @IsEnum(BlocklistSeverity)
  severity?: BlocklistSeverity;

  @ApiPropertyOptional({ description: 'Action taken when the pattern matches', enum: BlocklistAction, example: BlocklistAction.REJECT })
  @IsOptional()
  @IsEnum(BlocklistAction)
  action?: BlocklistAction;

  @ApiPropertyOptional({ description: 'Replacement text when action=replace', example: '[filtered]', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  replacement?: string;

  @ApiPropertyOptional({ description: 'Whether child scopes inherit this pattern', example: true })
  @IsOptional()
  @IsBoolean()
  inherit?: boolean;

  @ApiPropertyOptional({ description: 'Whether the pattern is active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort order within the scope', example: 1, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Whether this pattern is force-enforced in child scopes', example: false })
  @IsOptional()
  @IsBoolean()
  isForceUse?: boolean;

  @ApiProperty({ description: 'Optimistic lock version', example: 3, minimum: 1 })
  @IsInt()
  version!: number;
}

export class BatchToggleDto {
  @ApiProperty({ description: 'Identifiers to toggle', type: [String], example: ['550e8400-e29b-41d4-a716-446655440010'] })
  @IsString({ each: true })
  ids!: string[];

  @ApiProperty({ description: 'Target active state', example: false })
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
  translations: Record<string, string>;
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

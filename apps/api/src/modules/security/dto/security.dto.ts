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
  Min,
  Max,
  Matches,
  MaxLength,
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

// =============================================================================
// Blocklist DTOs
// =============================================================================

export class BlocklistListQueryDto {
  @IsOptional()
  @IsEnum(['tenant', 'subsidiary', 'talent'])
  scopeType?: 'tenant' | 'subsidiary' | 'talent' = 'tenant';

  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(BlocklistPatternType)
  patternType?: BlocklistPatternType;

  @IsOptional()
  @IsString()
  scope?: string;

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

export class DisableScopeDto {
  @IsEnum(['tenant', 'subsidiary', 'talent'])
  scopeType!: 'tenant' | 'subsidiary' | 'talent';

  @IsOptional()
  @IsUUID()
  scopeId?: string;
}

export class CreateBlocklistDto {
  @IsEnum(['tenant', 'subsidiary', 'talent'])
  ownerType!: 'tenant' | 'subsidiary' | 'talent';

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsString()
  @MaxLength(512)
  pattern!: string;

  @IsEnum(BlocklistPatternType)
  patternType!: BlocklistPatternType;

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
  scope?: string[] = ['marshmallow'];

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
  @Matches(/^[\d.:\/]+$/)
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

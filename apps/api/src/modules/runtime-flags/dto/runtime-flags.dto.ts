// SPDX-License-Identifier: Apache-2.0
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import {
  PLATFORM_TOOL_CONNECTION_ENVIRONMENTS,
  RUNTIME_FLAG_ADAPTER_CODES,
  type PlatformToolConnectionEnvironment,
  type RuntimeFlagAdapterCode,
} from '@tcrn/shared';

export class RuntimeFlagQueryDto {
  @IsOptional()
  @IsIn(PLATFORM_TOOL_CONNECTION_ENVIRONMENTS)
  environment?: PlatformToolConnectionEnvironment = 'local';
}

export class RuntimeFlagEvaluationDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9_.:-]{1,159}$/)
  flagCode!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @IsOptional()
  @IsIn(RUNTIME_FLAG_ADAPTER_CODES)
  adapterCode?: RuntimeFlagAdapterCode;
}

export class RuntimeFlagKillSwitchMutationDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9_.:-]{1,159}$/)
  flagCode!: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(255)
  affectedBehavior!: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;

  @IsISO8601()
  expiresAt!: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(2000)
  rollbackInstruction!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  explicitConfirmation?: boolean = false;
}

export class RuntimeFlagKillSwitchDeactivateDto {
  @ValidateIf((value) => value.flagCode !== undefined)
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9_.:-]{1,159}$/)
  flagCode?: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(2000)
  rollbackInstruction!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class RuntimeFlagProviderProfileDto {
  @IsOptional()
  @IsIn(PLATFORM_TOOL_CONNECTION_ENVIRONMENTS)
  environment?: PlatformToolConnectionEnvironment = 'local';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeAudit?: boolean = false;
}

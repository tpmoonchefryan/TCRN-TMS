// SPDX-License-Identifier: Apache-2.0
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  PLATFORM_TOOL_CONNECTION_ENVIRONMENTS,
  PLATFORM_TOOL_FAMILIES,
  PLATFORM_TOOL_LOCAL_DEV_MODES,
  type PlatformToolConnectionEnvironment,
  type PlatformToolFamily,
  type PlatformToolLocalDevMode,
} from '@tcrn/shared';

export class PlatformToolConnectionQueryDto {
  @IsOptional()
  @IsIn(PLATFORM_TOOL_CONNECTION_ENVIRONMENTS)
  environment?: PlatformToolConnectionEnvironment = 'local';

  @IsOptional()
  @IsIn(PLATFORM_TOOL_FAMILIES)
  family?: PlatformToolFamily;
}

export class PlatformToolConfigMutationDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_.:-]{1,128}$/)
  configKey!: string;

  @IsOptional()
  @IsIn(['keep', 'replace', 'clear', 'reference'])
  mutation?: 'keep' | 'replace' | 'clear' | 'reference' = 'keep';

  @IsOptional()
  @IsBoolean()
  isSecret?: boolean = false;

  @IsOptional()
  @IsObject()
  configValue?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  secretRef?: string;
}

export class UpsertPlatformToolConnectionDto {
  @IsOptional()
  @IsIn(PLATFORM_TOOL_CONNECTION_ENVIRONMENTS)
  environment?: PlatformToolConnectionEnvironment = 'local';

  @IsOptional()
  @IsIn(PLATFORM_TOOL_LOCAL_DEV_MODES)
  deploymentMode?: PlatformToolLocalDevMode = 'disabled';

  @IsOptional()
  @IsIn(PLATFORM_TOOL_LOCAL_DEV_MODES)
  localDevMode?: PlatformToolLocalDevMode = 'disabled';

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  endpointUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  internalServiceUrl?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)
  @MaxLength(128)
  namespace?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)
  @MaxLength(128)
  serviceName?: string | null;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = false;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformToolConfigMutationDto)
  configs?: PlatformToolConfigMutationDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  version?: number;
}

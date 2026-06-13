// SPDX-License-Identifier: Apache-2.0
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  EVENT_BACKBONE_BRIDGE_MODES,
  PLATFORM_TOOL_CONNECTION_ENVIRONMENTS,
  type EventBackboneBridgeMode,
  type PlatformToolConnectionEnvironment,
} from '@tcrn/shared';

export class EventBackboneQueryDto {
  @ApiPropertyOptional({
    enum: PLATFORM_TOOL_CONNECTION_ENVIRONMENTS,
    default: 'local',
    description: 'Runtime environment selector for AC readback evidence.',
  })
  @IsOptional()
  @IsIn(PLATFORM_TOOL_CONNECTION_ENVIRONMENTS)
  environment?: PlatformToolConnectionEnvironment = 'local';

  @ApiPropertyOptional({
    enum: EVENT_BACKBONE_BRIDGE_MODES,
    default: 'disabled',
    description: 'Bridge mode preview. Phase 8 defaults to disabled.',
  })
  @IsOptional()
  @IsIn(EVENT_BACKBONE_BRIDGE_MODES)
  bridgeMode?: EventBackboneBridgeMode = 'disabled';
}

export class EventBackboneReplayPreviewDto {
  @ApiProperty({
    maxLength: 128,
    description: 'Outbox record identifier to preview for replay authorization.',
  })
  @IsString()
  @MaxLength(128)
  outboxId!: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 500,
    description: 'Operator reason required for replay preview audit.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Replay preview is dry-run only in Phase 8.',
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean = true;
}

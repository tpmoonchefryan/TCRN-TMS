// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { IsIn, IsOptional } from 'class-validator';

import {
  OBSERVABILITY_ADAPTER_CODES,
  PLATFORM_TOOL_CONNECTION_ENVIRONMENTS,
  type ObservabilityAdapterCode,
  type PlatformToolConnectionEnvironment,
} from '@tcrn/shared';

export class ObservabilityAdapterQueryDto {
  @IsOptional()
  @IsIn(PLATFORM_TOOL_CONNECTION_ENVIRONMENTS)
  environment?: PlatformToolConnectionEnvironment = 'local';
}

export class ObservabilityDeepLinkQueryDto extends ObservabilityAdapterQueryDto {
  @IsOptional()
  @IsIn(OBSERVABILITY_ADAPTER_CODES)
  adapterCode?: ObservabilityAdapterCode;
}

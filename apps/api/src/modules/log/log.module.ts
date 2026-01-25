// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module, Global, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth';

import {
  ChangeLogController,
  TechEventLogController,
  IntegrationLogController,
  LogSearchController,
} from './controllers';
import {
  LogMaskingService,
  ChangeLogService,
  ChangeLogQueryService,
  TechEventLogService,
  TechEventLogQueryService,
  IntegrationLogService,
  IntegrationLogQueryService,
  LokiPushService,
  LokiQueryService,
} from './services';

@Global()
@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [
    ChangeLogController,
    TechEventLogController,
    IntegrationLogController,
    LogSearchController,
  ],
  providers: [
    LogMaskingService,
    ChangeLogService,
    ChangeLogQueryService,
    TechEventLogService,
    TechEventLogQueryService,
    IntegrationLogService,
    IntegrationLogQueryService,
    LokiPushService,
    LokiQueryService,
  ],
  exports: [
    LogMaskingService,
    ChangeLogService,
    ChangeLogQueryService,
    TechEventLogService,
    TechEventLogQueryService,
    IntegrationLogService,
    IntegrationLogQueryService,
    LokiPushService,
    LokiQueryService,
  ],
})
export class LogModule {}

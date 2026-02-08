// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { forwardRef,Global, Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import {
    ChangeLogController,
    ComplianceReportController,
    IntegrationLogController,
    LogSearchController,
    TechEventLogController,
} from './controllers';
import {
    ChangeLogQueryService,
    ChangeLogService,
    ComplianceReportService,
    IntegrationLogQueryService,
    IntegrationLogService,
    LogMaskingService,
    LokiPushService,
    LokiQueryService,
    TechEventLogQueryService,
    TechEventLogService,
} from './services';

@Global()
@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [
    ChangeLogController,
    TechEventLogController,
    IntegrationLogController,
    LogSearchController,
    ComplianceReportController,
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
    ComplianceReportService,
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
    ComplianceReportService,
  ],
})
export class LogModule {}

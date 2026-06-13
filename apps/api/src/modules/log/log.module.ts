// SPDX-License-Identifier: Apache-2.0
import { forwardRef, Global, Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { LokiQueryApplicationService } from './application/loki-query.service';
import {
  ChangeLogController,
  ComplianceReportController,
  IntegrationLogController,
  LogSearchController,
  TechEventLogController,
} from './controllers';
import { LokiQueryGateway } from './infrastructure/loki-query.gateway';
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
    LokiQueryGateway,
    LokiQueryApplicationService,
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
    LokiQueryGateway,
    LokiQueryApplicationService,
    LokiQueryService,
    ComplianceReportService,
  ],
})
export class LogModule {}

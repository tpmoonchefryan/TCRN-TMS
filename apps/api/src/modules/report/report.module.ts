// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';

import { IntegrationModule } from '../integration/integration.module';
import { MinioModule } from '../minio';
import { MfrReportApplicationService } from './application/mfr-report.service';
import { ReportJobReadApplicationService } from './application/report-job-read.service';
import { ReportJobStateApplicationService } from './application/report-job-state.service';
import { ReportJobWriteApplicationService } from './application/report-job-write.service';
import { ReportPiiPlatformApplicationService } from './application/report-pii-platform.service';
import { ReportController } from './controllers';
import { MfrReportRepository } from './infrastructure/mfr-report.repository';
import { ReportJobReadRepository } from './infrastructure/report-job-read.repository';
import { ReportJobStateRepository } from './infrastructure/report-job-state.repository';
import { ReportJobWriteRepository } from './infrastructure/report-job-write.repository';
import {
  ExcelBuilderService,
  MfrReportService,
  ReportJobService,
  ReportJobStateService,
} from './services';

@Module({
  imports: [MinioModule, IntegrationModule],
  controllers: [ReportController],
  providers: [
    MfrReportRepository,
    MfrReportApplicationService,
    ReportPiiPlatformApplicationService,
    ReportJobReadRepository,
    ReportJobReadApplicationService,
    ReportJobWriteRepository,
    ReportJobWriteApplicationService,
    ReportJobStateRepository,
    ReportJobStateApplicationService,
    ReportJobService,
    ReportJobStateService,
    MfrReportService,
    ExcelBuilderService,
  ],
  exports: [
    ReportJobService,
    ReportJobStateService,
    MfrReportService,
    ExcelBuilderService,
  ],
})
export class ReportModule {}

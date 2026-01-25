// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';

import { MinioModule } from '../minio';

import { ReportController } from './controllers';
import {
  ReportJobService,
  ReportJobStateService,
  MfrReportService,
  ExcelBuilderService,
} from './services';

@Module({
  imports: [MinioModule],
  controllers: [ReportController],
  providers: [
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

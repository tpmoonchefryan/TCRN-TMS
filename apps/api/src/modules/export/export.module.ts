// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { CustomerModule } from '../customer/customer.module';
import { QUEUE_NAMES } from '../queue';
import { ExportJobReadApplicationService } from './application/export-job-read.service';
import { ExportJobStateApplicationService } from './application/export-job-state.service';
import { ExportJobWriteApplicationService } from './application/export-job-write.service';
import { ExportController } from './controllers/export.controller';
import { ExportJobReadRepository } from './infrastructure/export-job-read.repository';
import { ExportJobStateRepository } from './infrastructure/export-job-state.repository';
import { ExportJobWriteRepository } from './infrastructure/export-job-write.repository';
import { ExportJobService } from './services/export-job.service';

@Module({
  imports: [
    CustomerModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.EXPORT }),
  ],
  controllers: [ExportController],
  providers: [
    ExportJobReadRepository,
    ExportJobReadApplicationService,
    ExportJobWriteRepository,
    ExportJobWriteApplicationService,
    ExportJobStateRepository,
    ExportJobStateApplicationService,
    ExportJobService,
  ],
  exports: [ExportJobService],
})
export class ExportModule {}

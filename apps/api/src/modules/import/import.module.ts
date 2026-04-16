// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CustomerModule } from '../customer/customer.module';
import { QUEUE_NAMES } from '../queue';
import { ImportJobReadApplicationService } from './application/import-job-read.service';
import { ImportJobStateApplicationService } from './application/import-job-state.service';
import { ImportJobSubmissionApplicationService } from './application/import-job-submission.service';
import { ImportJobWriteApplicationService } from './application/import-job-write.service';
import { ImportTemplateApplicationService } from './application/import-template.service';
import { ImportController } from './controllers';
import { ImportJobReadRepository } from './infrastructure/import-job-read.repository';
import { ImportJobStateRepository } from './infrastructure/import-job-state.repository';
import { ImportJobWriteRepository } from './infrastructure/import-job-write.repository';
import { ImportJobService, ImportParserService } from './services';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
    CustomerModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.IMPORT }),
  ],
  controllers: [ImportController],
  providers: [
    ImportJobReadRepository,
    ImportJobReadApplicationService,
    ImportJobWriteRepository,
    ImportJobWriteApplicationService,
    ImportJobSubmissionApplicationService,
    ImportJobStateRepository,
    ImportJobStateApplicationService,
    ImportTemplateApplicationService,
    ImportJobService,
    ImportParserService,
  ],
  exports: [ImportJobService, ImportParserService],
})
export class ImportModule {}

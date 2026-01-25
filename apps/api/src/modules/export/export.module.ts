// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { QUEUE_NAMES } from '../queue';
import { ExportController } from './controllers/export.controller';
import { ExportJobService } from './services/export-job.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.EXPORT }),
  ],
  controllers: [ExportController],
  providers: [ExportJobService],
  exports: [ExportJobService],
})
export class ExportModule {}

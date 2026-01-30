// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { QUEUE_NAMES } from '../queue';

import { ImportController } from './controllers';
import { ImportJobService, ImportParserService } from './services';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.IMPORT }),
  ],
  controllers: [ImportController],
  providers: [ImportJobService, ImportParserService],
  exports: [ImportJobService, ImportParserService],
})
export class ImportModule {}

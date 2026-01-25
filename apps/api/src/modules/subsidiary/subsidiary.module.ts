// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';

import { SubsidiaryController } from './subsidiary.controller';
import { SubsidiaryService } from './subsidiary.service';

@Module({
  controllers: [SubsidiaryController],
  providers: [SubsidiaryService],
  exports: [SubsidiaryService],
})
export class SubsidiaryModule {}

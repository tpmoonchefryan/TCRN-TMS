// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';

import { SubsidiaryReadApplicationService } from './application/subsidiary-read.service';
import { SubsidiaryWriteApplicationService } from './application/subsidiary-write.service';
import { SubsidiaryReadRepository } from './infrastructure/subsidiary-read.repository';
import { SubsidiaryWriteRepository } from './infrastructure/subsidiary-write.repository';
import { SubsidiaryController } from './subsidiary.controller';
import { SubsidiaryService } from './subsidiary.service';

@Module({
  controllers: [SubsidiaryController],
  providers: [
    SubsidiaryReadApplicationService,
    SubsidiaryReadRepository,
    SubsidiaryWriteApplicationService,
    SubsidiaryWriteRepository,
    SubsidiaryService,
  ],
  exports: [SubsidiaryService],
})
export class SubsidiaryModule {}

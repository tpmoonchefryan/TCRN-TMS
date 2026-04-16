// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';

import { CustomerModule } from '../customer/customer.module';
import { TalentCustomDomainService } from './application/talent-custom-domain.service';
import { TalentLifecycleService } from './application/talent-lifecycle.service';
import { TalentReadService } from './application/talent-read.service';
import { TalentWriteService } from './application/talent-write.service';
import { TalentCustomDomainRepository } from './infrastructure/talent-custom-domain.repository';
import { TalentLifecycleRepository } from './infrastructure/talent-lifecycle.repository';
import { TalentReadRepository } from './infrastructure/talent-read.repository';
import { TalentWriteRepository } from './infrastructure/talent-write.repository';
import { TalentController } from './talent.controller';
import { TalentService } from './talent.service';

@Module({
  imports: [CustomerModule],
  controllers: [TalentController],
  providers: [
    TalentReadRepository,
    TalentWriteRepository,
    TalentLifecycleRepository,
    TalentCustomDomainRepository,
    TalentReadService,
    TalentWriteService,
    TalentLifecycleService,
    TalentCustomDomainService,
    TalentService,
  ],
  exports: [TalentService, TalentCustomDomainService],
})
export class TalentModule {}

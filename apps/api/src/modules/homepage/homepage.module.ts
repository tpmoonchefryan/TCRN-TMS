// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { RateLimiterService } from '../../common/services/rate-limiter.service';
import { LogModule } from '../log/log.module';

import {
    DomainLookupController,
    HomepageController,
    InternalDomainController,
    PublicHomepageController,
} from './controllers';
import {
    CdnPurgeService,
    DomainLookupService,
    HomepageService,
    HomepageVersionService,
    PublicHomepageService,
} from './services';
import { HomepageSchedulerService } from './services/homepage-scheduler.service';

@Module({
  imports: [HttpModule, LogModule, ScheduleModule.forRoot()],
  controllers: [HomepageController, PublicHomepageController, DomainLookupController, InternalDomainController],
  providers: [
    HomepageService,
    HomepageVersionService,
    CdnPurgeService,
    PublicHomepageService,
    DomainLookupService,
    RateLimiterService,
    RateLimiterGuard,
    HomepageSchedulerService,
  ],
  exports: [
    HomepageService,
    HomepageVersionService,
    PublicHomepageService,
    DomainLookupService,
  ],
})
export class HomepageModule {}

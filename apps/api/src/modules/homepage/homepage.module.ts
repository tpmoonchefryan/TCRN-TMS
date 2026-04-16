// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { RateLimiterService } from '../../common/services/rate-limiter.service';
import { LogModule } from '../log/log.module';
import { HomepageAdminService } from './application/homepage-admin.service';
import { HomepageSchedulerApplicationService } from './application/homepage-scheduler.service';
import { HomepageVersionApplicationService } from './application/homepage-version.service';
import {
  CalendarController,
  DomainLookupController,
  HomepageController,
  InternalDomainController,
  PublicHomepageController,
} from './controllers';
import { HomepageAdminRepository } from './infrastructure/homepage-admin.repository';
import { HomepageSchedulerRepository } from './infrastructure/homepage-scheduler.repository';
import { HomepageVersionRepository } from './infrastructure/homepage-version.repository';
import { PublicHomepageReadRepository } from './infrastructure/public-homepage-read.repository';
import {
  CdnPurgeService,
  DomainLookupService,
  HomepageSchedulerService,
  HomepageService,
  HomepageVersionService,
  PublicHomepageService,
} from './services';

@Module({
  imports: [HttpModule, LogModule, ScheduleModule.forRoot()],
  controllers: [
    CalendarController,
    HomepageController,
    PublicHomepageController,
    DomainLookupController,
    InternalDomainController,
  ],
  providers: [
    HomepageService,
    HomepageVersionService,
    CdnPurgeService,
    HomepageAdminRepository,
    HomepageAdminService,
    HomepageSchedulerRepository,
    HomepageSchedulerApplicationService,
    HomepageVersionRepository,
    HomepageVersionApplicationService,
    PublicHomepageReadRepository,
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

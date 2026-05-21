// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { RateLimiterService } from '../../common/services/rate-limiter.service';
import { LogModule } from '../log/log.module';
import { MinioModule } from '../minio';
import { TalentModule } from '../talent/talent.module';
import { HomepageAdminService } from './application/homepage-admin.service';
import { HomepageSchedulerApplicationService } from './application/homepage-scheduler.service';
import { HomepageVersionApplicationService } from './application/homepage-version.service';
import { PublicPresenceFoundationService } from './application/public-presence-foundation.service';
import { PublicPresenceAuthoringService } from './application/public-presence-authoring.service';
import { PublicPresenceStudioService } from './application/public-presence-studio.service';
import { PublicPresenceWorkflowService } from './application/public-presence-workflow.service';
import {
  CalendarController,
  DomainLookupController,
  HomepageController,
  InternalDomainController,
  PublicHomepageController,
  PublicPresenceController,
} from './controllers';
import { HomepageAdminRepository } from './infrastructure/homepage-admin.repository';
import { HomepageSchedulerRepository } from './infrastructure/homepage-scheduler.repository';
import { HomepageVersionRepository } from './infrastructure/homepage-version.repository';
import { PublicHomepageReadRepository } from './infrastructure/public-homepage-read.repository';
import { PublicPresenceFoundationRepository } from './infrastructure/public-presence-foundation.repository';
import { PublicPresenceAuthoringRepository } from './infrastructure/public-presence-authoring.repository';
import {
  CdnPurgeService,
  DomainLookupService,
  HomepageAssetService,
  HomepageSchedulerService,
  HomepageService,
  HomepageVersionService,
  PublicHomepageProjectionService,
  PublicHomepageService,
  PublicPresencePublishSchedulerService,
} from './services';

@Module({
  imports: [HttpModule, LogModule, MinioModule, ScheduleModule.forRoot(), TalentModule],
  controllers: [
    CalendarController,
    HomepageController,
    PublicHomepageController,
    PublicPresenceController,
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
    PublicPresenceAuthoringRepository,
    PublicPresenceFoundationRepository,
    PublicHomepageService,
    PublicHomepageProjectionService,
    PublicPresenceAuthoringService,
    PublicPresenceFoundationService,
    PublicPresenceStudioService,
    PublicPresenceWorkflowService,
    PublicPresencePublishSchedulerService,
    DomainLookupService,
    HomepageAssetService,
    RateLimiterService,
    RateLimiterGuard,
    HomepageSchedulerService,
  ],
  exports: [
    HomepageService,
    HomepageVersionService,
    PublicHomepageProjectionService,
    PublicHomepageService,
    PublicPresenceStudioService,
    PublicPresenceWorkflowService,
    DomainLookupService,
  ],
})
export class HomepageModule {}

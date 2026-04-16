// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';

import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { RateLimiterService } from '../../common/services/rate-limiter.service';
import { AuthModule } from '../auth/auth.module';
import { LogModule } from '../log';
import { TalentModule } from '../talent';
import { ExternalBlocklistApplicationService } from './application/external-blocklist.service';
import { MarshmallowConfigApplicationService } from './application/marshmallow-config.service';
import { MarshmallowExportReadApplicationService } from './application/marshmallow-export-read.service';
import { MarshmallowExportStateApplicationService } from './application/marshmallow-export-state.service';
import { MarshmallowExportWriteApplicationService } from './application/marshmallow-export-write.service';
import { MarshmallowMessageApplicationService } from './application/marshmallow-message.service';
import { MarshmallowReactionApplicationService } from './application/marshmallow-reaction.service';
import { ProfanityFilterApplicationService } from './application/profanity-filter.service';
import {
  ExternalBlocklistController,
  MarshmallowController,
  PublicMarshmallowController,
} from './controllers';
import { ExternalBlocklistRepository } from './infrastructure/external-blocklist.repository';
import { ExternalBlocklistCacheRepository } from './infrastructure/external-blocklist-cache.repository';
import { MarshmallowConfigRepository } from './infrastructure/marshmallow-config.repository';
import { MarshmallowExportReadRepository } from './infrastructure/marshmallow-export-read.repository';
import { MarshmallowExportStateRepository } from './infrastructure/marshmallow-export-state.repository';
import { MarshmallowExportWriteRepository } from './infrastructure/marshmallow-export-write.repository';
import { MarshmallowMessageRepository } from './infrastructure/marshmallow-message.repository';
import { MarshmallowReactionRepository } from './infrastructure/marshmallow-reaction.repository';
import { ProfanityFilterRepository } from './infrastructure/profanity-filter.repository';
import {
  CaptchaService,
  ExternalBlocklistService,
  MarshmallowConfigService,
  MarshmallowExportService,
  MarshmallowMessageService,
  MarshmallowRateLimitService,
  MarshmallowReactionService,
  ProfanityFilterService,
  PublicMarshmallowService,
  TrustScoreService,
} from './services';

@Module({
  imports: [forwardRef(() => AuthModule), HttpModule, LogModule, TalentModule],
  controllers: [MarshmallowController, PublicMarshmallowController, ExternalBlocklistController],
  providers: [
    MarshmallowConfigService,
    MarshmallowMessageService,
    ProfanityFilterService,
    MarshmallowRateLimitService,
    CaptchaService,
    MarshmallowReactionService,
    MarshmallowReactionRepository,
    MarshmallowReactionApplicationService,
    MarshmallowConfigRepository,
    MarshmallowConfigApplicationService,
    ExternalBlocklistCacheRepository,
    ExternalBlocklistRepository,
    ExternalBlocklistApplicationService,
    MarshmallowExportReadRepository,
    MarshmallowExportReadApplicationService,
    MarshmallowExportWriteRepository,
    MarshmallowExportWriteApplicationService,
    MarshmallowExportStateRepository,
    MarshmallowExportStateApplicationService,
    MarshmallowMessageRepository,
    MarshmallowMessageApplicationService,
    ProfanityFilterRepository,
    ProfanityFilterApplicationService,
    PublicMarshmallowService,
    ExternalBlocklistService,
    MarshmallowExportService,
    TrustScoreService,
    RateLimiterService,
    RateLimiterGuard,
  ],
  exports: [
    MarshmallowConfigService,
    MarshmallowMessageService,
    PublicMarshmallowService,
    ExternalBlocklistService,
    MarshmallowExportService,
    TrustScoreService,
  ],
})
export class MarshmallowModule {}

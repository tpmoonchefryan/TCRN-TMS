// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { HttpModule } from '@nestjs/axios';
import { forwardRef,Module } from '@nestjs/common';

import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { RateLimiterService } from '../../common/services/rate-limiter.service';
import { AuthModule } from '../auth/auth.module';
import { LogModule } from '../log';
import {
    ExternalBlocklistController,
    MarshmallowController,
    PublicMarshmallowController,
} from './controllers';
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
  imports: [forwardRef(() => AuthModule), HttpModule, LogModule],
  controllers: [MarshmallowController, PublicMarshmallowController, ExternalBlocklistController],
  providers: [
    MarshmallowConfigService,
    MarshmallowMessageService,
    ProfanityFilterService,
    MarshmallowRateLimitService,
    CaptchaService,
    MarshmallowReactionService,
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


// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

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
  imports: [forwardRef(() => AuthModule), HttpModule],
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

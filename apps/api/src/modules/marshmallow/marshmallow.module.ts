// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import {
  MarshmallowController,
  PublicMarshmallowController,
  ExternalBlocklistController,
} from './controllers';
import {
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
} from './services';

@Module({
  imports: [forwardRef(() => AuthModule)],
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

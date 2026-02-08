// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { forwardRef,Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { RateLimitStatsController, SecurityController } from './controllers';
import { IpAccessGuard, UaDetectionGuard } from './guards';
import {
    BlocklistMatcherService,
    BlocklistService,
    FingerprintService,
    IpAccessService,
    RateLimitService,
    RateLimitStatsService,
    UaDetectionService,
} from './services';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [SecurityController, RateLimitStatsController],
  providers: [
    FingerprintService,
    BlocklistMatcherService,
    BlocklistService,
    IpAccessService,
    UaDetectionService,
    RateLimitService,
    RateLimitStatsService,
    IpAccessGuard,
    UaDetectionGuard,
  ],
  exports: [
    FingerprintService,
    BlocklistMatcherService,
    BlocklistService,
    IpAccessService,
    UaDetectionService,
    RateLimitService,
    RateLimitStatsService,
    IpAccessGuard,
    UaDetectionGuard,
  ],
})
export class SecurityModule {}


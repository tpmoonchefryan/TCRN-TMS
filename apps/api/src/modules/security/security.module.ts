// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { forwardRef,Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { BlocklistReadService } from './application/blocklist-read.service';
import { BlocklistWriteService } from './application/blocklist-write.service';
import { RateLimitStatsController, SecurityController } from './controllers';
import { IpAccessGuard, UaDetectionGuard } from './guards';
import { BlocklistReadRepository } from './infrastructure/blocklist-read.repository';
import { BlocklistWriteRepository } from './infrastructure/blocklist-write.repository';
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
    BlocklistReadRepository,
    BlocklistReadService,
    BlocklistWriteRepository,
    BlocklistWriteService,
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

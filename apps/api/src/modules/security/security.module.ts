// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';

import { SecurityController } from './controllers';
import { IpAccessGuard, UaDetectionGuard } from './guards';
import {
  FingerprintService,
  BlocklistMatcherService,
  BlocklistService,
  IpAccessService,
  UaDetectionService,
  RateLimitService,
} from './services';

@Module({
  controllers: [SecurityController],
  providers: [
    FingerprintService,
    BlocklistMatcherService,
    BlocklistService,
    IpAccessService,
    UaDetectionService,
    RateLimitService,
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
    IpAccessGuard,
    UaDetectionGuard,
  ],
})
export class SecurityModule {}

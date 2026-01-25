// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';

import {
  PiiServiceConfigController,
  ProfileStoreController,
} from './controllers';
import {
  PiiServiceConfigService,
  ProfileStoreService,
} from './services';

@Module({
  controllers: [
    PiiServiceConfigController,
    ProfileStoreController,
  ],
  providers: [
    PiiServiceConfigService,
    ProfileStoreService,
  ],
  exports: [
    PiiServiceConfigService,
    ProfileStoreService,
  ],
})
export class PiiConfigModule {}

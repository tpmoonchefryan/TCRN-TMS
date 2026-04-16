// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';

import { PiiServiceConfigApplicationService } from './application/pii-service-config.service';
import { ProfileStoreApplicationService } from './application/profile-store.service';
import {
  PiiServiceConfigController,
  ProfileStoreController,
} from './controllers';
import { PiiServiceConfigRepository } from './infrastructure/pii-service-config.repository';
import { ProfileStoreRepository } from './infrastructure/profile-store.repository';
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
    PiiServiceConfigRepository,
    PiiServiceConfigApplicationService,
    ProfileStoreRepository,
    ProfileStoreApplicationService,
    ProfileStoreService,
  ],
  exports: [
    PiiServiceConfigService,
    ProfileStoreService,
  ],
})
export class PiiConfigModule {}

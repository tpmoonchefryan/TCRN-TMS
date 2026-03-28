// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';

import { ConfigSanityService } from '../../config/config-sanity.service';
import { BlocklistService } from './blocklist.service';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ConsumerKeyService } from './consumer-key.service';
import { GlobalConfigController } from './global-config.controller';
import { GlobalConfigService } from './global-config.service';

@Module({
  controllers: [ConfigController, GlobalConfigController],
  providers: [ConfigService, BlocklistService, ConsumerKeyService, GlobalConfigService, ConfigSanityService],
  exports: [ConfigService, BlocklistService, ConsumerKeyService, GlobalConfigService],
})
export class ConfigModule {}

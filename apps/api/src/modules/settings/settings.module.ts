// SPDX-License-Identifier: Apache-2.0
import { Module } from '@nestjs/common';

import { SettingsSecretCryptoService } from './infrastructure/settings-secret-crypto.service';
import { SettingsRepository } from './infrastructure/settings.repository';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsRepository, SettingsSecretCryptoService, SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

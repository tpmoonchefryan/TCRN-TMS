// SPDX-License-Identifier: Apache-2.0
import { Module } from '@nestjs/common';

import { ObservabilityAdaptersController } from './observability-adapters.controller';
import { ObservabilityAdaptersService } from './observability-adapters.service';

@Module({
  controllers: [ObservabilityAdaptersController],
  providers: [ObservabilityAdaptersService],
  exports: [ObservabilityAdaptersService],
})
export class ObservabilityAdaptersModule {}

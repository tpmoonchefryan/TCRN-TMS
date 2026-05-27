// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Module } from '@nestjs/common';

import { ObservabilityAdaptersController } from './observability-adapters.controller';
import { ObservabilityAdaptersService } from './observability-adapters.service';

@Module({
  controllers: [ObservabilityAdaptersController],
  providers: [ObservabilityAdaptersService],
  exports: [ObservabilityAdaptersService],
})
export class ObservabilityAdaptersModule {}

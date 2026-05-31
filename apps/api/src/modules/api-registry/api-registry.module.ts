// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Module } from '@nestjs/common';

import { ApiRegistryController } from './api-registry.controller';
import { ApiRegistryService } from './api-registry.service';

@Module({
  controllers: [ApiRegistryController],
  providers: [ApiRegistryService],
  exports: [ApiRegistryService],
})
export class ApiRegistryModule {}

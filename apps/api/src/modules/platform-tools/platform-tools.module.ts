// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Module } from '@nestjs/common';

import { PlatformToolsController } from './platform-tools.controller';
import { PlatformToolsService } from './platform-tools.service';

@Module({
  controllers: [PlatformToolsController],
  providers: [PlatformToolsService],
  exports: [PlatformToolsService],
})
export class PlatformToolsModule {}

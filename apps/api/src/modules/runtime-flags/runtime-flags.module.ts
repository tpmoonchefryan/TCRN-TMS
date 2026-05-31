// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { RuntimeFlagsController } from './runtime-flags.controller';
import { RuntimeFlagsService } from './runtime-flags.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RuntimeFlagsController],
  providers: [RuntimeFlagsService],
  exports: [RuntimeFlagsService],
})
export class RuntimeFlagsModule {}

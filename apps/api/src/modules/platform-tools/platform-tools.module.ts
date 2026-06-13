// SPDX-License-Identifier: Apache-2.0
import { Module } from '@nestjs/common';

import { PlatformToolsController } from './platform-tools.controller';
import { PlatformToolsService } from './platform-tools.service';

@Module({
  controllers: [PlatformToolsController],
  providers: [PlatformToolsService],
  exports: [PlatformToolsService],
})
export class PlatformToolsModule {}

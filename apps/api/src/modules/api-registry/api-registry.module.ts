// SPDX-License-Identifier: Apache-2.0
import { Module } from '@nestjs/common';

import { ApiRegistryController } from './api-registry.controller';
import { ApiRegistryService } from './api-registry.service';

@Module({
  controllers: [ApiRegistryController],
  providers: [ApiRegistryService],
  exports: [ApiRegistryService],
})
export class ApiRegistryModule {}

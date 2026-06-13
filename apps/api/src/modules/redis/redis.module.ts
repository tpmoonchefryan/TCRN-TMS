// SPDX-License-Identifier: Apache-2.0
import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}

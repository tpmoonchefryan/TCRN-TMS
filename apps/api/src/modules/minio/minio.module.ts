// SPDX-License-Identifier: Apache-2.0
import { Global, Module } from '@nestjs/common';

import { MinioService } from './minio.service';

@Global()
@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}

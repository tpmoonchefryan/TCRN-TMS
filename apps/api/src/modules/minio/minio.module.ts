// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Global, Module } from '@nestjs/common';

import { MinioService } from './minio.service';

@Global()
@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}

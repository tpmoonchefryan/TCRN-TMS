// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Global, Module } from '@nestjs/common';

import { PiiClientService } from './services/pii-client.service';

@Global()
@Module({
  providers: [PiiClientService],
  exports: [PiiClientService],
})
export class PiiModule {}

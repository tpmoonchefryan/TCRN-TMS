// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Global, Module } from '@nestjs/common';

import { CryptoService } from './services/crypto.service';
import { DekService } from './services/dek.service';
import { KekService } from './services/kek.service';

@Global()
@Module({
  providers: [CryptoService, KekService, DekService],
  exports: [CryptoService, KekService, DekService],
})
export class CryptoModule {}

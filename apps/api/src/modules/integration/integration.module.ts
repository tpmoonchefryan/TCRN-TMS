// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';

import { IntegrationController } from './controllers';
import { ApiKeyGuard } from './guards';
import {
  AdapterCryptoService,
  AdapterService,
  WebhookService,
  ApiKeyService,
} from './services';

@Module({
  controllers: [IntegrationController],
  providers: [
    AdapterCryptoService,
    AdapterService,
    WebhookService,
    ApiKeyService,
    ApiKeyGuard,
  ],
  exports: [
    AdapterService,
    WebhookService,
    ApiKeyService,
    ApiKeyGuard,
  ],
})
export class IntegrationModule {}

// SPDX-License-Identifier: Apache-2.0
import { Module } from '@nestjs/common';

import { AdapterReadApplicationService } from './application/adapter-read.service';
import { AdapterResolutionApplicationService } from './application/adapter-resolution.service';
import { AdapterWriteApplicationService } from './application/adapter-write.service';
import { ApiKeyApplicationService } from './application/api-key.service';
import { WebhookDeliveryApplicationService } from './application/webhook-delivery.service';
import { WebhookReadApplicationService } from './application/webhook-read.service';
import { WebhookWriteApplicationService } from './application/webhook-write.service';
import {
  IntegrationController,
  SubsidiaryIntegrationAdapterController,
  TalentIntegrationAdapterController,
} from './controllers';
import { ApiKeyGuard } from './guards';
import { AdapterReadRepository } from './infrastructure/adapter-read.repository';
import { AdapterResolutionRepository } from './infrastructure/adapter-resolution.repository';
import { AdapterWriteRepository } from './infrastructure/adapter-write.repository';
import { ApiKeyRepository } from './infrastructure/api-key.repository';
import { WebhookDeliveryRepository } from './infrastructure/webhook-delivery.repository';
import { WebhookReadRepository } from './infrastructure/webhook-read.repository';
import { WebhookWriteRepository } from './infrastructure/webhook-write.repository';
import {
  AdapterCryptoService,
  AdapterResolutionService,
  AdapterService,
  ApiKeyService,
  WebhookService,
} from './services';

@Module({
  controllers: [
    IntegrationController,
    SubsidiaryIntegrationAdapterController,
    TalentIntegrationAdapterController,
  ],
  providers: [
    AdapterCryptoService,
    AdapterResolutionRepository,
    AdapterResolutionApplicationService,
    AdapterResolutionService,
    AdapterReadRepository,
    AdapterReadApplicationService,
    AdapterWriteRepository,
    AdapterWriteApplicationService,
    AdapterService,
    ApiKeyRepository,
    ApiKeyApplicationService,
    WebhookReadRepository,
    WebhookReadApplicationService,
    WebhookWriteRepository,
    WebhookWriteApplicationService,
    WebhookDeliveryRepository,
    WebhookDeliveryApplicationService,
    WebhookService,
    ApiKeyService,
    ApiKeyGuard,
  ],
  exports: [AdapterService, AdapterResolutionService, WebhookService, ApiKeyService, ApiKeyGuard],
})
export class IntegrationModule {}

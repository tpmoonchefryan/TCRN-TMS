// SPDX-License-Identifier: Apache-2.0
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import { WebhookDeliveryApplicationService } from '../application/webhook-delivery.service';
import { WebhookReadApplicationService } from '../application/webhook-read.service';
import { WebhookWriteApplicationService } from '../application/webhook-write.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookDeliveryAttemptQueryDto,
  WebhookDeliveryOperationDto,
} from '../dto/integration.dto';
import { WebhookDeliveryRepository } from '../infrastructure/webhook-delivery.repository';
import { WebhookReadRepository } from '../infrastructure/webhook-read.repository';
import { WebhookWriteRepository } from '../infrastructure/webhook-write.repository';
import { AdapterCryptoService } from './adapter-crypto.service';

@Injectable()
export class WebhookService {
  constructor(
    databaseService: DatabaseService,
    cryptoService: AdapterCryptoService,
    changeLogService: ChangeLogService,
    configService: ConfigService,
    private readonly webhookReadApplicationService: WebhookReadApplicationService = new WebhookReadApplicationService(
      new WebhookReadRepository(databaseService)
    ),
    private readonly webhookWriteApplicationService: WebhookWriteApplicationService = new WebhookWriteApplicationService(
      new WebhookWriteRepository(databaseService),
      webhookReadApplicationService,
      cryptoService,
      changeLogService,
      configService
    ),
    private readonly webhookDeliveryApplicationService: WebhookDeliveryApplicationService = new WebhookDeliveryApplicationService(
      new WebhookDeliveryRepository(databaseService),
      new WebhookReadRepository(databaseService),
      cryptoService,
      changeLogService,
      configService
    )
  ) {}

  async findMany(context?: RequestContext) {
    return this.webhookReadApplicationService.findMany(context);
  }

  async findById(id: string, context?: RequestContext) {
    return this.webhookReadApplicationService.findById(id, context);
  }

  async create(dto: CreateWebhookDto, context: RequestContext) {
    return this.webhookWriteApplicationService.create(dto, context);
  }

  async update(id: string, dto: UpdateWebhookDto, context: RequestContext) {
    return this.webhookWriteApplicationService.update(id, dto, context);
  }

  async delete(id: string, context: RequestContext) {
    return this.webhookWriteApplicationService.delete(id, context);
  }

  async deactivate(id: string, context: RequestContext) {
    return this.webhookWriteApplicationService.deactivate(id, context);
  }

  async reactivate(id: string, context: RequestContext) {
    return this.webhookWriteApplicationService.reactivate(id, context);
  }

  getEvents() {
    return this.webhookDeliveryApplicationService.getEventCatalog();
  }

  async listDeliveryAttempts(
    webhookId: string,
    query: WebhookDeliveryAttemptQueryDto,
    context: RequestContext
  ) {
    return this.webhookDeliveryApplicationService.listAttempts(webhookId, query, context);
  }

  async getDeliveryAttempt(attemptId: string, webhookId: string, context: RequestContext) {
    return this.webhookDeliveryApplicationService.getAttempt(attemptId, webhookId, context);
  }

  async createTestDelivery(
    webhookId: string,
    dto: WebhookDeliveryOperationDto,
    context: RequestContext
  ) {
    return this.webhookDeliveryApplicationService.createTestDelivery(webhookId, dto, context);
  }

  async replayDeliveryAttempt(
    webhookId: string,
    attemptId: string,
    dto: WebhookDeliveryOperationDto,
    context: RequestContext
  ) {
    return this.webhookDeliveryApplicationService.replayAttempt(webhookId, attemptId, dto, context);
  }
}

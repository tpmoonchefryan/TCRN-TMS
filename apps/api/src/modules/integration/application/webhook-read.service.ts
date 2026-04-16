// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import {
  mapWebhookDetail,
  mapWebhookListItem,
} from '../domain/webhook.policy';
import { WebhookReadRepository } from '../infrastructure/webhook-read.repository';
import { getWebhookTenantSchema } from './webhook-context.util';

@Injectable()
export class WebhookReadApplicationService {
  constructor(
    private readonly webhookReadRepository: WebhookReadRepository,
  ) {}

  async findMany(context?: RequestContext) {
    const webhooks = await this.webhookReadRepository.findMany(
      getWebhookTenantSchema(context),
    );

    return webhooks.map((webhook) => mapWebhookListItem(webhook));
  }

  async findById(id: string, context?: RequestContext) {
    const webhook = await this.webhookReadRepository.findById(
      id,
      getWebhookTenantSchema(context),
    );

    if (!webhook) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Webhook not found',
      });
    }

    return mapWebhookDetail(webhook);
  }
}

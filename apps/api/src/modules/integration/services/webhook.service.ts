// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import { WebhookReadApplicationService } from '../application/webhook-read.service';
import { WebhookWriteApplicationService } from '../application/webhook-write.service';
import { CreateWebhookDto, UpdateWebhookDto, WebhookEventType } from '../dto/integration.dto';
import { WebhookReadRepository } from '../infrastructure/webhook-read.repository';
import { WebhookWriteRepository } from '../infrastructure/webhook-write.repository';
import { AdapterCryptoService } from './adapter-crypto.service';

const WEBHOOK_EVENTS = Object.values(WebhookEventType).map((event) => ({
  event,
  name: getEventName(event),
  description: getEventDescription(event),
  category: event.split('.')[0],
}));

function getEventName(event: WebhookEventType): string {
  const names: Record<string, string> = {
    [WebhookEventType.CUSTOMER_CREATED]: '客户创建',
    [WebhookEventType.CUSTOMER_UPDATED]: '客户更新',
    [WebhookEventType.CUSTOMER_DEACTIVATED]: '客户停用',
    [WebhookEventType.MEMBERSHIP_CREATED]: '会员创建',
    [WebhookEventType.MEMBERSHIP_EXPIRED]: '会员过期',
    [WebhookEventType.MEMBERSHIP_RENEWED]: '会员续期',
    [WebhookEventType.MARSHMALLOW_RECEIVED]: '棉花糖收到',
    [WebhookEventType.MARSHMALLOW_APPROVED]: '棉花糖审核通过',
    [WebhookEventType.REPORT_COMPLETED]: '报表完成',
    [WebhookEventType.REPORT_FAILED]: '报表失败',
    [WebhookEventType.IMPORT_COMPLETED]: '导入完成',
    [WebhookEventType.IMPORT_FAILED]: '导入失败',
  };
  return names[event] || event;
}

function getEventDescription(event: WebhookEventType): string {
  const descriptions: Record<string, string> = {
    [WebhookEventType.CUSTOMER_CREATED]: '当新客户档案创建时触发',
    [WebhookEventType.CUSTOMER_UPDATED]: '当客户信息更新时触发',
    [WebhookEventType.CUSTOMER_DEACTIVATED]: '当客户被停用时触发',
    [WebhookEventType.MEMBERSHIP_CREATED]: '当会员记录创建时触发',
    [WebhookEventType.MEMBERSHIP_EXPIRED]: '当会员权益过期时触发',
    [WebhookEventType.MEMBERSHIP_RENEWED]: '当会员续期时触发',
    [WebhookEventType.MARSHMALLOW_RECEIVED]: '当收到新棉花糖消息时触发',
    [WebhookEventType.MARSHMALLOW_APPROVED]: '当棉花糖消息审核通过时触发',
    [WebhookEventType.REPORT_COMPLETED]: '当报表生成完成时触发',
    [WebhookEventType.REPORT_FAILED]: '当报表生成失败时触发',
    [WebhookEventType.IMPORT_COMPLETED]: '当批量导入完成时触发',
    [WebhookEventType.IMPORT_FAILED]: '当批量导入失败时触发',
  };
  return descriptions[event] || '';
}

@Injectable()
export class WebhookService {
  constructor(
    databaseService: DatabaseService,
    cryptoService: AdapterCryptoService,
    changeLogService: ChangeLogService,
    configService: ConfigService,
    private readonly webhookReadApplicationService: WebhookReadApplicationService = new WebhookReadApplicationService(
      new WebhookReadRepository(databaseService),
    ),
    private readonly webhookWriteApplicationService: WebhookWriteApplicationService = new WebhookWriteApplicationService(
      new WebhookWriteRepository(databaseService),
      webhookReadApplicationService,
      cryptoService,
      changeLogService,
      configService,
    ),
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
    return WEBHOOK_EVENTS;
  }
}

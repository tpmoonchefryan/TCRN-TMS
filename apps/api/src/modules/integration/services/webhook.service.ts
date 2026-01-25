// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@tcrn/database';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookEventType,
} from '../dto/integration.dto';

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
    private readonly databaseService: DatabaseService,
    private readonly cryptoService: AdapterCryptoService,
    private readonly changeLogService: ChangeLogService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * List webhooks
   */
  async findMany() {
    const prisma = this.databaseService.getPrisma();

    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map((w) => ({
      id: w.id,
      code: w.code,
      nameEn: w.nameEn,
      nameZh: w.nameZh,
      nameJa: w.nameJa,
      url: w.url,
      events: w.events,
      isActive: w.isActive,
      lastTriggeredAt: w.lastTriggeredAt?.toISOString() ?? null,
      lastStatus: w.lastStatus,
      consecutiveFailures: w.consecutiveFailures,
      createdAt: w.createdAt.toISOString(),
    }));
  }

  /**
   * Get webhook by ID
   */
  async findById(id: string) {
    const prisma = this.databaseService.getPrisma();

    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Webhook not found',
      });
    }

    return {
      id: webhook.id,
      code: webhook.code,
      nameEn: webhook.nameEn,
      nameZh: webhook.nameZh,
      nameJa: webhook.nameJa,
      url: webhook.url,
      secret: webhook.secret ? '******' : null,
      events: webhook.events,
      headers: webhook.headers as Record<string, string>,
      retryPolicy: webhook.retryPolicy as { maxRetries: number; backoffMs: number },
      isActive: webhook.isActive,
      lastTriggeredAt: webhook.lastTriggeredAt?.toISOString() ?? null,
      lastStatus: webhook.lastStatus,
      consecutiveFailures: webhook.consecutiveFailures,
      disabledAt: webhook.disabledAt?.toISOString() ?? null,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
      createdBy: webhook.createdBy,
      updatedBy: webhook.updatedBy,
      version: webhook.version,
    };
  }

  /**
   * Create webhook
   */
  async create(dto: CreateWebhookDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    // Validate HTTPS in production
    const requireHttps = this.configService.get<boolean>('WEBHOOK_REQUIRE_HTTPS', true);
    if (requireHttps && !dto.url.startsWith('https://')) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Webhook URL must use HTTPS',
      });
    }

    // Check code uniqueness
    const existing = await prisma.webhook.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: `Webhook with code '${dto.code}' already exists`,
      });
    }

    const webhook = await prisma.$transaction(async (tx) => {
      const newWebhook = await tx.webhook.create({
        data: {
          code: dto.code,
          nameEn: dto.nameEn,
          nameZh: dto.nameZh,
          nameJa: dto.nameJa,
          url: dto.url,
          secret: dto.secret ? this.cryptoService.encrypt(dto.secret) : null,
          events: dto.events,
          headers: dto.headers ?? {},
          retryPolicy: (dto.retryPolicy ?? { maxRetries: 3, backoffMs: 1000 }) as any,
          isActive: true,
          consecutiveFailures: 0,
          createdBy: context.userId!,
          updatedBy: context.userId!,
        },
      });

      await this.changeLogService.create(tx, {
        action: 'create',
        objectType: 'webhook',
        objectId: newWebhook.id,
        objectName: dto.code,
        newValue: { code: dto.code, events: dto.events },
      }, context);

      return newWebhook;
    });

    return this.findById(webhook.id);
  }

  /**
   * Update webhook
   */
  async update(id: string, dto: UpdateWebhookDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Webhook not found',
      });
    }

    if (webhook.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.VERSION_CONFLICT,
        message: 'Webhook was modified by another user',
      });
    }

    // Validate HTTPS if URL changed
    if (dto.url) {
      const requireHttps = this.configService.get<boolean>('WEBHOOK_REQUIRE_HTTPS', true);
      if (requireHttps && !dto.url.startsWith('https://')) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Webhook URL must use HTTPS',
        });
      }
    }

    const updateData: Record<string, unknown> = {};

    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.nameZh !== undefined) updateData.nameZh = dto.nameZh;
    if (dto.nameJa !== undefined) updateData.nameJa = dto.nameJa;
    if (dto.url !== undefined) updateData.url = dto.url;
    if (dto.secret !== undefined) {
      updateData.secret = dto.secret ? this.cryptoService.encrypt(dto.secret) : null;
    }
    if (dto.events !== undefined) updateData.events = dto.events;
    if (dto.headers !== undefined) updateData.headers = dto.headers;
    if (dto.retryPolicy !== undefined) updateData.retryPolicy = dto.retryPolicy;

    await prisma.$transaction(async (tx) => {
      await tx.webhook.update({
        where: { id },
        data: {
          ...updateData,
          updatedBy: context.userId,
          version: { increment: 1 },
        },
      });

      await this.changeLogService.create(tx, {
        action: 'update',
        objectType: 'webhook',
        objectId: id,
        objectName: webhook.code,
      }, context);
    });

    return this.findById(id);
  }

  /**
   * Delete webhook
   */
  async delete(id: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Webhook not found',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.webhook.delete({
        where: { id },
      });

      await this.changeLogService.create(tx, {
        action: 'delete',
        objectType: 'webhook',
        objectId: id,
        objectName: webhook.code,
      }, context);
    });

    return { id, deleted: true };
  }

  /**
   * Deactivate webhook
   */
  async deactivate(id: string, context: RequestContext) {
    return this.setActiveStatus(id, false, context);
  }

  /**
   * Reactivate webhook
   */
  async reactivate(id: string, context: RequestContext) {
    return this.setActiveStatus(id, true, context);
  }

  private async setActiveStatus(id: string, isActive: boolean, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Webhook not found',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.webhook.update({
        where: { id },
        data: {
          isActive,
          disabledAt: isActive ? null : new Date(),
          consecutiveFailures: isActive ? 0 : webhook.consecutiveFailures,
          updatedBy: context.userId,
          version: { increment: 1 },
        },
      });

      await this.changeLogService.create(tx, {
        action: isActive ? 'reactivate' : 'deactivate',
        objectType: 'webhook',
        objectId: id,
        objectName: webhook.code,
        oldValue: { isActive: webhook.isActive },
        newValue: { isActive },
      }, context);
    });

    return { id, isActive };
  }

  /**
   * Get available events
   */
  getEvents() {
    return WEBHOOK_EVENTS;
  }
}

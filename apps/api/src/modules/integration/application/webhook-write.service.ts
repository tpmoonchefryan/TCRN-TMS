// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@tcrn/database';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { ChangeLogService } from '../../log';
import { toRetryPolicyInput,type WebhookRecord } from '../domain/webhook.policy';
import { CreateWebhookDto, UpdateWebhookDto } from '../dto/integration.dto';
import { WebhookWriteRepository } from '../infrastructure/webhook-write.repository';
import { AdapterCryptoService } from '../services/adapter-crypto.service';
import { getWebhookTenantSchema } from './webhook-context.util';
import { WebhookReadApplicationService } from './webhook-read.service';

@Injectable()
export class WebhookWriteApplicationService {
  constructor(
    private readonly webhookWriteRepository: WebhookWriteRepository,
    private readonly webhookReadApplicationService: WebhookReadApplicationService,
    private readonly cryptoService: AdapterCryptoService,
    private readonly changeLogService: ChangeLogService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateWebhookDto, context: RequestContext) {
    this.assertHttpsUrl(dto.url);
    const tenantSchema = getWebhookTenantSchema(context);

    const webhookId = await this.webhookWriteRepository.withTransaction(async (prisma) => {
      const existing = await this.webhookWriteRepository.findByCode(prisma, dto.code, tenantSchema);

      if (existing) {
        throw new ConflictException({
          code: ErrorCodes.RES_ALREADY_EXISTS,
          message: `Webhook with code '${dto.code}' already exists`,
        });
      }

      const id = await this.webhookWriteRepository.create(prisma, tenantSchema, {
        code: dto.code,
        nameEn: dto.nameEn,
        nameZh: dto.nameZh ?? null,
        nameJa: dto.nameJa ?? null,
        url: dto.url,
        secret: dto.secret ? this.cryptoService.encrypt(dto.secret) : null,
        events: dto.events,
        headers: dto.headers ?? {},
        retryPolicy: toRetryPolicyInput(dto.retryPolicy),
        userId: context.userId ?? null,
      });

      if (!id) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Webhook creation failed',
        });
      }

      await this.changeLogService.create(
        prisma,
        {
          action: 'create',
          objectType: 'webhook',
          objectId: id,
          objectName: dto.code,
          newValue: { code: dto.code, events: dto.events },
        },
        context,
      );

      return id;
    });

    return this.webhookReadApplicationService.findById(webhookId, context);
  }

  async update(id: string, dto: UpdateWebhookDto, context: RequestContext) {
    if (dto.url) {
      this.assertHttpsUrl(dto.url);
    }

    const tenantSchema = getWebhookTenantSchema(context);

    await this.webhookWriteRepository.withTransaction(async (prisma) => {
      const webhook = await this.getWebhookOrThrow(prisma, id, tenantSchema);

      if (webhook.version !== dto.version) {
        throw new ConflictException({
          code: ErrorCodes.VERSION_CONFLICT,
          message: 'Webhook was modified by another user',
        });
      }

      await this.webhookWriteRepository.update(prisma, tenantSchema, id, {
        nameEn: dto.nameEn ?? webhook.nameEn,
        nameZh: dto.nameZh ?? webhook.nameZh,
        nameJa: dto.nameJa ?? webhook.nameJa,
        url: dto.url ?? webhook.url,
        secret: this.resolveSecret(dto.secret, webhook.secret),
        events: dto.events ?? webhook.events,
        headers: (dto.headers ?? webhook.headers ?? {}) as Prisma.InputJsonObject,
        retryPolicy: (
          dto.retryPolicy !== undefined
            ? toRetryPolicyInput(dto.retryPolicy)
            : (webhook.retryPolicy ?? toRetryPolicyInput(undefined))
        ) as Prisma.InputJsonObject,
        userId: context.userId ?? null,
      });

      await this.changeLogService.create(
        prisma,
        {
          action: 'update',
          objectType: 'webhook',
          objectId: id,
          objectName: webhook.code,
        },
        context,
      );
    });

    return this.webhookReadApplicationService.findById(id, context);
  }

  async delete(id: string, context: RequestContext) {
    const tenantSchema = getWebhookTenantSchema(context);

    return this.webhookWriteRepository.withTransaction(async (prisma) => {
      const webhook = await this.getWebhookOrThrow(prisma, id, tenantSchema);

      await this.webhookWriteRepository.delete(prisma, tenantSchema, id);

      await this.changeLogService.create(
        prisma,
        {
          action: 'delete',
          objectType: 'webhook',
          objectId: id,
          objectName: webhook.code,
        },
        context,
      );

      return { id, deleted: true };
    });
  }

  async deactivate(id: string, context: RequestContext) {
    return this.setActiveStatus(id, false, context);
  }

  async reactivate(id: string, context: RequestContext) {
    return this.setActiveStatus(id, true, context);
  }

  private async setActiveStatus(
    id: string,
    isActive: boolean,
    context: RequestContext,
  ) {
    const tenantSchema = getWebhookTenantSchema(context);

    return this.webhookWriteRepository.withTransaction(async (prisma) => {
      const webhook = await this.getWebhookOrThrow(prisma, id, tenantSchema);

      await this.webhookWriteRepository.setActiveStatus(prisma, tenantSchema, id, {
        isActive,
        disabledAt: isActive ? null : new Date(),
        consecutiveFailures: isActive ? 0 : webhook.consecutiveFailures,
        userId: context.userId ?? null,
      });

      await this.changeLogService.create(
        prisma,
        {
          action: isActive ? 'reactivate' : 'deactivate',
          objectType: 'webhook',
          objectId: id,
          objectName: webhook.code,
          oldValue: { isActive: webhook.isActive },
          newValue: { isActive },
        },
        context,
      );

      return { id, isActive };
    });
  }

  private async getWebhookOrThrow(
    prisma: Prisma.TransactionClient,
    id: string,
    tenantSchema: string | null,
  ): Promise<WebhookRecord> {
    const webhook = await this.webhookWriteRepository.findById(prisma, id, tenantSchema);

    if (!webhook) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Webhook not found',
      });
    }

    return webhook;
  }

  private resolveSecret(nextSecret: string | undefined, currentSecret: string | null): string | null {
    if (nextSecret === undefined) {
      return currentSecret;
    }

    return nextSecret ? this.cryptoService.encrypt(nextSecret) : null;
  }

  private assertHttpsUrl(url: string) {
    const requireHttps = this.configService.get<boolean>('WEBHOOK_REQUIRE_HTTPS', true);

    if (requireHttps && !url.startsWith('https://')) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Webhook URL must use HTTPS',
      });
    }
  }
}

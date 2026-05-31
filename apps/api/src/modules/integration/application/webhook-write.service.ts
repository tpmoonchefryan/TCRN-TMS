// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Prisma } from '@tcrn/database';
import {
  ErrorCodes,
  getIntegrationWebhookDefinition,
  normalizeLocalizedText,
  type IntegrationWebhookDefinition,
  type LocalizedText,
  type PartialLocalizedText,
  type RequestContext,
} from '@tcrn/shared';

import { ChangeLogService } from '../../log';
import { validateUrlSafety } from '../../platform-tools/url-safety';
import {
  mergeWebhookExtraData,
  normalizeMonitoredTalentIds,
  toRetryPolicyInput,
  type WebhookRecord,
} from '../domain/webhook.policy';
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
    private readonly configService: ConfigService
  ) {}

  async create(dto: CreateWebhookDto, context: RequestContext) {
    await this.assertWebhookTargetUrl(dto.url);
    const tenantSchema = getWebhookTenantSchema(context);
    const definition = this.resolveCreateDefinition(dto.definitionKey);
    const createInput = this.buildCreateInput(dto, definition);

    const webhookId = await this.webhookWriteRepository.withTransaction(async (prisma) => {
      const existing = await this.webhookWriteRepository.findByCode(
        prisma,
        createInput.code,
        tenantSchema
      );

      if (existing) {
        throw new ConflictException({
          code: ErrorCodes.RES_ALREADY_EXISTS,
          message: `Webhook with code '${createInput.code}' already exists`,
        });
      }

      await this.assertMonitoredTalentsAllowed(
        prisma,
        tenantSchema,
        dto.monitoredTalentIds
      );

      const id = await this.webhookWriteRepository.create(prisma, tenantSchema, {
        code: createInput.code,
        name: createInput.name,
        extraData: this.buildCreateExtraData(null, definition, dto.monitoredTalentIds),
        url: createInput.url,
        secret: createInput.secret ? this.cryptoService.encrypt(createInput.secret) : null,
        events: createInput.events,
        headers: createInput.headers,
        retryPolicy: toRetryPolicyInput(createInput.retryPolicy),
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
          objectName: createInput.code,
          newValue: {
            code: createInput.code,
            definitionKey: definition?.key,
            events: createInput.events,
            monitoredTalentIds: dto.monitoredTalentIds ?? [],
          },
        },
        context
      );

      return id;
    });

    return this.webhookReadApplicationService.findById(webhookId, context);
  }

  private resolveCreateDefinition(definitionKey: string | undefined) {
    if (!definitionKey) {
      return null;
    }

    const definition = getIntegrationWebhookDefinition(definitionKey);
    if (!definition) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Unsupported webhook definition '${definitionKey}'`,
      });
    }

    return definition;
  }

  private buildCreateInput(dto: CreateWebhookDto, definition: IntegrationWebhookDefinition | null) {
    if (!definition) {
      if (!dto.code || !dto.name || !dto.events?.length) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Webhook code, localized name, and events are required without a definition key',
        });
      }

      return {
        ...dto,
        code: dto.code.trim().toUpperCase(),
        name: this.normalizeWebhookName(dto.name),
        headers: dto.headers ?? {},
        retryPolicy: dto.retryPolicy,
      };
    }

    this.assertDefinitionIdentityLocked(dto, definition);

    return {
      ...dto,
      code: definition.code,
      name: definition.name,
      headers: {
        ...(definition.defaultHeaders ?? {}),
        ...(dto.headers ?? {}),
      },
      events: definition.events,
      retryPolicy: dto.retryPolicy ?? definition.defaultRetryPolicy,
    };
  }

  private assertDefinitionIdentityLocked(
    dto: CreateWebhookDto,
    definition: IntegrationWebhookDefinition
  ) {
    const hasLockedField = Boolean(dto.code || dto.name || dto.events);

    if (hasLockedField) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Webhook definition '${definition.key}' controls code, name, and event fields`,
      });
    }
  }

  private buildCreateExtraData(
    extraData: Record<string, unknown> | null,
    definition: IntegrationWebhookDefinition | null,
    monitoredTalentIds: string[] | undefined
  ) {
    const definitionExtraData = !definition
      ? extraData
      : {
          ...(extraData ?? {}),
          definitionKey: definition.key,
          definitionCode: definition.code,
        };

    return mergeWebhookExtraData(definitionExtraData, monitoredTalentIds);
  }

  private getStoredDefinitionKey(webhook: WebhookRecord) {
    return typeof webhook.extraData?.definitionKey === 'string'
      ? webhook.extraData.definitionKey
      : undefined;
  }

  private normalizeWebhookName(name: PartialLocalizedText): LocalizedText {
    const normalized = normalizeLocalizedText(name);

    if (!normalized.en.trim()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Webhook localized name requires an English value',
      });
    }

    return normalized;
  }

  async update(id: string, dto: UpdateWebhookDto, context: RequestContext) {
    if (dto.url) {
      await this.assertWebhookTargetUrl(dto.url);
    }

    const tenantSchema = getWebhookTenantSchema(context);

    await this.webhookWriteRepository.withTransaction(async (prisma) => {
      const webhook = await this.getWebhookOrThrow(prisma, id, tenantSchema);
      const nextEvents = this.resolveUpdateEvents(webhook, dto);

      if (webhook.version !== dto.version) {
        throw new ConflictException({
          code: ErrorCodes.VERSION_CONFLICT,
          message: 'Webhook was modified by another user',
        });
      }

      await this.assertMonitoredTalentsAllowed(
        prisma,
        tenantSchema,
        dto.monitoredTalentIds
      );

      await this.webhookWriteRepository.update(prisma, tenantSchema, id, {
        name: dto.name ? this.normalizeWebhookName({ ...webhook.name, ...dto.name }) : webhook.name,
        extraData: mergeWebhookExtraData(webhook.extraData, dto.monitoredTalentIds),
        url: dto.url ?? webhook.url,
        secret: this.resolveSecret(dto.secret, webhook.secret),
        events: nextEvents,
        headers: (dto.headers ?? webhook.headers ?? {}) as Prisma.InputJsonObject,
        retryPolicy: (dto.retryPolicy !== undefined
          ? toRetryPolicyInput(dto.retryPolicy)
          : (webhook.retryPolicy ?? toRetryPolicyInput(undefined))) as Prisma.InputJsonObject,
        userId: context.userId ?? null,
      });

      await this.changeLogService.create(
        prisma,
        {
          action: 'update',
          objectType: 'webhook',
          objectId: id,
          objectName: webhook.code,
          oldValue: { monitoredTalentIds: normalizeMonitoredTalentIds(webhook.extraData) },
          newValue: {
            monitoredTalentIds:
              dto.monitoredTalentIds ?? normalizeMonitoredTalentIds(webhook.extraData),
          },
        },
        context
      );
    });

    return this.webhookReadApplicationService.findById(id, context);
  }

  private resolveUpdateEvents(webhook: WebhookRecord, dto: UpdateWebhookDto) {
    const definitionKey = this.getStoredDefinitionKey(webhook);

    if (definitionKey) {
      const definition = getIntegrationWebhookDefinition(definitionKey);

      if (!definition) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `Unsupported stored webhook definition '${definitionKey}'`,
        });
      }

      if (dto.events !== undefined) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `Webhook definition '${definitionKey}' controls the event set`,
        });
      }

      return definition.events;
    }

    const nextEvents = dto.events ?? webhook.events;

    if (!nextEvents.length) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Webhook events cannot be empty',
      });
    }

    return nextEvents;
  }

  private async assertMonitoredTalentsAllowed(
    prisma: Prisma.TransactionClient,
    tenantSchema: string | null,
    monitoredTalentIds: string[] | undefined
  ) {
    const normalizedIds = Array.from(
      new Set((monitoredTalentIds ?? []).map((value) => value.trim()).filter(Boolean))
    );

    if (normalizedIds.length === 0) {
      return;
    }

    if (!tenantSchema) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Monitored talent scope requires tenant context',
      });
    }

    const scopeRecords = await this.webhookWriteRepository.findMonitoredTalentScopeRecords(
      prisma,
      tenantSchema,
      normalizedIds
    );
    const activeIds = new Set(
      scopeRecords.filter((record) => record.isActive).map((record) => record.id)
    );

    if (activeIds.size !== normalizedIds.length) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Monitored talents must belong to the current tenant and be active',
      });
    }
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
        context
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

  private async setActiveStatus(id: string, isActive: boolean, context: RequestContext) {
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
        context
      );

      return { id, isActive };
    });
  }

  private async getWebhookOrThrow(
    prisma: Prisma.TransactionClient,
    id: string,
    tenantSchema: string | null
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

  private resolveSecret(
    nextSecret: string | undefined,
    currentSecret: string | null
  ): string | null {
    if (nextSecret === undefined) {
      return currentSecret;
    }

    return nextSecret ? this.cryptoService.encrypt(nextSecret) : null;
  }

  private async assertWebhookTargetUrl(url: string) {
    const requireHttps = this.configService.get<boolean>('WEBHOOK_REQUIRE_HTTPS', true);

    if (requireHttps && !url.startsWith('https://')) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Webhook URL must use HTTPS',
      });
    }

    const safety = await validateUrlSafety(url, {
      resolveDns: this.configService.get<boolean>('WEBHOOK_TARGET_RESOLVE_DNS', false),
    });

    if (!safety.safe) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Webhook URL is not allowed: ${safety.reason}`,
      });
    }
  }
}

// SPDX-License-Identifier: Apache-2.0
import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ErrorCodes, WEBHOOK_EVENT_CATALOG, type RequestContext } from '@tcrn/shared';

import { ChangeLogService } from '../../log';
import { validateUrlSafety } from '../../platform-tools/url-safety';
import {
  WEBHOOK_DELIVERY_SIGNATURE_HEADERS,
  buildWebhookPayloadEnvelope,
  canonicalizeWebhookPayload,
  getTcrnWebhookEventOrThrow,
  hashWebhookPayload,
  redactWebhookPayloadEnvelope,
  signWebhookPayload,
  type WebhookDeliveryAttemptStatus,
  type WebhookDeliveryDispatchMode,
} from '../domain/webhook-delivery.policy';
import type { WebhookRecord } from '../domain/webhook.policy';
import {
  type WebhookDeliveryAttemptQueryDto,
  type WebhookDeliveryOperationDto,
} from '../dto/integration.dto';
import {
  WebhookDeliveryRepository,
  type WebhookDeliveryAttemptRecord,
  type WebhookDeliveryOutboxCreateInput,
  type WebhookDeliveryOutboxRecord,
} from '../infrastructure/webhook-delivery.repository';
import { WebhookReadRepository } from '../infrastructure/webhook-read.repository';
import { AdapterCryptoService } from '../services/adapter-crypto.service';
import { requireWebhookTenantSchema } from './webhook-context.util';

export interface WebhookDeliveryAttemptView {
  id: string;
  outboxId: string;
  webhookId: string | null;
  eventCode: string;
  payloadVersion: string;
  idempotencyKey: string;
  payloadHash: string;
  attemptNumber: number;
  status: WebhookDeliveryAttemptStatus;
  dispatchMode: WebhookDeliveryDispatchMode;
  endpointUrl: string;
  requestHeaders: Record<string, unknown>;
  requestBodySummary: unknown;
  responseStatus: number | null;
  responseBodySummary: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  latencyMs: number | null;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  replayReason: string | null;
  traceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryOperationResult {
  accepted: boolean;
  duplicate: boolean;
  dryRun: boolean;
  dispatchMode: WebhookDeliveryDispatchMode;
  status: WebhookDeliveryAttemptStatus | 'duplicate';
  webhookId: string;
  outboxId: string;
  attemptId: string | null;
  eventCode: string;
  payloadVersion: string;
  idempotencyKey: string;
  traceId: string | null;
  redacted: true;
}

@Injectable()
export class WebhookDeliveryApplicationService {
  constructor(
    private readonly deliveryRepository: WebhookDeliveryRepository,
    private readonly webhookReadRepository: WebhookReadRepository,
    private readonly cryptoService: AdapterCryptoService,
    private readonly changeLogService: ChangeLogService,
    private readonly configService: ConfigService
  ) {}

  getEventCatalog() {
    return WEBHOOK_EVENT_CATALOG;
  }

  async listAttempts(
    webhookId: string,
    query: WebhookDeliveryAttemptQueryDto,
    context: RequestContext
  ) {
    const tenantSchema = requireWebhookTenantSchema(context);
    await this.getWebhookOrThrow(webhookId, tenantSchema);
    const page = await this.deliveryRepository.listAttempts(tenantSchema, webhookId, query);

    return {
      ...page,
      items: page.items.map((attempt) => this.mapAttempt(attempt)),
    };
  }

  async getAttempt(attemptId: string, webhookId: string, context: RequestContext) {
    const tenantSchema = requireWebhookTenantSchema(context);
    await this.getWebhookOrThrow(webhookId, tenantSchema);
    const attempt = await this.deliveryRepository.findAttemptById(tenantSchema, webhookId, attemptId);

    if (!attempt) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Webhook delivery attempt not found',
      });
    }

    return this.mapAttempt(attempt);
  }

  async createTestDelivery(
    webhookId: string,
    dto: WebhookDeliveryOperationDto,
    context: RequestContext
  ): Promise<WebhookDeliveryOperationResult> {
    const tenantSchema = requireWebhookTenantSchema(context);
    const webhook = await this.getWebhookOrThrow(webhookId, tenantSchema);
    this.assertReason(dto.reason);
    await this.assertWebhookDispatchable(webhook, dto.dryRun ?? true);

    const eventCode = dto.sampleEventCode ?? webhook.events[0];

    if (!webhook.events.includes(eventCode)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Webhook is not subscribed to event '${eventCode}'`,
      });
    }

    const event = getTcrnWebhookEventOrThrow(eventCode);
    const dryRun = dto.dryRun ?? true;
    const traceId = context.requestId ?? `p7-webhook-${randomUUID()}`;
    const tenantId = this.requireDeliveryTenantId(context);
    const idempotencyKey =
      dto.idempotencyKey ?? `${webhook.id}:${event.eventCode}:test:${randomUUID()}`;
    const secret = this.decryptSecret(webhook.secret);
    const envelope = buildWebhookPayloadEnvelope({
      eventId: randomUUID(),
      eventCode: event.eventCode,
      tenantId,
      occurredAt: new Date(),
      idempotencyKey,
      correlationId: traceId,
      data: {
        fixture: 'test_delivery',
        webhookId: webhook.id,
        reason: dto.reason.trim(),
      },
    });
    const redactedPayload = redactWebhookPayloadEnvelope(envelope);
    const payloadHash = hashWebhookPayload(envelope);
    const signature = signWebhookPayload(envelope, secret);
    const requestHeaders = this.redactSignatureHeaders(signature.headers);
    const dispatchMode = this.resolveDispatchMode(dryRun);

    const outboxInput: WebhookDeliveryOutboxCreateInput = {
      webhookId: webhook.id,
      eventId: envelope.eventId,
      eventCode: event.eventCode,
      payloadVersion: event.payloadVersion,
      tenantId: envelope.tenantId,
      subsidiaryId: envelope.subsidiaryId ?? null,
      talentId: envelope.talentId ?? null,
      idempotencyKey,
      payloadHash,
      payloadEnvelope: envelope,
      redactedPayload: redactedPayload as unknown as Record<string, unknown>,
      dispatchMode,
      status: dryRun ? 'pending' : 'pending',
      correlationId: traceId,
      traceId,
      createdBy: context.userId ?? null,
    };

    return this.deliveryRepository.withTransaction(async (prisma) => {
      const outboxWrite = await this.deliveryRepository.insertOutboxIfAbsent(
        prisma,
        tenantSchema,
        outboxInput
      );
      const outbox = outboxWrite.record;

      if (!outboxWrite.created) {
        this.assertIdempotencyConflictMatches(outbox, outboxInput);
        return this.mapDuplicateOperation(outbox, webhook.id, dryRun);
      }

      const attemptStatus: WebhookDeliveryAttemptStatus = dryRun ? 'dry_run' : 'pending';
      const attempt = await this.deliveryRepository.insertAttempt(prisma, tenantSchema, {
        outboxId: outbox.id,
        webhookId: webhook.id,
        attemptNumber: 1,
        status: attemptStatus,
        dispatchMode,
        endpointUrl: webhook.url,
        requestHeaders,
        requestBodySummary: {
          ...redactedPayload,
          payloadHash: signature.payloadHash,
          signed: true,
        },
        responseStatus: null,
        responseBodySummary: {},
        errorCode: dryRun ? 'DRY_RUN_NO_OUTBOUND_HTTP' : null,
        errorMessage: dryRun ? 'Dry run recorded without outbound HTTP dispatch' : null,
        latencyMs: null,
        replayReason: dto.reason.trim(),
        requestedBy: context.userId ?? null,
        traceId,
      });

      await this.changeLogService.create(
        prisma,
        {
          action: 'create',
          objectType: 'webhook_delivery_attempt',
          objectId: attempt.id,
          objectName: webhook.code,
          newValue: {
            webhookId: webhook.id,
            outboxId: outbox.id,
            eventCode: event.eventCode,
            dryRun,
            redacted: true,
          },
        },
        context
      );

      return this.mapOperation(outbox, attempt, webhook.id, dryRun);
    });
  }

  async replayAttempt(
    webhookId: string,
    attemptId: string,
    dto: WebhookDeliveryOperationDto,
    context: RequestContext
  ): Promise<WebhookDeliveryOperationResult> {
    const tenantSchema = requireWebhookTenantSchema(context);
    const webhook = await this.getWebhookOrThrow(webhookId, tenantSchema);
    this.assertReason(dto.reason);
    await this.assertWebhookDispatchable(webhook, dto.dryRun ?? true);

    const sourceAttempt = await this.deliveryRepository.findAttemptById(
      tenantSchema,
      webhookId,
      attemptId
    );

    if (!sourceAttempt) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Webhook delivery attempt not found',
      });
    }

    const dryRun = dto.dryRun ?? true;
    const traceId = context.requestId ?? `p7-webhook-replay-${randomUUID()}`;
    const idempotencyKey =
      dto.idempotencyKey ?? `${sourceAttempt.outboxId}:replay:${randomUUID()}`;
    const sourceOutbox = await this.deliveryRepository.withTransaction((prisma) =>
      this.deliveryRepository.findOutboxById(prisma, tenantSchema, sourceAttempt.outboxId)
    );

    if (!sourceOutbox) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Webhook delivery outbox record not found',
      });
    }

    const replayOutboxInput: WebhookDeliveryOutboxCreateInput = {
      webhookId: webhook.id,
      eventId: randomUUID(),
      eventCode: sourceOutbox.eventCode,
      payloadVersion: sourceOutbox.payloadVersion,
      tenantId: sourceOutbox.tenantId,
      subsidiaryId: sourceOutbox.subsidiaryId,
      talentId: sourceOutbox.talentId,
      idempotencyKey,
      payloadHash: sourceOutbox.payloadHash,
      payloadEnvelope: sourceOutbox.payloadEnvelope as Record<string, unknown>,
      redactedPayload: sourceOutbox.redactedPayload as Record<string, unknown>,
      dispatchMode: this.resolveDispatchMode(dryRun),
      status: 'pending',
      correlationId: sourceOutbox.correlationId,
      traceId,
      replayOfOutboxId: sourceOutbox.id,
      createdBy: context.userId ?? null,
    };

    return this.deliveryRepository.withTransaction(async (prisma) => {
      const outboxWrite = await this.deliveryRepository.insertOutboxIfAbsent(
        prisma,
        tenantSchema,
        replayOutboxInput
      );
      const outbox = outboxWrite.record;

      if (!outboxWrite.created) {
        this.assertIdempotencyConflictMatches(outbox, replayOutboxInput);
        return this.mapDuplicateOperation(outbox, webhook.id, dryRun);
      }

      const attempt = await this.deliveryRepository.insertAttempt(prisma, tenantSchema, {
        outboxId: outbox.id,
        webhookId: webhook.id,
        attemptNumber: 1,
        status: dryRun ? 'dry_run' : 'pending',
        dispatchMode: this.resolveDispatchMode(dryRun),
        endpointUrl: webhook.url,
        requestHeaders: {
          [WEBHOOK_DELIVERY_SIGNATURE_HEADERS.signature]: '******',
          replayedFromAttemptId: sourceAttempt.id,
        },
        requestBodySummary: sourceOutbox.redactedPayload as Record<string, unknown>,
        responseStatus: null,
        responseBodySummary: {},
        errorCode: dryRun ? 'DRY_RUN_REPLAY_NO_OUTBOUND_HTTP' : null,
        errorMessage: dryRun ? 'Replay dry run recorded without outbound HTTP dispatch' : null,
        replayReason: dto.reason.trim(),
        requestedBy: context.userId ?? null,
        traceId,
      });

      await this.changeLogService.create(
        prisma,
        {
          action: 'restore',
          objectType: 'webhook_delivery_attempt',
          objectId: attempt.id,
          objectName: webhook.code,
          newValue: {
            webhookId: webhook.id,
            sourceAttemptId: sourceAttempt.id,
            sourceOutboxId: sourceOutbox.id,
            dryRun,
            redacted: true,
          },
        },
        context
      );

      return this.mapOperation(outbox, attempt, webhook.id, dryRun);
    });
  }

  async validateWebhookTargetUrl(url: string) {
    const result = await validateUrlSafety(url, {
      resolveDns: this.configService.get<boolean>('WEBHOOK_TARGET_RESOLVE_DNS', false),
    });

    if (!result.safe) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Webhook target URL is not allowed: ${result.reason}`,
      });
    }

    return result;
  }

  private async getWebhookOrThrow(
    webhookId: string,
    tenantSchema: string | null
  ): Promise<WebhookRecord> {
    const webhook = await this.webhookReadRepository.findById(webhookId, tenantSchema);

    if (!webhook) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Webhook not found',
      });
    }

    return webhook;
  }

  private requireDeliveryTenantId(context: RequestContext) {
    if (!context.tenantId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Webhook delivery requires tenant context',
      });
    }

    return context.tenantId;
  }

  private assertReason(reason: string | undefined) {
    if (!reason?.trim()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FIELD_REQUIRED,
        message: 'A reason is required for webhook delivery test or replay',
      });
    }
  }

  private async assertWebhookDispatchable(webhook: WebhookRecord, dryRun: boolean) {
    if (!webhook.isActive) {
      throw new ConflictException({
        code: ErrorCodes.RES_CONFLICT,
        message: 'Webhook must be active before delivery test or replay',
      });
    }

    if (!webhook.secret) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Webhook secret is required for delivery signing',
      });
    }

    await this.validateWebhookTargetUrl(webhook.url);

    if (
      !dryRun &&
      ['local_dispatch', 'provider_dispatch'].includes(
        this.configService.get<string>('WEBHOOK_DELIVERY_DISPATCH_MODE') ?? ''
      ) &&
      !this.configService.get<boolean>('WEBHOOK_TARGET_RESOLVE_DNS', false)
    ) {
      throw new ConflictException({
        code: ErrorCodes.RES_CONFLICT,
        message: 'Webhook non-dry-run dispatch requires DNS target validation',
      });
    }
  }

  private decryptSecret(secret: string | null) {
    if (!secret) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Webhook secret is required for delivery signing',
      });
    }

    return this.cryptoService.decrypt(secret);
  }

  private resolveDispatchMode(dryRun: boolean): WebhookDeliveryDispatchMode {
    if (dryRun) {
      return 'disabled';
    }

    const configuredMode = this.configService.get<string>('WEBHOOK_DELIVERY_DISPATCH_MODE');

    if (configuredMode === 'local_dispatch' || configuredMode === 'provider_dispatch') {
      return configuredMode;
    }

    return 'local_stub';
  }

  private redactSignatureHeaders(headers: Record<string, string>) {
    return {
      ...headers,
      [WEBHOOK_DELIVERY_SIGNATURE_HEADERS.signature]: '******',
    };
  }

  private assertIdempotencyConflictMatches(
    existing: WebhookDeliveryOutboxRecord,
    expected: {
      webhookId: string;
      eventCode: string;
      payloadVersion: string;
      tenantId: string | null;
      subsidiaryId: string | null;
      talentId: string | null;
      idempotencyKey: string;
      payloadEnvelope: Record<string, unknown>;
      dispatchMode: WebhookDeliveryDispatchMode;
      replayOfOutboxId?: string | null;
    }
  ) {
    const expectedReplayOfOutboxId = expected.replayOfOutboxId ?? null;
    const existingFingerprint = this.idempotencyPayloadFingerprint(existing.payloadEnvelope);
    const expectedFingerprint = this.idempotencyPayloadFingerprint(expected.payloadEnvelope);
    const matches =
      existing.webhookId === expected.webhookId &&
      existing.eventCode === expected.eventCode &&
      existing.payloadVersion === expected.payloadVersion &&
      existing.tenantId === expected.tenantId &&
      existing.subsidiaryId === expected.subsidiaryId &&
      existing.talentId === expected.talentId &&
      existing.idempotencyKey === expected.idempotencyKey &&
      existing.dispatchMode === expected.dispatchMode &&
      existing.replayOfOutboxId === expectedReplayOfOutboxId &&
      existingFingerprint === expectedFingerprint;

    if (!matches) {
      throw new ConflictException({
        code: ErrorCodes.RES_CONFLICT,
        message: 'Webhook delivery idempotency key is already used for a different operation',
      });
    }
  }

  private idempotencyPayloadFingerprint(payload: unknown) {
    const envelope =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {};

    return canonicalizeWebhookPayload({
      eventCode: envelope.eventCode,
      payloadVersion: envelope.payloadVersion,
      tenantId: envelope.tenantId ?? null,
      subsidiaryId: envelope.subsidiaryId ?? null,
      talentId: envelope.talentId ?? null,
      idempotencyKey: envelope.idempotencyKey,
      producer: envelope.producer,
      redaction: envelope.redaction ?? null,
      data: envelope.data ?? {},
    });
  }

  private mapAttempt(attempt: WebhookDeliveryAttemptRecord): WebhookDeliveryAttemptView {
    return {
      id: attempt.id,
      outboxId: attempt.outboxId,
      webhookId: attempt.webhookId,
      eventCode: attempt.outboxEventCode,
      payloadVersion: attempt.outboxPayloadVersion,
      idempotencyKey: attempt.outboxIdempotencyKey,
      payloadHash: attempt.outboxPayloadHash,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      dispatchMode: attempt.dispatchMode,
      endpointUrl: attempt.endpointUrl,
      requestHeaders: this.redactRecord(attempt.requestHeaders),
      requestBodySummary: attempt.requestBodySummary,
      responseStatus: attempt.responseStatus,
      responseBodySummary: attempt.responseBodySummary,
      errorCode: attempt.errorCode,
      errorMessage: attempt.errorMessage,
      latencyMs: attempt.latencyMs,
      nextRetryAt: attempt.nextRetryAt?.toISOString() ?? null,
      deliveredAt: attempt.deliveredAt?.toISOString() ?? null,
      replayReason: attempt.replayReason,
      traceId: attempt.traceId,
      createdAt: attempt.createdAt.toISOString(),
      updatedAt: attempt.updatedAt.toISOString(),
    };
  }

  private mapOperation(
    outbox: WebhookDeliveryOutboxRecord,
    attempt: WebhookDeliveryAttemptRecord,
    webhookId: string,
    dryRun: boolean
  ): WebhookDeliveryOperationResult {
    return {
      accepted: true,
      duplicate: false,
      dryRun,
      dispatchMode: attempt.dispatchMode,
      status: attempt.status,
      webhookId,
      outboxId: outbox.id,
      attemptId: attempt.id,
      eventCode: outbox.eventCode,
      payloadVersion: outbox.payloadVersion,
      idempotencyKey: outbox.idempotencyKey,
      traceId: attempt.traceId,
      redacted: true,
    };
  }

  private mapDuplicateOperation(
    outbox: WebhookDeliveryOutboxRecord,
    webhookId: string,
    dryRun: boolean
  ): WebhookDeliveryOperationResult {
    return {
      accepted: false,
      duplicate: true,
      dryRun,
      dispatchMode: outbox.dispatchMode,
      status: 'duplicate',
      webhookId,
      outboxId: outbox.id,
      attemptId: null,
      eventCode: outbox.eventCode,
      payloadVersion: outbox.payloadVersion,
      idempotencyKey: outbox.idempotencyKey,
      traceId: outbox.traceId,
      redacted: true,
    };
  }

  private redactRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const record = value as Record<string, unknown>;

    return Object.fromEntries(
      Object.entries(record).map(([key, entry]) => [
        key,
        key.toLowerCase().includes('signature') || key.toLowerCase().includes('secret')
          ? '******'
          : entry,
      ])
    );
  }
}

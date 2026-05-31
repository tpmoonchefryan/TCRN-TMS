// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Injectable } from '@nestjs/common';

import { Prisma } from '@tcrn/database';

import { DatabaseService } from '../../database';
import type {
  WebhookDeliveryAttemptStatus,
  WebhookDeliveryDispatchMode,
  WebhookDeliveryOutboxStatus,
} from '../domain/webhook-delivery.policy';

export interface WebhookDeliveryOutboxCreateInput {
  webhookId: string;
  eventId: string;
  eventCode: string;
  payloadVersion: string;
  tenantId: string | null;
  subsidiaryId: string | null;
  talentId: string | null;
  idempotencyKey: string;
  payloadHash: string;
  payloadEnvelope: Record<string, unknown>;
  redactedPayload: Record<string, unknown>;
  dispatchMode: WebhookDeliveryDispatchMode;
  status: WebhookDeliveryOutboxStatus;
  correlationId: string | null;
  traceId: string | null;
  replayOfOutboxId?: string | null;
  createdBy: string | null;
}

export interface WebhookDeliveryAttemptCreateInput {
  outboxId: string;
  webhookId: string;
  attemptNumber: number;
  status: WebhookDeliveryAttemptStatus;
  dispatchMode: WebhookDeliveryDispatchMode;
  endpointUrl: string;
  requestHeaders: Record<string, unknown>;
  requestBodySummary: Record<string, unknown>;
  responseStatus?: number | null;
  responseBodySummary?: Record<string, unknown>;
  errorCode?: string | null;
  errorMessage?: string | null;
  latencyMs?: number | null;
  nextRetryAt?: Date | null;
  deliveredAt?: Date | null;
  replayReason?: string | null;
  requestedBy?: string | null;
  traceId?: string | null;
}

export interface WebhookDeliveryOutboxRecord {
  id: string;
  webhookId: string | null;
  eventId: string;
  eventCode: string;
  payloadVersion: string;
  tenantId: string | null;
  subsidiaryId: string | null;
  talentId: string | null;
  idempotencyKey: string;
  payloadHash: string;
  payloadEnvelope: Prisma.JsonValue;
  redactedPayload: Prisma.JsonValue;
  dispatchMode: WebhookDeliveryDispatchMode;
  status: WebhookDeliveryOutboxStatus;
  attemptCount: number;
  nextAttemptAt: Date | null;
  availableAt: Date;
  deliveredAt: Date | null;
  deadLetteredAt: Date | null;
  dlqReason: string | null;
  correlationId: string | null;
  traceId: string | null;
  replayOfOutboxId: string | null;
  createdAt: Date;
}

export interface WebhookDeliveryAttemptRecord {
  id: string;
  outboxId: string;
  webhookId: string | null;
  attemptNumber: number;
  status: WebhookDeliveryAttemptStatus;
  dispatchMode: WebhookDeliveryDispatchMode;
  endpointUrl: string;
  requestHeaders: Prisma.JsonValue;
  requestBodySummary: Prisma.JsonValue;
  responseStatus: number | null;
  responseBodySummary: Prisma.JsonValue;
  errorCode: string | null;
  errorMessage: string | null;
  latencyMs: number | null;
  nextRetryAt: Date | null;
  deliveredAt: Date | null;
  replayReason: string | null;
  requestedBy: string | null;
  traceId: string | null;
  createdAt: Date;
  updatedAt: Date;
  outboxEventCode: string;
  outboxPayloadVersion: string;
  outboxIdempotencyKey: string;
  outboxPayloadHash: string;
}

export interface WebhookDeliveryAttemptQuery {
  status?: string;
  page?: number;
  pageSize?: number;
}

function schemaName(tenantSchema: string) {
  if (!tenantSchema) {
    throw new Error('Webhook delivery tenant schema is required');
  }

  return tenantSchema;
}

@Injectable()
export class WebhookDeliveryRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  withTransaction<T>(operation: (prisma: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((prisma) => operation(prisma));
  }

  async findOutboxById(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    id: string
  ): Promise<WebhookDeliveryOutboxRecord | null> {
    const rows = await prisma.$queryRawUnsafe<WebhookDeliveryOutboxRecord[]>(
      `
        SELECT
          id,
          webhook_id as "webhookId",
          event_id as "eventId",
          event_code as "eventCode",
          payload_version as "payloadVersion",
          tenant_id as "tenantId",
          subsidiary_id as "subsidiaryId",
          talent_id as "talentId",
          idempotency_key as "idempotencyKey",
          payload_hash as "payloadHash",
          payload_envelope as "payloadEnvelope",
          redacted_payload as "redactedPayload",
          dispatch_mode as "dispatchMode",
          status,
          attempt_count as "attemptCount",
          next_attempt_at as "nextAttemptAt",
          available_at as "availableAt",
          delivered_at as "deliveredAt",
          dead_lettered_at as "deadLetteredAt",
          dlq_reason as "dlqReason",
          correlation_id as "correlationId",
          trace_id as "traceId",
          replay_of_outbox_id as "replayOfOutboxId",
          created_at as "createdAt"
        FROM "${schemaName(tenantSchema)}".webhook_delivery_outbox
        WHERE id = $1::uuid
        LIMIT 1
      `,
      id
    );

    return rows[0] ?? null;
  }

  async findOutboxByIdempotencyKey(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    idempotencyKey: string
  ): Promise<WebhookDeliveryOutboxRecord | null> {
    const rows = await prisma.$queryRawUnsafe<WebhookDeliveryOutboxRecord[]>(
      `
        SELECT
          id,
          webhook_id as "webhookId",
          event_id as "eventId",
          event_code as "eventCode",
          payload_version as "payloadVersion",
          tenant_id as "tenantId",
          subsidiary_id as "subsidiaryId",
          talent_id as "talentId",
          idempotency_key as "idempotencyKey",
          payload_hash as "payloadHash",
          payload_envelope as "payloadEnvelope",
          redacted_payload as "redactedPayload",
          dispatch_mode as "dispatchMode",
          status,
          attempt_count as "attemptCount",
          next_attempt_at as "nextAttemptAt",
          available_at as "availableAt",
          delivered_at as "deliveredAt",
          dead_lettered_at as "deadLetteredAt",
          dlq_reason as "dlqReason",
          correlation_id as "correlationId",
          trace_id as "traceId",
          replay_of_outbox_id as "replayOfOutboxId",
          created_at as "createdAt"
        FROM "${schemaName(tenantSchema)}".webhook_delivery_outbox
        WHERE idempotency_key = $1
        LIMIT 1
      `,
      idempotencyKey
    );

    return rows[0] ?? null;
  }

  async insertOutboxIfAbsent(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    input: WebhookDeliveryOutboxCreateInput
  ): Promise<{ record: WebhookDeliveryOutboxRecord; created: boolean }> {
    const rows = await prisma.$queryRawUnsafe<WebhookDeliveryOutboxRecord[]>(
      `
        INSERT INTO "${schemaName(tenantSchema)}".webhook_delivery_outbox (
          id,
          webhook_id,
          event_id,
          event_code,
          payload_version,
          tenant_id,
          subsidiary_id,
          talent_id,
          idempotency_key,
          payload_hash,
          payload_envelope,
          redacted_payload,
          dispatch_mode,
          status,
          correlation_id,
          trace_id,
          replay_of_outbox_id,
          created_by
        ) VALUES (
          gen_random_uuid(),
          $1::uuid,
          $2,
          $3,
          $4,
          $5::uuid,
          $6::uuid,
          $7::uuid,
          $8,
          $9,
          $10::jsonb,
          $11::jsonb,
          $12,
          $13,
          $14,
          $15,
          $16::uuid,
          $17::uuid
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING
          id,
          webhook_id as "webhookId",
          event_id as "eventId",
          event_code as "eventCode",
          payload_version as "payloadVersion",
          tenant_id as "tenantId",
          subsidiary_id as "subsidiaryId",
          talent_id as "talentId",
          idempotency_key as "idempotencyKey",
          payload_hash as "payloadHash",
          payload_envelope as "payloadEnvelope",
          redacted_payload as "redactedPayload",
          dispatch_mode as "dispatchMode",
          status,
          attempt_count as "attemptCount",
          next_attempt_at as "nextAttemptAt",
          available_at as "availableAt",
          delivered_at as "deliveredAt",
          dead_lettered_at as "deadLetteredAt",
          dlq_reason as "dlqReason",
          correlation_id as "correlationId",
          trace_id as "traceId",
          replay_of_outbox_id as "replayOfOutboxId",
          created_at as "createdAt"
      `,
      input.webhookId,
      input.eventId,
      input.eventCode,
      input.payloadVersion,
      input.tenantId,
      input.subsidiaryId,
      input.talentId,
      input.idempotencyKey,
      input.payloadHash,
      JSON.stringify(input.payloadEnvelope),
      JSON.stringify(input.redactedPayload),
      input.dispatchMode,
      input.status,
      input.correlationId,
      input.traceId,
      input.replayOfOutboxId ?? null,
      input.createdBy
    );

    if (rows[0]) {
      return { record: rows[0], created: true };
    }

    const existing = await this.findOutboxByIdempotencyKey(prisma, tenantSchema, input.idempotencyKey);

    if (!existing) {
      throw new Error('Webhook delivery idempotency conflict could not be read back');
    }

    return { record: existing, created: false };
  }

  async insertAttempt(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    input: WebhookDeliveryAttemptCreateInput
  ): Promise<WebhookDeliveryAttemptRecord> {
    const rows = await prisma.$queryRawUnsafe<WebhookDeliveryAttemptRecord[]>(
      `
        INSERT INTO "${schemaName(tenantSchema)}".webhook_delivery_attempt (
          id,
          outbox_id,
          webhook_id,
          attempt_number,
          status,
          dispatch_mode,
          endpoint_url,
          request_headers,
          request_body_summary,
          response_status,
          response_body_summary,
          error_code,
          error_message,
          latency_ms,
          next_retry_at,
          delivered_at,
          replay_reason,
          requested_by,
          trace_id
        ) VALUES (
          gen_random_uuid(),
          $1::uuid,
          $2::uuid,
          $3,
          $4,
          $5,
          $6,
          $7::jsonb,
          $8::jsonb,
          $9,
          $10::jsonb,
          $11,
          $12,
          $13,
          $14::timestamptz,
          $15::timestamptz,
          $16,
          $17::uuid,
          $18
        )
        RETURNING
          id,
          outbox_id as "outboxId",
          webhook_id as "webhookId",
          attempt_number as "attemptNumber",
          status,
          dispatch_mode as "dispatchMode",
          endpoint_url as "endpointUrl",
          request_headers as "requestHeaders",
          request_body_summary as "requestBodySummary",
          response_status as "responseStatus",
          response_body_summary as "responseBodySummary",
          error_code as "errorCode",
          error_message as "errorMessage",
          latency_ms as "latencyMs",
          next_retry_at as "nextRetryAt",
          delivered_at as "deliveredAt",
          replay_reason as "replayReason",
          requested_by as "requestedBy",
          trace_id as "traceId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          (SELECT event_code FROM "${schemaName(tenantSchema)}".webhook_delivery_outbox WHERE id = $1::uuid) as "outboxEventCode",
          (SELECT payload_version FROM "${schemaName(tenantSchema)}".webhook_delivery_outbox WHERE id = $1::uuid) as "outboxPayloadVersion",
          (SELECT idempotency_key FROM "${schemaName(tenantSchema)}".webhook_delivery_outbox WHERE id = $1::uuid) as "outboxIdempotencyKey",
          (SELECT payload_hash FROM "${schemaName(tenantSchema)}".webhook_delivery_outbox WHERE id = $1::uuid) as "outboxPayloadHash"
      `,
      input.outboxId,
      input.webhookId,
      input.attemptNumber,
      input.status,
      input.dispatchMode,
      input.endpointUrl,
      JSON.stringify(input.requestHeaders),
      JSON.stringify(input.requestBodySummary),
      input.responseStatus ?? null,
      JSON.stringify(input.responseBodySummary ?? {}),
      input.errorCode ?? null,
      input.errorMessage ?? null,
      input.latencyMs ?? null,
      input.nextRetryAt ?? null,
      input.deliveredAt ?? null,
      input.replayReason ?? null,
      input.requestedBy ?? null,
      input.traceId ?? null
    );

    await prisma.$executeRawUnsafe(
      `
        UPDATE "${schemaName(tenantSchema)}".webhook_delivery_outbox
        SET attempt_count = GREATEST(attempt_count, $2),
            updated_at = NOW()
        WHERE id = $1::uuid
      `,
      input.outboxId,
      input.attemptNumber
    );

    return rows[0];
  }

  async listAttempts(
    tenantSchema: string,
    webhookId: string,
    query: WebhookDeliveryAttemptQuery = {}
  ): Promise<{ items: WebhookDeliveryAttemptRecord[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const offset = (page - 1) * pageSize;
    const statusPredicate = query.status ? 'AND attempt.status = $2' : '';
    const params = query.status
      ? [webhookId, query.status, pageSize, offset]
      : [webhookId, pageSize, offset];
    const limitParamIndex = query.status ? 3 : 2;
    const offsetParamIndex = query.status ? 4 : 3;

    const items = await this.prisma.$queryRawUnsafe<WebhookDeliveryAttemptRecord[]>(
      `
        SELECT
          attempt.id,
          attempt.outbox_id as "outboxId",
          attempt.webhook_id as "webhookId",
          attempt.attempt_number as "attemptNumber",
          attempt.status,
          attempt.dispatch_mode as "dispatchMode",
          attempt.endpoint_url as "endpointUrl",
          attempt.request_headers as "requestHeaders",
          attempt.request_body_summary as "requestBodySummary",
          attempt.response_status as "responseStatus",
          attempt.response_body_summary as "responseBodySummary",
          attempt.error_code as "errorCode",
          attempt.error_message as "errorMessage",
          attempt.latency_ms as "latencyMs",
          attempt.next_retry_at as "nextRetryAt",
          attempt.delivered_at as "deliveredAt",
          attempt.replay_reason as "replayReason",
          attempt.requested_by as "requestedBy",
          attempt.trace_id as "traceId",
          attempt.created_at as "createdAt",
          attempt.updated_at as "updatedAt",
          outbox.event_code as "outboxEventCode",
          outbox.payload_version as "outboxPayloadVersion",
          outbox.idempotency_key as "outboxIdempotencyKey",
          outbox.payload_hash as "outboxPayloadHash"
        FROM "${schemaName(tenantSchema)}".webhook_delivery_attempt attempt
        JOIN "${schemaName(tenantSchema)}".webhook_delivery_outbox outbox
          ON outbox.id = attempt.outbox_id
        WHERE attempt.webhook_id = $1::uuid
          ${statusPredicate}
        ORDER BY attempt.created_at DESC
        LIMIT $${limitParamIndex}
        OFFSET $${offsetParamIndex}
      `,
      ...params
    );

    const totalRows = await this.prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `
        SELECT COUNT(*)::int as count
        FROM "${schemaName(tenantSchema)}".webhook_delivery_attempt attempt
        WHERE attempt.webhook_id = $1::uuid
          ${statusPredicate}
      `,
      ...(query.status ? [webhookId, query.status] : [webhookId])
    );

    return {
      items,
      total: totalRows[0]?.count ?? 0,
      page,
      pageSize,
    };
  }

  async findAttemptById(
    tenantSchema: string,
    webhookId: string,
    attemptId: string
  ): Promise<WebhookDeliveryAttemptRecord | null> {
    const rows = await this.prisma.$queryRawUnsafe<WebhookDeliveryAttemptRecord[]>(
      `
        SELECT
          attempt.id,
          attempt.outbox_id as "outboxId",
          attempt.webhook_id as "webhookId",
          attempt.attempt_number as "attemptNumber",
          attempt.status,
          attempt.dispatch_mode as "dispatchMode",
          attempt.endpoint_url as "endpointUrl",
          attempt.request_headers as "requestHeaders",
          attempt.request_body_summary as "requestBodySummary",
          attempt.response_status as "responseStatus",
          attempt.response_body_summary as "responseBodySummary",
          attempt.error_code as "errorCode",
          attempt.error_message as "errorMessage",
          attempt.latency_ms as "latencyMs",
          attempt.next_retry_at as "nextRetryAt",
          attempt.delivered_at as "deliveredAt",
          attempt.replay_reason as "replayReason",
          attempt.requested_by as "requestedBy",
          attempt.trace_id as "traceId",
          attempt.created_at as "createdAt",
          attempt.updated_at as "updatedAt",
          outbox.event_code as "outboxEventCode",
          outbox.payload_version as "outboxPayloadVersion",
          outbox.idempotency_key as "outboxIdempotencyKey",
          outbox.payload_hash as "outboxPayloadHash"
        FROM "${schemaName(tenantSchema)}".webhook_delivery_attempt attempt
        JOIN "${schemaName(tenantSchema)}".webhook_delivery_outbox outbox
          ON outbox.id = attempt.outbox_id
        WHERE attempt.webhook_id = $1::uuid
          AND attempt.id = $2::uuid
        LIMIT 1
      `,
      webhookId,
      attemptId
    );

    return rows[0] ?? null;
  }
}

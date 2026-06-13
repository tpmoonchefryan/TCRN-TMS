// SPDX-License-Identifier: Apache-2.0
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import {
  WEBHOOK_EVENT_CATALOG,
  type RequestContext,
  type WebhookEventCatalogItem,
} from '@tcrn/shared';

export const WEBHOOK_DELIVERY_SIGNATURE_VERSION = 'v1';
export const WEBHOOK_DELIVERY_REPLAY_TOLERANCE_SECONDS = 300;

export const WEBHOOK_DELIVERY_SIGNATURE_HEADERS = {
  signature: 'x-tcrn-signature',
  timestamp: 'x-tcrn-timestamp',
  payloadHash: 'x-tcrn-payload-sha256',
  version: 'x-tcrn-signature-version',
} as const;

export type WebhookDeliveryDispatchMode =
  | 'disabled'
  | 'local_stub'
  | 'local_dispatch'
  | 'provider_dispatch';

export type WebhookDeliveryOutboxStatus =
  | 'pending'
  | 'delivered'
  | 'retry_scheduled'
  | 'dead_lettered'
  | 'replayed'
  | 'blocked';

export type WebhookDeliveryAttemptStatus =
  | 'dry_run'
  | 'pending'
  | 'delivered'
  | 'failed'
  | 'retry_scheduled'
  | 'dead_lettered'
  | 'replayed'
  | 'blocked';

export interface WebhookPayloadEnvelopeInput {
  eventId: string;
  eventCode: string;
  tenantId: string;
  subsidiaryId?: string | null;
  talentId?: string | null;
  occurredAt?: Date | string;
  idempotencyKey: string;
  correlationId?: string | null;
  data: Record<string, unknown>;
}

export interface WebhookPayloadEnvelope {
  eventId: string;
  eventCode: string;
  payloadVersion: string;
  tenantId: string;
  subsidiaryId?: string | null;
  talentId?: string | null;
  occurredAt: string;
  idempotencyKey: string;
  correlationId?: string | null;
  producer: string;
  data: Record<string, unknown>;
  redaction: {
    piiClass: WebhookEventCatalogItem['piiClass'];
    policy: string;
  };
}

export interface RedactedWebhookPayloadSummary {
  eventId: string;
  eventCode: string;
  payloadVersion: string;
  tenantId: string;
  subsidiaryId?: string | null;
  talentId?: string | null;
  occurredAt: string;
  idempotencyKey: string;
  correlationId?: string | null;
  producer: string;
  redaction: {
    piiClass: WebhookEventCatalogItem['piiClass'];
    policy: string;
  };
  dataSummary: {
    objectKeys: string[];
    rawPayloadStored: false;
  };
}

export interface WebhookSignatureResult {
  headers: Record<string, string>;
  payloadHash: string;
  signatureBase: string;
}

export interface WebhookSignatureVerificationInput {
  payload: unknown;
  secret: string | null | undefined;
  timestamp: string | number | Date | null | undefined;
  signature: string | null | undefined;
  now?: Date;
  toleranceSeconds?: number;
  usedSignatureKeys?: Set<string>;
}

export interface WebhookSignatureVerificationResult {
  valid: boolean;
  reason?: string;
  payloadHash?: string;
  replayKey?: string;
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortJsonValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortJsonValue(entry)])
    );
  }

  return value;
}

export function canonicalizeWebhookPayload(payload: unknown): string {
  return JSON.stringify(sortJsonValue(payload));
}

export function hashWebhookPayload(payload: unknown): string {
  return createHash('sha256').update(canonicalizeWebhookPayload(payload)).digest('hex');
}

export function getTcrnWebhookEventOrThrow(eventCode: string): WebhookEventCatalogItem {
  const event = WEBHOOK_EVENT_CATALOG.find((item) => item.eventCode === eventCode);

  if (!event) {
    throw new Error(`Webhook event '${eventCode}' is not registered by TCRN`);
  }

  return event;
}

export function buildWebhookPayloadEnvelope(input: WebhookPayloadEnvelopeInput) {
  const event = getTcrnWebhookEventOrThrow(input.eventCode);
  const occurredAt =
    input.occurredAt instanceof Date
      ? input.occurredAt.toISOString()
      : input.occurredAt ?? new Date().toISOString();

  return {
    eventId: input.eventId,
    eventCode: event.eventCode,
    payloadVersion: event.payloadVersion,
    tenantId: input.tenantId,
    subsidiaryId: input.subsidiaryId ?? null,
    talentId: input.talentId ?? null,
    occurredAt,
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId ?? null,
    producer: event.producer,
    data: input.data,
    redaction: {
      piiClass: event.piiClass,
      policy: event.redactionPolicy,
    },
  } satisfies WebhookPayloadEnvelope;
}

export function redactWebhookPayloadEnvelope(
  envelope: WebhookPayloadEnvelope
): RedactedWebhookPayloadSummary {
  return {
    eventId: envelope.eventId,
    eventCode: envelope.eventCode,
    payloadVersion: envelope.payloadVersion,
    tenantId: envelope.tenantId,
    subsidiaryId: envelope.subsidiaryId ?? null,
    talentId: envelope.talentId ?? null,
    occurredAt: envelope.occurredAt,
    idempotencyKey: envelope.idempotencyKey,
    correlationId: envelope.correlationId ?? null,
    producer: envelope.producer,
    redaction: envelope.redaction,
    dataSummary: {
      objectKeys: Object.keys(envelope.data).sort(),
      rawPayloadStored: false,
    },
  };
}

export function signWebhookPayload(
  payload: unknown,
  secret: string,
  timestamp: Date = new Date()
): WebhookSignatureResult {
  const payloadHash = hashWebhookPayload(payload);
  const timestampValue = timestamp.toISOString();
  const canonicalPayload = canonicalizeWebhookPayload(payload);
  const signatureBase = `${WEBHOOK_DELIVERY_SIGNATURE_VERSION}.${timestampValue}.${payloadHash}.${canonicalPayload}`;
  const signatureDigest = createHmac('sha256', secret).update(signatureBase).digest('hex');
  const signature = `${WEBHOOK_DELIVERY_SIGNATURE_VERSION}=${signatureDigest}`;

  return {
    payloadHash,
    signatureBase,
    headers: {
      [WEBHOOK_DELIVERY_SIGNATURE_HEADERS.version]: WEBHOOK_DELIVERY_SIGNATURE_VERSION,
      [WEBHOOK_DELIVERY_SIGNATURE_HEADERS.timestamp]: timestampValue,
      [WEBHOOK_DELIVERY_SIGNATURE_HEADERS.payloadHash]: payloadHash,
      [WEBHOOK_DELIVERY_SIGNATURE_HEADERS.signature]: signature,
    },
  };
}

export function verifyWebhookSignature(
  input: WebhookSignatureVerificationInput
): WebhookSignatureVerificationResult {
  if (!input.secret) {
    return { valid: false, reason: 'missing_secret' };
  }

  if (!input.timestamp || !input.signature) {
    return { valid: false, reason: 'missing_signature_headers' };
  }

  const timestamp = new Date(input.timestamp);

  if (Number.isNaN(timestamp.getTime())) {
    return { valid: false, reason: 'invalid_timestamp' };
  }

  const now = input.now ?? new Date();
  const toleranceSeconds = input.toleranceSeconds ?? WEBHOOK_DELIVERY_REPLAY_TOLERANCE_SECONDS;
  const ageSeconds = Math.abs(now.getTime() - timestamp.getTime()) / 1000;

  if (ageSeconds > toleranceSeconds) {
    return { valid: false, reason: 'timestamp_outside_replay_window' };
  }

  const expected = signWebhookPayload(input.payload, input.secret, timestamp);
  const expectedSignature = expected.headers[WEBHOOK_DELIVERY_SIGNATURE_HEADERS.signature];
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(input.signature);
  const matches =
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer);

  if (!matches) {
    return { valid: false, reason: 'signature_mismatch', payloadHash: expected.payloadHash };
  }

  const replayKey = createHash('sha256')
    .update(`${timestamp.toISOString()}:${expected.payloadHash}:${input.signature}`)
    .digest('hex');

  if (input.usedSignatureKeys?.has(replayKey)) {
    return { valid: false, reason: 'signature_replay', payloadHash: expected.payloadHash, replayKey };
  }

  input.usedSignatureKeys?.add(replayKey);

  return { valid: true, payloadHash: expected.payloadHash, replayKey };
}

export function deliveryTenantId(context: RequestContext | undefined): string {
  if (!context?.tenantId) {
    throw new Error('tenant_id_required_for_webhook_delivery');
  }

  return context.tenantId;
}

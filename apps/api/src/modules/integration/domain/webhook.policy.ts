// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Prisma } from '@tcrn/database';

import { WebhookEventType } from '../dto/integration.dto';

export const DEFAULT_WEBHOOK_RETRY_POLICY = {
  maxRetries: 3,
  backoffMs: 1000,
} satisfies Prisma.InputJsonObject;

export interface WebhookRetryPolicy {
  maxRetries: number;
  backoffMs: number;
}

export interface WebhookRecord {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  url: string;
  secret: string | null;
  events: string[];
  headers: unknown;
  retryPolicy: unknown;
  isActive: boolean;
  lastTriggeredAt: Date | null;
  lastStatus: number | null;
  consecutiveFailures: number;
  disabledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface WebhookListItem {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  url: string;
  events: WebhookEventType[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastStatus: number | null;
  consecutiveFailures: number;
  createdAt: string;
}

export interface WebhookDetailRecord extends WebhookListItem {
  secret: string | null;
  headers: Record<string, string>;
  retryPolicy: WebhookRetryPolicy;
  disabledAt: string | null;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNumericProperty(
  record: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

export function normalizeWebhookHeaders(value: unknown): Record<string, string> {
  if (!isJsonRecord(value)) {
    return {};
  }

  const headers: Record<string, string> = {};

  for (const [headerName, headerValue] of Object.entries(value)) {
    if (typeof headerValue === 'string') {
      headers[headerName] = headerValue;
    }
  }

  return headers;
}

export function normalizeWebhookRetryPolicy(value: unknown): WebhookRetryPolicy {
  if (!isJsonRecord(value)) {
    return { ...DEFAULT_WEBHOOK_RETRY_POLICY };
  }

  return {
    maxRetries:
      getNumericProperty(value, 'maxRetries', 'max_retries') ??
      DEFAULT_WEBHOOK_RETRY_POLICY.maxRetries,
    backoffMs:
      getNumericProperty(value, 'backoffMs', 'backoff_ms') ??
      DEFAULT_WEBHOOK_RETRY_POLICY.backoffMs,
  };
}

export function toRetryPolicyInput(value: unknown): Prisma.InputJsonObject {
  const normalized = normalizeWebhookRetryPolicy(value);

  return {
    maxRetries: normalized.maxRetries,
    backoffMs: normalized.backoffMs,
  };
}

export function mapWebhookListItem(webhook: WebhookRecord): WebhookListItem {
  return {
    id: webhook.id,
    code: webhook.code,
    nameEn: webhook.nameEn,
    nameZh: webhook.nameZh,
    nameJa: webhook.nameJa,
    url: webhook.url,
    events: webhook.events as WebhookEventType[],
    isActive: webhook.isActive,
    lastTriggeredAt: webhook.lastTriggeredAt?.toISOString() ?? null,
    lastStatus: webhook.lastStatus,
    consecutiveFailures: webhook.consecutiveFailures,
    createdAt: webhook.createdAt.toISOString(),
  };
}

export function mapWebhookDetail(webhook: WebhookRecord): WebhookDetailRecord {
  return {
    ...mapWebhookListItem(webhook),
    secret: webhook.secret ? '******' : null,
    headers: normalizeWebhookHeaders(webhook.headers),
    retryPolicy: normalizeWebhookRetryPolicy(webhook.retryPolicy),
    disabledAt: webhook.disabledAt?.toISOString() ?? null,
    updatedAt: webhook.updatedAt.toISOString(),
    createdBy: webhook.createdBy,
    updatedBy: webhook.updatedBy,
    version: webhook.version,
  };
}

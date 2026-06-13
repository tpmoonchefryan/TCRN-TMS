// SPDX-License-Identifier: Apache-2.0
import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Entry for Loki push
 */
export interface LokiEntry {
  stream: string;
  labels: Record<string, string>;
  tenantSchema?: string;
  timestamp: Date | string;
  data: unknown;
}

const SENSITIVE_OBSERVABILITY_KEY_PATTERN =
  /(password|token|authorization|cookie|client[_-]?secret|api[_-]?key|private[_-]?key|requestBody|responseBody|email|phone|customer|pii)/i;
const EMAIL_VALUE_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_VALUE_PATTERN = /\+?\d[\d\s().-]{7,}\d/g;
const TENANT_SCHEMA_LABEL_PATTERN = /^[A-Za-z0-9_]+$/;

function redactObservabilityText(value: string) {
  return value
    .replace(EMAIL_VALUE_PATTERN, '[redacted-email]')
    .replace(PHONE_VALUE_PATTERN, '[redacted-phone]');
}

function redactObservabilityValue(value: unknown, depth = 0): unknown {
  if (depth > 8) {
    return '[redacted-depth-limit]';
  }

  if (typeof value === 'string') {
    return redactObservabilityText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactObservabilityValue(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        SENSITIVE_OBSERVABILITY_KEY_PATTERN.test(key)
          ? '[redacted]'
          : redactObservabilityValue(nestedValue, depth + 1),
      ])
    );
  }

  return value;
}

function redactObservabilityLabels(labels: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(labels).map(([key, value]) => [
      key,
      SENSITIVE_OBSERVABILITY_KEY_PATTERN.test(key) ? '[redacted]' : redactObservabilityText(value),
    ])
  );
}

function tenantScopeLabel(tenantSchema?: string): Record<string, string> {
  const trimmed = tenantSchema?.trim();

  return trimmed && TENANT_SCHEMA_LABEL_PATTERN.test(trimmed)
    ? { tenant_schema: trimmed }
    : {};
}

/**
 * Loki Push Service
 * Handles pushing log entries to Grafana Loki
 */
@Injectable()
export class LokiPushService implements OnModuleInit {
  private readonly logger = new Logger(LokiPushService.name);
  private readonly lokiUrl: string;
  private readonly enabled: boolean;
  private pendingEntries: LokiEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 5000;

  constructor(private readonly configService: ConfigService) {
    this.lokiUrl = this.configService.get<string>(
      'LOKI_PUSH_URL',
      'http://loki:3100/loki/api/v1/push'
    );
    this.enabled = this.configService.get<string>('LOKI_ENABLED', 'false') === 'true';
  }

  onModuleInit() {
    if (this.enabled) {
      this.logger.log(`Loki push service initialized, URL: ${this.lokiUrl}`);
      this.startFlushTimer();
    } else {
      this.logger.log('Loki push service disabled');
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBatch().catch((err) => {
        this.logger.error('Periodic flush failed:', err);
      });
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Push single log entry to Loki
   */
  async push(
    stream: string,
    labels: Record<string, string>,
    entry: unknown,
    tenantSchema?: string
  ): Promise<void> {
    if (!this.enabled) return;

    this.pendingEntries.push({
      stream,
      labels: {
        ...redactObservabilityLabels(labels),
        ...tenantScopeLabel(tenantSchema),
      },
      tenantSchema,
      timestamp: new Date(),
      data: redactObservabilityValue(entry),
    });

    // Flush if batch is full
    if (this.pendingEntries.length >= this.BATCH_SIZE) {
      await this.flushBatch();
    }
  }

  /**
   * Push change log to Loki
   */
  async pushChangeLog(entry: {
    action: string;
    objectType: string;
    objectId: string;
    tenantSchema?: string;
    operatorId?: string;
    diff: unknown;
  }): Promise<void> {
    await this.push(
      'change_log',
      {
        action: entry.action,
        object_type: entry.objectType,
      },
      entry,
      entry.tenantSchema
    );
  }

  /**
   * Push tech event to Loki
   */
  async pushTechEvent(entry: {
    severity: string;
    eventType: string;
    scope: string;
    tenantSchema?: string;
    message?: string;
    payload?: unknown;
  }): Promise<void> {
    await this.push(
      'technical_event_log',
      {
        severity: entry.severity,
        event_type: entry.eventType,
        scope: entry.scope,
      },
      entry,
      entry.tenantSchema
    );
  }

  /**
   * Push integration log to Loki
   */
  async pushIntegrationLog(entry: {
    direction: string;
    tenantSchema?: string;
    consumerCode?: string;
    responseStatus?: number;
    endpoint: string;
  }): Promise<void> {
    await this.push(
      'integration_log',
      {
        direction: entry.direction,
        consumer_code: entry.consumerCode || 'unknown',
        status: entry.responseStatus?.toString() || 'unknown',
      },
      entry,
      entry.tenantSchema
    );
  }

  /**
   * Flush pending entries to Loki
   */
  async flushBatch(): Promise<void> {
    if (this.pendingEntries.length === 0) return;

    const entries = [...this.pendingEntries];
    this.pendingEntries = [];

    try {
      await this.pushBatch(entries);
    } catch (error) {
      // Log error but don't rethrow - log push failure shouldn't affect main flow
      this.logger.error(
        `Failed to push batch to Loki: ${error instanceof Error ? error.message : String(error)}`
      );
      // Optionally add back to queue for retry (with limit)
    }
  }

  /**
   * Push batch of entries to Loki
   */
  private async pushBatch(entries: LokiEntry[]): Promise<void> {
    if (!this.enabled || entries.length === 0) return;

    // Group entries by stream and labels
    const streamMap = new Map<string, [string, string][]>();

    for (const entry of entries) {
      const key = JSON.stringify({ stream: entry.stream, ...entry.labels });
      if (!streamMap.has(key)) {
        streamMap.set(key, []);
      }
      const existing = streamMap.get(key);
      if (existing) {
        existing.push([this.toNanoTimestamp(entry.timestamp), JSON.stringify(entry.data)]);
      }
    }

    const streams = Array.from(streamMap.entries()).map(([key, values]) => {
      const parsed = JSON.parse(key);
      const { stream, ...labels } = parsed;
      return {
        stream: {
          app: 'tcrn-tms',
          stream,
          ...labels,
        },
        values,
      };
    });

    const response = await fetch(this.lokiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ streams }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Loki push failed: ${response.status} ${response.statusText}`
      );
    }
  }

  /**
   * Convert timestamp to nanoseconds string
   */
  private toNanoTimestamp(timestamp: Date | string): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return (date.getTime() * 1000000).toString();
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Final flush
    await this.flushBatch();
  }
}

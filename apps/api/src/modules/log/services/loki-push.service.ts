// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Entry for Loki push
 */
export interface LokiEntry {
  stream: string;
  labels: Record<string, string>;
  timestamp: Date | string;
  data: unknown;
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
      'http://loki:3100/loki/api/v1/push',
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
  ): Promise<void> {
    if (!this.enabled) return;

    this.pendingEntries.push({
      stream,
      labels,
      timestamp: new Date(),
      data: entry,
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
    );
  }

  /**
   * Push tech event to Loki
   */
  async pushTechEvent(entry: {
    severity: string;
    eventType: string;
    scope: string;
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
    );
  }

  /**
   * Push integration log to Loki
   */
  async pushIntegrationLog(entry: {
    direction: string;
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
        `Failed to push batch to Loki: ${error instanceof Error ? error.message : String(error)}`,
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
        existing.push([
          this.toNanoTimestamp(entry.timestamp),
          JSON.stringify(entry.data),
        ]);
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
      throw new InternalServerErrorException(`Loki push failed: ${response.status} ${response.statusText}`);
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

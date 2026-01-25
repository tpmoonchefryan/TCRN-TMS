// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Loki query parameters
 */
interface LokiQueryParams {
  stream?: string;
  severity?: string;
  eventType?: string;
  scope?: string;
  traceId?: string;
  keyword?: string;
  start?: string;
  end?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
  rawQuery?: string;
}

/**
 * Loki query response entry
 */
interface LokiLogEntry {
  timestamp: Date;
  labels: Record<string, string>;
  data: unknown;
}

/**
 * Loki query response
 */
interface LokiQueryResponse {
  entries: LokiLogEntry[];
  stats?: Record<string, unknown>;
}

/**
 * Loki Query Service
 * Handles querying logs from Grafana Loki
 */
@Injectable()
export class LokiQueryService {
  private readonly logger = new Logger(LokiQueryService.name);
  private readonly lokiUrl: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.lokiUrl = this.configService.get<string>(
      'LOKI_QUERY_URL',
      'http://loki:3100',
    );
    this.enabled = this.configService.get<string>('LOKI_ENABLED', 'false') === 'true';
  }

  /**
   * Query logs from Loki
   */
  async query(params: LokiQueryParams): Promise<LokiQueryResponse> {
    if (!this.enabled) {
      return { entries: [] };
    }

    try {
      const logql = params.rawQuery || this.buildLogQL(params);

      const queryParams = new URLSearchParams({
        query: logql,
        start: params.start || this.getDefaultStart(),
        end: params.end || new Date().toISOString(),
        limit: (params.limit || 100).toString(),
        direction: params.direction || 'backward',
      });

      const response = await fetch(
        `${this.lokiUrl}/loki/api/v1/query_range?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(30000),
        },
      );

      if (!response.ok) {
        throw new InternalServerErrorException(`Loki query failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformResponse(data);
    } catch (error) {
      this.logger.error(
        `Loki query failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { entries: [] };
    }
  }

  /**
   * Search logs with keyword
   */
  async search(params: {
    keyword: string;
    stream?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    let logql = `{app="tcrn-tms"`;
    if (params.stream) {
      logql += `, stream="${params.stream}"`;
    }
    logql += `} |= "${params.keyword}"`;

    return this.query({
      rawQuery: logql,
      start: params.start,
      end: params.end,
      limit: params.limit,
    });
  }

  /**
   * Query change logs
   */
  async queryChangeLogs(params: {
    objectType?: string;
    action?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    const labels: string[] = ['app="tcrn-tms"', 'stream="change_log"'];

    if (params.objectType) {
      labels.push(`object_type="${params.objectType}"`);
    }
    if (params.action) {
      labels.push(`action="${params.action}"`);
    }

    return this.query({
      rawQuery: `{${labels.join(', ')}}`,
      start: params.start,
      end: params.end,
      limit: params.limit,
    });
  }

  /**
   * Query tech event logs
   */
  async queryTechEvents(params: {
    severity?: string;
    eventType?: string;
    scope?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    const labels: string[] = ['app="tcrn-tms"', 'stream="technical_event_log"'];

    if (params.severity) {
      labels.push(`severity="${params.severity}"`);
    }
    if (params.eventType) {
      labels.push(`event_type="${params.eventType}"`);
    }
    if (params.scope) {
      labels.push(`scope="${params.scope}"`);
    }

    return this.query({
      rawQuery: `{${labels.join(', ')}}`,
      start: params.start,
      end: params.end,
      limit: params.limit,
    });
  }

  /**
   * Query integration logs
   */
  async queryIntegrationLogs(params: {
    direction?: string;
    consumerCode?: string;
    status?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    const labels: string[] = ['app="tcrn-tms"', 'stream="integration_log"'];

    if (params.direction) {
      labels.push(`direction="${params.direction}"`);
    }
    if (params.consumerCode) {
      labels.push(`consumer_code="${params.consumerCode}"`);
    }
    if (params.status) {
      labels.push(`status="${params.status}"`);
    }

    return this.query({
      rawQuery: `{${labels.join(', ')}}`,
      start: params.start,
      end: params.end,
      limit: params.limit,
    });
  }

  /**
   * Build LogQL query from params
   */
  private buildLogQL(params: LokiQueryParams): string {
    const labels: string[] = ['app="tcrn-tms"'];

    if (params.stream) {
      labels.push(`stream="${params.stream}"`);
    }
    if (params.severity) {
      labels.push(`severity="${params.severity}"`);
    }
    if (params.eventType) {
      labels.push(`event_type="${params.eventType}"`);
    }
    if (params.scope) {
      labels.push(`scope="${params.scope}"`);
    }

    let query = `{${labels.join(', ')}}`;

    // Add filters
    if (params.traceId) {
      query += ` | json | trace_id="${params.traceId}"`;
    }
    if (params.keyword) {
      query += ` |= "${params.keyword}"`;
    }

    return query;
  }

  /**
   * Get default start time (24 hours ago)
   */
  private getDefaultStart(): string {
    const date = new Date();
    date.setHours(date.getHours() - 24);
    return date.toISOString();
  }

  /**
   * Transform Loki response to standard format
   */
  private transformResponse(data: {
    status: string;
    data?: {
      resultType: string;
      result: Array<{
        stream: Record<string, string>;
        values: Array<[string, string]>;
      }>;
      stats?: Record<string, unknown>;
    };
  }): LokiQueryResponse {
    const results = data.data?.result || [];

    const entries: LokiLogEntry[] = results.flatMap((r) =>
      r.values.map(([timestamp, value]) => ({
        timestamp: new Date(parseInt(timestamp) / 1000000),
        labels: r.stream,
        data: this.safeJsonParse(value),
      })),
    );

    return {
      entries,
      stats: data.data?.stats,
    };
  }

  /**
   * Safely parse JSON
   */
  private safeJsonParse(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}

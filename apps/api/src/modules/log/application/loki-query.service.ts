// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';

import {
  buildChangeLogQuery,
  buildIntegrationLogQuery,
  buildLokiKeywordSearchQuery,
  buildLokiQueryLogQl,
  buildTechEventQuery,
  getDefaultLokiQueryStart,
  type LokiQueryParams,
  type LokiQueryResponse,
  transformLokiQueryResponse,
} from '../domain/loki-query.policy';
import { LokiQueryGateway } from '../infrastructure/loki-query.gateway';

@Injectable()
export class LokiQueryApplicationService {
  private readonly logger = new Logger(LokiQueryApplicationService.name);

  constructor(
    private readonly lokiQueryGateway: LokiQueryGateway,
  ) {}

  async query(params: LokiQueryParams): Promise<LokiQueryResponse> {
    if (!this.lokiQueryGateway.isEnabled()) {
      return { entries: [] };
    }

    try {
      const rawQuery = params.rawQuery || buildLokiQueryLogQl(params);
      const data = await this.lokiQueryGateway.queryRange({
        query: rawQuery,
        start: params.start || getDefaultLokiQueryStart(),
        end: params.end || new Date().toISOString(),
        limit: params.limit || 100,
        direction: params.direction || 'backward',
      });

      return transformLokiQueryResponse(data);
    } catch (error) {
      this.logger.error(
        `Loki query failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { entries: [] };
    }
  }

  async search(params: {
    keyword: string;
    stream?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    return this.query({
      rawQuery: buildLokiKeywordSearchQuery(params.keyword, params.stream),
      start: params.start,
      end: params.end,
      limit: params.limit,
    });
  }

  async queryChangeLogs(params: {
    objectType?: string;
    action?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    return this.query({
      rawQuery: buildChangeLogQuery(params),
      start: params.start,
      end: params.end,
      limit: params.limit,
    });
  }

  async queryTechEvents(params: {
    severity?: string;
    eventType?: string;
    scope?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    return this.query({
      rawQuery: buildTechEventQuery(params),
      start: params.start,
      end: params.end,
      limit: params.limit,
    });
  }

  async queryIntegrationLogs(params: {
    direction?: string;
    consumerCode?: string;
    status?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    return this.query({
      rawQuery: buildIntegrationLogQuery(params),
      start: params.start,
      end: params.end,
      limit: params.limit,
    });
  }
}

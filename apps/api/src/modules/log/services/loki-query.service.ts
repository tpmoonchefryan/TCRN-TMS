// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LokiQueryApplicationService } from '../application/loki-query.service';
import type {
  CompatibleLogSearchParams,
  LokiLogEntry,
  LokiLogStream,
  LokiQueryParams,
  LokiQueryResponse,
  RawLokiQueryResponse,
} from '../domain/loki-query.policy';
import {
  buildCompatibleLogSearchQuery,
  buildCompatibleRawLogSearchQuery,
  getDefaultLokiQueryStart,
  LOKI_LOG_STREAMS,
  normalizeLogSearchStream,
  resolveRelativeTimeRange,
  transformLokiQueryResponse,
} from '../domain/loki-query.policy';
import { LokiQueryGateway } from '../infrastructure/loki-query.gateway';

@Injectable()
export class LokiQueryService {
  constructor(
    configService: ConfigService,
    private readonly lokiQueryApplicationService: LokiQueryApplicationService = new LokiQueryApplicationService(
      new LokiQueryGateway(configService),
    ),
  ) {}

  async query(params: LokiQueryParams): Promise<LokiQueryResponse> {
    return this.lokiQueryApplicationService.query(params);
  }

  async search(params: {
    keyword: string;
    stream?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    return this.lokiQueryApplicationService.search(params);
  }

  async queryChangeLogs(params: {
    objectType?: string;
    action?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    return this.lokiQueryApplicationService.queryChangeLogs(params);
  }

  async queryTechEvents(params: {
    severity?: string;
    eventType?: string;
    scope?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    return this.lokiQueryApplicationService.queryTechEvents(params);
  }

  async queryIntegrationLogs(params: {
    direction?: string;
    consumerCode?: string;
    status?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    return this.lokiQueryApplicationService.queryIntegrationLogs(params);
  }
}

export {
  buildCompatibleLogSearchQuery,
  buildCompatibleRawLogSearchQuery,
  getDefaultLokiQueryStart as getDefaultStart,
  LOKI_LOG_STREAMS,
  normalizeLogSearchStream,
  resolveRelativeTimeRange,
  transformLokiQueryResponse as transformResponse,
};
export type {
  CompatibleLogSearchParams,
  LokiLogEntry,
  LokiLogStream,
  LokiQueryParams,
  LokiQueryResponse,
  RawLokiQueryResponse,
};

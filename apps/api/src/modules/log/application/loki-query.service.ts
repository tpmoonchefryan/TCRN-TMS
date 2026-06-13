// SPDX-License-Identifier: Apache-2.0
import { Injectable, Logger } from '@nestjs/common';

import {
  buildChangeLogQuery,
  buildIntegrationLogQuery,
  buildLokiQueryLogQl,
  buildTenantScopedLokiKeywordSearchQuery,
  buildTechEventQuery,
  getDefaultLokiQueryStart,
  normalizeLokiQueryRange,
  type LokiQueryParams,
  type LokiQueryResponse,
  transformLokiQueryResponse,
} from '../domain/loki-query.policy';
import { LokiQueryGateway } from '../infrastructure/loki-query.gateway';

@Injectable()
export class LokiQueryApplicationService {
  private readonly logger = new Logger(LokiQueryApplicationService.name);

  constructor(private readonly lokiQueryGateway: LokiQueryGateway) {}

  async query(params: LokiQueryParams): Promise<LokiQueryResponse> {
    if (!this.lokiQueryGateway.isEnabled()) {
      return { entries: [] };
    }

    try {
      const rawQuery =
        params.rawQuery && params.trustedRawQuery ? params.rawQuery : buildLokiQueryLogQl(params);
      const range = normalizeLokiQueryRange({
        start: params.start || getDefaultLokiQueryStart(),
        end: params.end || new Date().toISOString(),
        limit: params.limit,
      });
      const data = await this.lokiQueryGateway.queryRange({
        query: rawQuery,
        start: range.start,
        end: range.end,
        limit: range.limit,
        direction: params.direction || 'backward',
      });

      return transformLokiQueryResponse(data);
    } catch (error) {
      this.logger.error(
        `Loki query failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return { entries: [] };
    }
  }

  async search(params: {
    tenantSchema?: string;
    keyword: string;
    stream?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    return this.query({
      rawQuery: buildTenantScopedLokiKeywordSearchQuery(
        params.keyword,
        params.stream,
        params.tenantSchema
      ),
      trustedRawQuery: true,
      tenantSchema: params.tenantSchema,
      start: params.start,
      end: params.end,
      limit: params.limit,
    });
  }

  async queryChangeLogs(params: {
    tenantSchema?: string;
    objectType?: string;
    action?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    return this.query({
      rawQuery: buildChangeLogQuery(params),
      trustedRawQuery: true,
      tenantSchema: params.tenantSchema,
      start: params.start,
      end: params.end,
      limit: params.limit,
    });
  }

  async queryTechEvents(params: {
    tenantSchema?: string;
    severity?: string;
    eventType?: string;
    scope?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    return this.query({
      rawQuery: buildTechEventQuery(params),
      trustedRawQuery: true,
      tenantSchema: params.tenantSchema,
      start: params.start,
      end: params.end,
      limit: params.limit,
    });
  }

  async queryIntegrationLogs(params: {
    tenantSchema?: string;
    direction?: string;
    consumerCode?: string;
    status?: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<LokiQueryResponse> {
    return this.query({
      rawQuery: buildIntegrationLogQuery(params),
      trustedRawQuery: true,
      tenantSchema: params.tenantSchema,
      start: params.start,
      end: params.end,
      limit: params.limit,
    });
  }
}

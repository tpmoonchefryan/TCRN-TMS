// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  type LokiQueryRangeRequest,
  type RawLokiQueryResponse,
} from '../domain/loki-query.policy';

@Injectable()
export class LokiQueryGateway {
  private readonly lokiUrl: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.lokiUrl = this.configService.get<string>(
      'LOKI_QUERY_URL',
      'http://loki:3100',
    );
    this.enabled = this.configService.get<string>('LOKI_ENABLED', 'false') === 'true';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async queryRange(params: LokiQueryRangeRequest): Promise<RawLokiQueryResponse> {
    const queryParams = new URLSearchParams({
      query: params.query,
      start: params.start,
      end: params.end,
      limit: params.limit.toString(),
      direction: params.direction,
    });

    const response = await fetch(
      `${this.lokiUrl}/loki/api/v1/query_range?${queryParams}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!response.ok) {
      throw new Error(`Loki query failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<RawLokiQueryResponse>;
  }
}

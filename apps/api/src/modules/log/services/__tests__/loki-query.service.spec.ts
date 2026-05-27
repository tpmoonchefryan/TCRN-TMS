// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildCompatibleLogSearchQuery,
  buildCompatibleRawLogSearchQuery,
  isRawLogQuerySyntax,
  LokiQueryService,
  resolveRelativeTimeRange,
} from '../loki-query.service';

describe('log search compatibility helpers', () => {
  const now = new Date('2026-03-28T12:00:00.000Z');

  it('resolves relative time ranges for raw search requests', () => {
    expect(resolveRelativeTimeRange('1h', now)).toEqual({
      start: '2026-03-28T11:00:00.000Z',
      end: '2026-03-28T12:00:00.000Z',
    });
  });

  it('maps plain-text search requests to a Loki keyword query', () => {
    expect(
      buildCompatibleLogSearchQuery(
        {
          tenantSchema: 'tenant_alpha',
          query: 'timeout',
          timeRange: '15m',
          limit: '50',
          stream: 'technical_event_log',
        },
        now
      )
    ).toEqual({
      keyword: 'timeout',
      tenantSchema: 'tenant_alpha',
      stream: 'technical_event_log',
      start: '2026-03-28T11:45:00.000Z',
      end: '2026-03-28T12:00:00.000Z',
      limit: 50,
    });
  });

  it('caps compatible search result limits at the Phase 5 safe maximum', () => {
    expect(
      buildCompatibleLogSearchQuery(
        {
          query: 'timeout',
          timeRange: '15m',
          limit: '500',
          stream: 'technical_event_log',
        },
        now
      )
    ).toEqual({
      keyword: 'timeout',
      stream: 'technical_event_log',
      start: '2026-03-28T11:45:00.000Z',
      end: '2026-03-28T12:00:00.000Z',
      limit: 100,
    });
  });

  it('denies selector-based LogQL compatibility queries', () => {
    expect(isRawLogQuerySyntax('{app="tcrn-tms"} |= "error"')).toBe(true);
    expect(() =>
      buildCompatibleRawLogSearchQuery('{app="tcrn-tms"} |= "error"', 'integration_log')
    ).toThrow('raw_logql_denied');
  });

  it('ignores legacy application filters that do not exist in Loki labels', () => {
    expect(
      buildCompatibleLogSearchQuery(
        {
          keyword: 'retry',
          app: 'api',
          limit: '25',
        },
        now
      )
    ).toEqual({
      keyword: 'retry',
      stream: undefined,
      severity: undefined,
      start: undefined,
      end: undefined,
      limit: 25,
    });
  });
});

describe('LokiQueryService', () => {
  const fetchMock = vi.fn();
  const enabledConfigService = {
    get: vi.fn((key: string, defaultValue?: string) => {
      if (key === 'LOKI_QUERY_URL') {
        return 'http://loki:3100';
      }
      if (key === 'LOKI_ENABLED') {
        return 'true';
      }

      return defaultValue;
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('queries Loki and normalizes the response entries through the layered path', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: {
          resultType: 'streams',
          result: [
            {
              stream: {
                app: 'tcrn-tms',
                stream: 'technical_event_log',
              },
              values: [['1713085200000000000', '{"message":"timeout","requestId":"req_123"}']],
            },
          ],
          stats: { inspectedStreams: 1 },
        },
      }),
    });

    const service = new LokiQueryService(enabledConfigService as never);
    const result = await service.query({
      tenantSchema: 'tenant_alpha',
      keyword: 'timeout',
      stream: 'technical_event_log',
      limit: 25,
    });
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/loki/api/v1/query_range?');
    expect(requestUrl.searchParams.get('query')).toBe(
      '{app="tcrn-tms", tenant_schema="tenant_alpha", stream="technical_event_log"} |= "timeout"'
    );
    expect(result).toEqual({
      entries: [
        {
          timestamp: new Date(1713085200000),
          labels: {
            app: 'tcrn-tms',
            stream: 'technical_event_log',
          },
          data: {
            message: 'timeout',
            requestId: 'req_123',
          },
        },
      ],
      stats: { inspectedStreams: 1 },
    });
  });

  it('returns empty entries when Loki is disabled', async () => {
    const disabledConfigService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        if (key === 'LOKI_ENABLED') {
          return 'false';
        }
        if (key === 'LOKI_QUERY_URL') {
          return 'http://loki:3100';
        }

        return defaultValue;
      }),
    };

    const service = new LokiQueryService(disabledConfigService as never);

    await expect(service.query({ keyword: 'timeout' })).resolves.toEqual({ entries: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('builds stream-scoped raw queries for keyword search helpers', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: {
          resultType: 'streams',
          result: [],
        },
      }),
    });

    const service = new LokiQueryService(enabledConfigService as never);
    await service.search({
      tenantSchema: 'tenant_beta',
      keyword: 'retry',
      stream: 'integration_log',
      limit: 5,
    });
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(requestUrl.searchParams.get('query')).toBe(
      '{app="tcrn-tms", tenant_schema="tenant_beta", stream="integration_log"} |= "retry"'
    );
  });

  it('does not execute untrusted raw queries passed directly to the generic query path', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: {
          resultType: 'streams',
          result: [],
        },
      }),
    });

    const service = new LokiQueryService(enabledConfigService as never);
    await service.query({
      tenantSchema: 'tenant_safe',
      rawQuery: '{tenant_id="other"} |= "secret"',
      keyword: 'safe keyword',
      limit: 500,
    });
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(requestUrl.searchParams.get('query')).toBe(
      '{app="tcrn-tms", tenant_schema="tenant_safe"} |= "safe keyword"'
    );
    expect(requestUrl.searchParams.get('limit')).toBe('100');
  });

  it('fails soft and returns empty entries when Loki responds with an error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'boom',
    });

    const service = new LokiQueryService(enabledConfigService as never);

    await expect(service.queryChangeLogs({ objectType: 'customer', limit: 10 })).resolves.toEqual({
      entries: [],
    });
  });
});

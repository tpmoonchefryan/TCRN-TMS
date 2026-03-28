// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it } from 'vitest';

import {
  buildCompatibleLogSearchQuery,
  buildCompatibleRawLogSearchQuery,
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
          query: 'timeout',
          timeRange: '15m',
          limit: '50',
          stream: 'technical_event_log',
        },
        now
      )
    ).toEqual({
      rawQuery: '{app="tcrn-tms", stream="technical_event_log"} |= "timeout"',
      start: '2026-03-28T11:45:00.000Z',
      end: '2026-03-28T12:00:00.000Z',
      limit: 50,
    });
  });

  it('injects stream filters into selector-based LogQL queries', () => {
    expect(buildCompatibleRawLogSearchQuery('{app="tcrn-tms"} |= "error"', 'integration_log')).toBe(
      '{app="tcrn-tms", stream="integration_log"} |= "error"'
    );
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

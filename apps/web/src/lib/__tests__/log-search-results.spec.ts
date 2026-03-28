// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it } from 'vitest';

import { mapLokiSearchEntry } from '../log-search-results';

describe('mapLokiSearchEntry', () => {
  it('prefers severity labels and direct messages when present', () => {
    expect(
      mapLokiSearchEntry({
        timestamp: '2026-03-28T12:00:00.000Z',
        labels: {
          severity: 'error',
          stream: 'technical_event_log',
        },
        data: {
          message: 'Worker timeout',
          severity: 'warning',
        },
      })
    ).toEqual({
      timestamp: '2026-03-28T12:00:00.000Z',
      level: 'error',
      message: 'Worker timeout',
      labels: {
        severity: 'error',
        stream: 'technical_event_log',
      },
    });
  });

  it('falls back to structured payload summaries when message fields are absent', () => {
    expect(
      mapLokiSearchEntry({
        timestamp: '2026-03-28T12:00:00.000Z',
        labels: {
          stream: 'change_log',
        },
        data: {
          action: 'update',
          objectType: 'customer',
        },
      }).message
    ).toBe('update');
  });

  it('stringifies unknown payloads without losing the raw content', () => {
    expect(
      mapLokiSearchEntry({
        timestamp: '2026-03-28T12:00:00.000Z',
        labels: {},
        data: {
          endpoint: '/api/v1/customers',
          responseStatus: 500,
        },
      })
    ).toMatchObject({
      level: 'info',
    });

    expect(
      mapLokiSearchEntry({
        timestamp: '2026-03-28T12:00:00.000Z',
        labels: {},
        data: 'plain log line',
      }).message
    ).toBe('plain log line');
  });
});

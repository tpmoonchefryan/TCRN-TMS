// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';

import { LokiPushService } from '../loki-push.service';

describe('LokiPushService', () => {
  it('redacts secrets and direct PII before queueing entries for Loki export', async () => {
    const service = new LokiPushService({
      get: vi.fn((key: string, fallback?: string) => {
        if (key === 'LOKI_ENABLED') {
          return 'true';
        }

        return fallback;
      }),
    } as never);

    await service.push(
      'technical_event_log',
      {
        stream: 'technical_event_log',
        email: 'alice@example.test',
      },
      {
        message: 'Contact alice@example.test at +1 415 555 1212',
        authorization: 'Bearer raw-token',
        nested: {
          requestBody: {
            password: 'unsafe',
          },
          safe: 'kept',
        },
      },
      'tenant_alpha'
    );

    const pendingEntries = (service as unknown as { pendingEntries: Array<Record<string, unknown>> })
      .pendingEntries;

    expect(pendingEntries).toHaveLength(1);
    expect(pendingEntries[0]).toEqual(
      expect.objectContaining({
        labels: {
          stream: 'technical_event_log',
          email: '[redacted]',
          tenant_schema: 'tenant_alpha',
        },
        data: {
          message: 'Contact [redacted-email] at [redacted-phone]',
          authorization: '[redacted]',
          nested: {
            requestBody: '[redacted]',
            safe: 'kept',
          },
        },
      })
    );
  });
});

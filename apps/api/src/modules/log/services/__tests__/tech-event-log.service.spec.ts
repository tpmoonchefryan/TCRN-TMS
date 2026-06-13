// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LogSeverity, TechEventScope } from '@tcrn/shared';

import { TechEventLogService } from '../tech-event-log.service';

function createService() {
  const executeRawUnsafe = vi.fn().mockResolvedValue(undefined);
  const databaseService = {
    getPrisma: () => ({
      $executeRawUnsafe: executeRawUnsafe,
    }),
  };
  const maskingService = {
    maskTechLogPayload: vi.fn((payload: Record<string, unknown>) => payload),
  };

  return {
    executeRawUnsafe,
    service: new TechEventLogService(databaseService as never, maskingService as never),
  };
}

describe('TechEventLogService trace correlation', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('writes an explicit event trace id', async () => {
    const { executeRawUnsafe, service } = createService();

    await service.log({
      severity: LogSeverity.ERROR,
      eventType: 'custom-domain.registry_unavailable',
      scope: TechEventScope.GENERAL,
      traceId: 'trace_from_event',
      message: 'Registry unavailable',
    });

    expect(executeRawUnsafe.mock.calls[0]?.[4]).toBe('trace_from_event');
  });

  it('falls back to the request context trace id', async () => {
    const { executeRawUnsafe, service } = createService();

    await service.log(
      {
        severity: LogSeverity.ERROR,
        eventType: 'custom-domain.registry_unavailable',
        message: 'Registry unavailable',
      },
      { tenantSchema: 'tenant_test', traceId: 'trace_from_context' }
    );

    expect(executeRawUnsafe.mock.calls[0]?.[4]).toBe('trace_from_context');
  });

  it('keeps explicit event trace id ahead of context trace id', async () => {
    const { executeRawUnsafe, service } = createService();

    await service.log(
      {
        severity: LogSeverity.ERROR,
        eventType: 'custom-domain.registry_unavailable',
        traceId: 'trace_from_event',
        message: 'Registry unavailable',
      },
      { tenantSchema: 'tenant_test', traceId: 'trace_from_context' }
    );

    expect(executeRawUnsafe.mock.calls[0]?.[4]).toBe('trace_from_event');
  });

  it('uses compatibility request id when context trace id is absent', async () => {
    const { executeRawUnsafe, service } = createService();

    await service.log(
      {
        severity: LogSeverity.WARN,
        eventType: 'legacy.request_id',
        message: 'Legacy request id only',
      },
      { requestId: 'req_legacy' }
    );

    expect(executeRawUnsafe.mock.calls[0]?.[4]).toBe('req_legacy');
  });
});

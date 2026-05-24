// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IntegrationLogService } from '../integration-log.service';

function createService() {
  const executeRawUnsafe = vi.fn().mockResolvedValue(undefined);
  const databaseService = {
    getPrisma: () => ({
      $executeRawUnsafe: executeRawUnsafe,
    }),
  };
  const maskingService = {
    maskIntegrationLogBody: vi.fn((payload: Record<string, unknown> | null) => payload),
  };

  return {
    executeRawUnsafe,
    service: new IntegrationLogService(databaseService as never, maskingService as never),
  };
}

describe('IntegrationLogService trace correlation', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('writes an explicit inbound trace id', async () => {
    const { executeRawUnsafe, service } = createService();

    await service.logInbound({
      endpoint: '/api/v1/public/webhook',
      method: 'POST',
      responseStatus: 503,
      latencyMs: 42,
      traceId: 'trace_from_inbound',
    });

    expect(executeRawUnsafe.mock.calls[0]?.[12]).toBe('trace_from_inbound');
  });

  it('falls back to context trace id for inbound logs', async () => {
    const { executeRawUnsafe, service } = createService();

    await service.logInbound(
      {
        endpoint: '/api/v1/public/webhook',
        method: 'POST',
        responseStatus: 503,
        latencyMs: 42,
      },
      { tenantSchema: 'tenant_test', traceId: 'trace_from_context' }
    );

    expect(executeRawUnsafe.mock.calls[0]?.[12]).toBe('trace_from_context');
  });

  it('keeps explicit outbound trace id ahead of context trace id', async () => {
    const { executeRawUnsafe, service } = createService();

    await service.logOutbound(
      {
        endpoint: 'https://example.test/provider',
        method: 'POST',
        responseStatus: 500,
        latencyMs: 100,
        traceId: 'trace_from_outbound',
      },
      { tenantSchema: 'tenant_test', traceId: 'trace_from_context' }
    );

    expect(executeRawUnsafe.mock.calls[0]?.[12]).toBe('trace_from_outbound');
  });

  it('uses compatibility request id when context trace id is absent', async () => {
    const { executeRawUnsafe, service } = createService();

    await service.logOutbound(
      {
        endpoint: 'https://example.test/provider',
        method: 'POST',
        responseStatus: 500,
        latencyMs: 100,
      },
      { tenantSchema: 'tenant_test', requestId: 'req_legacy' }
    );

    expect(executeRawUnsafe.mock.calls[0]?.[12]).toBe('req_legacy');
  });
});

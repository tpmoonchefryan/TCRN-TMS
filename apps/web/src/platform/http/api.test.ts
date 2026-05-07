import { describe, expect, it } from 'vitest';

import { ApiRequestError, readApiEnvelope } from '@/platform/http/api';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('readApiEnvelope', () => {
  it('captures canonical traceId and keeps requestId compatibility fallback on API errors', async () => {
    await expect(
      readApiEnvelope(
        jsonResponse(
          {
            success: false,
            error: {
              code: 'SYS_CUSTOM_DOMAIN_REGISTRY_UNAVAILABLE',
              message: 'Custom-domain routing is temporarily unavailable.',
              requestId: 'req_legacy_123',
              traceId: 'trace_canonical_123',
            },
          },
          503,
        ),
      ),
    ).rejects.toMatchObject({
      name: 'ApiRequestError',
      code: 'SYS_CUSTOM_DOMAIN_REGISTRY_UNAVAILABLE',
      requestId: 'req_legacy_123',
      traceId: 'trace_canonical_123',
    } satisfies Partial<ApiRequestError>);
  });

  it('keeps requestId-only error envelopes readable for mixed deploy compatibility', async () => {
    await expect(
      readApiEnvelope(
        jsonResponse(
          {
            success: false,
            error: {
              code: 'SYS_DATABASE_ERROR',
              message: 'Request failed.',
              requestId: 'req_only_123',
            },
          },
          500,
        ),
      ),
    ).rejects.toMatchObject({
      requestId: 'req_only_123',
      traceId: undefined,
    } satisfies Partial<ApiRequestError>);
  });
});

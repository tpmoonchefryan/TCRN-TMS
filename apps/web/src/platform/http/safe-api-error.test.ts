import { describe, expect, it } from 'vitest';

import { ApiRequestError } from '@/platform/http/api';
import { toSafeApiErrorView } from '@/platform/http/safe-api-error';

const copy = {
  fallbackTitle: 'Service temporarily unavailable',
  fallbackDescription: 'Try again later or contact an administrator.',
};

describe('toSafeApiErrorView', () => {
  it('uses traceId before legacy requestId for display correlation', () => {
    const view = toSafeApiErrorView(
      new ApiRequestError(
        'Custom-domain routing is temporarily unavailable.',
        'SYS_CUSTOM_DOMAIN_REGISTRY_UNAVAILABLE',
        503,
        undefined,
        'req_legacy_123',
        'trace_canonical_123',
      ),
      copy,
    );

    expect(view).toMatchObject({
      code: 'SYS_CUSTOM_DOMAIN_REGISTRY_UNAVAILABLE',
      traceId: 'trace_canonical_123',
      title: copy.fallbackTitle,
      description: 'Custom-domain routing is temporarily unavailable.',
    });
  });

  it('falls back to requestId when traceId is absent', () => {
    const view = toSafeApiErrorView(
      new ApiRequestError('Request failed.', 'SYS_DATABASE_ERROR', 500, undefined, 'req_only_123'),
      copy,
    );

    expect(view.traceId).toBe('req_only_123');
  });

  it('replaces raw database and ORM error copy with safe operator copy', () => {
    const view = toSafeApiErrorView(
      new ApiRequestError(
        'PrismaClientKnownRequestError: relation "public.custom_domain_binding" does not exist in $queryRawUnsafe SQL',
        'SYS_DATABASE_ERROR',
        503,
        undefined,
        'req_storage_123',
      ),
      copy,
    );

    expect(view.description).toBe(copy.fallbackDescription);
    expect(view.description).not.toMatch(/Prisma|public\.custom_domain_binding|\$queryRawUnsafe|SQL/i);
  });
});

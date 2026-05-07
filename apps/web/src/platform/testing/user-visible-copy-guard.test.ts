import { describe, expect, it } from 'vitest';

import {
  assertNoForbiddenUserVisibleCopy,
  findForbiddenUserVisibleCopy,
} from '@/platform/testing/user-visible-copy-guard';

describe('user-visible-copy-guard', () => {
  it('reports internal storage and implementation terms', () => {
    expect(
      findForbiddenUserVisibleCopy(
        'Prisma migration failed because public.custom_domain_talent_selection is missing.',
      ),
    ).toEqual(expect.arrayContaining(['Prisma', 'migration', 'public.custom_domain_talent_selection']));
  });

  it('throws with the caller-provided surface name when forbidden copy is visible', () => {
    expect(() =>
      assertNoForbiddenUserVisibleCopy('This product decision belongs to future scope.', {
        surface: 'custom-domain unavailable state',
      }),
    ).toThrow(/custom-domain unavailable state/);
  });

  it('allows ordinary recovery copy with trace correlation', () => {
    expect(() =>
      assertNoForbiddenUserVisibleCopy(
        'Custom-domain routing is temporarily unavailable. Trace ID: trace_123.',
      ),
    ).not.toThrow();
  });
});

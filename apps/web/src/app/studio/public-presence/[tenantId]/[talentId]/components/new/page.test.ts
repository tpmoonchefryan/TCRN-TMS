import { describe, expect, it, vi } from 'vitest';

import PublicPresenceComponentAuthoringPage from './page';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect: (href: string) => redirect(href),
}));

describe('retired public presence component authoring route', () => {
  it('redirects the retired talent-scoped component route to homepage management', async () => {
    await PublicPresenceComponentAuthoringPage({
      params: Promise.resolve({ talentId: 'talent-1', tenantId: 'tenant-1' }),
    });

    expect(redirect).toHaveBeenCalledWith('/tenant/tenant-1/talent/talent-1/homepage');
  });
});

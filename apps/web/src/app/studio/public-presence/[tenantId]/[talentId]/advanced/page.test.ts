import { describe, expect, it, vi } from 'vitest';

import PublicPresenceAdvancedIdePage from './page';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect: (href: string) => redirect(href),
}));

describe('retired public presence advanced authoring route', () => {
  it('redirects the retired advanced route to homepage management', async () => {
    await PublicPresenceAdvancedIdePage({
      params: Promise.resolve({ talentId: 'talent-1', tenantId: 'tenant-1' }),
    });

    expect(redirect).toHaveBeenCalledWith('/tenant/tenant-1/talent/talent-1/homepage');
  });
});

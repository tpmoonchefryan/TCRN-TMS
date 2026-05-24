import { describe, expect, it, vi } from 'vitest';

import PublicPresenceTemplateAuthoringPage from './page';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect: (href: string) => redirect(href),
}));

describe('retired public presence template authoring route', () => {
  it('redirects the retired talent-scoped template route to homepage management', async () => {
    await PublicPresenceTemplateAuthoringPage({
      params: Promise.resolve({ talentId: 'talent-1', tenantId: 'tenant-1' }),
    });

    expect(redirect).toHaveBeenCalledWith('/tenant/tenant-1/talent/talent-1/homepage');
  });
});

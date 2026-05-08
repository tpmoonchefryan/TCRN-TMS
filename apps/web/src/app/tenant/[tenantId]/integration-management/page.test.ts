import { describe, expect, it, vi } from 'vitest';

import IntegrationManagementPage from './page';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect: (href: string) => redirect(href),
}));

describe('tenant integration-management compatibility route', () => {
  it('redirects to the split Interface Management route', async () => {
    await IntegrationManagementPage({
      params: Promise.resolve({ tenantId: 'tenant-1' }),
    });

    expect(redirect).toHaveBeenCalledWith('/tenant/tenant-1/interface-management');
  });
});

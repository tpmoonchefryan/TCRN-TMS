import { describe, expect, it, vi } from 'vitest';

import AcIntegrationManagementPage from './page';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect: (href: string) => redirect(href),
}));

describe('AC integration-management compatibility route', () => {
  it('redirects to the split Interface Management route', async () => {
    await AcIntegrationManagementPage({
      params: Promise.resolve({ tenantId: 'tenant-ac' }),
    });

    expect(redirect).toHaveBeenCalledWith('/ac/tenant-ac/interface-management');
  });
});

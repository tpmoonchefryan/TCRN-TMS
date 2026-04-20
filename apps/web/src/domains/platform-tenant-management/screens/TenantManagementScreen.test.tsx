import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { TenantManagementScreen } from '@/domains/platform-tenant-management/screens/TenantManagementScreen';

const mockRequest = vi.fn();
const replace = vi.fn();
let pathname = '/ac/tenant-ac/tenants';
let currentSearch = '';
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
};

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: {
      tenantName: 'AC Tenant',
      tenantTier: 'ac',
      user: {
        displayName: 'AC Admin',
        username: 'ac.admin',
        email: 'ac@example.com',
      },
    },
    request: mockRequest,
    requestEnvelope: mockRequest,
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    replace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

describe('TenantManagementScreen', () => {
  beforeEach(() => {
    localeState.currentLocale = 'en';
    mockRequest.mockReset();
    replace.mockReset();
    pathname = '/ac/tenant-ac/tenants';
    currentSearch = '';
    replace.mockImplementation((href: string) => {
      const resolved = new URL(href, 'https://tcrn.local');
      pathname = resolved.pathname;
      currentSearch = resolved.search.startsWith('?') ? resolved.search.slice(1) : resolved.search;
    });
  });

  it('renders tenant inventory, routes create/edit into dedicated pages, and supports pagination', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/tenants?page=1&pageSize=20') {
        return {
          success: true,
          data: [
            {
              id: 'tenant-ac',
              code: 'AC',
              name: 'AC Tenant',
              schemaName: 'tenant_ac',
              tier: 'ac',
              isActive: true,
              settings: {},
              stats: {
                subsidiaryCount: 1,
                talentCount: 2,
                userCount: 3,
              },
              createdAt: '2026-04-17T00:00:00.000Z',
              updatedAt: '2026-04-17T01:00:00.000Z',
            },
            {
              id: 'tenant-new',
              code: 'BETA',
              name: 'Beta Entertainment',
              schemaName: 'tenant_beta',
              tier: 'standard',
              isActive: true,
              settings: {
                maxTalents: 25,
              },
              stats: {
                subsidiaryCount: 0,
                talentCount: 0,
                userCount: 1,
              },
              createdAt: '2026-04-17T02:00:00.000Z',
              updatedAt: '2026-04-17T02:00:00.000Z',
            },
          ],
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: 21,
              totalPages: 2,
              hasNext: true,
              hasPrev: false,
            },
          },
        };
      }

      if (path === '/api/v1/tenants?page=2&pageSize=20') {
        return {
          success: true,
          data: [
            {
              id: 'tenant-gamma',
              code: 'GAMMA',
              name: 'Gamma Entertainment',
              schemaName: 'tenant_gamma',
              tier: 'standard',
              isActive: false,
              settings: {},
              stats: {
                subsidiaryCount: 2,
                talentCount: 5,
                userCount: 8,
              },
              createdAt: '2026-04-17T03:00:00.000Z',
              updatedAt: '2026-04-17T04:00:00.000Z',
            },
          ],
          meta: {
            pagination: {
              page: 2,
              pageSize: 20,
              totalCount: 21,
              totalPages: 2,
              hasNext: false,
              hasPrev: true,
            },
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantManagementScreen acTenantId="tenant-ac" />);

    expect(await screen.findByRole('heading', { name: 'Tenant Management' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create tenant' })).toHaveAttribute(
      'href',
      '/ac/tenant-ac/tenants/new',
    );
    expect(screen.getAllByRole('link', { name: 'Edit tenant' })[0]).toHaveAttribute(
      'href',
      '/ac/tenant-ac/tenants/tenant-ac',
    );
    expect(screen.getAllByRole('link', { name: 'Edit tenant' })[1]).toHaveAttribute(
      'href',
      '/ac/tenant-ac/tenants/tenant-new',
    );
    expect(screen.queryByPlaceholderText('ACME_CORP')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/ac/tenant-ac/tenants?page=2');
      expect(mockRequest).toHaveBeenCalledWith('/api/v1/tenants?page=2&pageSize=20');
    });

    expect(await screen.findByText('Gamma Entertainment')).toBeInTheDocument();
  });

  it('deactivates a tenant through the confirm dialog from the inventory page', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/tenants?page=1&pageSize=20') {
        return {
          success: true,
          data: [
            {
              id: 'tenant-1',
              code: 'ALPHA',
              name: 'Alpha Entertainment',
              schemaName: 'tenant_alpha',
              tier: 'standard',
              isActive: true,
              settings: {},
              stats: {
                subsidiaryCount: 1,
                talentCount: 4,
                userCount: 5,
              },
              createdAt: '2026-04-17T00:00:00.000Z',
              updatedAt: '2026-04-17T01:00:00.000Z',
            },
          ],
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      if (path === '/api/v1/tenants/tenant-1/deactivate' && init?.method === 'POST') {
        return {
          id: 'tenant-1',
          isActive: false,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantManagementScreen acTenantId="tenant-ac" />);

    expect(await screen.findByText('Alpha Entertainment')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Deactivate tenant' })[0]);

    await screen.findByRole('dialog');
    fireEvent.click(screen.getAllByRole('button', { name: 'Deactivate tenant' })[1]);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/tenants/tenant-1/deactivate',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });
});

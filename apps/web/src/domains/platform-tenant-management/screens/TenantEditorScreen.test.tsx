import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { TenantEditorScreen } from '@/domains/platform-tenant-management/screens/TenantEditorScreen';

const mockRequest = vi.fn();
const mockReplace = vi.fn();
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

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
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

describe('TenantEditorScreen', () => {
  beforeEach(() => {
    localeState.currentLocale = 'en';
    mockRequest.mockReset();
    mockReplace.mockReset();
  });

  it('provisions a tenant from the dedicated create page and redirects to its editor', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/tenants' && init?.method === 'POST') {
        return {
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
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantEditorScreen acTenantId="tenant-ac" mode="create" />);

    fireEvent.change(screen.getByLabelText('Tenant code'), {
      target: { value: 'beta' },
    });
    fireEvent.change(screen.getByLabelText('Tenant name'), {
      target: { value: 'Beta Entertainment' },
    });
    fireEvent.change(screen.getByLabelText('Max talents'), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByLabelText('Admin username'), {
      target: { value: 'beta.admin' },
    });
    fireEvent.change(screen.getByLabelText('Admin email'), {
      target: { value: 'beta@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Admin password'), {
      target: { value: 'SuperSecure1234' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create tenant' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/tenants',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
    expect(mockReplace).toHaveBeenCalledWith('/ac/tenant-ac/tenants/tenant-new');
  });

  it('loads and updates a tenant from the dedicated edit page', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/tenants/tenant-1' && !init) {
        return {
          id: 'tenant-1',
          code: 'ALPHA',
          name: 'Alpha Entertainment',
          schemaName: 'tenant_alpha',
          tier: 'standard',
          isActive: true,
          settings: {
            maxTalents: 10,
            maxCustomersPerTalent: 200,
            features: ['homepage'],
          },
          stats: {
            subsidiaryCount: 1,
            talentCount: 4,
            userCount: 5,
          },
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T01:00:00.000Z',
        };
      }

      if (path === '/api/v1/tenants/tenant-1' && init?.method === 'PATCH') {
        return {
          id: 'tenant-1',
          code: 'ALPHA',
          name: 'Alpha Entertainment Updated',
          schemaName: 'tenant_alpha',
          tier: 'standard',
          isActive: true,
          settings: {
            maxTalents: 12,
            maxCustomersPerTalent: 200,
            features: ['homepage'],
          },
          stats: {
            subsidiaryCount: 1,
            talentCount: 4,
            userCount: 5,
          },
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T02:00:00.000Z',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TenantEditorScreen acTenantId="tenant-ac" managedTenantId="tenant-1" mode="edit" />);

    expect(await screen.findByRole('heading', { name: 'Alpha Entertainment' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tenant code')).toHaveValue('ALPHA');
    expect(screen.getByText('Tier: Standard')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tenant name'), {
      target: { value: 'Alpha Entertainment Updated' },
    });
    fireEvent.change(screen.getByLabelText('Max talents'), {
      target: { value: '12' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/tenants/tenant-1',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });

    expect(await screen.findByText('Alpha Entertainment Updated was updated.')).toBeInTheDocument();
  });
});

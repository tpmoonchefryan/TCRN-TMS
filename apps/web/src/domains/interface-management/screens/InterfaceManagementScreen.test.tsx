import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '@tcrn/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InterfaceManagementScreen } from '@/domains/interface-management/screens/InterfaceManagementScreen';
import { ApiRequestError } from '@/platform/http/api';

const mockRequest = vi.fn();
const mockReplace = vi.fn();
let searchQuery = '';
let pathname = '/tenant/tenant-1/interface-management';
const localeState = {
  locale: 'en' as SupportedUiLocale,
  copy: null,
  setLocale: vi.fn(),
  availableLocales: [...SUPPORTED_UI_LOCALES],
};

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(searchQuery),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    requestEnvelope: vi.fn(),
    session: {
      tenantName: 'Test Tenant',
      tenantTier: 'tenant',
      tenantCode: 'TENANT_TEST',
      user: {
        displayName: 'Operator Alice',
        username: 'alice',
        email: 'alice@example.com',
      },
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useUiLocale: () => localeState,
}));

describe('InterfaceManagementScreen', () => {
  beforeEach(() => {
    searchQuery = '';
    pathname = '/tenant/tenant-1/interface-management';
    localeState.locale = 'en';
    mockRequest.mockReset();
    mockReplace.mockReset();
  });

  it('keeps the tenant interface surface adapter-only', async () => {
    const user = userEvent.setup();

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return {
          tenantId: 'tenant-1',
          subsidiaries: [],
          directTalents: [],
        };
      }

      if (path === '/api/v1/integration/adapter-definitions') {
        return [];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return [];
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<InterfaceManagementScreen tenantId="tenant-1" />);

    expect(
      await screen.findByRole('heading', { name: 'Interface Management' })
    ).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Tenant root/i }));

    expect(screen.getByText(/TCRN product interface definitions/)).toBeInTheDocument();
    expect(await screen.findByText('No adapters configured')).toBeInTheDocument();
    expect(screen.getByText('Tenant Adapters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New adapter/i })).toBeInTheDocument();
    expect(screen.queryByText('Webhook Endpoints')).not.toBeInTheDocument();
    expect(screen.queryByText('API Clients')).not.toBeInTheDocument();
    expect(screen.queryByText('Email Management')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/integration/webhooks');
      expect(mockRequest).not.toHaveBeenCalledWith(
        '/api/v1/configuration-entity/consumer?includeInactive=true&page=1&pageSize=100'
      );
      expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/email/config');
    });
  });

  it('navigates Add Adapter to the dedicated new adapter page with selected scope query', async () => {
    const user = userEvent.setup();

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return {
          tenantId: 'tenant-1',
          subsidiaries: [],
          directTalents: [],
        };
      }

      if (path === '/api/v1/integration/adapter-definitions') {
        return [];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        return [];
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<InterfaceManagementScreen tenantId="tenant-1" />);

    await user.click(await screen.findByRole('button', { name: /Tenant root/i }));
    await user.click(await screen.findByRole('button', { name: /New adapter/i }));

    expect(mockReplace).toHaveBeenCalledWith(
      '/tenant/tenant-1/interface-management/adapters/new?ownerType=tenant'
    );
  });

  it('explains the AC control-plane adapter boundary instead of raw guard text', async () => {
    localeState.locale = 'zh_HANS';
    pathname = '/ac/ac-tenant/interface-management';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/integration/adapter-definitions') {
        return [];
      }

      if (path === '/api/v1/integration/adapters?includeInherited=true&includeDisabled=true') {
        throw new ApiRequestError(
          'Module is not enabled for this tenant.',
          'TENANT_CAPABILITY_DISABLED',
          403
        );
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<InterfaceManagementScreen tenantId="ac-tenant" workspaceKind="ac" />);

    expect(await screen.findByText('当前范围无法使用适配器')).toBeInTheDocument();
    expect(screen.getByText(/AC 是平台管理租户/)).toBeInTheDocument();
    expect(screen.getByText(/此 AC 页面仅用于汇总\/就绪说明，不承载适配器记录/)).toBeInTheDocument();
    expect(screen.queryByText('Module is not enabled for this tenant.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新建适配器/ })).toBeDisabled();

    await waitFor(() => {
      expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/integration/webhooks');
    });
  });
});

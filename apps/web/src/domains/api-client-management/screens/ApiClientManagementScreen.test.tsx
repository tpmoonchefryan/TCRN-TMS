import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '@tcrn/shared';

import { ApiClientManagementScreen } from '@/domains/api-client-management/screens/ApiClientManagementScreen';

const mockRequest = vi.fn();
const mockReplace = vi.fn();
let searchQuery = '';
let pathname = '/ac/tenant-ac/api-clients';
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
      tenantName: 'AC Tenant',
      tenantTier: 'ac',
      tenantCode: 'AC',
      user: {
        displayName: 'Platform Operator',
        username: 'operator',
        email: 'operator@example.com',
      },
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useUiLocale: () => localeState,
}));

describe('ApiClientManagementScreen', () => {
  beforeEach(() => {
    searchQuery = '';
    pathname = '/ac/tenant-ac/api-clients';
    mockRequest.mockReset();
    mockReplace.mockReset();
  });

  it('keeps API client key lifecycle on the AC platform surface', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (
        path === '/api/v1/configuration-entity/consumer?includeInactive=true&page=1&pageSize=100'
      ) {
        return [];
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<ApiClientManagementScreen tenantId="tenant-ac" />);

    expect(
      await screen.findByRole('heading', { name: 'API Client Management' })
    ).toBeInTheDocument();
    expect(screen.getByText(/TCRN product API client records/)).toBeInTheDocument();
    expect(await screen.findByText('No API clients configured')).toBeInTheDocument();
    expect(screen.getAllByText('API Clients').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /New API client/i })).toBeInTheDocument();
    expect(screen.queryByText('Scope capability matrix')).not.toBeInTheDocument();
    expect(screen.queryByText('Tenant Adapters')).not.toBeInTheDocument();
    expect(screen.queryByText('Webhook Endpoints')).not.toBeInTheDocument();
    expect(screen.queryByText('Email Management')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/integration/adapter-definitions');
      expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/integration/webhooks');
      expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/email/config');
    });
  });
});

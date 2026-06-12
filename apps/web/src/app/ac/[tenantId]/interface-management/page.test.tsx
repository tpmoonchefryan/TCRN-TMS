import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AcInterfaceManagementPage from './page';

const mockRequest = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/ac/tenant-ac/interface-management',
  useRouter: () => ({
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(''),
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
        displayName: 'Operator Alice',
        username: 'alice',
        email: 'alice@example.com',
      },
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useUiLocale: () => ({
    locale: 'en',
    copy: null,
    setLocale: vi.fn(),
    availableLocales: ['en'],
  }),
}));

describe('AC interface-management direct route', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockRejectedValue(new Error('Operational integration request should not run'));
  });

  it('renders not_available_in_ac before operational adapter effects run', async () => {
    render(
      await AcInterfaceManagementPage({
        params: Promise.resolve({ tenantId: 'tenant-ac' }),
      })
    );

    expect(
      screen.getByRole('heading', { name: 'Interface Management is not available in AC' })
    ).toBeInTheDocument();
    expect(screen.getByText('not_available_in_ac')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Platform/DevOps Tools' })).toHaveAttribute(
      'href',
      '/ac/tenant-ac/platform-tools'
    );
    expect(screen.queryByRole('button', { name: /new adapter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/module is not enabled/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dispatcher|live|svix|sso|captcha|external-ready/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockRequest).not.toHaveBeenCalled();
    });
    expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/integration/adapters');
    expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/integration/adapters?includeInherited=true&includeDisabled=true');
    expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/integration/adapter-definitions');
    expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/integration/webhooks');
    expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/integration/webhooks/events');
    expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/integration/webhook-definitions');
  });
});

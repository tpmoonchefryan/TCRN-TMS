import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '@tcrn/shared';

import { WebhookManagementScreen } from '@/domains/webhook-management/screens/WebhookManagementScreen';

const mockRequest = vi.fn();
const mockReplace = vi.fn();
let searchQuery = '';
let pathname = '/tenant/tenant-1/webhook-management';
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

describe('WebhookManagementScreen', () => {
  beforeEach(() => {
    searchQuery = '';
    pathname = '/tenant/tenant-1/webhook-management';
    mockRequest.mockReset();
    mockReplace.mockReset();
  });

  it('keeps webhook management separate from adapters, email, and API clients', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/organization/tree?includeInactive=false') {
        return {
          tenantId: 'tenant-1',
          subsidiaries: [],
          directTalents: [],
        };
      }

      if (path === '/api/v1/integration/webhooks') {
        return [];
      }

      if (path === '/api/v1/integration/webhooks/events') {
        return [];
      }

      if (path === '/api/v1/integration/webhook-definitions') {
        return [];
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<WebhookManagementScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Webhook Management' })).toBeInTheDocument();

    expect(await screen.findByText('No webhooks configured')).toBeInTheDocument();
    expect(screen.getByText('Webhook Endpoints')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New webhook/i })).toBeInTheDocument();
    expect(screen.queryByText('Tenant Adapters')).not.toBeInTheDocument();
    expect(screen.queryByText('API Clients')).not.toBeInTheDocument();
    expect(screen.queryByText('Email Management')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/integration/adapter-definitions');
      expect(mockRequest).not.toHaveBeenCalledWith(
        '/api/v1/configuration-entity/consumer?includeInactive=true&page=1&pageSize=100'
      );
      expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/email/config');
    });
  });
});

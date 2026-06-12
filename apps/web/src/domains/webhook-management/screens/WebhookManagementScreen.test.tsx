import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '@tcrn/shared';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebhookManagementScreen } from '@/domains/webhook-management/screens/WebhookManagementScreen';
import { ApiRequestError } from '@/platform/http/api';

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
    localeState.locale = 'en';
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
    expect(screen.getByText(/TCRN business webhook event subscriptions/)).toBeInTheDocument();

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

  it('explains the AC control-plane webhook boundary instead of raw guard text', async () => {
    localeState.locale = 'zh_HANS';
    pathname = '/ac/ac-tenant/webhook-management';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/integration/webhooks') {
        throw new ApiRequestError(
          'Module is not enabled for this tenant.',
          'TENANT_CAPABILITY_DISABLED',
          403
        );
      }

      if (
        path === '/api/v1/integration/webhooks/events' ||
        path === '/api/v1/integration/webhook-definitions'
      ) {
        return [];
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    render(<WebhookManagementScreen tenantId="ac-tenant" workspaceKind="ac" />);

    expect(await screen.findByText('当前范围无法使用 Webhook')).toBeInTheDocument();
    expect(screen.getByText(/AC 是平台管理租户/)).toBeInTheDocument();
    expect(
      screen.getByText(/此 AC 页面仅用于汇总\/就绪说明，不承载 Webhook 记录或投递器就绪状态/)
    ).toBeInTheDocument();
    expect(screen.queryByText('Module is not enabled for this tenant.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新建 Webhook/ })).toBeDisabled();

    await waitFor(() => {
      expect(mockRequest).not.toHaveBeenCalledWith('/api/v1/integration/adapter-definitions');
    });
  });
});

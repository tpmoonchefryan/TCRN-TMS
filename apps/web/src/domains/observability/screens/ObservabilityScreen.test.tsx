import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ObservabilityScreen } from '@/domains/observability/screens/ObservabilityScreen';

const mockRequest = vi.fn();
const mockReplace = vi.fn();
let searchQuery = '';
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
};

vi.mock('next/navigation', () => ({
  usePathname: () => '/tenant/tenant-1/observability',
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(searchQuery),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    session: {
      tenantName: 'Moonshot Tenant',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

describe('ObservabilityScreen', () => {
  beforeEach(() => {
    searchQuery = '';
    localeState.currentLocale = 'en';
    mockReplace.mockReset();
    mockRequest.mockReset();
  });

  it('renders change logs and switches into log search results', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/logs/changes?page=1&pageSize=20') {
        return {
          items: [
            {
              id: 'change-1',
              occurredAt: '2026-04-17T10:00:00.000Z',
              operatorId: 'user-1',
              operatorName: 'Operator Alice',
              action: 'update',
              objectType: 'talent',
              objectId: 'talent-1',
              objectName: 'Tokino Sora',
              diff: {
                displayName: {
                  old: 'Old Name',
                  new: 'Tokino Sora',
                },
              },
              ipAddress: '127.0.0.1',
              userAgent: 'Vitest',
              requestId: 'req_change_1',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        };
      }

      if (path === '/api/v1/logs/search?limit=20&timeRange=24h') {
        return {
          entries: [
            {
              timestamp: '2026-04-17T10:05:00.000Z',
              labels: {
                app: 'tcrn-tms',
                stream: 'integration_log',
                severity: 'warn',
              },
              data: {
                message: 'Webhook delivery delayed',
              },
            },
          ],
          stats: null,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<ObservabilityScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: 'Observability' })).toBeInTheDocument();
    expect(await screen.findByText('Tokino Sora')).toBeInTheDocument();
    expect(screen.getByText('Operator Alice')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Log Search' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/tenant/tenant-1/observability?tab=log-search');
    });

    expect(await screen.findByText('Webhook delivery delayed')).toBeInTheDocument();
    expect(screen.getByText('integration_log')).toBeInTheDocument();
  });

  it('uses the failed integration log endpoint when failed-only mode is enabled', async () => {
    searchQuery = 'tab=integration-logs';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/logs/integrations?page=1&pageSize=20') {
        return {
          items: [
            {
              id: 'integration-1',
              occurredAt: '2026-04-17T10:00:00.000Z',
              consumerId: 'consumer-1',
              consumerCode: 'PUBLIC_API',
              direction: 'outbound',
              endpoint: '/webhook/order-sync',
              method: 'POST',
              requestHeaders: null,
              requestBody: null,
              responseStatus: 202,
              responseBody: null,
              latencyMs: 120,
              errorMessage: null,
              traceId: 'trace-initial',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        };
      }

      if (path === '/api/v1/logs/integrations/failed?page=1&pageSize=20') {
        return {
          items: [
            {
              id: 'integration-2',
              occurredAt: '2026-04-17T10:08:00.000Z',
              consumerId: 'consumer-1',
              consumerCode: 'PUBLIC_API',
              direction: 'outbound',
              endpoint: '/webhook/order-sync',
              method: 'POST',
              requestHeaders: null,
              requestBody: null,
              responseStatus: 500,
              responseBody: null,
              latencyMs: 400,
              errorMessage: 'Upstream timeout',
              traceId: 'trace-failed',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<ObservabilityScreen tenantId="tenant-1" />);

    expect(await screen.findByText('PUBLIC_API')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /Show failed requests only/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh integration logs' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith('/api/v1/logs/integrations/failed?page=1&pageSize=20');
    });

    expect(await screen.findByText('trace-failed')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('renders localized zh copy for the header chrome', async () => {
    localeState.currentLocale = 'zh';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/logs/changes?page=1&pageSize=20') {
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<ObservabilityScreen tenantId="tenant-1" />);

    expect(await screen.findByRole('heading', { name: '可观测性' })).toBeInTheDocument();
    expect((await screen.findAllByText('变更日志')).length).toBeGreaterThan(0);
  });
});

import type { SupportedUiLocale } from '@tcrn/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ObservabilityScreen } from '@/domains/observability/screens/ObservabilityScreen';

const mockRequest = vi.fn();
const mockReplace = vi.fn();
let searchQuery = '';
const localeState = {
  locale: 'en' as SupportedUiLocale,
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
  useUiLocale: () => localeState,
}));

describe('ObservabilityScreen', () => {
  beforeEach(() => {
    searchQuery = '';
    localeState.locale = 'en';
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
            {
              id: 'change-2',
              occurredAt: '2026-04-17T10:01:00.000Z',
              operatorId: null,
              operatorName: null,
              action: 'approve',
              objectType: 'marshmallow_message',
              objectId: 'message-1',
              objectName: 'Marshmallow Message',
              diff: {
                old: {
                  status: 'pending',
                },
                new: {
                  status: 'approved',
                },
              },
              ipAddress: null,
              userAgent: null,
              requestId: 'req_change_2',
            },
          ],
          total: 2,
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
    expect(screen.getByText(/displayName: Old Name -> Tokino Sora/)).toBeInTheDocument();
    expect(screen.getByText(/status: pending -> approved/)).toBeInTheDocument();
    expect(screen.queryByText('new, old')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'View details' })[0]);

    expect(await screen.findByRole('dialog', { name: 'Change Log Detail' })).toBeInTheDocument();
    expect(screen.getAllByText(/displayName: Old Name -> Tokino Sora/)).toHaveLength(2);
    fireEvent.click(screen.getByLabelText('Close details drawer'));

    fireEvent.click(screen.getAllByRole('button', { name: 'View details' })[1]);
    expect(await screen.findByRole('dialog', { name: 'Change Log Detail' })).toBeInTheDocument();
    expect(screen.getAllByText(/status: pending -> approved/)).toHaveLength(2);
    fireEvent.click(screen.getByLabelText('Close details drawer'));

    fireEvent.click(screen.getByRole('tab', { name: 'Log Search' }));

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
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/logs/integrations/failed?page=1&pageSize=20'
      );
    });

    expect(await screen.findByText('trace-failed')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('surfaces technical event actor and network context with a detail drawer', async () => {
    searchQuery = 'tab=tech-events';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/logs/events?page=1&pageSize=20') {
        return {
          items: [
            {
              id: 'event-login',
              occurredAt: '2026-04-17T10:08:00.000Z',
              severity: 'info',
              eventType: 'LOGIN_SUCCESS',
              scope: 'auth',
              traceId: 'trace-login',
              spanId: 'span-login',
              source: 'api',
              message: 'User signed in',
              payloadJson: {
                username: 'alice@example.com',
                tenantName: 'Moonshot Tenant',
                requestId: 'req-login',
                ipAddress: '203.0.113.10',
                sessionId: 'session-1',
                fingerprint: 'fp-123',
              },
              errorCode: null,
              errorStack: null,
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

    expect(await screen.findByText('LOGIN_SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('Actor: alice@example.com')).toBeInTheDocument();
    expect(
      screen.getByText('IP 203.0.113.10 / Session session-1 / Fingerprint fp-123')
    ).toBeInTheDocument();
    expect(screen.getByText('Request: req-login')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View details' }));

    expect(
      await screen.findByRole('dialog', { name: 'Technical Event Detail' })
    ).toBeInTheDocument();
    expect(screen.getByText('fp-123')).toBeInTheDocument();
    expect(screen.getByText('span-login')).toBeInTheDocument();
  });

  it('hydrates integration log pagination from the URL and keeps page changes shareable', async () => {
    searchQuery = 'tab=integration-logs&page=2&pageSize=50';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/logs/integrations?page=2&pageSize=50') {
        return {
          items: [
            {
              id: 'integration-page-2',
              occurredAt: '2026-04-17T10:00:00.000Z',
              consumerId: 'consumer-1',
              consumerCode: 'PUBLIC_API',
              direction: 'outbound',
              endpoint: '/webhook/page-2',
              method: 'POST',
              requestHeaders: null,
              requestBody: null,
              responseStatus: 202,
              responseBody: null,
              latencyMs: 120,
              errorMessage: null,
              traceId: 'trace-page-2',
            },
          ],
          total: 51,
          page: 2,
          pageSize: 50,
          totalPages: 2,
        };
      }

      if (path === '/api/v1/logs/integrations?page=1&pageSize=50') {
        return {
          items: [
            {
              id: 'integration-page-1',
              occurredAt: '2026-04-17T10:05:00.000Z',
              consumerId: 'consumer-1',
              consumerCode: 'PUBLIC_API',
              direction: 'outbound',
              endpoint: '/webhook/page-1',
              method: 'POST',
              requestHeaders: null,
              requestBody: null,
              responseStatus: 200,
              responseBody: null,
              latencyMs: 100,
              errorMessage: null,
              traceId: 'trace-page-1',
            },
          ],
          total: 51,
          page: 1,
          pageSize: 50,
          totalPages: 2,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<ObservabilityScreen tenantId="tenant-1" />);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith('/api/v1/logs/integrations?page=2&pageSize=50');
    });
    expect(screen.getByRole('tab', { name: 'Integration Logs' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith('/api/v1/logs/integrations?page=1&pageSize=50');
      expect(mockReplace).toHaveBeenCalledWith(
        '/tenant/tenant-1/observability?tab=integration-logs&pageSize=50'
      );
    });
  });

  it('renders localized zh copy for the header chrome', async () => {
    localeState.locale = 'zh_HANS';

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

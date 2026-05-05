import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportsManagementScreen } from '@/domains/reports-management/screens/ReportsManagementScreen';

const mockRequest = vi.fn();
const openSpy = vi.fn();
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
};

HTMLDialogElement.prototype.showModal = vi.fn(function mockShowModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
HTMLDialogElement.prototype.close = vi.fn(function mockClose(this: HTMLDialogElement) {
  this.removeAttribute('open');
});

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    session: {
      tenantName: 'Test Tenant',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

describe('ReportsManagementScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    openSpy.mockReset();
    localeState.currentLocale = 'en';
    vi.stubGlobal('open', openSpy);
  });

  it('passes a localized close label to the report drawer', async () => {
    localeState.currentLocale = 'zh';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/reports/mfr/jobs?talentId=talent-1&page=1&pageSize=20') {
        return {
          items: [],
          meta: {
            total: 0,
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<ReportsManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: '报表管理' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '起草报表' })[0]);

    expect(await screen.findByRole('button', { name: '关闭 MFR 任务抽屉' })).toBeInTheDocument();
  });

  it('loads the report ledger and applies a status filter', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/reports/mfr/jobs?talentId=talent-1&page=1&pageSize=20') {
        return {
          items: [
            {
              id: 'job-1',
              reportType: 'mfr',
              status: 'pending',
              totalRows: null,
              fileName: null,
              createdAt: '2026-04-17T10:00:00.000Z',
              completedAt: null,
              expiresAt: null,
            },
          ],
          meta: {
            total: 1,
          },
        };
      }

      if (path === '/api/v1/reports/mfr/jobs?talentId=talent-1&page=1&pageSize=20&status=success') {
        return {
          items: [
            {
              id: 'job-2',
              reportType: 'mfr',
              status: 'success',
              totalRows: 52,
              fileName: 'MFR_talent-1_success.xlsx',
              createdAt: '2026-04-17T11:00:00.000Z',
              completedAt: '2026-04-17T11:02:00.000Z',
              expiresAt: '2026-04-17T11:10:00.000Z',
            },
          ],
          meta: {
            total: 1,
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<ReportsManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Reports Management' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Run History' }));
    expect(await screen.findByText('Pending file assignment')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Job status filter'), {
      target: { value: 'success' },
    });

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/reports/mfr/jobs?talentId=talent-1&page=1&pageSize=20&status=success',
      );
    });

    expect(await screen.findByText('MFR_talent-1_success.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('Pending file assignment')).not.toBeInTheDocument();
  });

  it('locks report draft filters while preview is pending', async () => {
    let resolvePreview: (value: {
      totalCount: number;
      preview: [];
      filterSummary: {
        platforms: string[];
        dateRange: string | null;
        includeExpired: boolean;
      };
    }) => void = () => {};
    const previewResponse = new Promise<Parameters<typeof resolvePreview>[0]>((resolve) => {
      resolvePreview = resolve;
    });

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/reports/mfr/jobs?talentId=talent-1&page=1&pageSize=20') {
        return {
          items: [],
          meta: {
            total: 0,
          },
        };
      }

      if (path === '/api/v1/reports/mfr/search' && init?.method === 'POST') {
        return previewResponse;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<ReportsManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Draft report' }))[0]);
    fireEvent.change(screen.getByLabelText('Platform codes'), {
      target: { value: 'YOUTUBE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview rows' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/reports/mfr/search',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            talentId: 'talent-1',
            filters: {
              platformCodes: ['YOUTUBE'],
              membershipClassCodes: undefined,
              membershipTypeCodes: undefined,
              membershipLevelCodes: undefined,
              statusCodes: undefined,
              validFromStart: undefined,
              validFromEnd: undefined,
              validToStart: undefined,
              validToEnd: undefined,
              includeExpired: undefined,
              includeInactive: undefined,
            },
            previewLimit: 8,
          }),
        }),
      );
    });
    expect(screen.getByLabelText('Platform codes')).toBeDisabled();
    expect(screen.getByLabelText('Download format')).toBeDisabled();
    expect(screen.getByLabelText('Include inactive memberships')).toBeDisabled();

    resolvePreview({
      totalCount: 0,
      preview: [],
      filterSummary: {
        platforms: ['YOUTUBE'],
        dateRange: null,
        includeExpired: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Platform codes')).not.toBeDisabled();
    });
    expect(await screen.findByText('Matched Rows')).toBeInTheDocument();
  });

  it('creates a local MFR job and refreshes the ledger', async () => {
    let hasQueuedJob = false;

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/reports/mfr/jobs?talentId=talent-1&page=1&pageSize=20') {
        return {
          items: hasQueuedJob
            ? [
                {
                  id: 'job-created',
                  reportType: 'mfr',
                  status: 'pending',
                  totalRows: 84,
                  fileName: null,
                  createdAt: '2026-04-17T12:00:00.000Z',
                  completedAt: null,
                  expiresAt: null,
                },
              ]
            : [],
          meta: {
            total: hasQueuedJob ? 1 : 0,
          },
        };
      }

      if (path === '/api/v1/reports/mfr/jobs' && init?.method === 'POST') {
        hasQueuedJob = true;
        return {
          deliveryMode: 'tms_job',
          jobId: 'job-created',
          status: 'pending',
          estimatedRows: 84,
          createdAt: '2026-04-17T12:00:00.000Z',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<ReportsManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Run History' }));
    expect(await screen.findByText('No MFR jobs found')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Create MFR Job' })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Draft report' })[0]);

    expect(await screen.findByRole('heading', { name: 'Create MFR Job' })).toBeInTheDocument();
    expect(screen.getByText('Preview first, then queue')).toBeInTheDocument();
    expect(screen.getByText('Code filters')).toBeInTheDocument();
    expect(screen.getByText('Validity window')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.getByText('No MFR jobs found')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create MFR job' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/reports/mfr/jobs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            talentId: 'talent-1',
            filters: undefined,
            format: 'xlsx',
          }),
        }),
      );
    });

    expect(await screen.findByText(/MFR job job-created was queued/i)).toBeInTheDocument();
    expect(await screen.findByText('Pending file assignment')).toBeInTheDocument();
  });

  it('explains external PII platform handoff after creating portal-delivered reports', async () => {
    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/reports/mfr/jobs?talentId=talent-1&page=1&pageSize=20') {
        return {
          items: [],
          meta: {
            total: 0,
          },
        };
      }

      if (path === '/api/v1/reports/mfr/jobs' && init?.method === 'POST') {
        return {
          deliveryMode: 'pii_platform_portal',
          redirectUrl: 'https://pii.example.com/reports/session-1',
          expiresAt: '2026-04-17T12:10:00.000Z',
          estimatedRows: 42,
          customerCount: 42,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<ReportsManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Draft report' }))[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Create MFR job' }));

    expect(await screen.findByText('PII platform handoff ready')).toBeInTheDocument();
    expect(screen.getByText('2. Complete in PII platform')).toBeInTheDocument();
    expect(screen.getByText('3. Track in history')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open PII platform' })).toHaveAttribute(
      'href',
      'https://pii.example.com/reports/session-1',
    );
  });

  it('downloads completed jobs and cancels pending jobs through the shared dialog', async () => {
    let pendingStatus: 'pending' | 'cancelled' = 'pending';

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/reports/mfr/jobs?talentId=talent-1&page=1&pageSize=20') {
        return {
          items: [
            {
              id: 'job-download',
              reportType: 'mfr',
              status: 'success',
              totalRows: 12,
              fileName: 'MFR_ready.xlsx',
              createdAt: '2026-04-17T12:00:00.000Z',
              completedAt: '2026-04-17T12:03:00.000Z',
              expiresAt: '2026-04-17T12:10:00.000Z',
            },
            {
              id: 'job-cancel',
              reportType: 'mfr',
              status: pendingStatus,
              totalRows: null,
              fileName: null,
              createdAt: '2026-04-17T12:05:00.000Z',
              completedAt: null,
              expiresAt: null,
            },
          ],
          meta: {
            total: 2,
          },
        };
      }

      if (path === '/api/v1/reports/mfr/jobs/job-download/download?talent_id=talent-1') {
        return {
          downloadUrl: 'https://files.example.com/report.xlsx',
          expiresIn: 300,
          fileName: 'MFR_ready.xlsx',
        };
      }

      if (path === '/api/v1/reports/mfr/jobs/job-cancel?talent_id=talent-1' && init?.method === 'DELETE') {
        pendingStatus = 'cancelled';
        return {
          id: 'job-cancel',
          status: 'cancelled',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<ReportsManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Run History' }));
    expect(await screen.findByText('MFR_ready.xlsx')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Download MFR_ready.xlsx' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith('/api/v1/reports/mfr/jobs/job-download/download?talent_id=talent-1');
    });

    expect(openSpy).toHaveBeenCalledWith('https://files.example.com/report.xlsx', '_blank', 'noopener,noreferrer');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel job-cancel' }));

    expect(await screen.findByText('Cancel report job?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel job' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/reports/mfr/jobs/job-cancel?talent_id=talent-1',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });

    expect(await screen.findByText(/selected job was cancelled/i)).toBeInTheDocument();
  });
});

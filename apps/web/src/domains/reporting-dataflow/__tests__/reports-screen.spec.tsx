// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListJobs = vi.hoisted(() => vi.fn());
const mockCancelJob = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock('@/platform/state/talent-store', () => ({
  useTalentStore: () => ({
    currentTalent: {
      id: 'talent-1',
      displayName: 'Test Talent',
    },
  }),
}));

vi.mock('@/domains/reporting-dataflow/api/reports.api', () => ({
  reportingDataflowDomainApi: {
    listJobs: (...args: unknown[]) => mockListJobs(...args),
    createJob: vi.fn(),
    getDownloadUrl: vi.fn(),
    cancelJob: (...args: unknown[]) => mockCancelJob(...args),
  },
}));

vi.mock('@/components/report/MfrConfigDialog', () => ({
  MfrConfigDialog: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { ReportsScreen } from '@/domains/reporting-dataflow/screens/ReportsScreen';

describe('ReportsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListJobs.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'job-1',
            reportType: 'mfr',
            status: 'failed',
            totalRows: 12,
            createdAt: '2026-04-15T10:00:00.000Z',
            expiresAt: null,
          },
        ],
      },
    });
    mockCancelJob.mockResolvedValue({
      success: true,
    });
  });

  it('loads jobs and cancels a job through the confirm dialog', async () => {
    render(<ReportsScreen />);

    expect(await screen.findByText('types.mfr')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'cancel mfr' }));

    expect(await screen.findByText('cancelJob')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));

    await waitFor(() => {
      expect(mockCancelJob).toHaveBeenCalledWith('job-1', 'talent-1');
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('jobCancelled');
  });
});

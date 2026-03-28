// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTalentStore } from '@/stores/talent-store';

import ImportCustomersPage from './page';

const mockUploadIndividual = vi.hoisted(() => vi.fn());
const mockUploadCompany = vi.hoisted(() => vi.fn());
const mockGetJob = vi.hoisted(() => vi.fn());
const mockDownloadErrors = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/modules/customer', () => ({
  customerImportApi: {
    uploadIndividual: (...args: unknown[]) => mockUploadIndividual(...args),
    uploadCompany: (...args: unknown[]) => mockUploadCompany(...args),
    getJob: (...args: unknown[]) => mockGetJob(...args),
    downloadErrors: (...args: unknown[]) => mockDownloadErrors(...args),
    downloadIndividualTemplate: vi.fn(),
    downloadCompanyTemplate: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const initialTalentState = useTalentStore.getState();

const mockTalent = {
  id: 'talent-123',
  code: 'TALENT_123',
  displayName: 'Test Talent',
  path: 'test-talent',
};

const createUploadResponse = (overrides?: Partial<{
  id: string;
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed' | 'cancelled';
  fileName: string;
  totalRows: number;
  createdAt: string;
}>) => ({
  success: true,
  data: {
    id: 'job-123',
    status: 'pending' as const,
    fileName: 'customers.csv',
    totalRows: 4,
    createdAt: '2026-03-29T00:00:00.000Z',
    ...overrides,
  },
});

const createJobResponse = (
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed' | 'cancelled',
  overrides?: Partial<{
    id: string;
    fileName: string;
    totalRows: number;
    processedRows: number;
    successRows: number;
    failedRows: number;
    percentage: number;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
  }>,
) => {
  const totalRows = overrides?.totalRows ?? 4;
  const processedRows = overrides?.processedRows ?? totalRows;
  const failedRows = overrides?.failedRows ?? 0;
  const successRows = overrides?.successRows ?? totalRows - failedRows;
  const isTerminal = ['success', 'partial', 'failed', 'cancelled'].includes(status);

  return {
    success: true,
    data: {
      id: overrides?.id ?? 'job-123',
      jobType: 'customer_create',
      status,
      fileName: overrides?.fileName ?? 'customers.csv',
      consumerCode: null,
      progress: {
        totalRows,
        processedRows,
        successRows,
        failedRows,
        warningRows: 0,
        percentage: overrides?.percentage ?? (totalRows === 0 ? 0 : Math.round((processedRows / totalRows) * 100)),
      },
      startedAt: overrides?.startedAt ?? '2026-03-29T00:01:00.000Z',
      completedAt: overrides?.completedAt ?? (isTerminal ? '2026-03-29T00:02:00.000Z' : null),
      estimatedRemainingSeconds: null,
      createdAt: overrides?.createdAt ?? '2026-03-29T00:00:00.000Z',
      createdBy: {
        id: 'user-123',
        username: 'tester',
      },
    },
  };
};

const getFileInput = (container: HTMLElement): HTMLInputElement => {
  const input = container.querySelector('input[type="file"]');

  if (!(input instanceof HTMLInputElement)) {
    throw new Error('File input not found');
  }

  return input;
};

const flushPendingWork = async (cycles = 5) => {
  for (let index = 0; index < cycles; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

describe('ImportCustomersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    act(() => {
      useTalentStore.setState(initialTalentState, true);
      useTalentStore.getState().setCurrentTalent(mockTalent);
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    localStorage.clear();
    act(() => {
      useTalentStore.setState(initialTalentState, true);
    });
  });

  it('uploads individual customers and reaches the complete state after polling', async () => {
    mockUploadIndividual.mockResolvedValue(
      createUploadResponse({
        id: 'job-individual',
        fileName: 'individuals.csv',
        totalRows: 4,
      })
    );
    mockGetJob
      .mockResolvedValueOnce(
        createJobResponse('running', {
          id: 'job-individual',
          fileName: 'individuals.csv',
          totalRows: 4,
          processedRows: 1,
          successRows: 1,
          failedRows: 0,
          percentage: 25,
          completedAt: null,
        })
      )
      .mockResolvedValueOnce(
        createJobResponse('success', {
          id: 'job-individual',
          fileName: 'individuals.csv',
          totalRows: 4,
          processedRows: 4,
          successRows: 4,
          failedRows: 0,
          percentage: 100,
        })
      );

    const { container } = render(<ImportCustomersPage />);
    const file = new File(['id,name\n1,Alice'], 'individuals.csv', { type: 'text/csv' });

    await act(async () => {
      fireEvent.change(getFileInput(container), {
        target: { files: [file] },
      });
    });

    await flushPendingWork();

    expect(mockUploadIndividual).toHaveBeenCalledWith(file, 'talent-123');
    expect(mockGetJob).toHaveBeenCalledWith('individuals', 'job-individual');
    expect(screen.getByText('processing')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    await flushPendingWork();

    expect(mockGetJob).toHaveBeenCalledTimes(2);
    expect(screen.getByText('complete')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(mockGetJob).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('downloadErrorReport')).not.toBeInTheDocument();
  });

  it('uploads company customers, reaches the partial state, and downloads the error report', async () => {
    mockUploadCompany.mockResolvedValue(
      createUploadResponse({
        id: 'job-company',
        fileName: 'companies.csv',
        totalRows: 5,
      })
    );
    mockGetJob
      .mockResolvedValueOnce(
        createJobResponse('running', {
          id: 'job-company',
          fileName: 'companies.csv',
          totalRows: 5,
          processedRows: 2,
          successRows: 2,
          failedRows: 0,
          percentage: 40,
          completedAt: null,
        })
      )
      .mockResolvedValueOnce(
        createJobResponse('partial', {
          id: 'job-company',
          fileName: 'companies.csv',
          totalRows: 5,
          processedRows: 5,
          successRows: 3,
          failedRows: 2,
          percentage: 100,
        })
      );
    mockDownloadErrors.mockResolvedValue(undefined);

    const { container } = render(<ImportCustomersPage />);

    fireEvent.click(screen.getByText('companies'));

    const file = new File(['id,name\n1,ACME'], 'companies.csv', { type: 'text/csv' });

    await act(async () => {
      fireEvent.change(getFileInput(container), {
        target: { files: [file] },
      });
    });

    await flushPendingWork();

    expect(mockUploadCompany).toHaveBeenCalledWith(file, 'talent-123');
    expect(mockGetJob).toHaveBeenCalledWith('companies', 'job-company');

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    await flushPendingWork();

    expect(screen.getByText('Import Completed with Errors')).toBeInTheDocument();

    fireEvent.click(screen.getByText('downloadErrorReport'));

    await flushPendingWork(1);

    expect(mockDownloadErrors).toHaveBeenCalledWith('companies', 'job-company');
    expect(mockToastSuccess).toHaveBeenCalledWith('Error report downloaded');
  });

  it('rejects non-csv uploads before calling the import API', async () => {
    const { container } = render(<ImportCustomersPage />);
    const file = new File(['xlsx'], 'customers.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await act(async () => {
      fireEvent.change(getFileInput(container), {
        target: { files: [file] },
      });
    });

    expect(mockToastError).toHaveBeenCalledWith('IMP_INVALID_FILE_FORMAT');
    expect(mockUploadIndividual).not.toHaveBeenCalled();
    expect(mockUploadCompany).not.toHaveBeenCalled();
    expect(screen.getByText('clickToUpload')).toBeInTheDocument();
  });
});

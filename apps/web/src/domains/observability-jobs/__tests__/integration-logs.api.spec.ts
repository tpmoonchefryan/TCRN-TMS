// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetIntegrationLogs = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/modules/security', () => ({
  logApi: {
    getIntegrationLogs: (...args: unknown[]) => mockGetIntegrationLogs(...args),
  },
}));

import {
  businessIntegrationLogsApi,
  formatIntegrationLogPreciseTime,
  getIntegrationLogStatusColor,
} from '@/domains/observability-jobs/api/integration-logs.api';

describe('businessIntegrationLogsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates list queries to logApi with the canonical filter names', async () => {
    mockGetIntegrationLogs.mockResolvedValue({
      success: true,
      data: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    });

    await businessIntegrationLogsApi.list({
      direction: 'inbound',
      statusFilter: '4xx',
      page: 2,
      pageSize: 20,
    });

    expect(mockGetIntegrationLogs).toHaveBeenCalledWith({
      direction: 'inbound',
      status: '4xx',
      page: 2,
      pageSize: 20,
    });
  });

  it('formats status colors and timestamps deterministically', () => {
    expect(getIntegrationLogStatusColor(204)).toContain('bg-green-100');
    expect(getIntegrationLogStatusColor(404)).toContain('bg-yellow-100');
    expect(getIntegrationLogStatusColor(503)).toContain('bg-red-100');
    expect(getIntegrationLogStatusColor(null)).toContain('bg-gray-100');

    expect(formatIntegrationLogPreciseTime('en', '2026-04-13T00:00:00.000Z')).toBe(
      '2026-04-13 08:00:00',
    );
  });
});

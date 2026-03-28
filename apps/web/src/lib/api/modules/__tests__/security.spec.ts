// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();

vi.mock('@/lib/api/core', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { logApi } from '@/lib/api/modules/security';

describe('logApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes flattened query params to change-log requests', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } });

    await logApi.getChangeLogs({
      objectType: 'customer',
      action: 'update',
      page: 2,
      pageSize: 20,
    });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/logs/changes', {
      objectType: 'customer',
      action: 'update',
      page: 2,
      pageSize: 20,
    });
  });

  it('passes flattened query params to integration-log requests', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } });

    await logApi.getIntegrationLogs({
      direction: 'outbound',
      status: '500',
      page: 1,
      pageSize: 50,
    });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/logs/integrations', {
      direction: 'outbound',
      status: '500',
      page: 1,
      pageSize: 50,
    });
  });
});

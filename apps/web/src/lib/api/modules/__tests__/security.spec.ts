// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logApi } from '@/lib/api/modules/security';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/lib/api/core', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

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

  it('uses GET query params for Loki search requests', async () => {
    mockGet.mockResolvedValue({ success: true, data: { entries: [] } });

    await logApi.searchLoki({
      query: 'timeout',
      timeRange: '1h',
      limit: 100,
      stream: 'technical_event_log',
    });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/logs/search', {
      query: 'timeout',
      timeRange: '1h',
      limit: 100,
      stream: 'technical_event_log',
    });
    expect(mockPost).not.toHaveBeenCalled();
  });
});

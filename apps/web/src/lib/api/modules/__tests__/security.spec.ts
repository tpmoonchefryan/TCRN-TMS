// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logApi, securityApi } from '@/lib/api/modules/security';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api/core', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: vi.fn(),
    delete: (...args: unknown[]) => mockDelete(...args),
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

describe('securityApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests IP rules from the management endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [], meta: { total: 0 } } });

    await securityApi.getIpRules();

    expect(mockGet).toHaveBeenCalledWith('/api/v1/ip-access-rules');
  });

  it('posts typed IP rule payloads unchanged', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'rule-1' } });

    await securityApi.createIpRule({
      ruleType: 'blacklist',
      ipPattern: '10.0.0.0/8',
      scope: 'global',
      reason: 'internal only',
    });

    expect(mockPost).toHaveBeenCalledWith('/api/v1/ip-access-rules', {
      ruleType: 'blacklist',
      ipPattern: '10.0.0.0/8',
      scope: 'global',
      reason: 'internal only',
    });
  });

  it('posts IP access checks with explicit scope', async () => {
    mockPost.mockResolvedValue({ success: true, data: { allowed: true } });

    await securityApi.checkIpAccess('127.0.0.1', 'admin');

    expect(mockPost).toHaveBeenCalledWith('/api/v1/ip-access-rules/check', {
      ip: '127.0.0.1',
      scope: 'admin',
    });
  });

  it('deletes IP rules by id', async () => {
    mockDelete.mockResolvedValue({ success: true });

    await securityApi.deleteIpRule('rule-1');

    expect(mockDelete).toHaveBeenCalledWith('/api/v1/ip-access-rules/rule-1');
  });
});

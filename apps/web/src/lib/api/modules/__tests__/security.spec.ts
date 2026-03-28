// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logApi, securityApi } from '@/lib/api/modules/security';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api/core', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
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

  it('requests blocklist entries with flattened query params', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [], meta: { total: 0 } } });

    await securityApi.getBlocklistEntries({
      scopeType: 'subsidiary',
      scopeId: 'scope-1',
      includeInherited: false,
      includeDisabled: true,
      includeInactive: true,
    });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/blocklist-entries', {
      scopeType: 'subsidiary',
      scopeId: 'scope-1',
      includeInherited: false,
      includeDisabled: true,
      includeInactive: true,
    });
  });

  it('posts typed blocklist payloads unchanged', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'entry-1' } });

    await securityApi.createBlocklistEntry({
      ownerType: 'tenant',
      pattern: 'badword',
      patternType: 'keyword',
      nameEn: 'Bad Word',
      action: 'reject',
      severity: 'high',
      scope: ['marshmallow'],
      inherit: true,
    });

    expect(mockPost).toHaveBeenCalledWith('/api/v1/blocklist-entries', {
      ownerType: 'tenant',
      pattern: 'badword',
      patternType: 'keyword',
      nameEn: 'Bad Word',
      action: 'reject',
      severity: 'high',
      scope: ['marshmallow'],
      inherit: true,
    });
  });

  it('patches blocklist entries with camelCase contract fields', async () => {
    mockPatch.mockResolvedValue({ success: true, data: { id: 'entry-1' } });

    await securityApi.updateBlocklistEntry('entry-1', {
      pattern: 'updated',
      patternType: 'regex',
      nameEn: 'Updated Name',
      nameZh: '更新名称',
      action: 'flag',
      severity: 'medium',
      replacement: '***',
      scope: ['api'],
      inherit: false,
      version: 3,
    });

    expect(mockPatch).toHaveBeenCalledWith('/api/v1/blocklist-entries/entry-1', {
      pattern: 'updated',
      patternType: 'regex',
      nameEn: 'Updated Name',
      nameZh: '更新名称',
      action: 'flag',
      severity: 'medium',
      replacement: '***',
      scope: ['api'],
      inherit: false,
      version: 3,
    });
  });

  it('posts blocklist test payloads with typed pattern type', async () => {
    mockPost.mockResolvedValue({ success: true, data: { matched: true, positions: [0], highlightedContent: '<mark>badword</mark>' } });

    await securityApi.testBlocklistPattern('badword here', 'badword', 'keyword');

    expect(mockPost).toHaveBeenCalledWith('/api/v1/blocklist-entries/test', {
      testContent: 'badword here',
      pattern: 'badword',
      patternType: 'keyword',
    });
  });

  it('posts scope payloads for blocklist disable and enable actions', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'entry-1', disabled: true } });

    await securityApi.disableBlocklistEntry('entry-1', {
      scopeType: 'talent',
      scopeId: 'talent-1',
    });
    await securityApi.enableBlocklistEntry('entry-1', {
      scopeType: 'talent',
      scopeId: 'talent-1',
    });

    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/v1/blocklist-entries/entry-1/disable', {
      scopeType: 'talent',
      scopeId: 'talent-1',
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/v1/blocklist-entries/entry-1/enable', {
      scopeType: 'talent',
      scopeId: 'talent-1',
    });
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

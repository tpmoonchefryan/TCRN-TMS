/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { apiClient } from '../core';

export const securityApi = {
  generateFingerprint: () => apiClient.post<any>('/api/v1/security/fingerprint', {}),

  getBlocklistEntries: (query?: {
    scopeType?: string;
    scopeId?: string;
    includeInherited?: boolean;
    includeDisabled?: boolean;
    includeInactive?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (query?.scopeType) params.append('scopeType', query.scopeType);
    if (query?.scopeId) params.append('scopeId', query.scopeId);
    if (query?.includeInherited !== undefined) {
      params.append('includeInherited', String(query.includeInherited));
    }
    if (query?.includeDisabled !== undefined) {
      params.append('includeDisabled', String(query.includeDisabled));
    }
    if (query?.includeInactive !== undefined) {
      params.append('includeInactive', String(query.includeInactive));
    }
    const queryStr = params.toString();
    return apiClient.get<any[]>(`/api/v1/blocklist-entries${queryStr ? `?${queryStr}` : ''}`);
  },

  createBlocklistEntry: (entry: {
    ownerType?: string;
    ownerId?: string;
    pattern: string;
    patternType: string;
    nameEn: string;
    action: string;
    severity: string;
    scope: string[];
    sortOrder?: number;
    isForceUse?: boolean;
  }) =>
    apiClient.post<any>('/api/v1/blocklist-entries', {
      ownerType: entry.ownerType ?? 'tenant',
      ownerId: entry.ownerId,
      pattern: entry.pattern,
      patternType: entry.patternType,
      nameEn: entry.nameEn,
      action: entry.action,
      severity: entry.severity,
      scope: entry.scope,
      sortOrder: entry.sortOrder ?? 0,
      isForceUse: entry.isForceUse ?? false,
    }),

  updateBlocklistEntry: (id: string, entry: any) =>
    apiClient.patch<any>(`/api/v1/blocklist-entries/${id}`, entry),

  deleteBlocklistEntry: (id: string) => apiClient.delete<any>(`/api/v1/blocklist-entries/${id}`),

  disableBlocklistEntry: (id: string, scope: { scopeType?: string; scopeId?: string }) =>
    apiClient.post<any>(`/api/v1/blocklist-entries/${id}/disable`, scope),

  enableBlocklistEntry: (id: string, scope: { scopeType?: string; scopeId?: string }) =>
    apiClient.post<any>(`/api/v1/blocklist-entries/${id}/enable`, scope),

  testBlocklistPattern: (testContent: string, pattern: string, patternType: string) =>
    apiClient.post<{ matched: boolean; positions: number[] }>('/api/v1/blocklist-entries/test', {
      testContent,
      pattern,
      patternType,
    }),

  getIpRules: () => apiClient.get<any[]>('/api/v1/ip-access-rules'),

  createIpRule: (rule: { ruleType: string; ipPattern: string; scope: string; reason?: string }) =>
    apiClient.post<any>('/api/v1/ip-access-rules', {
      ruleType: rule.ruleType,
      ipPattern: rule.ipPattern,
      scope: rule.scope,
      reason: rule.reason,
    }),

  deleteIpRule: (id: string) => apiClient.delete<any>(`/api/v1/ip-access-rules/${id}`),

  checkIpAccess: (ip: string, scope: 'global' | 'admin' | 'public' | 'api' = 'global') =>
    apiClient.post<{ allowed: boolean; reason?: string; matched_rule?: any; matchedRule?: any }>(
      '/api/v1/ip-access-rules/check',
      { ip, scope },
    ),

  getRateLimitStats: () =>
    apiClient.get<{
      summary: {
        totalRequests24h: number;
        blockedRequests24h: number;
        uniqueIPs24h: number;
        currentlyBlocked: number;
      };
      topEndpoints: Array<{
        endpoint: string;
        method: string;
        current: number;
        limit: number;
        resetIn: number;
      }>;
      topIPs: Array<{
        ip: string;
        requests: number;
        blocked: boolean;
        lastSeen: string;
      }>;
      lastUpdated: string;
    }>('/api/v1/rate-limit/stats'),
};

export const logApi = {
  getChangeLogs: (params?: {
    objectType?: string;
    action?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => apiClient.get<any>('/api/v1/logs/changes', params),

  getTechEvents: (params?: {
    scope?: string;
    severity?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => apiClient.get<any>('/api/v1/logs/events', params),

  getIntegrationLogs: (params?: {
    direction?: string;
    status?: string;
    endpoint?: string;
    consumerId?: string;
    page?: number;
    pageSize?: number;
  }) => apiClient.get<any>('/api/v1/logs/integrations', params),

  getIntegrationLogByTrace: (traceId: string) =>
    apiClient.get<any>(`/api/v1/logs/integrations/trace/${traceId}`),

  getFailedIntegrations: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<any>('/api/v1/logs/integrations/failed', params),

  searchLoki: (params: { query: string; timeRange: string; limit?: number; app?: string }) =>
    apiClient.post<any>('/api/v1/logs/search', params),

  searchUnified: (params?: {
    keyword?: string;
    stream?: string;
    severity?: string;
    start?: string;
    end?: string;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.keyword) queryParams.append('keyword', params.keyword);
    if (params?.stream) queryParams.append('stream', params.stream);
    if (params?.severity) queryParams.append('severity', params.severity);
    if (params?.start) queryParams.append('start', params.start);
    if (params?.end) queryParams.append('end', params.end);
    if (params?.limit) queryParams.append('limit', String(params.limit));
    const queryStr = queryParams.toString();
    return apiClient.get<
      Array<{
        timestamp: string;
        level: string;
        message: string;
        source: string;
        metadata?: Record<string, unknown>;
      }>
    >(`/api/v1/logs/search${queryStr ? `?${queryStr}` : ''}`);
  },
};

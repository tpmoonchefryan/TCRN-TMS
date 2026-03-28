// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { apiClient } from '../core';

export type LogSearchStream = 'change_log' | 'technical_event_log' | 'integration_log';

export type LogSearchTimeRange = '15m' | '1h' | '6h' | '24h' | '7d';

export interface LokiSearchEntry {
  timestamp: string;
  labels: Record<string, string>;
  data: unknown;
}

export interface LokiSearchResponse {
  entries: LokiSearchEntry[];
  stats?: Record<string, unknown>;
}

export interface FingerprintRecord {
  fingerprint: string;
  shortFingerprint: string;
  version: string;
  generatedAt: string;
}

export type SecurityScopeType = 'tenant' | 'subsidiary' | 'talent';
export type BlocklistPatternType = 'keyword' | 'regex' | 'wildcard';
export type BlocklistSeverity = 'low' | 'medium' | 'high';
export type BlocklistAction = 'reject' | 'flag' | 'replace';

export interface BlocklistEntryRecord {
  id: string;
  ownerType: SecurityScopeType;
  ownerId: string | null;
  pattern: string;
  patternType: BlocklistPatternType;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  description?: string | null;
  category?: string | null;
  severity: BlocklistSeverity;
  action: BlocklistAction;
  replacement: string;
  scope: string[];
  inherit: boolean;
  sortOrder: number;
  isActive: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  matchCount: number;
  lastMatchedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  createdBy: string | null;
  version: number;
  isInherited?: boolean;
  isDisabledHere?: boolean;
  canDisable?: boolean;
}

export interface BlocklistEntryListPayload {
  items: BlocklistEntryRecord[];
  meta: {
    total: number;
  };
}

export interface BlocklistListQuery {
  scopeType?: SecurityScopeType;
  scopeId?: string;
  category?: string;
  patternType?: BlocklistPatternType;
  scope?: string;
  includeInherited?: boolean;
  includeDisabled?: boolean;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateBlocklistPayload {
  ownerType: SecurityScopeType;
  ownerId?: string;
  pattern: string;
  patternType: BlocklistPatternType;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  description?: string;
  category?: string;
  severity?: BlocklistSeverity;
  action?: BlocklistAction;
  replacement?: string;
  scope?: string[];
  inherit?: boolean;
  sortOrder?: number;
  isForceUse?: boolean;
}

export interface UpdateBlocklistPayload {
  pattern?: string;
  patternType?: BlocklistPatternType;
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  description?: string;
  category?: string;
  severity?: BlocklistSeverity;
  action?: BlocklistAction;
  replacement?: string;
  scope?: string[];
  inherit?: boolean;
  sortOrder?: number;
  isForceUse?: boolean;
  version: number;
}

export interface BlocklistDeleteResponse {
  id: string;
  deleted: boolean;
}

export interface BlocklistScopePayload {
  scopeType: SecurityScopeType;
  scopeId?: string;
}

export interface DisableBlocklistResponse {
  id: string;
  disabled: boolean;
}

export interface EnableBlocklistResponse {
  id: string;
  enabled: boolean;
}

export interface TestBlocklistPatternResponse {
  matched: boolean;
  positions: number[];
  highlightedContent: string;
}

export type IpRuleType = 'whitelist' | 'blacklist';
export type IpAccessScope = 'global' | 'admin' | 'public' | 'api';
export type IpRuleSource = 'manual' | 'auto';

export interface IpAccessRuleRecord {
  id: string;
  ruleType: IpRuleType;
  ipPattern: string;
  scope: IpAccessScope;
  reason: string | null;
  source: IpRuleSource;
  expiresAt: string | null;
  hitCount: number;
  lastHitAt: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
}

export interface IpAccessRuleListPayload {
  items: IpAccessRuleRecord[];
  meta: {
    total: number;
  };
}

export interface CreateIpRulePayload {
  ruleType: IpRuleType;
  ipPattern: string;
  scope: IpAccessScope;
  reason?: string;
}

export interface CreateIpRuleResponse {
  id: string;
  ruleType: IpRuleType;
  ipPattern: string;
  scope: IpAccessScope;
  reason?: string;
  createdAt: string;
}

export interface DeleteIpRuleResponse {
  success: boolean;
}

export interface IpAccessCheckMatchedRule {
  id: string;
  ruleType: IpRuleType;
  ipPattern: string;
  scope: IpAccessScope;
  reason?: string;
}

export interface IpAccessCheckResponse {
  allowed: boolean;
  reason?: string;
  matchedRule?: IpAccessCheckMatchedRule;
  matched_rule?: IpAccessCheckMatchedRule;
}

export const securityApi = {
  generateFingerprint: () => apiClient.post<FingerprintRecord>('/api/v1/security/fingerprint', {}),

  getBlocklistEntries: (query?: BlocklistListQuery) =>
    apiClient.get<BlocklistEntryListPayload>('/api/v1/blocklist-entries', query),

  createBlocklistEntry: (entry: CreateBlocklistPayload) =>
    apiClient.post<BlocklistEntryRecord>('/api/v1/blocklist-entries', entry),

  updateBlocklistEntry: (id: string, entry: UpdateBlocklistPayload) =>
    apiClient.patch<BlocklistEntryRecord>(`/api/v1/blocklist-entries/${id}`, entry),

  deleteBlocklistEntry: (id: string) =>
    apiClient.delete<BlocklistDeleteResponse>(`/api/v1/blocklist-entries/${id}`),

  disableBlocklistEntry: (id: string, scope: BlocklistScopePayload) =>
    apiClient.post<DisableBlocklistResponse>(`/api/v1/blocklist-entries/${id}/disable`, scope),

  enableBlocklistEntry: (id: string, scope: BlocklistScopePayload) =>
    apiClient.post<EnableBlocklistResponse>(`/api/v1/blocklist-entries/${id}/enable`, scope),

  testBlocklistPattern: (
    testContent: string,
    pattern: string,
    patternType: BlocklistPatternType
  ) =>
    apiClient.post<TestBlocklistPatternResponse>('/api/v1/blocklist-entries/test', {
      testContent,
      pattern,
      patternType,
    }),

  getIpRules: () => apiClient.get<IpAccessRuleListPayload>('/api/v1/ip-access-rules'),

  createIpRule: (rule: CreateIpRulePayload) =>
    apiClient.post<CreateIpRuleResponse>('/api/v1/ip-access-rules', {
      ruleType: rule.ruleType,
      ipPattern: rule.ipPattern,
      scope: rule.scope,
      reason: rule.reason,
    }),

  deleteIpRule: (id: string) => apiClient.delete<DeleteIpRuleResponse>(`/api/v1/ip-access-rules/${id}`),

  checkIpAccess: (ip: string, scope: IpAccessScope = 'global') =>
    apiClient.post<IpAccessCheckResponse>(
      '/api/v1/ip-access-rules/check',
      { ip, scope }
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
  }) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiClient.get<any>('/api/v1/logs/changes', params),

  getTechEvents: (params?: {
    scope?: string;
    severity?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiClient.get<any>('/api/v1/logs/events', params),

  getIntegrationLogs: (params?: {
    direction?: string;
    status?: string;
    endpoint?: string;
    consumerId?: string;
    page?: number;
    pageSize?: number;
  }) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiClient.get<any>('/api/v1/logs/integrations', params),

  getIntegrationLogByTrace: (traceId: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiClient.get<any>(`/api/v1/logs/integrations/trace/${traceId}`),

  getFailedIntegrations: (params?: { page?: number; pageSize?: number }) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiClient.get<any>('/api/v1/logs/integrations/failed', params),

  searchLoki: (params: {
    query: string;
    timeRange: LogSearchTimeRange;
    limit?: number;
    stream?: LogSearchStream;
  }) => apiClient.get<LokiSearchResponse>('/api/v1/logs/search', params),

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

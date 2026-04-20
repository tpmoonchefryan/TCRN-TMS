import type { ApiSuccessEnvelope } from '@/platform/http/api';

export type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;
export type RequestEnvelopeFn = <T>(
  path: string,
  init?: RequestInit,
) => Promise<ApiSuccessEnvelope<T>>;

export type SecurityTab = 'blocklist' | 'external-blocklist' | 'ip-access' | 'runtime-signals';
export type SecurityScopeType = 'tenant' | 'subsidiary' | 'talent';
export type BlocklistPatternType = 'keyword' | 'regex' | 'wildcard';
export type ExternalPatternType = 'domain' | 'url_regex' | 'keyword';
export type BlocklistSeverity = 'low' | 'medium' | 'high';
export type BlocklistAction = 'reject' | 'flag' | 'replace';
export type IpRuleType = 'whitelist' | 'blacklist';
export type IpRuleScope = 'global' | 'admin' | 'public' | 'api';

export interface BlocklistEntryRecord {
  id: string;
  ownerType: SecurityScopeType;
  ownerId: string | null;
  pattern: string;
  patternType: BlocklistPatternType;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  translations: Record<string, string>;
  description: string | null;
  category: string | null;
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
  createdBy: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
  version: number;
  isInherited?: boolean;
  isDisabledHere?: boolean;
  canDisable?: boolean;
}

export interface BlocklistListResponse {
  items: BlocklistEntryRecord[];
  meta: {
    total: number;
  };
}

export interface CreateBlocklistPayload {
  ownerType: SecurityScopeType;
  ownerId?: string;
  pattern: string;
  patternType: BlocklistPatternType;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
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
  translations?: Record<string, string>;
  description?: string;
  category?: string;
  severity?: BlocklistSeverity;
  action?: BlocklistAction;
  replacement?: string;
  scope?: string[];
  inherit?: boolean;
  sortOrder?: number;
  isForceUse?: boolean;
  isActive?: boolean;
  version: number;
}

export interface BlocklistTestResult {
  matched: boolean;
  matches: Array<{
    pattern: string;
    action: string;
    severity: string;
    category?: string | null;
  }>;
  action?: string;
  filteredContent?: string;
}

export interface ExternalBlocklistRecord {
  id: string;
  ownerType: SecurityScopeType;
  ownerId: string | null;
  pattern: string;
  patternType: ExternalPatternType;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  translations?: Record<string, string>;
  description: string | null;
  category: string | null;
  severity: BlocklistSeverity;
  action: BlocklistAction;
  replacement: string;
  inherit: boolean;
  sortOrder: number;
  isActive: boolean;
  isForceUse?: boolean;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  isInherited?: boolean;
  isDisabledHere?: boolean;
  canDisable?: boolean;
}

export interface CreateExternalBlocklistPayload {
  ownerType: SecurityScopeType;
  ownerId?: string;
  pattern: string;
  patternType: ExternalPatternType;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  description?: string;
  category?: string;
  severity?: BlocklistSeverity;
  action?: BlocklistAction;
  replacement?: string;
  inherit?: boolean;
  sortOrder?: number;
  isForceUse?: boolean;
}

export interface UpdateExternalBlocklistPayload {
  pattern?: string;
  patternType?: ExternalPatternType;
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  description?: string;
  category?: string;
  severity?: BlocklistSeverity;
  action?: BlocklistAction;
  replacement?: string;
  inherit?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  isForceUse?: boolean;
  version: number;
}

export interface ExternalBlocklistListResponse {
  items: ExternalBlocklistRecord[];
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface BatchToggleExternalBlocklistResponse {
  updated: number;
}

export interface IpAccessRuleRecord {
  id: string;
  ruleType: IpRuleType;
  ipPattern: string;
  scope: IpRuleScope;
  reason?: string | null;
  source?: string | null;
  expiresAt: string | null;
  hitCount: number;
  lastHitAt: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy?: string | null;
}

export interface IpAccessRuleListResponse {
  items: IpAccessRuleRecord[];
  meta: {
    total: number;
  };
}

export interface CreateIpAccessRulePayload {
  ruleType: IpRuleType;
  ipPattern: string;
  scope: IpRuleScope;
  reason?: string;
  expiresAt?: string;
}

export interface IpAccessCheckResult {
  allowed: boolean;
  reason?: string;
  matchedRule?: {
    id: string;
    ruleType: IpRuleType;
    ipPattern: string;
    scope: IpRuleScope;
    reason?: string;
  };
}

export interface FingerprintResponse {
  fingerprint: string;
  shortFingerprint: string;
  version: string;
  generatedAt: string;
}

export interface RateLimitStatsResponse {
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
}

export interface ProfileStoreSummaryRecord {
  id: string;
  code: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  isActive: boolean;
  isDefault: boolean;
  talentCount: number;
  customerCount: number;
}

export interface ProfileStoreSummaryResponse {
  items: ProfileStoreSummaryRecord[];
  meta?: {
    pagination?: {
      totalCount: number;
    };
  };
}

export interface ListBlocklistOptions {
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

export interface ListExternalBlocklistOptions {
  scopeType?: SecurityScopeType;
  scopeId?: string;
  category?: string;
  includeInherited?: boolean;
  includeDisabled?: boolean;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListIpAccessRulesOptions {
  ruleType?: IpRuleType;
  scope?: IpRuleScope;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

function buildQueryString(input: Record<string, string | number | boolean | null | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildJsonRequestInit(method: 'POST' | 'PATCH', payload?: unknown): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload ?? {}),
  };
}

export async function listBlocklistEntries(request: RequestFn, options: ListBlocklistOptions = {}) {
  const query = buildQueryString({
    scopeType: options.scopeType ?? 'tenant',
    scopeId: options.scopeId,
    category: options.category,
    patternType: options.patternType,
    scope: options.scope,
    includeInherited: options.includeInherited ?? true,
    includeDisabled: options.includeDisabled ?? true,
    includeInactive: options.includeInactive ?? true,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 20,
  });

  return request<BlocklistListResponse>(`/api/v1/blocklist-entries${query}`);
}

export async function getBlocklistEntry(request: RequestFn, blocklistId: string) {
  return request<BlocklistEntryRecord>(`/api/v1/blocklist-entries/${blocklistId}`);
}

export async function createBlocklistEntry(request: RequestFn, payload: CreateBlocklistPayload) {
  return request<BlocklistEntryRecord>('/api/v1/blocklist-entries', buildJsonRequestInit('POST', payload));
}

export async function updateBlocklistEntry(
  request: RequestFn,
  blocklistId: string,
  payload: UpdateBlocklistPayload,
) {
  return request<BlocklistEntryRecord>(
    `/api/v1/blocklist-entries/${blocklistId}`,
    buildJsonRequestInit('PATCH', payload),
  );
}

export async function deleteBlocklistEntry(request: RequestFn, blocklistId: string) {
  return request<{ deleted: boolean }>(`/api/v1/blocklist-entries/${blocklistId}`, {
    method: 'DELETE',
  });
}

export async function testBlocklistEntry(
  request: RequestFn,
  payload: { text: string; scope?: string },
) {
  return request<BlocklistTestResult>('/api/v1/blocklist-entries/test', buildJsonRequestInit('POST', payload));
}

export async function disableInheritedBlocklistEntry(
  request: RequestFn,
  blocklistId: string,
  payload: { scopeType: SecurityScopeType; scopeId?: string },
) {
  return request<{ disabled: boolean }>(
    `/api/v1/blocklist-entries/${blocklistId}/disable`,
    buildJsonRequestInit('POST', payload),
  );
}

export async function enableInheritedBlocklistEntry(
  request: RequestFn,
  blocklistId: string,
  payload: { scopeType: SecurityScopeType; scopeId?: string },
) {
  return request<{ enabled: boolean }>(
    `/api/v1/blocklist-entries/${blocklistId}/enable`,
    buildJsonRequestInit('POST', payload),
  );
}

export async function listExternalBlocklistEntries(
  requestEnvelope: RequestEnvelopeFn,
  options: ListExternalBlocklistOptions = {},
) {
  const query = buildQueryString({
    scopeType: options.scopeType ?? 'tenant',
    scopeId: options.scopeId,
    category: options.category,
    includeInherited: options.includeInherited ?? true,
    includeDisabled: options.includeDisabled ?? true,
    includeInactive: options.includeInactive ?? true,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 20,
  });

  const response = await requestEnvelope<ExternalBlocklistRecord[]>(`/api/v1/external-blocklist${query}`);

  return {
    items: response.data,
    pagination: response.meta?.pagination,
  } satisfies ExternalBlocklistListResponse;
}

export async function getExternalBlocklistEntry(request: RequestFn, entryId: string) {
  return request<ExternalBlocklistRecord>(`/api/v1/external-blocklist/${entryId}`);
}

export async function createExternalBlocklistEntry(
  request: RequestFn,
  payload: CreateExternalBlocklistPayload,
) {
  return request<ExternalBlocklistRecord>('/api/v1/external-blocklist', buildJsonRequestInit('POST', payload));
}

export async function updateExternalBlocklistEntry(
  request: RequestFn,
  entryId: string,
  payload: UpdateExternalBlocklistPayload,
) {
  return request<ExternalBlocklistRecord>(
    `/api/v1/external-blocklist/${entryId}`,
    buildJsonRequestInit('PATCH', payload),
  );
}

export async function deleteExternalBlocklistEntry(request: RequestFn, entryId: string) {
  return request<{ message: string }>(`/api/v1/external-blocklist/${entryId}`, {
    method: 'DELETE',
  });
}

export async function disableInheritedExternalBlocklistEntry(
  request: RequestFn,
  entryId: string,
  payload: { scopeType: SecurityScopeType; scopeId?: string },
) {
  return request<{ disabled: boolean }>(
    `/api/v1/external-blocklist/${entryId}/disable`,
    buildJsonRequestInit('POST', payload),
  );
}

export async function enableInheritedExternalBlocklistEntry(
  request: RequestFn,
  entryId: string,
  payload: { scopeType: SecurityScopeType; scopeId?: string },
) {
  return request<{ enabled: boolean }>(
    `/api/v1/external-blocklist/${entryId}/enable`,
    buildJsonRequestInit('POST', payload),
  );
}

export async function batchToggleExternalBlocklistEntries(
  request: RequestFn,
  payload: { ids: string[]; isActive: boolean },
) {
  return request<BatchToggleExternalBlocklistResponse>(
    '/api/v1/external-blocklist/batch-toggle',
    buildJsonRequestInit('POST', payload),
  );
}

export async function listIpAccessRules(request: RequestFn, options: ListIpAccessRulesOptions = {}) {
  const query = buildQueryString({
    ruleType: options.ruleType,
    scope: options.scope,
    isActive: options.isActive,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 20,
  });

  return request<IpAccessRuleListResponse>(`/api/v1/ip-access-rules${query}`);
}

export async function createIpAccessRule(request: RequestFn, payload: CreateIpAccessRulePayload) {
  return request<IpAccessRuleRecord>('/api/v1/ip-access-rules', buildJsonRequestInit('POST', payload));
}

export async function deleteIpAccessRule(request: RequestFn, ruleId: string) {
  return request<{ deleted: boolean }>(`/api/v1/ip-access-rules/${ruleId}`, {
    method: 'DELETE',
  });
}

export async function checkIpAccess(request: RequestFn, payload: { ip: string; scope?: IpRuleScope }) {
  return request<IpAccessCheckResult>('/api/v1/ip-access-rules/check', buildJsonRequestInit('POST', payload));
}

export async function getFingerprint(request: RequestFn) {
  return request<FingerprintResponse>('/api/v1/security/fingerprint', {
    method: 'POST',
  });
}

export async function getRateLimitStats(request: RequestFn) {
  return request<RateLimitStatsResponse>('/api/v1/rate-limit/stats');
}

export async function listProfileStoreSummaries(request: RequestFn) {
  return request<ProfileStoreSummaryResponse>('/api/v1/profile-stores?page=1&pageSize=8');
}

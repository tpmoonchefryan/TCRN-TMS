import type { LocalizedText } from '@tcrn/shared';

export type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export type ObservabilityTab = 'change-logs' | 'tech-events' | 'integration-logs' | 'log-search';
export type ObservabilityAdapterEnvironment = 'local' | 'shared_dev' | 'staging' | 'production';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ChangeLogRecord {
  id: string;
  occurredAt: string;
  operatorId: string | null;
  operatorName: string | null;
  action: string;
  objectType: string;
  objectId: string;
  objectName: string | null;
  diff: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export interface TechEventRecord {
  id: string;
  occurredAt: string;
  severity: string;
  eventType: string;
  scope: string;
  traceId: string | null;
  spanId: string | null;
  source: string | null;
  message: string | null;
  payloadJson: unknown;
  errorCode: string | null;
  errorStack: string | null;
}

export interface IntegrationLogRecord {
  id: string;
  occurredAt: string;
  consumerId: string | null;
  consumerCode: string | null;
  direction: string;
  endpoint: string;
  method: string;
  requestHeaders: unknown;
  requestBody: unknown;
  responseStatus: number | null;
  responseBody: unknown;
  latencyMs: number | null;
  errorMessage: string | null;
  traceId: string | null;
}

export interface LogSearchEntry {
  timestamp: string;
  labels: Record<string, string>;
  data: Record<string, unknown>;
}

export interface LogSearchResponse {
  entries: LogSearchEntry[];
  stats?: Record<string, unknown> | null;
}

export interface ObservabilityAdapterDefinition {
  code: string;
  label: string;
  localizedLabel: LocalizedText;
  signalFamily: 'logs' | 'traces' | 'metrics' | 'alerts' | 'dashboards';
  platformToolCode: string | null;
  defaultEnabled: false;
  defaultReadinessState: string;
  ownerPhase: string;
  humanUi: boolean;
  deepLink: boolean;
  safeQueryCapability: string;
  localDevModes: readonly string[];
  ssoRequirement: 'required' | 'not_applicable';
  licensePosture: string;
  sourceOfTruthBoundary: string;
  defaultBackendState: string;
  sortOrder: number;
}

export interface ObservabilityAdapterSummary {
  definition: ObservabilityAdapterDefinition;
  profile: {
    adapterCode: string;
    environment: ObservabilityAdapterEnvironment;
    enabled: boolean;
    backendMode: string;
    readinessState: string;
    healthStatus: string;
    ssoState: string;
    platformToolConnectionId: string | null;
    platformToolCode: string | null;
    endpointConfigured: boolean;
    lastCheckedAt: string | null;
    configVersion: number;
  };
  policy: {
    sourceOfTruthBoundary: string;
    rawQueryAllowedForOrdinaryTenants: false;
    maxQueryRangeHours: number;
    maxResultLimit: number;
  };
}

export interface ObservabilitySignalPolicy {
  allowedAttributeKeys: readonly string[];
  forbiddenAttributePatterns: readonly string[];
  maxQueryRangeHours: number;
  maxResultLimit: number;
  rawQueryAllowedForOrdinaryTenants: false;
  productAuthority: string;
  externalToolAuthority: string;
  checkedAt: string;
}

export interface ObservabilityAdapterDeepLinkReadiness {
  adapterCode: string;
  environment: ObservabilityAdapterEnvironment;
  state: string;
  url: string | null;
  opensInNewTab: boolean;
}

export interface ListChangeLogOptions {
  objectType?: string;
  objectId?: string;
  operatorId?: string;
  action?: string;
  requestId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ListTechEventOptions {
  severity?: string;
  eventType?: string;
  scope?: string;
  traceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ListIntegrationLogOptions {
  consumerCode?: string;
  direction?: string;
  responseStatus?: number;
  traceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  failedOnly?: boolean;
}

export interface SearchLogsOptions {
  keyword?: string;
  stream?: string;
  severity?: string;
  start?: string;
  end?: string;
  limit?: number;
  timeRange?: string;
}

export interface ObservabilityAdapterOptions {
  environment?: ObservabilityAdapterEnvironment;
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

export async function listChangeLogs(request: RequestFn, options: ListChangeLogOptions = {}) {
  const query = buildQueryString({
    objectType: options.objectType,
    objectId: options.objectId,
    operatorId: options.operatorId,
    action: options.action,
    requestId: options.requestId,
    startDate: options.startDate,
    endDate: options.endDate,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 20,
  });

  return request<PaginatedResult<ChangeLogRecord>>(`/api/v1/logs/changes${query}`);
}

export async function listTechEvents(request: RequestFn, options: ListTechEventOptions = {}) {
  const query = buildQueryString({
    severity: options.severity,
    eventType: options.eventType,
    scope: options.scope,
    traceId: options.traceId,
    startDate: options.startDate,
    endDate: options.endDate,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 20,
  });

  return request<PaginatedResult<TechEventRecord>>(`/api/v1/logs/events${query}`);
}

export async function listIntegrationLogs(
  request: RequestFn,
  options: ListIntegrationLogOptions = {}
) {
  const query = buildQueryString({
    consumerCode: options.consumerCode,
    direction: options.direction,
    responseStatus: options.responseStatus,
    traceId: options.traceId,
    startDate: options.startDate,
    endDate: options.endDate,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 20,
  });

  if (options.failedOnly) {
    return request<PaginatedResult<IntegrationLogRecord>>(
      `/api/v1/logs/integrations/failed${query}`
    );
  }

  return request<PaginatedResult<IntegrationLogRecord>>(`/api/v1/logs/integrations${query}`);
}

export async function searchLogs(request: RequestFn, options: SearchLogsOptions = {}) {
  const query = buildQueryString({
    keyword: options.keyword,
    stream: options.stream,
    severity: options.severity,
    start: options.start,
    end: options.end,
    limit: options.limit ?? 20,
    timeRange: options.timeRange ?? '24h',
  });

  return request<LogSearchResponse>(`/api/v1/logs/search${query}`);
}

export async function listObservabilityAdapterSummary(
  request: RequestFn,
  options: ObservabilityAdapterOptions = {}
) {
  const query = buildQueryString({
    environment: options.environment ?? 'local',
  });

  return request<ObservabilityAdapterSummary[]>(`/api/v1/observability/adapters/summary${query}`);
}

export async function readObservabilitySignalPolicy(request: RequestFn) {
  return request<ObservabilitySignalPolicy>('/api/v1/observability/adapters/policy');
}

export async function readObservabilityAdapterDeepLink(
  request: RequestFn,
  adapterCode: string,
  options: ObservabilityAdapterOptions = {}
) {
  const query = buildQueryString({
    environment: options.environment ?? 'local',
  });

  return request<ObservabilityAdapterDeepLinkReadiness>(
    `/api/v1/observability/adapters/${encodeURIComponent(adapterCode)}/deep-link${query}`
  );
}

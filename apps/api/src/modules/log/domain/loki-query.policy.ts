// SPDX-License-Identifier: Apache-2.0

/**
 * Loki query parameters
 */
export interface LokiQueryParams {
  tenantSchema?: string;
  stream?: string;
  severity?: string;
  eventType?: string;
  scope?: string;
  traceId?: string;
  keyword?: string;
  start?: string;
  end?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
  rawQuery?: string;
  trustedRawQuery?: true;
}

export const LOKI_LOG_STREAMS = ['change_log', 'technical_event_log', 'integration_log'] as const;

export type LokiLogStream = (typeof LOKI_LOG_STREAMS)[number];

export interface CompatibleLogSearchParams {
  tenantSchema?: string;
  keyword?: string;
  stream?: string;
  severity?: string;
  start?: string;
  end?: string;
  limit?: number | string;
  query?: string;
  timeRange?: string;
  app?: string;
}

const RELATIVE_TIME_RANGE_MS = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
} as const;

const LEGACY_APPLICATION_FILTERS = new Set(['api', 'web', 'worker']);
const LOKI_MAX_QUERY_RANGE_MS = 24 * 60 * 60 * 1000;
const LOKI_MAX_RESULT_LIMIT = 100;
const TENANT_SCHEMA_LABEL_PATTERN = /^[A-Za-z0-9_]+$/;
const RAW_LOG_QUERY_SYNTAX_PATTERN =
  /(^\s*\{)|(\|\s*(json|regexp|pattern|line_format|label_format|unwrap|=~|!~|=|!=))|(\[[0-9]+[smhd]\])|(\b(count|sum|avg|max|min|rate|count_over_time|sum_over_time|quantile_over_time)\s*\()/i;

/**
 * Loki query response entry
 */
export interface LokiLogEntry {
  timestamp: Date;
  labels: Record<string, string>;
  data: unknown;
}

/**
 * Loki query response
 */
export interface LokiQueryResponse {
  entries: LokiLogEntry[];
  stats?: Record<string, unknown>;
}

export interface RawLokiQueryResponse {
  status: string;
  data?: {
    resultType: string;
    result: Array<{
      stream: Record<string, string>;
      values: Array<[string, string]>;
    }>;
    stats?: Record<string, unknown>;
  };
}

export interface LokiQueryRangeRequest {
  query: string;
  start: string;
  end: string;
  limit: number;
  direction: 'forward' | 'backward';
}

export function normalizeLogSearchStream(value?: string): LokiLogStream | undefined {
  if (!value) {
    return undefined;
  }

  if (LEGACY_APPLICATION_FILTERS.has(value)) {
    return undefined;
  }

  return (LOKI_LOG_STREAMS as readonly string[]).includes(value)
    ? (value as LokiLogStream)
    : undefined;
}

export function resolveRelativeTimeRange(
  timeRange?: string,
  now = new Date()
): { start: string; end: string } | undefined {
  if (!timeRange) {
    return undefined;
  }

  const durationMs = RELATIVE_TIME_RANGE_MS[timeRange as keyof typeof RELATIVE_TIME_RANGE_MS];

  if (!durationMs) {
    return undefined;
  }

  const end = new Date(now);
  const start = new Date(end.getTime() - Math.min(durationMs, LOKI_MAX_QUERY_RANGE_MS));

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function isRawLogQuerySyntax(value?: string): boolean {
  const trimmed = value?.trim();

  if (!trimmed) {
    return false;
  }

  return RAW_LOG_QUERY_SYNTAX_PATTERN.test(trimmed);
}

export function buildCompatibleRawLogSearchQuery(query: string, stream?: LokiLogStream): string {
  const trimmedQuery = query.trim();

  if (isRawLogQuerySyntax(trimmedQuery)) {
    throw new Error('raw_logql_denied');
  }

  return buildLokiKeywordSearchQuery(trimmedQuery, stream);
}

export function buildCompatibleLogSearchQuery(
  params: CompatibleLogSearchParams,
  now = new Date()
): LokiQueryParams {
  const query = params.query?.trim();
  const keyword = params.keyword?.trim() || undefined;
  const limit = parsePositiveInteger(params.limit);
  const stream = normalizeLogSearchStream(params.stream ?? params.app);
  const relativeRange = resolveRelativeTimeRange(params.timeRange, now);
  const start = params.start || relativeRange?.start;
  const end = params.end || relativeRange?.end;
  const tenantSchema = normalizeTenantSchemaLabel(params.tenantSchema);

  if (query) {
    return {
      keyword: query,
      ...(tenantSchema ? { tenantSchema } : {}),
      stream,
      start,
      end,
      limit,
    };
  }

  return {
    keyword,
    ...(tenantSchema ? { tenantSchema } : {}),
    stream,
    severity: params.severity?.trim() || undefined,
    start,
    end,
    limit,
  };
}

export function buildLokiQueryLogQl(params: LokiQueryParams): string {
  const labels: string[] = [buildLabelMatcher('app', 'tcrn-tms')];

  const tenantSchema = normalizeTenantSchemaLabel(params.tenantSchema);
  if (tenantSchema) {
    labels.push(buildLabelMatcher('tenant_schema', tenantSchema));
  }
  if (params.stream) {
    labels.push(buildLabelMatcher('stream', params.stream));
  }
  if (params.severity) {
    labels.push(buildLabelMatcher('severity', params.severity));
  }
  if (params.eventType) {
    labels.push(buildLabelMatcher('event_type', params.eventType));
  }
  if (params.scope) {
    labels.push(buildLabelMatcher('scope', params.scope));
  }

  let query = `{${labels.join(', ')}}`;

  if (params.traceId) {
    query += ` | json | trace_id=${formatLogQlString(params.traceId)}`;
  }
  if (params.keyword) {
    query += ` |= ${formatLogQlString(params.keyword)}`;
  }

  return query;
}

export function buildLokiKeywordSearchQuery(keyword: string, stream?: string): string {
  let logql = `{${buildLabelMatcher('app', 'tcrn-tms')}`;
  if (stream) {
    logql += `, ${buildLabelMatcher('stream', stream)}`;
  }
  logql += `} |= ${formatLogQlString(keyword)}`;

  return logql;
}

export function buildTenantScopedLokiKeywordSearchQuery(
  keyword: string,
  stream?: string,
  tenantSchema?: string
): string {
  const labels = [buildLabelMatcher('app', 'tcrn-tms')];
  const normalizedTenantSchema = normalizeTenantSchemaLabel(tenantSchema);

  if (normalizedTenantSchema) {
    labels.push(buildLabelMatcher('tenant_schema', normalizedTenantSchema));
  }
  if (stream) {
    labels.push(buildLabelMatcher('stream', stream));
  }

  return `{${labels.join(', ')}} |= ${formatLogQlString(keyword)}`;
}

export function buildChangeLogQuery(params: {
  tenantSchema?: string;
  objectType?: string;
  action?: string;
}): string {
  const labels: string[] = [
    buildLabelMatcher('app', 'tcrn-tms'),
    buildLabelMatcher('stream', 'change_log'),
  ];
  const tenantSchema = normalizeTenantSchemaLabel(params.tenantSchema);

  if (tenantSchema) {
    labels.push(buildLabelMatcher('tenant_schema', tenantSchema));
  }
  if (params.objectType) {
    labels.push(buildLabelMatcher('object_type', params.objectType));
  }
  if (params.action) {
    labels.push(buildLabelMatcher('action', params.action));
  }

  return `{${labels.join(', ')}}`;
}

export function buildTechEventQuery(params: {
  tenantSchema?: string;
  severity?: string;
  eventType?: string;
  scope?: string;
}): string {
  const labels: string[] = [
    buildLabelMatcher('app', 'tcrn-tms'),
    buildLabelMatcher('stream', 'technical_event_log'),
  ];
  const tenantSchema = normalizeTenantSchemaLabel(params.tenantSchema);

  if (tenantSchema) {
    labels.push(buildLabelMatcher('tenant_schema', tenantSchema));
  }
  if (params.severity) {
    labels.push(buildLabelMatcher('severity', params.severity));
  }
  if (params.eventType) {
    labels.push(buildLabelMatcher('event_type', params.eventType));
  }
  if (params.scope) {
    labels.push(buildLabelMatcher('scope', params.scope));
  }

  return `{${labels.join(', ')}}`;
}

export function buildIntegrationLogQuery(params: {
  tenantSchema?: string;
  direction?: string;
  consumerCode?: string;
  status?: string;
}): string {
  const labels: string[] = [
    buildLabelMatcher('app', 'tcrn-tms'),
    buildLabelMatcher('stream', 'integration_log'),
  ];
  const tenantSchema = normalizeTenantSchemaLabel(params.tenantSchema);

  if (tenantSchema) {
    labels.push(buildLabelMatcher('tenant_schema', tenantSchema));
  }
  if (params.direction) {
    labels.push(buildLabelMatcher('direction', params.direction));
  }
  if (params.consumerCode) {
    labels.push(buildLabelMatcher('consumer_code', params.consumerCode));
  }
  if (params.status) {
    labels.push(buildLabelMatcher('status', params.status));
  }

  return `{${labels.join(', ')}}`;
}

export function getDefaultLokiQueryStart(now = new Date()): string {
  const date = new Date(now);
  date.setHours(date.getHours() - 24);
  return date.toISOString();
}

export function normalizeLokiQueryRange(input: {
  start?: string;
  end?: string;
  limit?: number;
  now?: Date;
}): { start: string; end: string; limit: number } {
  const now = input.now ?? new Date();
  const parsedEnd = parseValidDate(input.end) ?? now;
  const requestedStart = parseValidDate(input.start) ?? new Date(parsedEnd.getTime() - LOKI_MAX_QUERY_RANGE_MS);
  const minStart = new Date(parsedEnd.getTime() - LOKI_MAX_QUERY_RANGE_MS);
  const start = requestedStart.getTime() < minStart.getTime() ? minStart : requestedStart;

  return {
    start: start.toISOString(),
    end: parsedEnd.toISOString(),
    limit: parsePositiveInteger(input.limit) ?? LOKI_MAX_RESULT_LIMIT,
  };
}

export function transformLokiQueryResponse(data: RawLokiQueryResponse): LokiQueryResponse {
  const results = data.data?.result || [];

  const entries: LokiLogEntry[] = results.flatMap((result) =>
    result.values.map(([timestamp, value]) => ({
      timestamp: new Date(parseInt(timestamp, 10) / 1000000),
      labels: result.stream,
      data: safeJsonParse(value),
    }))
  );

  return {
    entries,
    stats: data.data?.stats,
  };
}

function parsePositiveInteger(value?: number | string): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0
      ? Math.min(Math.floor(value), LOKI_MAX_RESULT_LIMIT)
      : undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, LOKI_MAX_RESULT_LIMIT) : undefined;
}

function buildLabelMatcher(label: string, value: string): string {
  return `${label}=${formatLogQlString(value)}`;
}

export function normalizeTenantSchemaLabel(value?: string): string | undefined {
  const trimmed = value?.trim();

  return trimmed && TENANT_SCHEMA_LABEL_PATTERN.test(trimmed) ? trimmed : undefined;
}

function formatLogQlString(value: string): string {
  return JSON.stringify(String(value).trim().slice(0, 256));
}

function parseValidDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

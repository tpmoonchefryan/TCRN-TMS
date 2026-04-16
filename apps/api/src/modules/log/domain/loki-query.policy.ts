// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Loki query parameters
 */
export interface LokiQueryParams {
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
}

export const LOKI_LOG_STREAMS = [
  'change_log',
  'technical_event_log',
  'integration_log',
] as const;

export type LokiLogStream = (typeof LOKI_LOG_STREAMS)[number];

export interface CompatibleLogSearchParams {
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
  now = new Date(),
): { start: string; end: string } | undefined {
  if (!timeRange) {
    return undefined;
  }

  const durationMs =
    RELATIVE_TIME_RANGE_MS[timeRange as keyof typeof RELATIVE_TIME_RANGE_MS];

  if (!durationMs) {
    return undefined;
  }

  const end = new Date(now);
  const start = new Date(end.getTime() - durationMs);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function buildCompatibleRawLogSearchQuery(
  query: string,
  stream?: LokiLogStream,
): string {
  const trimmedQuery = query.trim();

  if (hasLogSelector(trimmedQuery)) {
    return injectStreamIntoFirstSelector(trimmedQuery, stream);
  }

  const selector = stream
    ? `{app="tcrn-tms", stream="${stream}"}`
    : '{app="tcrn-tms"}';

  return `${selector} |= ${JSON.stringify(trimmedQuery)}`;
}

export function buildCompatibleLogSearchQuery(
  params: CompatibleLogSearchParams,
  now = new Date(),
): LokiQueryParams {
  const query = params.query?.trim();
  const keyword = params.keyword?.trim() || undefined;
  const limit = parsePositiveInteger(params.limit);
  const stream = normalizeLogSearchStream(params.stream ?? params.app);
  const relativeRange = resolveRelativeTimeRange(params.timeRange, now);
  const start = params.start || relativeRange?.start;
  const end = params.end || relativeRange?.end;

  if (query) {
    return {
      rawQuery: buildCompatibleRawLogSearchQuery(query, stream),
      start,
      end,
      limit,
    };
  }

  return {
    keyword,
    stream,
    severity: params.severity?.trim() || undefined,
    start,
    end,
    limit,
  };
}

export function buildLokiQueryLogQl(params: LokiQueryParams): string {
  const labels: string[] = ['app="tcrn-tms"'];

  if (params.stream) {
    labels.push(`stream="${params.stream}"`);
  }
  if (params.severity) {
    labels.push(`severity="${params.severity}"`);
  }
  if (params.eventType) {
    labels.push(`event_type="${params.eventType}"`);
  }
  if (params.scope) {
    labels.push(`scope="${params.scope}"`);
  }

  let query = `{${labels.join(', ')}}`;

  if (params.traceId) {
    query += ` | json | trace_id="${params.traceId}"`;
  }
  if (params.keyword) {
    query += ` |= "${params.keyword}"`;
  }

  return query;
}

export function buildLokiKeywordSearchQuery(
  keyword: string,
  stream?: string,
): string {
  let logql = '{app="tcrn-tms"';
  if (stream) {
    logql += `, stream="${stream}"`;
  }
  logql += `} |= "${keyword}"`;

  return logql;
}

export function buildChangeLogQuery(params: {
  objectType?: string;
  action?: string;
}): string {
  const labels: string[] = ['app="tcrn-tms"', 'stream="change_log"'];

  if (params.objectType) {
    labels.push(`object_type="${params.objectType}"`);
  }
  if (params.action) {
    labels.push(`action="${params.action}"`);
  }

  return `{${labels.join(', ')}}`;
}

export function buildTechEventQuery(params: {
  severity?: string;
  eventType?: string;
  scope?: string;
}): string {
  const labels: string[] = ['app="tcrn-tms"', 'stream="technical_event_log"'];

  if (params.severity) {
    labels.push(`severity="${params.severity}"`);
  }
  if (params.eventType) {
    labels.push(`event_type="${params.eventType}"`);
  }
  if (params.scope) {
    labels.push(`scope="${params.scope}"`);
  }

  return `{${labels.join(', ')}}`;
}

export function buildIntegrationLogQuery(params: {
  direction?: string;
  consumerCode?: string;
  status?: string;
}): string {
  const labels: string[] = ['app="tcrn-tms"', 'stream="integration_log"'];

  if (params.direction) {
    labels.push(`direction="${params.direction}"`);
  }
  if (params.consumerCode) {
    labels.push(`consumer_code="${params.consumerCode}"`);
  }
  if (params.status) {
    labels.push(`status="${params.status}"`);
  }

  return `{${labels.join(', ')}}`;
}

export function getDefaultLokiQueryStart(now = new Date()): string {
  const date = new Date(now);
  date.setHours(date.getHours() - 24);
  return date.toISOString();
}

export function transformLokiQueryResponse(data: RawLokiQueryResponse): LokiQueryResponse {
  const results = data.data?.result || [];

  const entries: LokiLogEntry[] = results.flatMap((result) =>
    result.values.map(([timestamp, value]) => ({
      timestamp: new Date(parseInt(timestamp, 10) / 1000000),
      labels: result.stream,
      data: safeJsonParse(value),
    })),
  );

  return {
    entries,
    stats: data.data?.stats,
  };
}

function hasLogSelector(query: string): boolean {
  return /\{[^}]*\}/.test(query);
}

function injectStreamIntoFirstSelector(
  query: string,
  stream?: LokiLogStream,
): string {
  if (!stream) {
    return query;
  }

  return query.replace(/\{([^}]*)\}/, (_selector, labels: string) => {
    if (/\bstream\s*=/.test(labels)) {
      return `{${labels}}`;
    }

    const normalizedLabels = labels.trim();
    const nextLabels = normalizedLabels
      ? `${normalizedLabels}, stream="${stream}"`
      : `stream="${stream}"`;

    return `{${nextLabels}}`;
  });
}

function parsePositiveInteger(value?: number | string): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

import { BROWSER_PUBLIC_CONSUMER_CODE, BROWSER_PUBLIC_CONSUMER_HEADER } from '@tcrn/shared';

export interface ApiEnvelopeError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  traceId?: string;
}

export interface ApiEnvelopeMeta {
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export type ApiPaginationMeta = NonNullable<ApiEnvelopeMeta['pagination']>;

export type ApiEnvelope<T> =
  | {
      success: true;
      data: T;
      meta?: ApiEnvelopeMeta;
    }
  | {
      success: false;
      error: ApiEnvelopeError;
    };

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: ApiEnvelopeMeta;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: ApiPaginationMeta;
}

export class ApiRequestError extends Error {
  code: string;
  status: number;
  details?: unknown;
  requestId?: string;
  traceId?: string;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: unknown,
    requestId?: string,
    traceId?: string
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
    this.traceId = traceId;
  }
}

export async function readApiEnvelope<T>(response: Response): Promise<ApiSuccessEnvelope<T>> {
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    const error = 'error' in payload ? payload.error : undefined;
    throw new ApiRequestError(
      error?.message || 'Request failed',
      error?.code || 'UNKNOWN_ERROR',
      response.status,
      error?.details,
      error?.requestId,
      error?.traceId
    );
  }

  return payload;
}

export async function readApiData<T>(response: Response): Promise<T> {
  const payload = await readApiEnvelope<T>(response);
  return payload.data;
}

export function buildFallbackPagination(
  itemCount: number,
  page: number,
  pageSize: number
): ApiPaginationMeta {
  const safePageSize = normalizePositiveInteger(pageSize, Math.max(itemCount, 1));
  const totalCount = normalizeNonNegativeInteger(itemCount, 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const safePage = Math.min(normalizePositiveInteger(page, 1), totalPages);

  return {
    page: safePage,
    pageSize: safePageSize,
    totalCount,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}

export function resolveApiPagination(
  meta: ApiEnvelopeMeta | undefined,
  page: number,
  pageSize: number,
  itemCount: number
): ApiPaginationMeta {
  const fallback = buildFallbackPagination(itemCount, page, pageSize);
  const rawPagination = meta?.pagination as Partial<ApiPaginationMeta> | undefined;

  if (!rawPagination) {
    return fallback;
  }

  const safePageSize = normalizePositiveInteger(rawPagination.pageSize, fallback.pageSize);
  const safeTotalCount = normalizeNonNegativeInteger(rawPagination.totalCount, fallback.totalCount);
  const derivedTotalPages = Math.max(1, Math.ceil(safeTotalCount / safePageSize));
  const safeTotalPages = normalizePositiveInteger(rawPagination.totalPages, derivedTotalPages);
  const safePage = Math.min(
    normalizePositiveInteger(rawPagination.page, fallback.page),
    safeTotalPages
  );

  return {
    page: safePage,
    pageSize: safePageSize,
    totalCount: safeTotalCount,
    totalPages: safeTotalPages,
    hasNext:
      typeof rawPagination.hasNext === 'boolean'
        ? rawPagination.hasNext
        : safePage < safeTotalPages,
    hasPrev:
      typeof rawPagination.hasPrev === 'boolean'
        ? rawPagination.hasPrev
        : safePage > 1,
  };
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const numericValue = Number(value);

  if (Number.isInteger(numericValue) && numericValue > 0) {
    return numericValue;
  }

  return Math.max(1, fallback);
}

function normalizeNonNegativeInteger(value: unknown, fallback: number): number {
  const numericValue = Number(value);

  if (Number.isInteger(numericValue) && numericValue >= 0) {
    return numericValue;
  }

  return Math.max(0, fallback);
}

export function withBrowserPublicConsumerHeaders(headers?: HeadersInit): Headers {
  const nextHeaders = new Headers(headers);
  nextHeaders.set(BROWSER_PUBLIC_CONSUMER_HEADER, BROWSER_PUBLIC_CONSUMER_CODE);
  return nextHeaders;
}

import {
  BROWSER_PUBLIC_CONSUMER_CODE,
  BROWSER_PUBLIC_CONSUMER_HEADER,
} from '@tcrn/shared';

export interface ApiEnvelopeError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
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

  constructor(message: string, code: string, status: number, details?: unknown, requestId?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
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
  pageSize: number,
): ApiPaginationMeta {
  const totalCount = itemCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function resolveApiPagination(
  meta: ApiEnvelopeMeta | undefined,
  page: number,
  pageSize: number,
  itemCount: number,
): ApiPaginationMeta {
  return meta?.pagination ?? buildFallbackPagination(itemCount, page, pageSize);
}

export function withBrowserPublicConsumerHeaders(headers?: HeadersInit): Headers {
  const nextHeaders = new Headers(headers);
  nextHeaders.set(BROWSER_PUBLIC_CONSUMER_HEADER, BROWSER_PUBLIC_CONSUMER_CODE);
  return nextHeaders;
}

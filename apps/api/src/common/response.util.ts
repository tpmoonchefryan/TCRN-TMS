// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Unified API Response Utilities
 * PRD §4.1, 03-认证系统 Part A
 */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: unknown;
  };
}

export interface ErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[] | Record<string, unknown>;
    requestId?: string;
  };
}

/**
 * Create a success response
 */
export function success<T>(data: T, meta?: SuccessResponse<T>['meta']): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  return response;
}

/**
 * Create a paginated success response
 */
export function paginated<T>(
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
  },
  extraMeta?: Record<string, unknown>
): SuccessResponse<T[]> {
  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);
  
  return {
    success: true,
    data,
    meta: {
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalCount: pagination.totalCount,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      },
      ...extraMeta,
    },
  };
}

/**
 * Create an error response
 */
export function error(
  code: string,
  message: string,
  details?: ErrorResponse['error']['details'],
  requestId?: string
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };
  if (details) {
    response.error.details = details;
  }
  if (requestId) {
    response.error.requestId = requestId;
  }
  return response;
}

/**
 * Convert snake_case to camelCase for response serialization
 */
export function toCamelCase<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase) as T;
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(value);
    }
    return result as T;
  }
  
  return obj;
}

/**
 * Convert camelCase to snake_case for database queries
 */
export function toSnakeCase<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase) as T;
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(value);
    }
    return result as T;
  }
  
  return obj;
}

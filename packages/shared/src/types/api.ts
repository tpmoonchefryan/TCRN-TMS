// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Standard API Response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

/**
 * Standard API Error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  traceId?: string;
}

/**
 * Pagination metadata
 */
export interface ApiMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Paginated API Response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiMeta;
}

/**
 * Standard pagination query parameters
 */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  services: Record<
    string,
    {
      status: 'up' | 'down';
      latency?: number;
      message?: string;
    }
  >;
}

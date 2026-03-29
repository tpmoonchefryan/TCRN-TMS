// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

export function buildApiUrl(pathname: string): string {
  return `${getApiBaseUrl()}${pathname}`;
}

const API_BASE_URL = getApiBaseUrl();

export interface ApiResponseError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface ApiResponsePagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type ApiResponseMeta = Record<string, unknown> & {
  pagination?: ApiResponsePagination;
};

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiResponseError;
  message?: string;
  meta?: ApiResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

export type ApiQueryParams = object;

type ApiResponsePayload<T> = Omit<ApiResponse<T>, 'error' | 'message'> & {
  error?: ApiResponseError | string;
  message?: string | string[];
};

function buildQueryString(params?: ApiQueryParams): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function getResponseErrorMessage<T>(payload: ApiResponsePayload<T>): string {
  if (typeof payload.error === 'object' && payload.error !== null && payload.error.message) {
    return payload.error.message;
  }

  if (Array.isArray(payload.message)) {
    return payload.message.join(', ');
  }

  if (typeof payload.message === 'string' && payload.message) {
    return payload.message;
  }

  return 'An error occurred';
}

function getResponseErrorCode<T>(payload: ApiResponsePayload<T>): string {
  if (typeof payload.error === 'object' && payload.error !== null && payload.error.code) {
    return payload.error.code;
  }

  if (typeof payload.error === 'string' && payload.error) {
    return payload.error;
  }

  return 'UNKNOWN_ERROR';
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  );
}

interface ApiClientAuthHooks {
  getTenantCode: () => string | null;
  logout: () => Promise<void> | void;
  redirectToLogin: () => void;
}

let authClientHooks: ApiClientAuthHooks | null = null;

export const registerAuthClientHooks = (hooks: ApiClientAuthHooks) => {
  authClientHooks = hooks;
};

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>).Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      const data: ApiResponsePayload<T> = await response.json();

      if (!response.ok) {
        if (
          response.status === 401 &&
          !endpoint.includes('/auth/login') &&
          !endpoint.includes('/auth/refresh')
        ) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            if (this.accessToken) {
              (headers as Record<string, string>).Authorization = `Bearer ${this.accessToken}`;
            }

            const retryResponse = await fetch(url, {
              ...options,
              headers,
              credentials: 'include',
            });
            return retryResponse.json() as Promise<ApiResponse<T>>;
          }

          void authClientHooks?.logout();
          authClientHooks?.redirectToLogin();
        }

        const error: ApiError = {
          code: getResponseErrorCode(data),
          message: getResponseErrorMessage(data),
          statusCode: response.status,
        };
        throw error;
      }

      return {
        ...data,
        error: typeof data.error === 'string' ? undefined : data.error,
        message: Array.isArray(data.message) ? data.message.join(', ') : data.message,
      };
    } catch (error) {
      if (isApiError(error)) {
        throw error;
      }

      throw {
        code: 'NETWORK_ERROR',
        message: 'Network error occurred',
        statusCode: 0,
      } as ApiError;
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const tenantCode = authClientHooks?.getTenantCode() ?? null;
        const headers = tenantCode ? { 'X-Tenant-ID': tenantCode } : undefined;
        const response = await this.post<{ accessToken?: string }>(
          '/api/v1/auth/refresh',
          {},
          headers
        );

        if (response.success && response.data?.accessToken) {
          this.setAccessToken(response.data.accessToken);
          return true;
        }
      } catch {
        // Refresh failed
      } finally {
        this.refreshPromise = null;
      }

      return false;
    })();

    return this.refreshPromise;
  }

  async get<T>(
    endpoint: string,
    params?: ApiQueryParams,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(`${endpoint}${buildQueryString(params)}`, { method: 'GET', headers });
  }

  async post<T>(
    endpoint: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  }

  async patch<T>(
    endpoint: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers,
    });
  }

  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

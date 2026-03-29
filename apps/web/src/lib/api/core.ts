/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

export function buildApiUrl(pathname: string): string {
  return `${getApiBaseUrl()}${pathname}`;
}

const API_BASE_URL = getApiBaseUrl();

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
  };
  message?: string;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    [key: string]: any;
  };
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
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

      const data = await response.json();

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
            return retryResponse.json();
          }

          void authClientHooks?.logout();
          authClientHooks?.redirectToLogin();
        }

        const errorMessage =
          data.error?.message ||
          (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
          'An error occurred';

        const errorCode = data.error?.code || data.error || 'UNKNOWN_ERROR';

        const error: ApiError = {
          code: errorCode,
          message: errorMessage,
          statusCode: response.status,
        };
        throw error;
      }

      return data;
    } catch (error) {
      if ((error as ApiError).statusCode) {
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
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const filteredParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
        )
      : undefined;
    const searchParams =
      filteredParams && Object.keys(filteredParams).length > 0
        ? `?${new URLSearchParams(filteredParams as Record<string, string>).toString()}`
        : '';
    return this.request<T>(`${endpoint}${searchParams}`, { method: 'GET', headers });
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

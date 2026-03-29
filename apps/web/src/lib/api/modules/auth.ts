// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { apiClient } from '../core';
import {
  type ApiAuthSessionData,
  type ApiLoginResponseData,
  normalizeApiResponseData,
  normalizeAuthSessionData,
  normalizeLoginResponseData,
} from './auth-user-contract';

export const authApi = {
  login: async (login: string, password: string, tenantCode: string) =>
    normalizeApiResponseData(
      await apiClient.post<ApiLoginResponseData>(
        '/api/v1/auth/login',
        { login, password, tenantCode },
        { 'X-Tenant-ID': tenantCode }
      ),
      (data) => normalizeLoginResponseData(data, { code: tenantCode })
    ),

  verifyTotp: async (sessionToken: string, code: string) =>
    normalizeApiResponseData(
      await apiClient.post<ApiAuthSessionData>('/api/v1/auth/totp/verify', { sessionToken, code }),
      normalizeAuthSessionData
    ),

  resetPassword: async (sessionToken: string, newPassword: string, newPasswordConfirm: string) =>
    normalizeApiResponseData(
      await apiClient.post<ApiAuthSessionData & { message?: string }>('/api/v1/auth/password/reset', {
        sessionToken,
        newPassword,
        newPasswordConfirm,
      }),
      normalizeAuthSessionData
    ),

  logout: () => apiClient.post('/api/v1/auth/logout', {}),

  refresh: (tenantCode?: string) =>
    apiClient.post<{ accessToken?: string; expiresIn?: number }>(
      '/api/v1/auth/refresh',
      {},
      tenantCode ? { 'X-Tenant-ID': tenantCode } : undefined
    ),

  forgotPassword: (email: string, tenantCode: string) =>
    apiClient.post<{ message?: string }>('/api/v1/auth/forgot-password', { email, tenantCode }),

  resetPasswordByToken: (
    token: string,
    tenantCode: string,
    newPassword: string,
    newPasswordConfirm: string
  ) =>
    apiClient.post<{ message?: string }>('/api/v1/auth/reset-password-by-token', {
      token,
      tenantCode,
      newPassword,
      newPasswordConfirm,
    }),
};

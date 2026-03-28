/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { apiClient } from '../core';

export const authApi = {
  login: (login: string, password: string, tenantCode: string) =>
    apiClient.post<{
      accessToken?: string;
      expiresIn?: number;
      totpRequired?: boolean;
      passwordResetRequired?: boolean;
      reason?: string;
      sessionToken?: string;
      tenantId?: string;
      user?: any;
    }>('/api/v1/auth/login', { login, password, tenantCode }, { 'X-Tenant-ID': tenantCode }),

  verifyTotp: (sessionToken: string, code: string) =>
    apiClient.post<{
      accessToken?: string;
      expiresIn?: number;
      tenantId?: string;
      user?: any;
    }>('/api/v1/auth/totp/verify', { sessionToken, code }),

  resetPassword: (sessionToken: string, newPassword: string, newPasswordConfirm: string) =>
    apiClient.post<{
      accessToken?: string;
      expiresIn?: number;
      tenantId?: string;
      user?: any;
      message?: string;
    }>('/api/v1/auth/password/reset', { sessionToken, newPassword, newPasswordConfirm }),

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

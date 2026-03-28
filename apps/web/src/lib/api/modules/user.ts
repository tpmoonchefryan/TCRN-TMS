/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { apiClient } from '../core';

export const userApi = {
  me: () => apiClient.get<any>('/api/v1/users/me'),

  update: (data: {
    displayName?: string;
    phone?: string;
    preferredLanguage?: string;
    avatarUrl?: string;
  }) => apiClient.patch<any>('/api/v1/users/me', data),

  updateProfile: (data: { displayName?: string }) => apiClient.patch<any>('/api/v1/users/me', data),

  uploadAvatar: async (
    file: File
  ): Promise<{ success: boolean; data?: { avatarUrl: string }; error?: any }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/v1/users/me/avatar', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const result = await response.json();
    return {
      success: response.ok,
      data: result.data,
      error: result.error,
    };
  },

  deleteAvatar: () => apiClient.delete<any>('/api/v1/users/me/avatar'),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirm: string;
  }) => apiClient.post<any>('/api/v1/users/me/password', data),

  requestEmailChange: (newEmail: string) =>
    apiClient.post<any>('/api/v1/users/me/email/request-change', { newEmail }),

  confirmEmailChange: (token: string) =>
    apiClient.post<any>('/api/v1/users/me/email/confirm', { token }),
};

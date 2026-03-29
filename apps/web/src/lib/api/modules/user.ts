// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { apiClient, type ApiResponse } from '../core';
import {
  type ApiAuthUser,
  normalizeApiResponseData,
  normalizeRequiredAuthUser,
} from './auth-user-contract';

export interface UserProfileUpdateData {
  displayName?: string;
  phone?: string;
  preferredLanguage?: string;
  avatarUrl?: string;
}

export interface AvatarUploadResponse {
  avatarUrl: string;
  message: string;
}

export interface AvatarDeleteResponse {
  message: string;
}

export interface ChangePasswordResponse {
  message: string;
  passwordExpiresAt: string;
}

export interface RequestEmailChangeResponse {
  message: string;
}

export interface ConfirmEmailChangeResponse {
  message: string;
  email: string;
}

export interface AvatarUploadResult {
  success: boolean;
  data?: AvatarUploadResponse;
  error?: ApiResponse<never>['error'];
  message?: string;
}

export const userApi = {
  me: async () =>
    normalizeApiResponseData(
      await apiClient.get<ApiAuthUser>('/api/v1/users/me'),
      normalizeRequiredAuthUser
    ),

  update: async (data: UserProfileUpdateData) =>
    normalizeApiResponseData(
      await apiClient.patch<ApiAuthUser>('/api/v1/users/me', data),
      normalizeRequiredAuthUser
    ),

  updateProfile: async (data: Pick<UserProfileUpdateData, 'displayName'>) =>
    normalizeApiResponseData(
      await apiClient.patch<ApiAuthUser>('/api/v1/users/me', data),
      normalizeRequiredAuthUser
    ),

  uploadAvatar: async (file: File): Promise<AvatarUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/v1/users/me/avatar', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const result = (await response.json()) as ApiResponse<AvatarUploadResponse>;

    return {
      success: response.ok && result.success,
      data: result.data,
      error: result.error,
      message: result.message,
    };
  },

  deleteAvatar: () => apiClient.delete<AvatarDeleteResponse>('/api/v1/users/me/avatar'),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirm: string;
  }) => apiClient.post<ChangePasswordResponse>('/api/v1/users/me/password', data),

  requestEmailChange: (newEmail: string) =>
    apiClient.post<RequestEmailChangeResponse>('/api/v1/users/me/email/request-change', { newEmail }),

  confirmEmailChange: (token: string) =>
    apiClient.post<ConfirmEmailChangeResponse>('/api/v1/users/me/email/confirm', { token }),
};

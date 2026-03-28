// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  AssignUserRoleRequest,
  AssignUserRoleResponse,
  RbacScopeType,
  RemoveUserRoleAssignmentResponse,
  RolePermissionInput,
  SystemRoleRecord,
  UpdateUserRoleAssignmentResponse,
  UserRoleAssignmentRecord,
} from '@tcrn/shared';

import { apiClient } from '../core';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const systemUserApi = {
  list: (params?: {
    search?: string;
    roleId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  }) => apiClient.get<any[]>('/api/v1/system-users', params),

  get: (id: string) => apiClient.get<any>(`/api/v1/system-users/${id}`),

  create: (data: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
    forceReset?: boolean;
  }) => apiClient.post<any>('/api/v1/system-users', data),

  update: (
    id: string,
    data: { displayName?: string; phone?: string; preferredLanguage?: string },
  ) => apiClient.patch<any>(`/api/v1/system-users/${id}`, data),

  resetPassword: (id: string, options?: { newPassword?: string; forceReset?: boolean }) =>
    apiClient.post<any>(`/api/v1/system-users/${id}/reset-password`, options || {}),

  deactivate: (id: string) => apiClient.post<any>(`/api/v1/system-users/${id}/deactivate`, {}),

  reactivate: (id: string) => apiClient.post<any>(`/api/v1/system-users/${id}/reactivate`, {}),

  getScopeAccess: (id: string) =>
    apiClient.get<
      Array<{ id: string; scopeType: string; scopeId: string | null; includeSubunits: boolean }>
    >(`/api/v1/system-users/${id}/scope-access`),

  setScopeAccess: (
    id: string,
    accesses: Array<{ scopeType: string; scopeId?: string; includeSubunits?: boolean }>,
  ) => apiClient.post<any>(`/api/v1/system-users/${id}/scope-access`, { accesses }),

  disableTotp: (id: string) => apiClient.post<any>(`/api/v1/system-users/${id}/disable-totp`, {}),

  setPasswordExpiry: (id: string, options: { enabled: boolean; expiresInDays?: number }) =>
    apiClient.post<any>(`/api/v1/system-users/${id}/password-expiry`, options),
};

export interface DelegatedAdmin {
  id: string;
  scopeType: 'subsidiary' | 'talent';
  scopeId: string;
  scopeName: string | null;
  delegateType: 'user' | 'role';
  delegateId: string;
  delegateName: string | null;
  grantedAt: string;
  grantedBy: {
    id: string;
    username: string | null;
  } | null;
}

export const delegatedAdminApi = {
  list: (params?: { scopeType?: 'subsidiary' | 'talent'; scopeId?: string }) =>
    apiClient.get<DelegatedAdmin[]>('/api/v1/delegated-admins', params),

  create: (data: {
    scopeType: 'subsidiary' | 'talent';
    scopeId: string;
    delegateType: 'user' | 'role';
    delegateId: string;
  }) => apiClient.post<DelegatedAdmin>('/api/v1/delegated-admins', data),

  delete: (id: string) => apiClient.delete<{ message: string }>(`/api/v1/delegated-admins/${id}`),

  getMyScopes: () =>
    apiClient.get<Array<{ scopeType: 'subsidiary' | 'talent'; scopeId: string }>>(
      '/api/v1/delegated-admins/my-scopes',
    ),
};

export const systemRoleApi = {
  list: (params?: { isActive?: boolean; isSystem?: boolean; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.isSystem !== undefined) searchParams.set('isSystem', String(params.isSystem));
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return apiClient.get<SystemRoleRecord[]>(`/api/v1/system-roles${query ? `?${query}` : ''}`);
  },

  get: (id: string) => apiClient.get<SystemRoleRecord>(`/api/v1/system-roles/${id}`),

  create: (data: {
    code: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    description?: string;
    isActive?: boolean;
    permissions?: RolePermissionInput[];
  }) => apiClient.post<SystemRoleRecord>('/api/v1/system-roles', data),

  update: (
    id: string,
    data: {
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      description?: string;
      isActive?: boolean;
      permissions?: RolePermissionInput[];
    },
  ) => apiClient.patch<SystemRoleRecord>(`/api/v1/system-roles/${id}`, data),

  delete: (id: string) => apiClient.delete<any>(`/api/v1/system-roles/${id}`),
};

export const authExtApi = {
  verifyRecoveryCode: (sessionToken: string, recoveryCode: string) =>
    apiClient.post<any>('/api/v1/auth/recovery-code/verify', { sessionToken, recoveryCode }),

  logoutAll: () => apiClient.post<any>('/api/v1/auth/logout-all', {}),
};

export const totpApi = {
  setup: () =>
    apiClient.post<{ secret: string; qrCode: string; otpauthUrl: string }>(
      '/api/v1/users/me/totp/setup',
      {},
    ),

  enable: (code: string) =>
    apiClient.post<{ enabled: boolean; recoveryCodes: string[] }>('/api/v1/users/me/totp/enable', {
      code,
    }),

  disable: (password: string) =>
    apiClient.post<{ disabled: boolean }>('/api/v1/users/me/totp/disable', { password }),

  regenerateRecoveryCodes: (password: string) =>
    apiClient.post<{ recoveryCodes: string[] }>('/api/v1/users/me/recovery-codes/regenerate', {
      password,
    }),
};

export const userRoleApi = {
  getUserRoles: (userId: string, scopeType?: RbacScopeType, scopeId?: string) =>
    apiClient.get<UserRoleAssignmentRecord[]>(`/api/v1/users/${userId}/roles`, {
      scopeType,
      scopeId,
    }),

  assignRole: (userId: string, data: AssignUserRoleRequest) => {
    const payload: Record<string, unknown> = {
      scopeType: data.scopeType,
      scopeId: data.scopeId,
      inherit: data.inherit,
    };
    if (data.expiresAt !== undefined) {
      payload.expiresAt = data.expiresAt;
    }
    if (data.roleCode && data.roleCode.trim()) {
      payload.roleCode = data.roleCode.trim();
    }
    if (data.roleId && data.roleId.trim()) {
      payload.roleId = data.roleId.trim();
    }
    return apiClient.post<AssignUserRoleResponse>(`/api/v1/users/${userId}/roles`, payload);
  },

  removeRole: (userId: string, assignmentId: string) =>
    apiClient.delete<RemoveUserRoleAssignmentResponse>(
      `/api/v1/users/${userId}/roles/${assignmentId}`,
    ),

  updateRoleInherit: (userId: string, assignmentId: string, inherit: boolean) =>
    apiClient.patch<UpdateUserRoleAssignmentResponse>(
      `/api/v1/users/${userId}/roles/${assignmentId}`,
      { inherit },
    ),
};

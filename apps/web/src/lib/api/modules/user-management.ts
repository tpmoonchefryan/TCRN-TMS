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

export type SystemUserPreferredLanguage = 'en' | 'zh' | 'ja';

export interface SystemUserListQuery {
  search?: string;
  roleId?: string;
  isActive?: boolean;
  isTotpEnabled?: boolean;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export interface SystemUserListItem {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isTotpEnabled: boolean;
  forceReset: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface SystemUserDetailRecord extends SystemUserListItem {
  phone: string | null;
  preferredLanguage: SystemUserPreferredLanguage;
  updatedAt: string;
}

export interface CreateSystemUserPayload {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  phone?: string;
  preferredLanguage?: SystemUserPreferredLanguage;
  forceReset?: boolean;
}

export interface SystemUserCreateResponse {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  forceReset: boolean;
  createdAt: string;
}

export interface UpdateSystemUserPayload {
  displayName?: string;
  phone?: string;
  preferredLanguage?: SystemUserPreferredLanguage;
  avatarUrl?: string;
}

export interface SystemUserUpdateResponse {
  id: string;
  displayName: string | null;
  phone: string | null;
  preferredLanguage: SystemUserPreferredLanguage;
  avatarUrl: string | null;
  updatedAt: string;
}

export interface ResetSystemUserPasswordPayload {
  newPassword?: string;
  forceReset?: boolean;
}

export interface ResetSystemUserPasswordResponse {
  message: string;
  tempPassword?: string;
  forceReset: boolean;
}

export interface SystemUserActivationResponse {
  id: string;
  isActive: boolean;
}

export interface SystemUserScopeAccessRecord {
  id: string;
  scopeType: RbacScopeType;
  scopeId: string | null;
  includeSubunits: boolean;
}

export interface SystemUserScopeAccessMutation {
  scopeType: RbacScopeType;
  scopeId?: string | null;
  includeSubunits?: boolean;
}

export interface SystemUserScopeAccessUpdateResponse {
  message: string;
}

export interface SystemUserForceTotpResponse {
  message: string;
}

export interface SystemRoleDeleteResponse {
  deleted: boolean;
}

export interface RecoveryCodeVerifyResponse {
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: Record<string, unknown>;
  recoveryCodesRemaining?: number;
  warning?: string;
}

export interface LogoutAllResponse {
  message: string;
  revokedSessions: number;
}

export const systemUserApi = {
  list: (params?: SystemUserListQuery) =>
    apiClient.get<SystemUserListItem[]>('/api/v1/system-users', params),

  get: (id: string) => apiClient.get<SystemUserDetailRecord>(`/api/v1/system-users/${id}`),

  create: (data: CreateSystemUserPayload) =>
    apiClient.post<SystemUserCreateResponse>('/api/v1/system-users', data),

  update: (id: string, data: UpdateSystemUserPayload) =>
    apiClient.patch<SystemUserUpdateResponse>(`/api/v1/system-users/${id}`, data),

  resetPassword: (id: string, options?: ResetSystemUserPasswordPayload) =>
    apiClient.post<ResetSystemUserPasswordResponse>(
      `/api/v1/system-users/${id}/reset-password`,
      options || {}
    ),

  deactivate: (id: string) =>
    apiClient.post<SystemUserActivationResponse>(`/api/v1/system-users/${id}/deactivate`, {}),

  reactivate: (id: string) =>
    apiClient.post<SystemUserActivationResponse>(`/api/v1/system-users/${id}/reactivate`, {}),

  getScopeAccess: (id: string) =>
    apiClient.get<SystemUserScopeAccessRecord[]>(`/api/v1/system-users/${id}/scope-access`),

  setScopeAccess: (id: string, accesses: SystemUserScopeAccessMutation[]) =>
    apiClient.post<SystemUserScopeAccessUpdateResponse>(`/api/v1/system-users/${id}/scope-access`, {
      accesses,
    }),

  forceTotp: (id: string) =>
    apiClient.post<SystemUserForceTotpResponse>(`/api/v1/system-users/${id}/force-totp`, {}),

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

  delete: (id: string) => apiClient.delete<SystemRoleDeleteResponse>(`/api/v1/system-roles/${id}`),
};

export const authExtApi = {
  verifyRecoveryCode: (sessionToken: string, recoveryCode: string) =>
    apiClient.post<RecoveryCodeVerifyResponse>('/api/v1/auth/recovery-code/verify', {
      sessionToken,
      recoveryCode,
    }),

  logoutAll: () => apiClient.post<LogoutAllResponse>('/api/v1/auth/logout-all', {}),
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

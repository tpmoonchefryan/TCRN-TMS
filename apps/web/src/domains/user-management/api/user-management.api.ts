import type { SupportedUiLocale } from '@tcrn/shared';

import {
  type ApiSuccessEnvelope,
  type PaginatedResult,
  resolveApiPagination,
} from '@/platform/http/api';

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

export interface SystemUserDetailResponse extends SystemUserListItem {
  phone: string | null;
  preferredLanguage: SupportedUiLocale;
  updatedAt: string;
  roleAssignments: SystemUserRoleAssignment[];
  scopeAccess: SystemUserScopeAccessDetail[];
}

export interface SystemUserRoleAssignment {
  id: string;
  roleId: string;
  roleCode: string;
  roleNameEn: string;
  roleNameZh: string | null;
  roleNameJa: string | null;
  roleIsActive: boolean;
  scopeType: 'tenant' | 'subsidiary' | 'talent';
  scopeId: string | null;
  scopeName: string | null;
  scopePath: string | null;
  inherit: boolean;
  grantedAt: string;
  expiresAt: string | null;
}

export interface SystemUserScopeAccessDetail {
  id: string;
  scopeType: 'tenant' | 'subsidiary' | 'talent';
  scopeId: string | null;
  scopeName: string | null;
  scopePath: string | null;
  includeSubunits: boolean;
  grantedAt: string;
}

export interface SystemRoleListItem {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  translations: Record<string, string>;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissionCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemRolePermissionRecord {
  resource: string;
  action: string;
  effect: 'grant' | 'deny';
}

export interface SystemRoleDetailResponse extends Omit<SystemRoleListItem, 'permissionCount'> {
  permissions: SystemRolePermissionRecord[];
  permissionCount: number;
  userCount: number;
  scopeBindings: SystemRoleScopeBinding[];
  assignedUsers: SystemRoleAssignedUser[];
}

export interface SystemRoleScopeBinding {
  scopeType: 'tenant' | 'subsidiary' | 'talent';
  scopeId: string | null;
  scopeName: string | null;
  scopePath: string | null;
  assignmentCount: number;
  userCount: number;
  inheritedAssignmentCount: number;
}

export interface SystemRoleAssignedUser {
  assignmentId: string;
  userId: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  scopeType: 'tenant' | 'subsidiary' | 'talent';
  scopeId: string | null;
  scopeName: string | null;
  scopePath: string | null;
  inherit: boolean;
  grantedAt: string;
  expiresAt: string | null;
}

export interface DelegatedAdminListItem {
  id: string;
  scopeType: 'subsidiary' | 'talent';
  scopeId: string;
  scopeName: string;
  delegateType: 'user' | 'role';
  delegateId: string;
  delegateName: string;
  grantedAt: string;
  grantedBy: {
    id: string;
    username: string;
  } | null;
}

export interface ListSystemUsersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export interface ListSystemRolesOptions {
  isActive?: boolean;
}

export interface CreateSystemUserInput {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  phone?: string;
  preferredLanguage?: SupportedUiLocale;
  forceReset?: boolean;
}

export interface UpdateSystemUserInput {
  displayName?: string;
  phone?: string;
  preferredLanguage?: SupportedUiLocale;
}

export interface CreateUserRoleAssignmentInput {
  roleId?: string;
  roleCode?: string;
  scopeType: 'tenant' | 'subsidiary' | 'talent';
  scopeId?: string | null;
  inherit: boolean;
  expiresAt?: string | null;
}

export interface UpdateUserRoleAssignmentInput {
  inherit?: boolean;
  expiresAt?: string | null;
}

export interface CreateDelegatedAdminInput {
  scopeType: 'subsidiary' | 'talent';
  scopeId: string;
  delegateType: 'user' | 'role';
  delegateId: string;
}

export interface CreateSystemRoleInput {
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  description?: string;
  isActive?: boolean;
  permissions?: SystemRolePermissionRecord[];
}

export interface UpdateSystemRoleInput {
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  description?: string;
  isActive?: boolean;
  permissions?: SystemRolePermissionRecord[];
}

type RequestEnvelopeFn = <T>(path: string, init?: RequestInit) => Promise<ApiSuccessEnvelope<T>>;

function buildQueryString(
  input: Record<string, string | number | boolean | null | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildJsonRequestInit(method: 'POST' | 'PATCH', body?: unknown): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

export async function listSystemUsers(
  requestEnvelope: RequestEnvelopeFn,
  options: ListSystemUsersOptions = {},
) : Promise<PaginatedResult<SystemUserListItem>> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const query = buildQueryString({
    page,
    pageSize,
    search: options.search,
    isActive: options.isActive,
  });

  const envelope = await requestEnvelope<SystemUserListItem[]>(`/api/v1/system-users${query}`);

  return {
    items: envelope.data,
    pagination: resolveApiPagination(envelope.meta, page, pageSize, envelope.data.length),
  };
}

export async function createSystemUser(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  input: CreateSystemUserInput,
) {
  return request<{
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    isActive: boolean;
    forceReset: boolean;
    createdAt: string;
  }>('/api/v1/system-users', buildJsonRequestInit('POST', input));
}

export async function readSystemUserDetail(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemUserId: string,
) {
  return request<SystemUserDetailResponse>(`/api/v1/system-users/${systemUserId}`);
}

export async function updateSystemUser(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemUserId: string,
  input: UpdateSystemUserInput,
) {
  return request<{
    id: string;
    displayName: string | null;
    phone: string | null;
    preferredLanguage: SupportedUiLocale;
    updatedAt: string;
  }>(`/api/v1/system-users/${systemUserId}`, buildJsonRequestInit('PATCH', input));
}

export async function deactivateSystemUser(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemUserId: string,
) {
  return request<{ id: string; isActive: boolean }>(
    `/api/v1/system-users/${systemUserId}/deactivate`,
    {
      method: 'POST',
    },
  );
}

export async function forceSystemUserTotp(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemUserId: string,
) {
  return request<{ message: string }>(
    `/api/v1/system-users/${systemUserId}/force-totp`,
    {
      method: 'POST',
    },
  );
}

export async function reactivateSystemUser(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemUserId: string,
) {
  return request<{ id: string; isActive: boolean }>(
    `/api/v1/system-users/${systemUserId}/reactivate`,
    {
      method: 'POST',
    },
  );
}

export async function createUserRoleAssignment(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemUserId: string,
  input: CreateUserRoleAssignmentInput,
) {
  return request<{
    id: string;
    userId: string;
    roleId: string;
    scopeType: 'tenant' | 'subsidiary' | 'talent';
    scopeId: string | null;
    inherit: boolean;
    grantedAt: string;
    snapshotUpdateQueued: boolean;
  }>(`/api/v1/users/${systemUserId}/roles`, buildJsonRequestInit('POST', input));
}

export async function updateUserRoleAssignment(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemUserId: string,
  assignmentId: string,
  input: UpdateUserRoleAssignmentInput,
) {
  return request<{
    id: string;
    inherit: boolean;
    expiresAt: string | null;
    snapshotUpdateQueued: boolean;
  }>(
    `/api/v1/users/${systemUserId}/roles/${assignmentId}`,
    buildJsonRequestInit('PATCH', input),
  );
}

export async function removeUserRoleAssignment(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemUserId: string,
  assignmentId: string,
) {
  return request<{ message: string; snapshotUpdateQueued: boolean }>(
    `/api/v1/users/${systemUserId}/roles/${assignmentId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function listSystemRoles(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  options: ListSystemRolesOptions = {},
) {
  const query = buildQueryString({
    isActive: options.isActive,
  });

  return request<SystemRoleListItem[]>(`/api/v1/system-roles${query}`);
}

export async function readSystemRoleDetail(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemRoleId: string,
) {
  return request<SystemRoleDetailResponse>(`/api/v1/system-roles/${systemRoleId}`);
}

export async function createSystemRole(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  input: CreateSystemRoleInput,
) {
  return request<SystemRoleListItem>('/api/v1/system-roles', buildJsonRequestInit('POST', input));
}

export async function updateSystemRole(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemRoleId: string,
  input: UpdateSystemRoleInput,
) {
  return request<SystemRoleListItem>(
    `/api/v1/system-roles/${systemRoleId}`,
    buildJsonRequestInit('PATCH', input),
  );
}

export async function removeSystemRole(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemRoleId: string,
) {
  return request<{ deleted: boolean }>(`/api/v1/system-roles/${systemRoleId}`, {
    method: 'DELETE',
  });
}

export async function listDelegatedAdmins(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
) {
  return request<DelegatedAdminListItem[]>('/api/v1/delegated-admins');
}

export async function createDelegatedAdmin(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  input: CreateDelegatedAdminInput,
) {
  return request<{
    id: string;
    scopeType: 'subsidiary' | 'talent';
    scopeId: string;
    scopeName: string;
    delegateType: 'user' | 'role';
    delegateId: string;
    delegateName: string;
    grantedAt: string;
  }>('/api/v1/delegated-admins', buildJsonRequestInit('POST', input));
}

export async function removeDelegatedAdmin(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  delegationId: string,
) {
  return request<{ message: string }>(`/api/v1/delegated-admins/${delegationId}`, {
    method: 'DELETE',
  });
}

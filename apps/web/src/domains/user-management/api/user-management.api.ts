import type { LocalizedText, SupportedUiLocale } from '@tcrn/shared';

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
  roleName: LocalizedText;
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

export interface RoleListItem {
  id: string;
  code: string;
  name: LocalizedText;
  localizedName: string;
  description: string | null;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface RolePermissionRecord {
  resource: string;
  action: string;
  effect: 'grant' | 'deny';
}

export interface RoleDetailResponse extends Omit<RoleListItem, 'permissionCount'> {
  permissions: RolePermissionRecord[];
  permissionCount: number;
  userCount: number;
  scopeBindings: RoleScopeBinding[];
  assignedUsers: RoleAssignedUser[];
}

export interface RoleScopeBinding {
  scopeType: 'tenant' | 'subsidiary' | 'talent';
  scopeId: string | null;
  scopeName: string | null;
  scopePath: string | null;
  assignmentCount: number;
  userCount: number;
  inheritedAssignmentCount: number;
}

export interface RoleAssignedUser {
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

export type SystemRoleListItem = RoleListItem;
export type SystemRolePermissionRecord = RolePermissionRecord;
export type SystemRoleDetailResponse = RoleDetailResponse;
export type SystemRoleScopeBinding = RoleScopeBinding;
export type SystemRoleAssignedUser = RoleAssignedUser;

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

export interface ListRolesOptions {
  search?: string;
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

export interface CheckCurrentUserPermissionInput {
  resource: string;
  action: string;
  scopeType?: 'tenant' | 'subsidiary' | 'talent';
  scopeId?: string | null;
}

export interface CreateDelegatedAdminInput {
  scopeType: 'subsidiary' | 'talent';
  scopeId: string;
  delegateType: 'user' | 'role';
  delegateId: string;
}

export interface CreateSystemRoleInput {
  code: string;
  name: LocalizedText;
  description?: string;
  permissions?: RolePermissionRecord[];
}

export interface UpdateSystemRoleInput {
  name?: LocalizedText;
  description?: string;
  permissions?: RolePermissionRecord[];
  version?: number;
}

export type CreateRoleInput = CreateSystemRoleInput;
export type UpdateRoleInput = UpdateSystemRoleInput;

type RequestEnvelopeFn = <T>(path: string, init?: RequestInit) => Promise<ApiSuccessEnvelope<T>>;

function buildQueryString(input: Record<string, string | number | boolean | null | undefined>) {
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

const ROLE_NAME_LOCALES: Array<keyof LocalizedText> = [
  'en',
  'zh_HANS',
  'zh_HANT',
  'ja',
  'ko',
  'fr',
];

type RawRolePermissionRecord = {
  resource?: string;
  resourceCode?: string;
  action: string;
  effect: 'grant' | 'deny';
};

type RawRoleListItem = Omit<RoleListItem, 'name' | 'localizedName' | 'updatedAt'> & {
  name: LocalizedText | string;
  localizedName?: string;
  updatedAt?: string;
};

type RawRoleDetailResponse = Omit<
  RoleDetailResponse,
  'name' | 'localizedName' | 'permissions'
> & {
  name: LocalizedText | string;
  nameTranslations?: LocalizedText;
  localizedName?: string;
  permissions: RawRolePermissionRecord[];
};

function normalizeRoleName(value: LocalizedText | string, fallback?: string): LocalizedText {
  if (typeof value !== 'string') {
    return value;
  }

  const text = value || fallback || '';
  return Object.fromEntries(ROLE_NAME_LOCALES.map((locale) => [locale, text])) as LocalizedText;
}

function normalizeRoleListItem(role: RawRoleListItem): RoleListItem {
  const localizedName =
    role.localizedName || (typeof role.name === 'string' ? role.name : role.name.en) || role.code;

  return {
    ...role,
    name: normalizeRoleName(role.name, localizedName),
    localizedName,
    updatedAt: role.updatedAt || role.createdAt,
  };
}

function normalizeRoleDetail(role: RawRoleDetailResponse): RoleDetailResponse {
  const localizedName =
    role.localizedName ||
    (typeof role.name === 'string' ? role.name : role.name.en) ||
    role.nameTranslations?.en ||
    role.code;
  const name = normalizeRoleName(role.nameTranslations || role.name, localizedName);

  return {
    ...role,
    name,
    localizedName,
    permissions: role.permissions.flatMap((permission) => {
      const resource = permission.resource || permission.resourceCode;

      if (!resource) {
        return [];
      }

      return [
        {
          resource,
          action: permission.action,
          effect: permission.effect,
        },
      ];
    }),
  };
}

export async function listSystemUsers(
  requestEnvelope: RequestEnvelopeFn,
  options: ListSystemUsersOptions = {}
): Promise<PaginatedResult<SystemUserListItem>> {
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
  input: CreateSystemUserInput
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
  systemUserId: string
) {
  return request<SystemUserDetailResponse>(`/api/v1/system-users/${systemUserId}`);
}

export async function updateSystemUser(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemUserId: string,
  input: UpdateSystemUserInput
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
  systemUserId: string
) {
  return request<{ id: string; isActive: boolean }>(
    `/api/v1/system-users/${systemUserId}/deactivate`,
    {
      method: 'POST',
    }
  );
}

export async function forceSystemUserTotp(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemUserId: string
) {
  return request<{ message: string }>(`/api/v1/system-users/${systemUserId}/force-totp`, {
    method: 'POST',
  });
}

export async function reactivateSystemUser(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemUserId: string
) {
  return request<{ id: string; isActive: boolean }>(
    `/api/v1/system-users/${systemUserId}/reactivate`,
    {
      method: 'POST',
    }
  );
}

export async function createUserRoleAssignment(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemUserId: string,
  input: CreateUserRoleAssignmentInput
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
  input: UpdateUserRoleAssignmentInput
) {
  return request<{
    id: string;
    inherit: boolean;
    expiresAt: string | null;
    snapshotUpdateQueued: boolean;
  }>(`/api/v1/users/${systemUserId}/roles/${assignmentId}`, buildJsonRequestInit('PATCH', input));
}

export async function removeUserRoleAssignment(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  systemUserId: string,
  assignmentId: string
) {
  return request<{ message: string; snapshotUpdateQueued: boolean }>(
    `/api/v1/users/${systemUserId}/roles/${assignmentId}`,
    {
      method: 'DELETE',
    }
  );
}

export async function checkCurrentUserPermission(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  input: CheckCurrentUserPermissionInput
) {
  const result = await request<{
    results: Array<{
      resource: string;
      action: string;
      checkedAction: string;
      allowed: boolean;
    }>;
  }>('/api/v1/permissions/check', buildJsonRequestInit('POST', { checks: [input] }));

  return result.results[0]?.allowed ?? false;
}

export async function listRoles(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  options: ListRolesOptions = {}
) {
  const query = buildQueryString({
    search: options.search,
  });

  const roles = await request<RawRoleListItem[]>(`/api/v1/roles${query}`);
  return roles.map(normalizeRoleListItem);
}

export async function readRoleDetail(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  roleId: string
) {
  const role = await request<RawRoleDetailResponse>(`/api/v1/roles/${roleId}`);
  return normalizeRoleDetail(role);
}

export async function createRole(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  input: CreateRoleInput
) {
  const role = await request<RawRoleListItem>('/api/v1/roles', buildJsonRequestInit('POST', input));
  return normalizeRoleListItem(role);
}

export async function updateRole(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  roleId: string,
  input: UpdateRoleInput
) {
  const role = await request<RawRoleListItem>(
    `/api/v1/roles/${roleId}`,
    buildJsonRequestInit('PATCH', input)
  );
  return normalizeRoleListItem(role);
}

export async function listDelegatedAdmins(
  request: <T>(path: string, init?: RequestInit) => Promise<T>
) {
  return request<DelegatedAdminListItem[]>('/api/v1/delegated-admins');
}

export async function createDelegatedAdmin(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  input: CreateDelegatedAdminInput
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
  delegationId: string
) {
  return request<{ message: string }>(`/api/v1/delegated-admins/${delegationId}`, {
    method: 'DELETE',
  });
}

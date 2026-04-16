// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ApiResponse } from '../core';

export interface AuthUserTenant {
  id: string;
  code?: string;
  name?: string;
  tier?: string;
  schemaName?: string;
}

export interface AuthUserRole {
  code: string;
  name?: string;
  isSystem?: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles?: AuthUserRole[];
  permissions?: string[];
  phone?: string;
  displayName?: string;
  avatarUrl?: string;
  preferredLanguage?: string;
  totpEnabled?: boolean;
  forceReset?: boolean;
  lastLoginAt?: string;
  passwordChangedAt?: string;
  passwordExpiresAt?: string;
  createdAt?: string;
  tenantCode?: string;
  tenant?: AuthUserTenant;
}

export interface ApiAuthUserRole {
  code: string;
  name?: string;
  isSystem?: boolean;
  is_system?: boolean;
}

export interface ApiAuthUser {
  id: string;
  username: string;
  email: string;
  roles?: ApiAuthUserRole[];
  permissions?: string[];
  phone?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  preferredLanguage?: string | null;
  totpEnabled?: boolean;
  forceReset?: boolean;
  lastLoginAt?: string | null;
  passwordChangedAt?: string | null;
  passwordExpiresAt?: string | null;
  createdAt?: string;
  tenant?: AuthUserTenant;
}

interface LegacyAuthUserRole {
  code: string;
  name?: string;
  isSystem?: boolean;
  is_system?: boolean;
}

interface LegacyAuthUser {
  id: string;
  username: string;
  email: string;
  roles?: LegacyAuthUserRole[];
  permissions?: string[];
  phone?: string;
  display_name?: string;
  avatar_url?: string;
  preferred_language?: string;
  is_totp_enabled?: boolean;
  force_reset?: boolean;
  last_login_at?: string;
  password_changed_at?: string;
  password_expires_at?: string;
  created_at?: string;
  tenant_code?: string;
  tenant?: AuthUserTenant;
}

export interface AuthUserTenantFallback {
  id?: string | null;
  code?: string | null;
  name?: string | null;
}

export interface AuthSessionData {
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  tenantId?: string;
  user?: AuthUser;
}

export interface LoginResponseData extends AuthSessionData {
  totpRequired?: boolean;
  passwordResetRequired?: boolean;
  reason?: string;
  sessionToken?: string;
}

export interface ApiAuthSessionData {
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  tenantId?: string;
  user?: ApiAuthUser;
}

export interface ApiLoginResponseData extends ApiAuthSessionData {
  totpRequired?: boolean;
  passwordResetRequired?: boolean;
  reason?: string;
  sessionToken?: string;
}

type AuthUserLike = AuthUser | LegacyAuthUser;

const toOptionalString = (
  value: string | null | undefined,
): string | undefined => (typeof value === 'string' ? value : undefined);

const normalizeAuthRoles = (
  roles?: Array<ApiAuthUserRole | LegacyAuthUserRole | AuthUserRole>,
): AuthUserRole[] | undefined =>
  roles?.map((role) => ({
    code: role.code,
    name: role.name,
    isSystem:
      role.isSystem ??
      ('is_system' in role ? role.is_system : undefined),
  }));

const resolveFallbackTenant = (
  fallback?: AuthUserTenantFallback,
): AuthUserTenant | undefined =>
  fallback?.id
    ? {
        id: fallback.id,
        code: fallback.code ?? undefined,
        name: fallback.name ?? undefined,
      }
    : undefined;

const resolveFallbackTenantCode = (
  fallback?: AuthUserTenantFallback,
): string | undefined => fallback?.code ?? undefined;

export const normalizeStoredAuthUser = (
  user: AuthUserLike | null | undefined,
  fallback?: AuthUserTenantFallback,
): AuthUser | undefined => {
  if (!user) {
    return undefined;
  }

  const maybeAuthUser = user as AuthUser;
  const fallbackTenant = resolveFallbackTenant(fallback);
  const maybeLegacyUser = user as LegacyAuthUser;
  const displayName =
    maybeAuthUser.displayName ??
    toOptionalString(maybeLegacyUser.display_name);
  const avatarUrl =
    maybeAuthUser.avatarUrl ?? toOptionalString(maybeLegacyUser.avatar_url);
  const preferredLanguage =
    maybeAuthUser.preferredLanguage ??
    toOptionalString(maybeLegacyUser.preferred_language);
  const totpEnabled =
    maybeAuthUser.totpEnabled ?? maybeLegacyUser.is_totp_enabled;
  const forceReset =
    maybeAuthUser.forceReset ?? maybeLegacyUser.force_reset;
  const lastLoginAt =
    maybeAuthUser.lastLoginAt ??
    toOptionalString(maybeLegacyUser.last_login_at);
  const passwordChangedAt =
    maybeAuthUser.passwordChangedAt ??
    toOptionalString(maybeLegacyUser.password_changed_at);
  const passwordExpiresAt =
    maybeAuthUser.passwordExpiresAt ??
    toOptionalString(maybeLegacyUser.password_expires_at);
  const createdAt =
    maybeAuthUser.createdAt ?? toOptionalString(maybeLegacyUser.created_at);
  const tenantCode =
    maybeAuthUser.tenantCode ??
    toOptionalString(maybeLegacyUser.tenant_code) ??
    user.tenant?.code ??
    resolveFallbackTenantCode(fallback);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: normalizeAuthRoles(user.roles),
    permissions: user.permissions,
    phone: toOptionalString(user.phone),
    displayName,
    avatarUrl,
    preferredLanguage,
    totpEnabled,
    forceReset,
    lastLoginAt,
    passwordChangedAt,
    passwordExpiresAt,
    createdAt,
    tenantCode,
    tenant: user.tenant ?? fallbackTenant,
  };
};

export const normalizeAuthUser = (
  user: ApiAuthUser | null | undefined,
  fallback?: AuthUserTenantFallback,
): AuthUser | undefined =>
  normalizeStoredAuthUser(
    user
      ? {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: normalizeAuthRoles(user.roles),
          permissions: user.permissions,
          phone: toOptionalString(user.phone),
          displayName: toOptionalString(user.displayName),
          avatarUrl: toOptionalString(user.avatarUrl),
          preferredLanguage: toOptionalString(user.preferredLanguage),
          totpEnabled: user.totpEnabled,
          forceReset: user.forceReset,
          lastLoginAt: toOptionalString(user.lastLoginAt),
          passwordChangedAt: toOptionalString(user.passwordChangedAt),
          passwordExpiresAt: toOptionalString(user.passwordExpiresAt),
          createdAt: toOptionalString(user.createdAt),
          tenantCode: user.tenant?.code ?? resolveFallbackTenantCode(fallback),
          tenant: user.tenant,
        }
      : undefined,
    fallback,
  );

export const normalizeRequiredAuthUser = (
  user: ApiAuthUser,
  fallback?: AuthUserTenantFallback,
): AuthUser => normalizeAuthUser(user, fallback) as AuthUser;

export const withTenantContext = (
  user: AuthUserLike,
  fallback?: AuthUserTenantFallback,
): AuthUser => {
  const normalizedUser = normalizeStoredAuthUser(user, fallback) as AuthUser;

  return {
    ...normalizedUser,
    tenantCode:
      normalizedUser.tenantCode ??
      resolveFallbackTenantCode(fallback),
    tenant: normalizedUser.tenant ?? resolveFallbackTenant(fallback),
  };
};

export const mergeAuthUserContext = (
  user: AuthUserLike,
  currentUser?: AuthUserLike | null,
  fallback?: AuthUserTenantFallback,
): AuthUser => {
  const normalizedUser = normalizeStoredAuthUser(user, fallback) as AuthUser;
  const normalizedCurrentUser = normalizeStoredAuthUser(currentUser, fallback);

  return {
    ...(normalizedCurrentUser ?? {}),
    ...normalizedUser,
    roles: normalizedUser.roles ?? normalizedCurrentUser?.roles,
    permissions: normalizedUser.permissions ?? normalizedCurrentUser?.permissions,
    tenantCode:
      normalizedUser.tenantCode ??
      normalizedCurrentUser?.tenantCode ??
      resolveFallbackTenantCode(fallback),
    tenant:
      normalizedUser.tenant ??
      normalizedCurrentUser?.tenant ??
      resolveFallbackTenant(fallback),
  };
};

export const normalizeApiResponseData = <TInput, TOutput>(
  response: ApiResponse<TInput>,
  normalize: (data: TInput) => TOutput,
): ApiResponse<TOutput> => {
  if (response.data === undefined) {
    return response as unknown as ApiResponse<TOutput>;
  }

  return {
    ...response,
    data: normalize(response.data),
  };
};

export const normalizeAuthSessionData = (
  data: ApiAuthSessionData,
  fallback?: AuthUserTenantFallback,
): AuthSessionData => ({
  accessToken: data.accessToken,
  tokenType: data.tokenType,
  expiresIn: data.expiresIn,
  tenantId: data.tenantId,
  user: data.user ? normalizeAuthUser(data.user, fallback) : undefined,
});

export const normalizeLoginResponseData = (
  data: ApiLoginResponseData,
  fallback?: AuthUserTenantFallback,
): LoginResponseData => ({
  ...normalizeAuthSessionData(data, fallback),
  totpRequired: data.totpRequired,
  passwordResetRequired: data.passwordResetRequired,
  reason: data.reason,
  sessionToken: data.sessionToken,
});

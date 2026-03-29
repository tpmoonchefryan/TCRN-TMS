// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ApiResponse } from '../core';

export interface AuthUserTenant {
  id: string;
  code?: string;
  name?: string;
  tier?: string;
  schemaName?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles?: Array<{ code: string; name?: string; is_system?: boolean }>;
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

export interface ApiAuthUser {
  id: string;
  username: string;
  email: string;
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

const toOptionalString = (value: string | null | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const normalizeAuthUser = (
  user: ApiAuthUser | null | undefined,
  fallback?: AuthUserTenantFallback
): AuthUser | undefined => {
  if (!user) {
    return undefined;
  }

  const fallbackTenant = fallback?.id
    ? {
        id: fallback.id,
        code: fallback.code ?? undefined,
        name: fallback.name ?? undefined,
      }
    : undefined;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: toOptionalString(user.phone),
    display_name: toOptionalString(user.displayName),
    avatar_url: toOptionalString(user.avatarUrl),
    preferred_language: toOptionalString(user.preferredLanguage),
    is_totp_enabled: user.totpEnabled,
    force_reset: user.forceReset,
    last_login_at: toOptionalString(user.lastLoginAt),
    password_changed_at: toOptionalString(user.passwordChangedAt),
    password_expires_at: toOptionalString(user.passwordExpiresAt),
    created_at: toOptionalString(user.createdAt),
    tenant_code: user.tenant?.code ?? fallback?.code ?? undefined,
    tenant: user.tenant ?? fallbackTenant,
  };
};

export const normalizeRequiredAuthUser = (
  user: ApiAuthUser,
  fallback?: AuthUserTenantFallback
): AuthUser => normalizeAuthUser(user, fallback) as AuthUser;

export const withTenantContext = (
  user: AuthUser,
  fallback?: AuthUserTenantFallback
): AuthUser => ({
  ...user,
  tenant_code: user.tenant_code ?? fallback?.code ?? undefined,
  tenant:
    user.tenant ??
    (fallback?.id
      ? {
          id: fallback.id,
          code: fallback.code ?? undefined,
          name: fallback.name ?? undefined,
        }
      : undefined),
});

export const mergeAuthUserContext = (
  user: AuthUser,
  currentUser?: AuthUser | null,
  fallback?: AuthUserTenantFallback
): AuthUser => ({
  ...(currentUser ?? {}),
  ...user,
  roles: user.roles ?? currentUser?.roles,
  permissions: user.permissions ?? currentUser?.permissions,
  tenant_code: user.tenant_code ?? currentUser?.tenant_code ?? fallback?.code ?? undefined,
  tenant:
    user.tenant ??
    currentUser?.tenant ??
    (fallback?.id
      ? {
          id: fallback.id,
          code: fallback.code ?? undefined,
          name: fallback.name ?? undefined,
        }
      : undefined),
});

export const normalizeApiResponseData = <TInput, TOutput>(
  response: ApiResponse<TInput>,
  normalize: (data: TInput) => TOutput
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
  fallback?: AuthUserTenantFallback
): AuthSessionData => ({
  accessToken: data.accessToken,
  tokenType: data.tokenType,
  expiresIn: data.expiresIn,
  tenantId: data.tenantId,
  user: data.user ? normalizeAuthUser(data.user, fallback) : undefined,
});

export const normalizeLoginResponseData = (
  data: ApiLoginResponseData,
  fallback?: AuthUserTenantFallback
): LoginResponseData => ({
  ...normalizeAuthSessionData(data, fallback),
  totpRequired: data.totpRequired,
  passwordResetRequired: data.passwordResetRequired,
  reason: data.reason,
  sessionToken: data.sessionToken,
});

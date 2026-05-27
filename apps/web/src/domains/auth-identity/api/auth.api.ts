import {
  type LoginInput,
  LoginSchema,
  normalizeSupportedUiLocale,
  type SupportedUiLocale,
} from '@tcrn/shared';

import type { OrganizationTreeResponse } from '@/domains/organization-access/api/organization.api';
import { readApiData, withBrowserPublicConsumerHeaders } from '@/platform/http/api';

export interface AuthTenantInfo {
  id: string;
  code?: string;
  name: string;
  tier: string;
  schemaName: string;
}

export interface AuthenticatedUserInfo {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  preferredLanguage: SupportedUiLocale;
  totpEnabled: boolean;
  forceReset: boolean;
  passwordExpiresAt: string | null;
  tenant: AuthTenantInfo;
}

export interface AuthenticatedSessionResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthenticatedUserInfo;
}

export type LoginFlowResult =
  | { kind: 'authenticated'; data: AuthenticatedSessionResult }
  | { kind: 'totp_required'; sessionToken: string; expiresIn: number }
  | { kind: 'password_reset_required'; sessionToken: string; expiresIn: number; reason: string };

export interface SsoProviderDiscovery {
  id: string;
  code: string;
  displayName: Record<string, string>;
  providerType: 'oidc';
  ownerScope: 'tenant_product' | 'ac_platform' | 'external_tool_readiness';
  enabled: boolean;
}

export interface StartSsoLoginResult {
  authorizationUrl: string;
  stateExpiresIn: number;
  provider: SsoProviderDiscovery;
}

export interface CurrentUserProfile {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  preferredLanguage: SupportedUiLocale;
  totpEnabled: boolean;
  forceReset: boolean;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  passwordExpiresAt: string | null;
  createdAt: string;
}

export interface CurrentTenantCapabilitySnapshot {
  tenantId: string;
  effective: {
    tenantId: string;
    scopeType: string;
    scopeId: string | null;
    enabledCapabilityCodes: string[];
    disabledReasons: Record<string, string>;
    registryVersion: string;
    resolvedAt: string;
  };
  registryVersion: string;
}

function normalizeUiLocaleOrDefault(input?: string | null): SupportedUiLocale {
  return normalizeSupportedUiLocale(input) ?? 'en';
}

function normalizeAuthenticatedSessionResult(
  result: AuthenticatedSessionResult
): AuthenticatedSessionResult {
  return {
    ...result,
    user: {
      ...result.user,
      preferredLanguage: normalizeUiLocaleOrDefault(result.user.preferredLanguage),
    },
  };
}

function normalizeCurrentUserProfile(profile: CurrentUserProfile): CurrentUserProfile {
  return {
    ...profile,
    preferredLanguage: normalizeUiLocaleOrDefault(profile.preferredLanguage),
  };
}

function mapLoginFlow(data: Record<string, unknown>): LoginFlowResult {
  if ('accessToken' in data && 'user' in data) {
    return {
      kind: 'authenticated',
      data: normalizeAuthenticatedSessionResult(data as unknown as AuthenticatedSessionResult),
    };
  }

  if (data.totpRequired === true && typeof data.sessionToken === 'string') {
    return {
      kind: 'totp_required',
      sessionToken: data.sessionToken,
      expiresIn: Number(data.expiresIn || 300),
    };
  }

  if (data.passwordResetRequired === true && typeof data.sessionToken === 'string') {
    return {
      kind: 'password_reset_required',
      sessionToken: data.sessionToken,
      expiresIn: Number(data.expiresIn || 300),
      reason: String(data.reason || 'PASSWORD_RESET_REQUIRED'),
    };
  }

  throw new Error('Unsupported login response');
}

export async function login(input: LoginInput): Promise<LoginFlowResult> {
  const parsed = LoginSchema.parse(input);
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(parsed),
  });

  const data = await readApiData<Record<string, unknown>>(response);
  return mapLoginFlow(data);
}

export async function listSsoProviders(tenantCode: string): Promise<SsoProviderDiscovery[]> {
  const params = new URLSearchParams({ tenantCode });
  const response = await fetch(`/api/v1/auth/sso/providers?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders(),
  });

  return readApiData<SsoProviderDiscovery[]>(response);
}

export async function startSsoLogin(input: {
  tenantCode: string;
  providerCode: string;
  next?: string | null;
}): Promise<StartSsoLoginResult> {
  const response = await fetch('/api/v1/auth/sso/start', {
    method: 'POST',
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(input),
  });

  return readApiData<StartSsoLoginResult>(response);
}

export async function exchangeSsoResult(result: string): Promise<AuthenticatedSessionResult> {
  const response = await fetch('/api/v1/auth/sso/exchange', {
    method: 'POST',
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ result }),
  });

  return normalizeAuthenticatedSessionResult(
    await readApiData<AuthenticatedSessionResult>(response)
  );
}

export async function verifyTotp(
  sessionToken: string,
  code: string
): Promise<AuthenticatedSessionResult> {
  const response = await fetch('/api/v1/auth/totp/verify', {
    method: 'POST',
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ sessionToken, code }),
  });

  return normalizeAuthenticatedSessionResult(
    await readApiData<AuthenticatedSessionResult>(response)
  );
}

export async function forceResetPassword(
  sessionToken: string,
  newPassword: string,
  newPasswordConfirm: string
): Promise<AuthenticatedSessionResult> {
  const response = await fetch('/api/v1/auth/password/reset', {
    method: 'POST',
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ sessionToken, newPassword, newPasswordConfirm }),
  });

  return normalizeAuthenticatedSessionResult(
    await readApiData<AuthenticatedSessionResult>(response)
  );
}

export async function refreshAccessToken(): Promise<
  Pick<AuthenticatedSessionResult, 'accessToken' | 'tokenType' | 'expiresIn'>
> {
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({}),
  });

  return readApiData<Pick<AuthenticatedSessionResult, 'accessToken' | 'tokenType' | 'expiresIn'>>(
    response
  );
}

export async function getCurrentUser(accessToken: string): Promise<CurrentUserProfile> {
  const response = await fetch('/api/v1/users/me', {
    method: 'GET',
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  return normalizeCurrentUserProfile(await readApiData<CurrentUserProfile>(response));
}

export async function getCurrentTenantCapabilities(
  accessToken: string
): Promise<CurrentTenantCapabilitySnapshot> {
  const response = await fetch('/api/v1/module-capabilities/effective', {
    method: 'GET',
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  return readApiData<CurrentTenantCapabilitySnapshot>(response);
}

export async function readPostLoginOrganizationTree(
  accessToken: string
): Promise<OrganizationTreeResponse> {
  const response = await fetch('/api/v1/organization/tree?includeInactive=false', {
    method: 'GET',
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  return readApiData<OrganizationTreeResponse>(response);
}

export async function logout(accessToken: string): Promise<void> {
  const response = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  await readApiData<{ message: string }>(response);
}

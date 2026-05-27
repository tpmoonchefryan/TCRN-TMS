import { normalizeSupportedUiLocale, type SupportedUiLocale } from '@tcrn/shared';

export type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export interface CurrentProfile {
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

export interface UpdateCurrentProfilePayload {
  displayName?: string | null;
  phone?: string | null;
  preferredLanguage?: SupportedUiLocale;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

export interface TotpSetupResponse {
  secret: string;
  qrCode?: string;
  otpauthUrl: string;
  issuer: string;
  account: string;
}

export interface TotpEnableResponse {
  enabled: boolean;
  enabledAt: string;
  recoveryCodes: string[];
  warning: string;
}

export interface TotpDisableResponse {
  enabled: boolean;
  disabledAt: string;
}

export interface RecoveryCodesResponse {
  recoveryCodes: string[];
  warning: string;
}

export interface UserSessionRecord {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface SsoAccountLinkRecord {
  id: string;
  providerId: string;
  providerCode: string;
  providerIssuer: string;
  email: string | null;
  displayName: string | null;
  linkedAt: string;
  lastLoginAt: string | null;
  revokedAt: string | null;
}

export interface SsoAccountLinkProviderRecord {
  id: string;
  code: string;
  displayName: Record<string, string>;
  providerType: 'oidc';
  ownerScope: 'tenant_product' | 'ac_platform' | 'external_tool_readiness';
  enabled: boolean;
}

export interface StartSsoAccountLinkResult {
  authorizationUrl: string;
  stateExpiresIn: number;
  provider: SsoAccountLinkProviderRecord;
}

export interface ExternalToolSsoReadinessRecord {
  toolCode: string;
  status: 'blocked' | 'ready' | 'not_applicable';
  requiredByPhase: string | null;
  providerId: string | null;
  failClosed: boolean;
  evidence: Record<string, unknown>;
  updatedAt: string;
}

function buildJsonRequestInit(method: 'POST' | 'PATCH', payload?: unknown): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload ?? {}),
  };
}

function normalizeProfileLocale(profile: CurrentProfile): CurrentProfile {
  return {
    ...profile,
    preferredLanguage: normalizeSupportedUiLocale(profile.preferredLanguage) ?? 'en',
  };
}

export async function readCurrentProfile(request: RequestFn) {
  return normalizeProfileLocale(await request<CurrentProfile>('/api/v1/users/me'));
}

export async function updateCurrentProfile(
  request: RequestFn,
  payload: UpdateCurrentProfilePayload
) {
  return normalizeProfileLocale(
    await request<CurrentProfile>('/api/v1/users/me', buildJsonRequestInit('PATCH', payload))
  );
}

export async function changeCurrentPassword(request: RequestFn, payload: ChangePasswordPayload) {
  return request<{ message: string; passwordExpiresAt: string }>(
    '/api/v1/users/me/password',
    buildJsonRequestInit('POST', payload)
  );
}

export async function setupTotp(request: RequestFn) {
  return request<TotpSetupResponse>('/api/v1/users/me/totp/setup', {
    method: 'POST',
  });
}

export async function enableTotp(request: RequestFn, code: string) {
  return request<TotpEnableResponse>(
    '/api/v1/users/me/totp/enable',
    buildJsonRequestInit('POST', { code })
  );
}

export async function disableTotp(request: RequestFn, password: string) {
  return request<TotpDisableResponse>(
    '/api/v1/users/me/totp/disable',
    buildJsonRequestInit('POST', { password })
  );
}

export async function regenerateRecoveryCodes(request: RequestFn, password: string) {
  return request<RecoveryCodesResponse>(
    '/api/v1/users/me/recovery-codes',
    buildJsonRequestInit('POST', { password })
  );
}

export async function listUserSessions(request: RequestFn) {
  return request<UserSessionRecord[]>('/api/v1/users/me/sessions');
}

export async function revokeUserSession(request: RequestFn, sessionId: string) {
  return request<{ message: string }>(`/api/v1/users/me/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

export async function listSsoAccountLinks(request: RequestFn) {
  return request<SsoAccountLinkRecord[]>('/api/v1/auth/sso/account-links');
}

export async function listSsoAccountLinkProviders(request: RequestFn) {
  return request<SsoAccountLinkProviderRecord[]>('/api/v1/auth/sso/account-link-providers');
}

export async function startSsoAccountLink(
  request: RequestFn,
  payload: { providerCode: string; next?: string | null }
) {
  return request<StartSsoAccountLinkResult>(
    '/api/v1/auth/sso/account-links/start',
    buildJsonRequestInit('POST', payload)
  );
}

export async function completeSsoAccountLink(request: RequestFn, result: string) {
  return request<SsoAccountLinkRecord>(
    '/api/v1/auth/sso/account-links/complete',
    buildJsonRequestInit('POST', { result })
  );
}

export async function revokeSsoAccountLink(request: RequestFn, linkId: string) {
  return request<{ revoked: boolean; revokedSessionCount: number }>(
    `/api/v1/auth/sso/account-links/${linkId}`,
    {
    method: 'DELETE',
    }
  );
}

export async function listExternalToolSsoReadiness(request: RequestFn) {
  return request<ExternalToolSsoReadinessRecord[]>('/api/v1/auth/sso/external-tools/readiness');
}

export async function uploadCurrentAvatar(request: RequestFn, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return request<{ avatarUrl: string; message: string }>('/api/v1/users/me/avatar', {
    method: 'POST',
    body: formData,
  });
}

export async function deleteCurrentAvatar(request: RequestFn) {
  return request<{ message: string }>('/api/v1/users/me/avatar', {
    method: 'DELETE',
  });
}

export async function requestEmailChange(request: RequestFn, newEmail: string) {
  return request<{ message: string }>(
    '/api/v1/users/me/email/request-change',
    buildJsonRequestInit('POST', { newEmail })
  );
}

export async function confirmEmailChange(request: RequestFn, token: string) {
  return request<{ message: string; email: string }>(
    '/api/v1/users/me/email/confirm',
    buildJsonRequestInit('POST', { token })
  );
}

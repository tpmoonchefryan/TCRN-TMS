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

export async function updateCurrentProfile(request: RequestFn, payload: UpdateCurrentProfilePayload) {
  return normalizeProfileLocale(
    await request<CurrentProfile>('/api/v1/users/me', buildJsonRequestInit('PATCH', payload)),
  );
}

export async function changeCurrentPassword(request: RequestFn, payload: ChangePasswordPayload) {
  return request<{ message: string; passwordExpiresAt: string }>('/api/v1/users/me/password', buildJsonRequestInit('POST', payload));
}

export async function setupTotp(request: RequestFn) {
  return request<TotpSetupResponse>('/api/v1/users/me/totp/setup', {
    method: 'POST',
  });
}

export async function enableTotp(request: RequestFn, code: string) {
  return request<TotpEnableResponse>('/api/v1/users/me/totp/enable', buildJsonRequestInit('POST', { code }));
}

export async function disableTotp(request: RequestFn, password: string) {
  return request<TotpDisableResponse>('/api/v1/users/me/totp/disable', buildJsonRequestInit('POST', { password }));
}

export async function regenerateRecoveryCodes(request: RequestFn, password: string) {
  return request<RecoveryCodesResponse>('/api/v1/users/me/recovery-codes', buildJsonRequestInit('POST', { password }));
}

export async function listUserSessions(request: RequestFn) {
  return request<UserSessionRecord[]>('/api/v1/users/me/sessions');
}

export async function revokeUserSession(request: RequestFn, sessionId: string) {
  return request<{ message: string }>(`/api/v1/users/me/sessions/${sessionId}`, {
    method: 'DELETE',
  });
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
  return request<{ message: string }>('/api/v1/users/me/email/request-change', buildJsonRequestInit('POST', { newEmail }));
}

export async function confirmEmailChange(request: RequestFn, token: string) {
  return request<{ message: string; email: string }>('/api/v1/users/me/email/confirm', buildJsonRequestInit('POST', { token }));
}

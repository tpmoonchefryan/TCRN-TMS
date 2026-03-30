// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { EffectivePermissionMap } from '@tcrn/shared';

import type { AuthUser } from '@/lib/api/modules/auth-user-contract';

import type { SessionBootstrapErrors, SessionBootstrapTaskResult } from './auth-session-bootstrap';

export type { AuthUser, LoginResponseData } from '@/lib/api/modules/auth-user-contract';

export interface PermissionScope {
  scopeType?: 'GLOBAL' | 'TENANT' | 'SUBSIDIARY' | 'TALENT';
  scopeId?: string;
}

export interface AuthLoginResult {
  success: boolean;
  totpRequired?: boolean;
  passwordResetRequired?: boolean;
  passwordResetReason?: string;
  sessionToken?: string;
}

export interface AuthState {
  user: AuthUser | null;
  tenantCode: string | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  isAcTenant: boolean;
  sessionBootstrapStatus: 'idle' | 'loading' | 'ready' | 'degraded';
  sessionBootstrapErrors: SessionBootstrapErrors | null;
  effectivePermissions: EffectivePermissionMap | null;
  currentScope: PermissionScope | null;
  isLoading: boolean;
  isRefreshing: boolean;
  sessionBootstrapPromise: Promise<void> | null;
  refreshPromise: Promise<boolean> | null;
  error: string | null;
  _hasHydrated: boolean;
  login: (
    login: string,
    password: string,
    tenantCode: string
  ) => Promise<AuthLoginResult>;
  verifyTotp: (sessionToken: string, code: string) => Promise<boolean>;
  resetPassword: (sessionToken: string, newPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
  setTenantCode: (code: string) => void;
  setHasHydrated: (state: boolean) => void;
  mergeCurrentUserProfile: (user: AuthUser) => void;
  setCurrentUserAvatar: (avatarUrl: string | null) => void;
  fetchAccessibleTalents: () => Promise<SessionBootstrapTaskResult>;
  fetchMyPermissions: (scope?: PermissionScope) => Promise<SessionBootstrapTaskResult>;
  bootstrapAuthenticatedSession: () => Promise<void>;
  clearPermissions: () => void;
}

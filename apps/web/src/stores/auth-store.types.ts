// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { EffectivePermissionMap, SystemUser } from '@tcrn/shared';

import type {
  SessionBootstrapErrors,
  SessionBootstrapTaskResult,
} from './auth-session-bootstrap';

export interface PermissionScope {
  scopeType?: 'GLOBAL' | 'TENANT' | 'SUBSIDIARY' | 'TALENT';
  scopeId?: string;
}

export interface AuthUser extends Partial<SystemUser> {
  roles?: Array<{ code: string; name?: string; is_system?: boolean }>;
  permissions?: string[];
  tenant_code?: string;
  tenant?: { id: string; code?: string; name?: string };
}

export interface LoginResponseData {
  accessToken?: string;
  expiresIn?: number;
  sessionToken?: string;
  passwordResetRequired?: boolean;
  totpRequired?: boolean;
  reason?: string;
  tenantId?: string;
  user?: AuthUser;
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
  ) => Promise<{
    success: boolean;
    totpRequired?: boolean;
    passwordResetRequired?: boolean;
    passwordResetReason?: string;
    sessionToken?: string;
  }>;
  verifyTotp: (sessionToken: string, code: string) => Promise<boolean>;
  resetPassword: (sessionToken: string, newPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
  setTenantCode: (code: string) => void;
  setHasHydrated: (state: boolean) => void;
  setUser: (user: AuthUser) => void;
  fetchAccessibleTalents: () => Promise<SessionBootstrapTaskResult>;
  fetchMyPermissions: (scope?: PermissionScope) => Promise<SessionBootstrapTaskResult>;
  bootstrapAuthenticatedSession: () => Promise<void>;
  clearPermissions: () => void;
}

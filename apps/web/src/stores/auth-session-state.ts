// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  type AuthUser,
  mergeAuthUserContext,
  withTenantContext,
} from '@/lib/api/modules/auth-user-contract';

import type { SessionBootstrapErrors } from './auth-session-bootstrap';

export interface AuthenticatedSessionState {
  user: AuthUser | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  isAcTenant: boolean;
  sessionBootstrapStatus: 'idle' | 'loading' | 'ready' | 'degraded';
  sessionBootstrapErrors: SessionBootstrapErrors | null;
}

export interface ClearedSessionState extends AuthenticatedSessionState {
  sessionBootstrapPromise: null;
  effectivePermissions: null;
  currentScope: null;
}

const isAcTenantCode = (tenantCode: string | null | undefined) =>
  tenantCode?.toUpperCase() === 'AC';

export const createAuthenticatedSessionState = (params: {
  user: AuthUser | null | undefined;
  tenantCode: string | null | undefined;
  tenantId?: string | null;
}): AuthenticatedSessionState => ({
  user: params.user ?? null,
  tenantId: params.user?.tenant?.id ?? params.tenantId ?? null,
  isAuthenticated: true,
  isAcTenant: isAcTenantCode(params.tenantCode),
  sessionBootstrapStatus: 'idle',
  sessionBootstrapErrors: null,
});

export const createClearedSessionState = (): ClearedSessionState => ({
  user: null,
  tenantId: null,
  isAuthenticated: false,
  isAcTenant: false,
  sessionBootstrapStatus: 'idle',
  sessionBootstrapErrors: null,
  sessionBootstrapPromise: null,
  effectivePermissions: null,
  currentScope: null,
});

export const mergeVerifiedAuthUser = (params: {
  currentUser?: AuthUser | null;
  tenantCode?: string | null;
  tenantId?: string | null;
  user: AuthUser;
}): AuthUser =>
  mergeAuthUserContext(
    withTenantContext(params.user, {
      id: params.user.tenant?.id ?? params.tenantId ?? params.currentUser?.tenant?.id ?? null,
      code: params.user.tenantCode ?? params.tenantCode ?? params.currentUser?.tenantCode ?? null,
      name: params.user.tenant?.name ?? params.currentUser?.tenant?.name ?? null,
    }),
    params.currentUser
  );

export const mergeCurrentUserProfile = (
  currentUser: AuthUser | null | undefined,
  profile: AuthUser
): AuthUser => mergeAuthUserContext(profile, currentUser);

export const updateCurrentUserAvatar = (
  currentUser: AuthUser | null | undefined,
  avatarUrl: string | null
): AuthUser | null =>
  currentUser
    ? {
        ...currentUser,
        avatarUrl: avatarUrl ?? undefined,
      }
    : null;

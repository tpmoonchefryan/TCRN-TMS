// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { apiClient } from '@/lib/api/core';

import { createAuthenticatedSessionState } from './auth-session-state';
import type { AuthUser } from './auth-store.types';

export interface AuthenticatedSessionTransitionInput {
  accessToken: string | null;
  user: AuthUser | null | undefined;
  tenantCode: string | null | undefined;
  tenantId?: string | null;
}

export const createPendingTenantAuthState = (tenantCode: string) => ({
  tenantCode,
  isAcTenant: tenantCode.toUpperCase() === 'AC',
  isLoading: false,
});

export const createAuthenticatedSessionTransition = (params: AuthenticatedSessionTransitionInput & {
  setAccessToken?: (token: string | null) => void;
}) => {
  const {
    accessToken,
    user,
    tenantCode,
    tenantId,
    setAccessToken = (token) => apiClient.setAccessToken(token),
  } = params;

  setAccessToken(accessToken);

  return {
    tenantCode: tenantCode ?? null,
    ...createAuthenticatedSessionState({
      user,
      tenantCode,
      tenantId,
    }),
    isLoading: false,
  };
};

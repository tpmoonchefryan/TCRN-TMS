// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { apiClient } from '@/lib/api/core';
import { authApi } from '@/lib/api/modules/auth';
import { userApi } from '@/lib/api/modules/user';

import { mergeVerifiedAuthUser } from './auth-session-state';
import type { AuthUser } from './auth-store.types';

export const SESSION_VERIFICATION_NETWORK_WARNING =
  'Session verification hit a network error; preserving current in-memory session';

export type SessionVerificationResult =
  | {
      status: 'verified';
      user: AuthUser;
      tenantId: string | null;
    }
  | {
      status: 'preserved';
      warning: string;
    }
  | {
      status: 'failed';
    };

const getApiErrorStatusCode = (error: unknown): number | null => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  ) {
    return (error as { statusCode: number }).statusCode;
  }

  return null;
};

export const verifyAuthenticatedSessionUser = async (params: {
  tenantCode: string | null;
  tenantId: string | null;
  currentUser: AuthUser | null;
  userClient?: Pick<typeof userApi, 'me'>;
}): Promise<SessionVerificationResult> => {
  const { tenantCode, tenantId: currentTenantId, currentUser, userClient = userApi } = params;

  try {
    const response = await userClient.me();

    if (response.success && response.data) {
      const tenantId = response.data.tenant?.id || currentTenantId;

      return {
        status: 'verified',
        user: mergeVerifiedAuthUser({
          user: response.data,
          tenantCode,
          tenantId,
          currentUser,
        }),
        tenantId,
      };
    }
  } catch (error) {
    if (getApiErrorStatusCode(error) === 0 && currentUser) {
      return {
        status: 'preserved',
        warning: SESSION_VERIFICATION_NETWORK_WARNING,
      };
    }
  }

  return { status: 'failed' };
};

export const refreshAccessTokenForSession = async (params: {
  tenantCode: string | null;
  authClient?: Pick<typeof authApi, 'refresh'>;
  setAccessToken?: (token: string | null) => void;
}): Promise<boolean> => {
  const {
    tenantCode,
    authClient = authApi,
    setAccessToken = (token) => apiClient.setAccessToken(token),
  } = params;

  try {
    const response = await authClient.refresh(tenantCode || undefined);

    if (response.success && response.data?.accessToken) {
      setAccessToken(response.data.accessToken);
      return true;
    }
  } catch {
    // Refresh failures are handled fail-closed by the caller.
  }

  setAccessToken(null);
  return false;
};

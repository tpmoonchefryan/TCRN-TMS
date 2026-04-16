// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { getThrownErrorMessage } from '@/lib/api/error-utils';
import { authApi } from '@/lib/api/modules/auth';

import type { AuthenticatedSessionTransitionInput } from './auth-session-transitions';
import type { AuthLoginResult } from './auth-store.types';

export const runLoginSessionCommand = async (params: {
  login: string;
  password: string;
  tenantCode: string;
  setPendingTenantAuth: (tenantCode: string) => void;
  completeAuthenticatedSession: (params: AuthenticatedSessionTransitionInput) => void;
  setFailure: (message: string) => void;
  authClient?: Pick<typeof authApi, 'login'>;
}): Promise<AuthLoginResult> => {
  const {
    login,
    password,
    tenantCode,
    setPendingTenantAuth,
    completeAuthenticatedSession,
    setFailure,
    authClient = authApi,
  } = params;

  try {
    const response = await authClient.login(login, password, tenantCode);

    if (response.success && response.data) {
      const data = response.data;

      if (data.passwordResetRequired) {
        setPendingTenantAuth(tenantCode);
        return {
          success: true,
          passwordResetRequired: true,
          passwordResetReason: data.reason,
          sessionToken: data.sessionToken,
        };
      }

      if (data.totpRequired) {
        setPendingTenantAuth(tenantCode);
        return {
          success: true,
          totpRequired: true,
          sessionToken: data.sessionToken,
        };
      }

      if (data.accessToken) {
        completeAuthenticatedSession({
          accessToken: data.accessToken,
          user: data.user,
          tenantCode,
          tenantId: data.tenantId,
        });
        return { success: true };
      }
    }

    setFailure(response.error?.message || 'Login failed');
    return { success: false };
  } catch (error) {
    setFailure(getThrownErrorMessage(error, 'Login failed'));
    return { success: false };
  }
};

export const runVerifyTotpSessionCommand = async (params: {
  sessionToken: string;
  code: string;
  tenantCode: string | null;
  completeAuthenticatedSession: (params: AuthenticatedSessionTransitionInput) => void;
  setFailure: (message: string) => void;
  authClient?: Pick<typeof authApi, 'verifyTotp'>;
}): Promise<boolean> => {
  const {
    sessionToken,
    code,
    tenantCode,
    completeAuthenticatedSession,
    setFailure,
    authClient = authApi,
  } = params;

  try {
    const response = await authClient.verifyTotp(sessionToken, code);

    if (response.success && response.data) {
      completeAuthenticatedSession({
        accessToken: response.data.accessToken || null,
        user: response.data.user,
        tenantCode,
        tenantId: response.data.tenantId,
      });
      return true;
    }

    setFailure(response.error?.message || 'Verification failed');
    return false;
  } catch (error) {
    setFailure(getThrownErrorMessage(error, 'Verification failed'));
    return false;
  }
};

export const runResetPasswordSessionCommand = async (params: {
  sessionToken: string;
  newPassword: string;
  tenantCode: string | null;
  completeAuthenticatedSession: (params: AuthenticatedSessionTransitionInput) => void;
  setFailure: (message: string) => void;
  authClient?: Pick<typeof authApi, 'resetPassword'>;
}): Promise<boolean> => {
  const {
    sessionToken,
    newPassword,
    tenantCode,
    completeAuthenticatedSession,
    setFailure,
    authClient = authApi,
  } = params;

  try {
    const response = await authClient.resetPassword(sessionToken, newPassword, newPassword);

    if (response.success && response.data?.accessToken) {
      completeAuthenticatedSession({
        accessToken: response.data.accessToken,
        user: response.data.user,
        tenantCode,
        tenantId: response.data.tenantId,
      });
      return true;
    }

    setFailure(response.error?.message || 'Password reset failed');
    return false;
  } catch (error) {
    setFailure(getThrownErrorMessage(error, 'Password reset failed'));
    return false;
  }
};

export const runLogoutSessionCommand = async (params: {
  clearAuthenticatedState: () => void;
  authClient?: Pick<typeof authApi, 'logout'>;
}): Promise<void> => {
  const { clearAuthenticatedState, authClient = authApi } = params;

  try {
    await authClient.logout();
  } catch {
    // Ignore logout errors and clear local session state anyway.
  }

  clearAuthenticatedState();
};

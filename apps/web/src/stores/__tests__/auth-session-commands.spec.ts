// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it, vi } from 'vitest';

import {
  runLoginSessionCommand,
  runLogoutSessionCommand,
  runResetPasswordSessionCommand,
  runVerifyTotpSessionCommand,
} from '../auth-session-commands';

describe('auth-session-commands', () => {
  it('marks tenant context as pending when login requires password reset', async () => {
    const setPendingTenantAuth = vi.fn();
    const completeAuthenticatedSession = vi.fn();
    const setFailure = vi.fn();

    await expect(
      runLoginSessionCommand({
        login: 'admin',
        password: 'password',
        tenantCode: 'tenant-a',
        setPendingTenantAuth,
        completeAuthenticatedSession,
        setFailure,
        authClient: {
          login: vi.fn().mockResolvedValue({
            success: true,
            data: {
              passwordResetRequired: true,
              reason: 'expired',
              sessionToken: 'session-token',
            },
          }),
        },
      })
    ).resolves.toEqual({
      success: true,
      passwordResetRequired: true,
      passwordResetReason: 'expired',
      sessionToken: 'session-token',
    });

    expect(setPendingTenantAuth).toHaveBeenCalledWith('tenant-a');
    expect(completeAuthenticatedSession).not.toHaveBeenCalled();
    expect(setFailure).not.toHaveBeenCalled();
  });

  it('completes the authenticated session when login succeeds', async () => {
    const completeAuthenticatedSession = vi.fn();

    await expect(
      runLoginSessionCommand({
        login: 'admin',
        password: 'password',
        tenantCode: 'tenant-a',
        setPendingTenantAuth: vi.fn(),
        completeAuthenticatedSession,
        setFailure: vi.fn(),
        authClient: {
          login: vi.fn().mockResolvedValue({
            success: true,
            data: {
              accessToken: 'access-token',
              tenantId: 'tenant-live',
              user: { id: 'user-1', username: 'admin', email: 'user@example.com' },
            },
          }),
        },
      })
    ).resolves.toEqual({ success: true });

    expect(completeAuthenticatedSession).toHaveBeenCalledWith({
      accessToken: 'access-token',
      tenantCode: 'tenant-a',
      tenantId: 'tenant-live',
      user: {
        id: 'user-1',
        username: 'admin',
        email: 'user@example.com',
      },
    });
  });

  it('surfaces plain-object API login errors through the provided failure callback', async () => {
    const setFailure = vi.fn();

    await expect(
      runLoginSessionCommand({
        login: 'admin',
        password: 'wrong-password',
        tenantCode: 'tenant-a',
        setPendingTenantAuth: vi.fn(),
        completeAuthenticatedSession: vi.fn(),
        setFailure,
        authClient: {
          login: vi.fn().mockRejectedValue({
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Invalid username or password',
            statusCode: 401,
          }),
        },
      })
    ).resolves.toEqual({ success: false });

    expect(setFailure).toHaveBeenCalledWith('Invalid username or password');
  });

  it('reports verification failures through the provided failure callback', async () => {
    const setFailure = vi.fn();

    await expect(
      runVerifyTotpSessionCommand({
        sessionToken: 'session-token',
        code: '123456',
        tenantCode: 'tenant-a',
        completeAuthenticatedSession: vi.fn(),
        setFailure,
        authClient: {
          verifyTotp: vi.fn().mockResolvedValue({
            success: false,
            error: { message: 'Verification failed from API' },
          }),
        },
      })
    ).resolves.toBe(false);

    expect(setFailure).toHaveBeenCalledWith('Verification failed from API');
  });

  it('fails password reset closed when no access token is returned', async () => {
    const completeAuthenticatedSession = vi.fn();
    const setFailure = vi.fn();

    await expect(
      runResetPasswordSessionCommand({
        sessionToken: 'session-token',
        newPassword: 'new-password',
        tenantCode: 'tenant-a',
        completeAuthenticatedSession,
        setFailure,
        authClient: {
          resetPassword: vi.fn().mockResolvedValue({
            success: true,
            data: {},
          }),
        },
      })
    ).resolves.toBe(false);

    expect(completeAuthenticatedSession).not.toHaveBeenCalled();
    expect(setFailure).toHaveBeenCalledWith('Password reset failed');
  });

  it('clears local authenticated state even when backend logout fails', async () => {
    const clearAuthenticatedState = vi.fn();

    await runLogoutSessionCommand({
      clearAuthenticatedState,
      authClient: {
        logout: vi.fn().mockRejectedValue(new Error('network down')),
      },
    });

    expect(clearAuthenticatedState).toHaveBeenCalledTimes(1);
  });
});

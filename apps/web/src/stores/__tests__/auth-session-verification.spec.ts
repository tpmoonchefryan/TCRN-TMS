// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it, vi } from 'vitest';

import {
  refreshAccessTokenForSession,
  SESSION_VERIFICATION_NETWORK_WARNING,
  verifyAuthenticatedSessionUser,
} from '../auth-session-verification';
import type { AuthUser } from '../auth-store.types';

const createUser = (tenantId: string): AuthUser => ({
  id: 'user-1',
  username: 'admin',
  email: 'user@example.com',
  tenant: {
    id: tenantId,
    code: 'TENANT_A',
    name: 'Tenant A',
  },
});

describe('auth-session-verification', () => {
  it('verifies the current session user and preserves existing auth context', async () => {
    const currentUser: AuthUser = {
      ...createUser('tenant-cached'),
      roles: [{ code: 'TENANT_ADMIN' }],
      permissions: ['customer.profile:read'],
    };

    const result = await verifyAuthenticatedSessionUser({
      tenantCode: 'TENANT_A',
      tenantId: 'tenant-live',
      currentUser,
      userClient: {
        me: vi.fn().mockResolvedValue({
          success: true,
          data: createUser('tenant-live'),
        }),
      },
    });

    expect(result).toEqual({
      status: 'verified',
      tenantId: 'tenant-live',
      user: expect.objectContaining({
        id: 'user-1',
        roles: [{ code: 'TENANT_ADMIN' }],
        permissions: ['customer.profile:read'],
      }),
    });
  });

  it('preserves the in-memory session on network-only verification failures', async () => {
    const result = await verifyAuthenticatedSessionUser({
      tenantCode: 'TENANT_A',
      tenantId: 'tenant-cached',
      currentUser: createUser('tenant-cached'),
      userClient: {
        me: vi.fn().mockRejectedValue({ statusCode: 0 }),
      },
    });

    expect(result).toEqual({
      status: 'preserved',
      warning: SESSION_VERIFICATION_NETWORK_WARNING,
    });
  });

  it('stores a refreshed access token when refresh succeeds', async () => {
    const setAccessToken = vi.fn();

    await expect(
      refreshAccessTokenForSession({
        tenantCode: 'TENANT_A',
        setAccessToken,
        authClient: {
          refresh: vi.fn().mockResolvedValue({
            success: true,
            data: { accessToken: 'fresh-token' },
          }),
        },
      })
    ).resolves.toBe(true);

    expect(setAccessToken).toHaveBeenCalledWith('fresh-token');
  });

  it('clears the access token when refresh cannot obtain a new one', async () => {
    const setAccessToken = vi.fn();

    await expect(
      refreshAccessTokenForSession({
        tenantCode: 'TENANT_A',
        setAccessToken,
        authClient: {
          refresh: vi.fn().mockResolvedValue({
            success: true,
            data: {},
          }),
        },
      })
    ).resolves.toBe(false);

    expect(setAccessToken).toHaveBeenCalledWith(null);
  });
});

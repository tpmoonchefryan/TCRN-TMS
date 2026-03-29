// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '@/lib/api/modules/auth';

const mockPost = vi.fn();

vi.mock('@/lib/api/core', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes login success users into the store-facing auth user shape', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: {
        accessToken: 'access-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: {
          id: 'user-1',
          username: 'admin',
          email: 'admin@example.com',
          displayName: 'System Admin',
          avatarUrl: 'https://example.com/avatar.png',
          preferredLanguage: 'ja',
          totpEnabled: true,
          forceReset: false,
          passwordExpiresAt: '2026-04-01T00:00:00.000Z',
          tenant: {
            id: 'tenant-1',
            name: 'Tenant One',
            tier: 'enterprise',
            schemaName: 'tenant_one',
          },
        },
      },
    });

    const response = await authApi.login('admin', 'secret', 'AC');

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      { login: 'admin', password: 'secret', tenantCode: 'AC' },
      { 'X-Tenant-ID': 'AC' }
    );
    expect(response.data).toEqual({
      accessToken: 'access-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      tenantId: undefined,
      totpRequired: undefined,
      passwordResetRequired: undefined,
      reason: undefined,
      sessionToken: undefined,
      user: {
        id: 'user-1',
        username: 'admin',
        email: 'admin@example.com',
        display_name: 'System Admin',
        avatar_url: 'https://example.com/avatar.png',
        preferred_language: 'ja',
        is_totp_enabled: true,
        force_reset: false,
        password_expires_at: '2026-04-01T00:00:00.000Z',
        tenant_code: 'AC',
        tenant: {
          id: 'tenant-1',
          name: 'Tenant One',
          tier: 'enterprise',
          schemaName: 'tenant_one',
        },
      },
    });
  });

  it('preserves login step-up responses without forcing a user payload', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: {
        totpRequired: true,
        sessionToken: 'sess-1',
        expiresIn: 300,
      },
    });

    const response = await authApi.login('admin', 'secret', 'tenant-a');

    expect(response.data).toEqual({
      accessToken: undefined,
      tokenType: undefined,
      expiresIn: 300,
      tenantId: undefined,
      user: undefined,
      totpRequired: true,
      passwordResetRequired: undefined,
      reason: undefined,
      sessionToken: 'sess-1',
    });
  });

  it('normalizes totp and force-reset completion payloads', async () => {
    mockPost
      .mockResolvedValueOnce({
        success: true,
        data: {
          accessToken: 'totp-token',
          expiresIn: 900,
          user: {
            id: 'user-1',
            username: 'admin',
            email: 'admin@example.com',
            displayName: 'Admin',
            tenant: {
              id: 'tenant-1',
              name: 'Tenant One',
            },
          },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          accessToken: 'reset-token',
          expiresIn: 900,
          user: {
            id: 'user-1',
            username: 'admin',
            email: 'admin@example.com',
            displayName: 'Admin',
            tenant: {
              id: 'tenant-1',
              name: 'Tenant One',
            },
          },
        },
      });

    const totpResponse = await authApi.verifyTotp('sess-1', '123456');
    const resetResponse = await authApi.resetPassword('sess-2', 'NewPassword123!', 'NewPassword123!');

    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/v1/auth/totp/verify', {
      sessionToken: 'sess-1',
      code: '123456',
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/v1/auth/password/reset', {
      sessionToken: 'sess-2',
      newPassword: 'NewPassword123!',
      newPasswordConfirm: 'NewPassword123!',
    });
    expect(totpResponse.data?.user).toMatchObject({
      display_name: 'Admin',
      tenant: { id: 'tenant-1', name: 'Tenant One' },
    });
    expect(resetResponse.data?.user).toMatchObject({
      display_name: 'Admin',
      tenant: { id: 'tenant-1', name: 'Tenant One' },
    });
  });
});

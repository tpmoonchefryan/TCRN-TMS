import { BROWSER_PUBLIC_CONSUMER_CODE, BROWSER_PUBLIC_CONSUMER_HEADER } from '@tcrn/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCurrentUser, login, logout, refreshAccessToken } from './auth.api';

function buildFetchResponse(data: unknown) {
  return {
    ok: true,
    json: async () => ({
      success: true,
      data,
    }),
  };
}

describe('auth api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps a success login envelope into an authenticated flow', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        buildFetchResponse({
          accessToken: 'token',
          tokenType: 'Bearer',
          expiresIn: 900,
          user: {
            id: 'user-1',
            username: 'admin',
            email: 'admin@example.com',
            displayName: 'Admin',
            avatarUrl: null,
            preferredLanguage: 'en',
            totpEnabled: false,
            forceReset: false,
            passwordExpiresAt: null,
            tenant: {
              id: 'tenant-1',
              name: 'Tenant',
              tier: 'standard',
              schemaName: 'tenant_demo',
            },
          },
        }),
      ),
    );

    const result = await login({
      tenantCode: 'AC',
      login: 'admin@example.com',
      password: '123456789012',
      rememberMe: true,
    });

    expect(result.kind).toBe('authenticated');
    if (result.kind === 'authenticated') {
      expect(result.data.user.tenant.id).toBe('tenant-1');
      expect(result.data.accessToken).toBe('token');
    }

    const headers = new Headers((vi.mocked(fetch).mock.calls[0] ?? [])[1]?.headers);
    expect(headers.get(BROWSER_PUBLIC_CONSUMER_HEADER)).toBe(BROWSER_PUBLIC_CONSUMER_CODE);
  });

  it('maps a TOTP-required login envelope into the totp branch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        buildFetchResponse({
          totpRequired: true,
          sessionToken: 'totp-session',
          expiresIn: 300,
        }),
      ),
    );

    const result = await login({
      tenantCode: 'AC',
      login: 'admin@example.com',
      password: '123456789012',
      rememberMe: true,
    });

    expect(result).toEqual({
      kind: 'totp_required',
      sessionToken: 'totp-session',
      expiresIn: 300,
    });
  });

  it('maps a force-reset login envelope into the password reset branch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        buildFetchResponse({
          passwordResetRequired: true,
          sessionToken: 'reset-session',
          expiresIn: 300,
          reason: 'PASSWORD_RESET_REQUIRED',
        }),
      ),
    );

    const result = await login({
      tenantCode: 'AC',
      login: 'admin@example.com',
      password: '123456789012',
      rememberMe: true,
    });

    expect(result).toEqual({
      kind: 'password_reset_required',
      sessionToken: 'reset-session',
      expiresIn: 300,
      reason: 'PASSWORD_RESET_REQUIRED',
    });
  });

  it('requests refresh tokens with same-origin credentials', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      buildFetchResponse({
        accessToken: 'refreshed',
        tokenType: 'Bearer',
        expiresIn: 900,
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const refreshed = await refreshAccessToken();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
    const headers = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
    expect(headers.get(BROWSER_PUBLIC_CONSUMER_HEADER)).toBe(BROWSER_PUBLIC_CONSUMER_CODE);
    expect(refreshed.accessToken).toBe('refreshed');
  });

  it('sends the public consumer code when reading the current user profile', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      buildFetchResponse({
        id: 'user-1',
        username: 'admin',
        email: 'admin@example.com',
        phone: null,
        displayName: 'Admin',
        avatarUrl: null,
        preferredLanguage: 'en',
        totpEnabled: false,
        forceReset: false,
        lastLoginAt: null,
        passwordChangedAt: null,
        passwordExpiresAt: null,
        createdAt: '2026-04-20T00:00:00.000Z',
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    await getCurrentUser('access-token');

    const headers = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer access-token');
    expect(headers.get(BROWSER_PUBLIC_CONSUMER_HEADER)).toBe(BROWSER_PUBLIC_CONSUMER_CODE);
  });

  it('sends the logout request with bearer auth and same-origin credentials', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      buildFetchResponse({
        message: 'Logged out',
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    await logout('access-token');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
    const headers = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer access-token');
    expect(headers.get(BROWSER_PUBLIC_CONSUMER_HEADER)).toBe(BROWSER_PUBLIC_CONSUMER_CODE);
  });
});

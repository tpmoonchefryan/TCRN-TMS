// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api/core';

import { useAuthStore } from '../auth-store';
import type { AuthUser } from '../auth-store.types';

const mockRunSessionBootstrap = vi.hoisted(() => vi.fn());

vi.mock('../auth-session-bootstrap', () => ({
  runSessionBootstrap: mockRunSessionBootstrap,
}));

const initialState = useAuthStore.getState();

const readyBootstrapResult = {
  status: 'ready' as const,
  tasks: {
    talents: { success: true },
    permissions: { success: true },
  },
  errors: null,
};

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const userFromApi = (tenantId: string): AuthUser => ({
  id: 'user-1',
  username: 'admin',
  email: 'user@example.com',
  tenant: {
    id: tenantId,
    code: 'TENANT_A',
    name: 'Tenant A',
  },
});

describe('useAuthStore checkAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    apiClient.setAccessToken(null);
    useAuthStore.setState(initialState, true);
    mockRunSessionBootstrap.mockReset();
    mockRunSessionBootstrap.mockResolvedValue(readyBootstrapResult);
  });

  afterEach(() => {
    apiClient.setAccessToken(null);
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('verifies the in-memory token with /users/me before trusting the session', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      createJsonResponse({
        success: true,
        data: userFromApi('tenant-live'),
      })
    );

    const refreshSpy = vi.fn().mockResolvedValue(false);

    apiClient.setAccessToken('access-token');
    useAuthStore.setState({
      refreshSession: refreshSpy,
      tenantId: null,
      user: {
        ...userFromApi('tenant-cached'),
        roles: [{ code: 'TENANT_ADMIN' }],
        permissions: ['customer.profile:read'],
      },
    });

    await expect(useAuthStore.getState().checkAuth()).resolves.toBe(true);

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().tenantId).toBe('tenant-live');
    expect(useAuthStore.getState().user).toMatchObject({
      id: 'user-1',
      roles: [{ code: 'TENANT_ADMIN' }],
      permissions: ['customer.profile:read'],
    });
    expect(mockRunSessionBootstrap).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/users/me',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('preserves an existing in-memory session on network verification failure', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('offline'));
    const refreshSpy = vi.fn().mockResolvedValue(false);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    apiClient.setAccessToken('access-token');
    useAuthStore.setState({
      user: userFromApi('tenant-cached'),
      tenantId: 'tenant-cached',
      isAuthenticated: true,
      refreshSession: refreshSpy,
    });

    await expect(useAuthStore.getState().checkAuth()).resolves.toBe(true);

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      'Session verification hit a network error; preserving current in-memory session'
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().tenantId).toBe('tenant-cached');
    expect(useAuthStore.getState().user).toMatchObject({ id: 'user-1' });
    expect(mockRunSessionBootstrap).toHaveBeenCalledTimes(1);
  });

  it('refreshes the session and rehydrates the user when no access token is present', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: { accessToken: 'fresh-token' },
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: userFromApi('tenant-refreshed'),
        })
      );

    useAuthStore.setState({
      tenantCode: 'tenant-a',
      tenantId: 'tenant-stale',
      user: null,
      isAuthenticated: false,
    });

    await expect(useAuthStore.getState().checkAuth()).resolves.toBe(true);

    expect(apiClient.getAccessToken()).toBe('fresh-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().tenantId).toBe('tenant-refreshed');
    expect(useAuthStore.getState().user).toMatchObject({ id: 'user-1' });
    expect(mockRunSessionBootstrap).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4000/api/v1/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'tenant-a',
        }),
      })
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'http://localhost:4000/api/v1/users/me',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-token',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('fails closed when refresh cannot obtain a new access token', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(createJsonResponse({ success: true, data: {} }));

    useAuthStore.setState({
      tenantCode: 'tenant-a',
      user: userFromApi('tenant-stale'),
      tenantId: 'tenant-stale',
      isAuthenticated: true,
      isAcTenant: true,
      effectivePermissions: { 'customer.read': 'grant' },
      currentScope: { scopeType: 'TENANT', scopeId: 'tenant-stale' },
    });

    await expect(useAuthStore.getState().checkAuth()).resolves.toBe(false);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(apiClient.getAccessToken()).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().tenantId).toBeNull();
    expect(useAuthStore.getState().isAcTenant).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().effectivePermissions).toBeNull();
    expect(useAuthStore.getState().currentScope).toBeNull();
    expect(mockRunSessionBootstrap).not.toHaveBeenCalled();
  });

  it('merges profile updates without dropping auth context fields', () => {
    useAuthStore.setState({
      user: {
        ...userFromApi('tenant-cached'),
        display_name: 'Old Name',
        roles: [{ code: 'TENANT_ADMIN' }],
        permissions: ['customer.profile:read'],
      },
      tenantId: 'tenant-cached',
      isAuthenticated: true,
    });

    useAuthStore.getState().mergeCurrentUserProfile({
      id: 'user-1',
      username: 'admin',
      email: 'updated@example.com',
      display_name: 'Updated Name',
    });

    expect(useAuthStore.getState().user).toMatchObject({
      id: 'user-1',
      email: 'updated@example.com',
      display_name: 'Updated Name',
      roles: [{ code: 'TENANT_ADMIN' }],
      permissions: ['customer.profile:read'],
      tenant: {
        id: 'tenant-cached',
        code: 'TENANT_A',
      },
    });
  });

  it('updates the current avatar without replacing the full auth user object', () => {
    useAuthStore.setState({
      user: {
        ...userFromApi('tenant-cached'),
        avatar_url: 'https://example.com/old-avatar.png',
        roles: [{ code: 'TENANT_ADMIN' }],
      },
    });

    useAuthStore.getState().setCurrentUserAvatar(null);

    expect(useAuthStore.getState().user).toMatchObject({
      id: 'user-1',
      roles: [{ code: 'TENANT_ADMIN' }],
      tenant: {
        id: 'tenant-cached',
        code: 'TENANT_A',
      },
    });
    expect(useAuthStore.getState().user?.avatar_url).toBeUndefined();
  });
});

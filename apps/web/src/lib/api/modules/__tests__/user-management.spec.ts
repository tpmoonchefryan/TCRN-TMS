// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  authExtApi,
  systemRoleApi,
  systemUserApi,
} from '@/lib/api/modules/user-management';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api/core', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('userManagementApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the real system-user read routes and does not expose removed fake helpers', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });

    await systemUserApi.list({
      search: 'admin',
      isActive: true,
      isTotpEnabled: false,
      page: 2,
      pageSize: 50,
      sort: '-createdAt',
    });
    await systemUserApi.get('user-1');
    await systemUserApi.getScopeAccess('user-1');

    expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v1/system-users', {
      search: 'admin',
      isActive: true,
      isTotpEnabled: false,
      page: 2,
      pageSize: 50,
      sort: '-createdAt',
    });
    expect(mockGet).toHaveBeenNthCalledWith(2, '/api/v1/system-users/user-1');
    expect(mockGet).toHaveBeenNthCalledWith(3, '/api/v1/system-users/user-1/scope-access');
    expect('disableTotp' in systemUserApi).toBe(false);
    expect('setPasswordExpiry' in systemUserApi).toBe(false);
  });

  it('uses the real system-user mutation routes including force-totp and scope-access', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'user-1' } });
    mockPatch.mockResolvedValue({ success: true, data: { id: 'user-1' } });

    await systemUserApi.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'VeryStrongPassword123!',
      displayName: 'Admin',
      forceReset: true,
    });
    await systemUserApi.update('user-1', {
      displayName: 'Updated Admin',
      phone: '+81-90-0000-0000',
      preferredLanguage: 'ja',
    });
    await systemUserApi.resetPassword('user-1', { forceReset: true });
    await systemUserApi.deactivate('user-1');
    await systemUserApi.reactivate('user-1');
    await systemUserApi.forceTotp('user-1');
    await systemUserApi.setScopeAccess('user-1', [
      { scopeType: 'tenant', includeSubunits: true },
      { scopeType: 'subsidiary', scopeId: 'sub-1', includeSubunits: false },
    ]);

    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/v1/system-users', {
      username: 'admin',
      email: 'admin@example.com',
      password: 'VeryStrongPassword123!',
      displayName: 'Admin',
      forceReset: true,
    });
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/system-users/user-1', {
      displayName: 'Updated Admin',
      phone: '+81-90-0000-0000',
      preferredLanguage: 'ja',
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/v1/system-users/user-1/reset-password', {
      forceReset: true,
    });
    expect(mockPost).toHaveBeenNthCalledWith(3, '/api/v1/system-users/user-1/deactivate', {});
    expect(mockPost).toHaveBeenNthCalledWith(4, '/api/v1/system-users/user-1/reactivate', {});
    expect(mockPost).toHaveBeenNthCalledWith(5, '/api/v1/system-users/user-1/force-totp', {});
    expect(mockPost).toHaveBeenNthCalledWith(6, '/api/v1/system-users/user-1/scope-access', {
      accesses: [
        { scopeType: 'tenant', includeSubunits: true },
        { scopeType: 'subsidiary', scopeId: 'sub-1', includeSubunits: false },
      ],
    });
  });

  it('keeps the adjacent auth and system-role helpers on their real routes', async () => {
    mockPost.mockResolvedValue({ success: true, data: {} });
    mockDelete.mockResolvedValue({ success: true, data: { deleted: true } });

    await authExtApi.verifyRecoveryCode('session-1', 'recovery-1');
    await authExtApi.logoutAll();
    await systemRoleApi.delete('role-1');

    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/v1/auth/recovery-code/verify', {
      sessionToken: 'session-1',
      recoveryCode: 'recovery-1',
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/v1/auth/logout-all', {});
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/system-roles/role-1');
  });
});

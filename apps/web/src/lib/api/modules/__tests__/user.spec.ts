// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { userApi } from '@/lib/api/modules/user';

const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api/core', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('userApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes current-user and profile update payloads into store-facing fields', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        id: 'user-1',
        username: 'admin',
        email: 'admin@example.com',
        phone: '+81-90-0000-0000',
        displayName: 'System Admin',
        avatarUrl: 'https://example.com/avatar.png',
        preferredLanguage: 'zh',
        totpEnabled: true,
        forceReset: false,
        lastLoginAt: '2026-03-29T10:00:00.000Z',
        passwordChangedAt: '2026-03-01T00:00:00.000Z',
        passwordExpiresAt: '2026-06-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
    mockPatch.mockResolvedValue({
      success: true,
      data: {
        id: 'user-1',
        username: 'admin',
        email: 'admin@example.com',
        displayName: 'Updated Admin',
        preferredLanguage: 'ja',
      },
    });

    const meResponse = await userApi.me();
    const updateResponse = await userApi.updateProfile({ displayName: 'Updated Admin' });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/users/me');
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/users/me', {
      displayName: 'Updated Admin',
    });
    expect(meResponse.data).toEqual({
      id: 'user-1',
      username: 'admin',
      email: 'admin@example.com',
      phone: '+81-90-0000-0000',
      displayName: 'System Admin',
      avatarUrl: 'https://example.com/avatar.png',
      preferredLanguage: 'zh',
      totpEnabled: true,
      forceReset: false,
      lastLoginAt: '2026-03-29T10:00:00.000Z',
      passwordChangedAt: '2026-03-01T00:00:00.000Z',
      passwordExpiresAt: '2026-06-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      tenantCode: undefined,
      tenant: undefined,
    });
    expect(updateResponse.data).toMatchObject({
      displayName: 'Updated Admin',
      preferredLanguage: 'ja',
    });
  });

  it('uploads avatars through the current me avatar endpoint and preserves response metadata', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            avatarUrl: 'https://example.com/avatar.png',
            message: 'Avatar uploaded successfully',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const result = await userApi.uploadAvatar(file);

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/users/me/avatar', {
      method: 'POST',
      body: expect.any(FormData),
      credentials: 'include',
    });
    expect(result).toEqual({
      success: true,
      data: {
        avatarUrl: 'https://example.com/avatar.png',
        message: 'Avatar uploaded successfully',
      },
      error: undefined,
      message: undefined,
    });
  });

  it('uses the current me mutation endpoints for avatar, password, and email flows', async () => {
    mockDelete.mockResolvedValue({ success: true, data: { message: 'Avatar deleted successfully' } });
    mockPost
      .mockResolvedValueOnce({
        success: true,
        data: {
          message: 'Password changed successfully',
          passwordExpiresAt: '2026-06-01T00:00:00.000Z',
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          message: 'Verification email sent to new address',
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          message: 'Email changed successfully',
          email: 'new@example.com',
        },
      });

    await userApi.deleteAvatar();
    await userApi.changePassword({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      newPasswordConfirm: 'NewPassword123!',
    });
    await userApi.requestEmailChange('new@example.com');
    await userApi.confirmEmailChange('token-1');

    expect(mockDelete).toHaveBeenCalledWith('/api/v1/users/me/avatar');
    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/v1/users/me/password', {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      newPasswordConfirm: 'NewPassword123!',
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/v1/users/me/email/request-change', {
      newEmail: 'new@example.com',
    });
    expect(mockPost).toHaveBeenNthCalledWith(3, '/api/v1/users/me/email/confirm', {
      token: 'token-1',
    });
  });
});

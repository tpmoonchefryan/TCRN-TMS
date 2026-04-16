// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentUserProfile } from '@/hooks/use-current-user-profile';

const mockUseAuthStore = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('@/lib/api/modules/user', () => ({
  userApi: {
    updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  },
}));

describe('useCurrentUserProfile', () => {
  const mergeCurrentUserProfile = vi.fn();
  const setCurrentUserAvatar = vi.fn();
  let authState = {
    user: {
      id: 'user-1',
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Original Name',
    },
    mergeCurrentUserProfile,
    setCurrentUserAvatar,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      user: {
        id: 'user-1',
        username: 'admin',
        email: 'admin@example.com',
        displayName: 'Original Name',
      },
      mergeCurrentUserProfile,
      setCurrentUserAvatar,
    };
    mockUseAuthStore.mockImplementation(() => authState);
  });

  it('keeps display name in sync with the current auth user', () => {
    const { result, rerender } = renderHook(() => useCurrentUserProfile());

    expect(result.current.displayName).toBe('Original Name');

    authState = {
      ...authState,
      user: {
        ...authState.user,
        displayName: 'Updated From Store',
      },
    };
    mockUseAuthStore.mockImplementation(() => authState);

    rerender();

    expect(result.current.displayName).toBe('Updated From Store');
  });

  it('saves the profile and merges the normalized response back into auth state', async () => {
    mockUpdateProfile.mockResolvedValue({
      success: true,
      data: {
        id: 'user-1',
        username: 'admin',
        email: 'updated@example.com',
        displayName: 'Updated Name',
      },
    });

    const { result } = renderHook(() => useCurrentUserProfile());

    act(() => {
      result.current.setDisplayName('Updated Name');
    });

    let saveResult: Awaited<ReturnType<typeof result.current.saveProfile>> | undefined;

    await act(async () => {
      saveResult = await result.current.saveProfile();
    });

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      displayName: 'Updated Name',
    });
    expect(mergeCurrentUserProfile).toHaveBeenCalledWith({
      id: 'user-1',
      username: 'admin',
      email: 'updated@example.com',
      displayName: 'Updated Name',
    });
    expect(saveResult).toEqual({ success: true });
    expect(result.current.isSaving).toBe(false);
  });

  it('returns normalized API errors and proxies avatar updates to auth state', async () => {
    mockUpdateProfile.mockResolvedValue({
      success: false,
      error: {
        message: 'Profile write denied',
      },
    });

    const { result } = renderHook(() => useCurrentUserProfile());

    let saveResult: Awaited<ReturnType<typeof result.current.saveProfile>> | undefined;

    await act(async () => {
      saveResult = await result.current.saveProfile();
    });

    expect(saveResult).toEqual({
      success: false,
      error: 'Profile write denied',
    });

    act(() => {
      result.current.updateAvatar('https://example.com/avatar.png');
    });

    expect(setCurrentUserAvatar).toHaveBeenCalledWith('https://example.com/avatar.png');
  });
});

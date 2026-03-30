// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentUserSecurity } from '@/hooks/use-current-user-security';

const mockUseAuthStore = vi.fn();
const mockChangePassword = vi.fn();
const mockRequestEmailChange = vi.fn();

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('@/lib/api/modules/user', () => ({
  userApi: {
    changePassword: (...args: unknown[]) => mockChangePassword(...args),
    requestEmailChange: (...args: unknown[]) => mockRequestEmailChange(...args),
  },
}));

const messages = {
  allFieldsRequired: 'All fields are required',
  passwordMismatch: 'Passwords do not match',
  passwordTooShort: 'Password must be at least 12 characters',
  passwordChangeFailed: 'Failed to change password',
  invalidEmail: 'Invalid email format',
  emailSameAsCurrent: 'New email must be different from current email',
  emailChangeFailed: 'Failed to request email change',
};

describe('useCurrentUserSecurity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'user-1',
        username: 'admin',
        email: 'admin@example.com',
      },
    });
  });

  it('fails closed on password mismatch without calling the password endpoint', async () => {
    const { result } = renderHook(() => useCurrentUserSecurity(messages));

    act(() => {
      result.current.openPasswordDialog();
      result.current.setCurrentPassword('CurrentPassword123!');
      result.current.setNewPassword('NewPassword123!');
      result.current.setConfirmPassword('MismatchPassword123!');
    });

    let actionResult: Awaited<ReturnType<typeof result.current.changePassword>> | undefined;

    await act(async () => {
      actionResult = await result.current.changePassword();
    });

    expect(mockChangePassword).not.toHaveBeenCalled();
    expect(actionResult).toEqual({
      success: false,
      error: messages.passwordMismatch,
    });
    expect(result.current.passwordError).toBe(messages.passwordMismatch);
  });

  it('changes the password and closes the dialog on success', async () => {
    mockChangePassword.mockResolvedValue({
      success: true,
    });

    const { result } = renderHook(() => useCurrentUserSecurity(messages));

    act(() => {
      result.current.openPasswordDialog();
      result.current.setCurrentPassword('CurrentPassword123!');
      result.current.setNewPassword('NewPassword123!');
      result.current.setConfirmPassword('NewPassword123!');
    });

    let actionResult: Awaited<ReturnType<typeof result.current.changePassword>> | undefined;

    await act(async () => {
      actionResult = await result.current.changePassword();
    });

    expect(mockChangePassword).toHaveBeenCalledWith({
      currentPassword: 'CurrentPassword123!',
      newPassword: 'NewPassword123!',
      newPasswordConfirm: 'NewPassword123!',
    });
    expect(actionResult).toEqual({ success: true });
    expect(result.current.showPasswordDialog).toBe(false);
    expect(result.current.currentPassword).toBe('');
  });

  it('prevents requesting an email change to the current email address', async () => {
    const { result } = renderHook(() => useCurrentUserSecurity(messages));

    act(() => {
      result.current.openEmailDialog();
      result.current.setNewEmail('admin@example.com');
    });

    let actionResult: Awaited<ReturnType<typeof result.current.requestEmailChange>> | undefined;

    await act(async () => {
      actionResult = await result.current.requestEmailChange();
    });

    expect(mockRequestEmailChange).not.toHaveBeenCalled();
    expect(actionResult).toEqual({
      success: false,
      error: messages.emailSameAsCurrent,
    });
    expect(result.current.emailError).toBe(messages.emailSameAsCurrent);
  });
});

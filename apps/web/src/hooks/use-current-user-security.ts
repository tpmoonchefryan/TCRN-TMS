// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { useState } from 'react';

import { getApiResponseMessage, getThrownErrorMessage } from '@/lib/api/error-utils';
import { userApi } from '@/lib/api/modules/user';
import { useAuthStore } from '@/stores/auth-store';

export interface CurrentUserSecurityMessages {
  allFieldsRequired: string;
  passwordMismatch: string;
  passwordTooShort: string;
  passwordChangeFailed: string;
  invalidEmail: string;
  emailSameAsCurrent: string;
  emailChangeFailed: string;
}

export interface CurrentUserSecurityActionResult {
  success: boolean;
  error?: string;
}

export function useCurrentUserSecurity(messages: CurrentUserSecurityMessages) {
  const { user } = useAuthStore();

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const resetPasswordDialog = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const openPasswordDialog = () => {
    resetPasswordDialog();
    setShowPasswordDialog(true);
  };

  const closePasswordDialog = (open: boolean) => {
    if (!open) {
      resetPasswordDialog();
    }

    setShowPasswordDialog(open);
  };

  const changePassword = async (): Promise<CurrentUserSecurityActionResult> => {
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(messages.allFieldsRequired);
      return { success: false, error: messages.allFieldsRequired };
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(messages.passwordMismatch);
      return { success: false, error: messages.passwordMismatch };
    }

    if (newPassword.length < 12) {
      setPasswordError(messages.passwordTooShort);
      return { success: false, error: messages.passwordTooShort };
    }

    setIsChangingPassword(true);

    try {
      const response = await userApi.changePassword({
        currentPassword,
        newPassword,
        newPasswordConfirm: confirmPassword,
      });

      if (response.success) {
        closePasswordDialog(false);
        return { success: true };
      }

      const error = getApiResponseMessage(response, messages.passwordChangeFailed);
      setPasswordError(error);
      return { success: false, error };
    } catch (error) {
      const message = getThrownErrorMessage(error, messages.passwordChangeFailed);
      setPasswordError(message);
      return { success: false, error: message };
    } finally {
      setIsChangingPassword(false);
    }
  };

  const resetEmailDialog = () => {
    setNewEmail('');
    setEmailError('');
    setEmailSent(false);
  };

  const openEmailDialog = () => {
    resetEmailDialog();
    setShowEmailDialog(true);
  };

  const closeEmailDialog = (open: boolean) => {
    if (!open) {
      resetEmailDialog();
    }

    setShowEmailDialog(open);
  };

  const requestEmailChange = async (): Promise<CurrentUserSecurityActionResult> => {
    setEmailError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      setEmailError(messages.invalidEmail);
      return { success: false, error: messages.invalidEmail };
    }

    if (newEmail === user?.email) {
      setEmailError(messages.emailSameAsCurrent);
      return { success: false, error: messages.emailSameAsCurrent };
    }

    setIsChangingEmail(true);

    try {
      const response = await userApi.requestEmailChange(newEmail);

      if (response.success) {
        setEmailSent(true);
        return { success: true };
      }

      const error = getApiResponseMessage(response, messages.emailChangeFailed);
      setEmailError(error);
      return { success: false, error };
    } catch (error) {
      const message = getThrownErrorMessage(error, messages.emailChangeFailed);
      setEmailError(message);
      return { success: false, error: message };
    } finally {
      setIsChangingEmail(false);
    }
  };

  return {
    user,
    showPasswordDialog,
    currentPassword,
    newPassword,
    confirmPassword,
    isChangingPassword,
    passwordError,
    showEmailDialog,
    newEmail,
    isChangingEmail,
    emailError,
    emailSent,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    setNewEmail,
    openPasswordDialog,
    closePasswordDialog,
    changePassword,
    openEmailDialog,
    closeEmailDialog,
    requestEmailChange,
  };
}

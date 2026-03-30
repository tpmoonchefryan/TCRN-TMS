// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { useEffect, useState } from 'react';

import { getApiResponseMessage, getThrownErrorMessage } from '@/lib/api/error-utils';
import { userApi } from '@/lib/api/modules/user';
import { useAuthStore } from '@/stores/auth-store';

export interface SaveCurrentUserProfileResult {
  success: boolean;
  error?: string;
}

export function useCurrentUserProfile() {
  const { user, mergeCurrentUserProfile, setCurrentUserAvatar } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDisplayName(user?.display_name || '');
  }, [user]);

  const saveProfile = async (): Promise<SaveCurrentUserProfileResult> => {
    setIsSaving(true);

    try {
      const response = await userApi.updateProfile({ displayName });

      if (response.success && response.data) {
        mergeCurrentUserProfile(response.data);
        return { success: true };
      }

      return {
        success: false,
        error: getApiResponseMessage(response, 'Failed to save profile'),
      };
    } catch (error) {
      return {
        success: false,
        error: getThrownErrorMessage(error, 'Failed to save profile'),
      };
    } finally {
      setIsSaving(false);
    }
  };

  const updateAvatar = (avatarUrl: string | null) => {
    setCurrentUserAvatar(avatarUrl);
  };

  return {
    user,
    displayName,
    isSaving,
    setDisplayName,
    saveProfile,
    updateAvatar,
  };
}

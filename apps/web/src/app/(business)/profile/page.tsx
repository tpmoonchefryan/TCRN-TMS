// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { CurrentUserProfileContent } from '@/components/auth/current-user-profile-content';
import { CurrentUserSecuritySettings } from '@/components/auth/current-user-security-settings';

export default function ProfilePage() {
  return (
    <CurrentUserProfileContent>
      <CurrentUserSecuritySettings />
    </CurrentUserProfileContent>
  );
}

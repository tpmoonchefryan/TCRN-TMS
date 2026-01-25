// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Mail, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AvatarUpload } from '@/components/ui/avatar-upload';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { userApi } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

export default function AdminProfilePage() {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const { user, setUser } = useAuthStore();
  
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await userApi.updateProfile({ displayName });
      if (response.success && response.data) {
        setUser({
          ...user!,
          display_name: displayName,
        });
        toast.success(t('saveSuccess'));
      }
    } catch (error) {
      toast.error(t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (avatarUrl: string | null) => {
    if (user) {
      setUser({
        ...user,
        avatar_url: avatarUrl ?? undefined,
      });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Avatar Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('avatar')}</CardTitle>
          <CardDescription>{t('avatarDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            currentAvatarUrl={user.avatar_url}
            email={user.email}
            displayName={user.display_name || user.username}
            onAvatarChange={handleAvatarChange}
          />
        </CardContent>
      </Card>

      {/* Profile Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('accountInfo')}</CardTitle>
          <CardDescription>{t('accountInfoDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Username (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('username')}
            </Label>
            <Input
              id="username"
              value={user.username}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">{t('usernameHint')}</p>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('email')}
            </Label>
            <Input
              id="email"
              value={user.email}
              disabled
              className="bg-muted"
            />
          </div>

          <Separator />

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">{t('displayName')}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('displayNamePlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('displayNameHint')}</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? tCommon('saving') : tCommon('save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

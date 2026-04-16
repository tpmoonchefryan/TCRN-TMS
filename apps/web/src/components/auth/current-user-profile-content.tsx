// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Mail, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { AvatarUpload } from '@/components/ui/avatar-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCurrentUserProfile } from '@/hooks/use-current-user-profile';

interface CurrentUserProfileContentProps {
  children?: ReactNode;
}

export function CurrentUserProfileContent({ children }: CurrentUserProfileContentProps) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const { user, displayName, isSaving, setDisplayName, saveProfile, updateAvatar } =
    useCurrentUserProfile();

  if (!user) {
    return null;
  }

  const handleSaveProfile = async () => {
    const result = await saveProfile();

    if (result.success) {
      toast.success(t('saveSuccess'));
      return;
    }

    toast.error(result.error || t('saveFailed'));
  };

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('avatar')}</CardTitle>
          <CardDescription>{t('avatarDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            currentAvatarUrl={user.avatarUrl}
            email={user.email}
            displayName={user.displayName || user.username}
            onAvatarChange={updateAvatar}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('accountInfo')}</CardTitle>
          <CardDescription>{t('accountInfoDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('username')}
            </Label>
            <Input id="username" value={user.username} disabled className="bg-muted" />
            <p className="text-muted-foreground text-xs">{t('usernameHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('email')}
            </Label>
            <Input id="email" value={user.email} disabled className="bg-muted" />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="displayName">{t('displayName')}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t('displayNamePlaceholder')}
            />
            <p className="text-muted-foreground text-xs">{t('displayNameHint')}</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? tCommon('saving') : tCommon('save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {children}
    </div>
  );
}

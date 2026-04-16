// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Key, Loader2, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCurrentUserSecurity } from '@/hooks/use-current-user-security';

export function CurrentUserSecuritySettings() {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const tPlaceholders = useTranslations('forms.placeholders');
  const {
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
  } = useCurrentUserSecurity({
    allFieldsRequired: t('allFieldsRequired'),
    passwordMismatch: t('passwordMismatch'),
    passwordTooShort: t('passwordTooShort'),
    passwordChangeFailed: t('passwordChangeFailed'),
    invalidEmail: t('invalidEmail'),
    emailSameAsCurrent: t('emailSameAsCurrent'),
    emailChangeFailed: t('emailChangeFailed'),
  });

  if (!user) {
    return null;
  }

  const handleChangePassword = async () => {
    const result = await changePassword();

    if (result.success) {
      toast.success(t('passwordChanged'));
    }
  };

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('security')}</CardTitle>
          <CardDescription>
            {t('securityDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                <Key className="text-primary h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{t('password')}</p>
                <p className="text-muted-foreground text-sm">
                  {t('passwordHint')}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={openPasswordDialog}>
              {t('changePassword')}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                <Mail className="text-primary h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{t('emailAddress')}</p>
                <p className="text-muted-foreground text-sm">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={openEmailDialog}>
              {t('changeEmail')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPasswordDialog} onOpenChange={closePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changePassword')}</DialogTitle>
            <DialogDescription>
              {t('changePasswordDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
              />
              <p className="text-muted-foreground text-xs">
                {t('passwordRequirements')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>
            {passwordError && <p className="text-destructive text-sm">{passwordError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => closePasswordDialog(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('changePassword')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmailDialog} onOpenChange={closeEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changeEmail')}</DialogTitle>
            <DialogDescription>
              {t('changeEmailDescription')}
            </DialogDescription>
          </DialogHeader>
          {emailSent ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium">
                {t('emailVerificationSent')}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {t('emailVerificationSentDescription')}
              </p>
              <Button className="mt-4" onClick={() => closeEmailDialog(false)}>
                {tCommon('close')}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="currentEmail">{t('currentEmail')}</Label>
                  <Input
                    id="currentEmail"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newEmail">{t('newEmail')}</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={tPlaceholders('newEmail')}
                  />
                </div>
                {emailError && <p className="text-destructive text-sm">{emailError}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => closeEmailDialog(false)}>
                  {tCommon('cancel')}
                </Button>
                <Button onClick={requestEmailChange} disabled={isChangingEmail}>
                  {isChangingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('sendVerification')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

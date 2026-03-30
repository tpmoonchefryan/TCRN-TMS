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
    allFieldsRequired: t('allFieldsRequired') || 'All fields are required',
    passwordMismatch: t('passwordMismatch') || 'Passwords do not match',
    passwordTooShort: t('passwordTooShort') || 'Password must be at least 12 characters',
    passwordChangeFailed: t('passwordChangeFailed') || 'Failed to change password',
    invalidEmail: t('invalidEmail') || 'Invalid email format',
    emailSameAsCurrent: t('emailSameAsCurrent') || 'New email must be different from current email',
    emailChangeFailed: t('emailChangeFailed') || 'Failed to request email change',
  });

  if (!user) {
    return null;
  }

  const handleChangePassword = async () => {
    const result = await changePassword();

    if (result.success) {
      toast.success(t('passwordChanged') || 'Password changed successfully');
    }
  };

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('security') || 'Security'}</CardTitle>
          <CardDescription>
            {t('securityDescription') || 'Manage your account security settings'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                <Key className="text-primary h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{t('password') || 'Password'}</p>
                <p className="text-muted-foreground text-sm">
                  {t('passwordHint') || 'Keep your account secure by using a strong password'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={openPasswordDialog}>
              {t('changePassword') || 'Change Password'}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                <Mail className="text-primary h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{t('emailAddress') || 'Email Address'}</p>
                <p className="text-muted-foreground text-sm">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={openEmailDialog}>
              {t('changeEmail') || 'Change Email'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPasswordDialog} onOpenChange={closePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changePassword') || 'Change Password'}</DialogTitle>
            <DialogDescription>
              {t('changePasswordDescription') || 'Enter your current password and choose a new one'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('currentPassword') || 'Current Password'}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('newPassword') || 'New Password'}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
              />
              <p className="text-muted-foreground text-xs">
                {t('passwordRequirements') ||
                  'At least 12 characters with uppercase, lowercase, number, and special character'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword') || 'Confirm Password'}</Label>
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
              {t('changePassword') || 'Change Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmailDialog} onOpenChange={closeEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changeEmail') || 'Change Email'}</DialogTitle>
            <DialogDescription>
              {t('changeEmailDescription') ||
                'Enter your new email address. We will send a verification link to confirm the change.'}
            </DialogDescription>
          </DialogHeader>
          {emailSent ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium">
                {t('emailVerificationSent') || 'Verification Email Sent'}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {t('emailVerificationSentDescription') ||
                  'Please check your new email inbox and click the verification link to complete the change.'}
              </p>
              <Button className="mt-4" onClick={() => closeEmailDialog(false)}>
                {tCommon('close') || 'Close'}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="currentEmail">{t('currentEmail') || 'Current Email'}</Label>
                  <Input
                    id="currentEmail"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newEmail">{t('newEmail') || 'New Email'}</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="your.new.email@example.com"
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
                  {t('sendVerification') || 'Send Verification'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

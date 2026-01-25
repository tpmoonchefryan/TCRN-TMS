// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Key, Loader2, Mail, User } from 'lucide-react';
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
import { userApi } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const { user, setUser } = useAuthStore();
  
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // Email change state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
    }
  }, [user]);
  
  // Password change handler
  const handleChangePassword = async () => {
    setPasswordError('');
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('allFieldsRequired') || 'All fields are required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordMismatch') || 'Passwords do not match');
      return;
    }
    
    if (newPassword.length < 12) {
      setPasswordError(t('passwordTooShort') || 'Password must be at least 12 characters');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const response = await userApi.changePassword({
        currentPassword,
        newPassword,
        newPasswordConfirm: confirmPassword,
      });
      
      if (response.success) {
        toast.success(t('passwordChanged') || 'Password changed successfully');
        setShowPasswordDialog(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(response.message || t('passwordChangeFailed') || 'Failed to change password');
      }
    } catch (error: any) {
      setPasswordError(error?.message || t('passwordChangeFailed') || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  const resetPasswordDialog = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };
  
  // Email change handler
  const handleRequestEmailChange = async () => {
    setEmailError('');
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      setEmailError(t('invalidEmail') || 'Invalid email format');
      return;
    }
    
    if (newEmail === user?.email) {
      setEmailError(t('emailSameAsCurrent') || 'New email must be different from current email');
      return;
    }
    
    setIsChangingEmail(true);
    try {
      const response = await userApi.requestEmailChange(newEmail);
      
      if (response.success) {
        setEmailSent(true);
      } else {
        setEmailError(response.message || t('emailChangeFailed') || 'Failed to request email change');
      }
    } catch (error: any) {
      setEmailError(error?.message || t('emailChangeFailed') || 'Failed to request email change');
    } finally {
      setIsChangingEmail(false);
    }
  };
  
  const resetEmailDialog = () => {
    setNewEmail('');
    setEmailError('');
    setEmailSent(false);
  };

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

      {/* Security Settings Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('security') || 'Security'}</CardTitle>
          <CardDescription>{t('securityDescription') || 'Manage your account security settings'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{t('password') || 'Password'}</p>
                <p className="text-sm text-muted-foreground">
                  {t('passwordHint') || 'Keep your account secure by using a strong password'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                resetPasswordDialog();
                setShowPasswordDialog(true);
              }}
            >
              {t('changePassword') || 'Change Password'}
            </Button>
          </div>

          <Separator />

          {/* Email */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{t('emailAddress') || 'Email Address'}</p>
                <p className="text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                resetEmailDialog();
                setShowEmailDialog(true);
              }}
            >
              {t('changeEmail') || 'Change Email'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
        if (!open) resetPasswordDialog();
        setShowPasswordDialog(open);
      }}>
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
              <p className="text-xs text-muted-foreground">
                {t('passwordRequirements') || 'At least 12 characters with uppercase, lowercase, number, and special character'}
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
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('changePassword') || 'Change Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Change Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={(open) => {
        if (!open) resetEmailDialog();
        setShowEmailDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changeEmail') || 'Change Email'}</DialogTitle>
            <DialogDescription>
              {t('changeEmailDescription') || 'Enter your new email address. We will send a verification link to confirm the change.'}
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
              <p className="mt-2 text-sm text-muted-foreground">
                {t('emailVerificationSentDescription') || 'Please check your new email inbox and click the verification link to complete the change.'}
              </p>
              <Button className="mt-4" onClick={() => setShowEmailDialog(false)}>
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
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                  {tCommon('cancel')}
                </Button>
                <Button onClick={handleRequestEmailChange} disabled={isChangingEmail}>
                  {isChangingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('sendVerification') || 'Send Verification'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

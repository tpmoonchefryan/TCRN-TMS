/* eslint-disable no-useless-escape, import/order */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { AlertTriangle, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';


export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword, isLoading, error, clearError } = useAuthStore();

  const sessionToken = searchParams.get('token');
  const reason = searchParams.get('reason');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  // Redirect if no token
  useEffect(() => {
    if (!sessionToken) {
      router.push('/login');
    }
  }, [sessionToken, router]);

  // Validate password in real-time
  useEffect(() => {
    const errors: string[] = [];
    if (newPassword.length > 0) {
      if (newPassword.length < 12) {
        errors.push(t('validation.minLength'));
      }
      if (!/[A-Z]/.test(newPassword)) {
        errors.push(t('validation.uppercase'));
      }
      if (!/[a-z]/.test(newPassword)) {
        errors.push(t('validation.lowercase'));
      }
      if (!/\d/.test(newPassword)) {
        errors.push(t('validation.number'));
      }
      if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword)) {
        errors.push(t('validation.specialChar'));
      }
    }
    setPasswordErrors(errors);
  }, [newPassword, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (newPassword !== confirmPassword) {
      return;
    }

    if (passwordErrors.length > 0) {
      return;
    }

    if (!sessionToken) {
      return;
    }

    const result = await resetPassword(sessionToken, newPassword);
    if (result) {
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
  };

  const getReasonMessage = () => {
    switch (reason) {
      case 'ADMIN_REQUIRED':
        return t('reason.adminRequired');
      case 'PASSWORD_EXPIRED':
        return t('reason.passwordExpired');
      default:
        return t('reason.default');
    }
  };

  const passwordMatch = newPassword === confirmPassword;
  const isValid = passwordErrors.length === 0 && passwordMatch && newPassword.length >= 12;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-md shadow-medium border-white/50 animate-fade-in">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">{t('success.title')}</h2>
            <p className="text-slate-500">{t('success.redirecting')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md bg-white/80 backdrop-blur-md shadow-medium border-white/50 animate-fade-in z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 text-yellow-400 fill-yellow-400 animate-pulse" size={24} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            {t('title')}
          </CardTitle>
          <CardDescription className="text-slate-500">
            {getReasonMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-slate-600 font-medium">
                {t('newPassword.label')}
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder={t('newPassword.placeholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="new-password"
                className="bg-white/50 focus:bg-white transition-all border-slate-200"
              />
              {newPassword.length > 0 && passwordErrors.length > 0 && (
                <ul className="text-xs text-amber-600 mt-1 space-y-1">
                  {passwordErrors.map((err, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-amber-500 rounded-full" />
                      {err}
                    </li>
                  ))}
                </ul>
              )}
              {newPassword.length > 0 && passwordErrors.length === 0 && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  {t('newPassword.meetsRequirements')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-600 font-medium">
                {t('confirmPassword.label')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('confirmPassword.placeholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="new-password"
                className="bg-white/50 focus:bg-white transition-all border-slate-200"
              />
              {confirmPassword.length > 0 && !passwordMatch && (
                <p className="text-xs text-destructive">{t('confirmPassword.mismatch')}</p>
              )}
              {confirmPassword.length > 0 && passwordMatch && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  {t('confirmPassword.match')}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/20 border-none h-11"
              loading={isLoading}
              disabled={!isValid}
            >
              {t('submit')}
            </Button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-xs text-slate-400">Copyright © 2026 月球厨师莱恩 (TPMOONCHEFRYAN)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

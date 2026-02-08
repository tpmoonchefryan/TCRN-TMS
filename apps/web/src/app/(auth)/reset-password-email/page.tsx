/* eslint-disable @typescript-eslint/no-explicit-any, no-useless-escape */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ResetPasswordByTokenSchema } from '@tcrn/shared';
import { AlertTriangle, ArrowLeft, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { authApi } from '@/lib/api/client';
import { useZodForm } from '@/lib/form';

export default function ResetPasswordEmailPage() {
  const t = useTranslations('auth.resetPasswordEmail');
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token');
  const tenantCode = searchParams.get('tenant');

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const form = useZodForm(ResetPasswordByTokenSchema, {
    defaultValues: {
      token: token || '',
      tenantCode: tenantCode || '',
      newPassword: '',
      newPasswordConfirm: '',
    },
    mode: 'onChange',
  });

  const newPassword = form.watch('newPassword');
  const confirmPassword = form.watch('newPasswordConfirm');

  // Redirect if no token
  useEffect(() => {
    if (!token || !tenantCode) {
      router.push('/login');
    } else {
      form.setValue('token', token);
      form.setValue('tenantCode', tenantCode);
    }
  }, [token, tenantCode, router, form]);

  // Validate password in real-time
  useEffect(() => {
    const errors: string[] = [];
    if (newPassword.length > 0) {
      if (newPassword.length < 12) {
        errors.push(t('validation.minLength') || 'At least 12 characters');
      }
      if (!/[A-Z]/.test(newPassword)) {
        errors.push(t('validation.uppercase') || 'At least one uppercase letter');
      }
      if (!/[a-z]/.test(newPassword)) {
        errors.push(t('validation.lowercase') || 'At least one lowercase letter');
      }
      if (!/\d/.test(newPassword)) {
        errors.push(t('validation.number') || 'At least one number');
      }
      if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword)) {
        errors.push(t('validation.specialChar') || 'At least one special character');
      }
    }
    setPasswordErrors(errors);
  }, [newPassword, t]);

  const handleSubmit = form.handleSubmit(async (data) => {
    setError('');

    if (passwordErrors.length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.resetPasswordByToken(data.token, data.tenantCode, data.newPassword, data.newPasswordConfirm);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(response.message || t('resetFailed') || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err?.message || t('resetFailed') || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  });

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
            <h2 className="text-xl font-semibold text-slate-800 mb-2">{t('success.title') || 'Password Reset Successfully'}</h2>
            <p className="text-slate-500">{t('success.redirecting') || 'Redirecting to login page...'}</p>
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
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20 rotate-3">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 text-yellow-400 fill-yellow-400 animate-pulse" size={24} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            {t('title') || 'Create New Password'}
          </CardTitle>
          <CardDescription className="text-slate-500">
            {t('description') || 'Enter your new password below'}
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
                {t('newPassword') || 'New Password'}
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••••••"
                {...form.register('newPassword')}
                disabled={isLoading}
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
                  {t('meetsRequirements') || 'Password meets all requirements'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPasswordConfirm" className="text-slate-600 font-medium">
                {t('confirmPassword') || 'Confirm Password'}
              </Label>
              <Input
                id="newPasswordConfirm"
                type="password"
                placeholder="••••••••••••"
                {...form.register('newPasswordConfirm')}
                disabled={isLoading}
                autoComplete="new-password"
                className="bg-white/50 focus:bg-white transition-all border-slate-200"
              />
              {form.formState.errors.newPasswordConfirm && (
                <p className="text-xs text-destructive">{form.formState.errors.newPasswordConfirm.message}</p>
              )}
              {confirmPassword.length > 0 && !passwordMatch && (
                <p className="text-xs text-destructive">{t('passwordMismatch') || 'Passwords do not match'}</p>
              )}
              {confirmPassword.length > 0 && passwordMatch && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  {t('passwordsMatch') || 'Passwords match'}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg shadow-green-500/20 border-none h-11"
              loading={isLoading}
              disabled={!isValid}
            >
              {t('submit') || 'Reset Password'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              {t('backToLogin') || 'Back to Login'}
            </Link>
          </div>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-xs text-slate-400">Copyright © 2026 月球厨师莱恩 (TPMOONCHEFRYAN)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

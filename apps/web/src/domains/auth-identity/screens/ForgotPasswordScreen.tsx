// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ForgotPasswordSchema } from '@tcrn/shared';
import { ArrowLeft, CheckCircle2, Mail, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { getApiResponseMessage, getThrownErrorMessage } from '@/lib/api/error-utils';
import { authApi } from '@/lib/api/modules/auth';
import { useZodForm } from '@/lib/form';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/platform/ui';

export function ForgotPasswordScreen() {
  const t = useTranslations('auth.forgotPassword');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const form = useZodForm(ForgotPasswordSchema, {
    defaultValues: {
      tenantCode: '',
      email: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setError('');
    setIsLoading(true);
    try {
      const response = await authApi.forgotPassword(data.email, data.tenantCode);
      if (response.success) {
        setSuccess(true);
      } else {
        setError(getApiResponseMessage(response, t('requestFailed')));
      }
    } catch (error) {
      setError(getThrownErrorMessage(error, t('requestFailed')));
    } finally {
      setIsLoading(false);
    }
  });

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-md shadow-medium border-white/50 animate-fade-in">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">{t('success.title')}</h2>
            <p className="text-slate-500 mb-6">
              {t('success.description')}
            </p>
            <Link href="/login">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backToLogin')}
              </Button>
            </Link>
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
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 rotate-3">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 text-yellow-400 fill-yellow-400 animate-pulse" size={24} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            {t('title')}
          </CardTitle>
          <CardDescription className="text-slate-500">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tenantCode" className="text-slate-600 font-medium">
                {tAuth('tenant')}
              </Label>
              <Input
                id="tenantCode"
                type="text"
                placeholder={tAuth('tenantCodePlaceholder')}
                {...form.register('tenantCode')}
                disabled={isLoading}
                className="bg-white/50 focus:bg-white transition-all border-slate-200"
              />
              {form.formState.errors.tenantCode && (
                <p className="text-xs text-destructive">{form.formState.errors.tenantCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-600 font-medium">
                {t('email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                {...form.register('email')}
                disabled={isLoading}
                autoComplete="email"
                className="bg-white/50 focus:bg-white transition-all border-slate-200"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white shadow-lg shadow-blue-500/20 border-none h-11"
              loading={isLoading}
            >
              {t('submit')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              {t('backToLogin')}
            </Link>
          </div>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-xs text-slate-400">{tCommon('copyright', { year: new Date().getFullYear() })}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

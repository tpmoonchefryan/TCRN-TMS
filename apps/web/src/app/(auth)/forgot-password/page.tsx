// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ArrowLeft, Mail, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { authApi } from '@/lib/api/client';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword');
  const tAuth = useTranslations('auth');

  const [email, setEmail] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !tenantCode) {
      setError(t('allFieldsRequired') || 'All fields are required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.forgotPassword(email, tenantCode);
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.message || t('requestFailed') || 'Failed to send reset email');
      }
    } catch (err: any) {
      setError(err?.message || t('requestFailed') || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-md shadow-medium border-white/50 animate-fade-in">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">{t('success.title') || 'Check Your Email'}</h2>
            <p className="text-slate-500 mb-6">
              {t('success.description') || 'If an account exists with that email, we have sent a password reset link.'}
            </p>
            <Link href="/login">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backToLogin') || 'Back to Login'}
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
            {t('title') || 'Forgot Password'}
          </CardTitle>
          <CardDescription className="text-slate-500">
            {t('description') || 'Enter your email and we will send you a password reset link'}
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
                {tAuth('tenant') || 'Tenant Code'}
              </Label>
              <Input
                id="tenantCode"
                type="text"
                placeholder={tAuth('tenantCodePlaceholder') || 'e.g. HOLOLIVE'}
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                disabled={isLoading}
                required
                className="bg-white/50 focus:bg-white transition-all border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-600 font-medium">
                {t('email') || 'Email Address'}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder') || 'your.email@example.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="email"
                className="bg-white/50 focus:bg-white transition-all border-slate-200"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white shadow-lg shadow-blue-500/20 border-none h-11"
              loading={isLoading}
            >
              {t('submit') || 'Send Reset Link'}
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

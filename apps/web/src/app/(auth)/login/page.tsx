// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ArrowLeft, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { login, verifyTotp, isLoading, error, clearError, tenantCode: savedTenantCode, _hasHydrated } = useAuthStore();
  
  // Steps: 'credentials' | 'totp'
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  
  // Credentials State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  
  // TOTP State
  const [totpCode, setTotpCode] = useState('');
  const [sessionToken, setSessionToken] = useState('');

  // Sync saved tenant code after hydration
  useEffect(() => {
    if (_hasHydrated && savedTenantCode && !tenantCode) {
      setTenantCode(savedTenantCode);
    }
  }, [_hasHydrated, savedTenantCode]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!tenantCode || !username || !password) return;

    const result = await login(username, password, tenantCode);
    
    if (result.success) {
      if (result.passwordResetRequired && result.sessionToken) {
        // Redirect to password reset page with session token
        const params = new URLSearchParams({
          token: result.sessionToken,
          reason: result.passwordResetReason || 'PASSWORD_EXPIRED',
        });
        router.push(`/reset-password?${params.toString()}`);
      } else if (result.totpRequired && result.sessionToken) {
        setSessionToken(result.sessionToken);
        setStep('totp');
      } else {
        // AC tenant goes to admin console, others go to home
        const normalizedTenantCode = tenantCode.toUpperCase();
        if (normalizedTenantCode === 'AC') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      }
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!totpCode || !sessionToken) return;

    const success = await verifyTotp(sessionToken, totpCode);
    if (success) {
      // AC tenant goes to admin console, others go to home
      const normalizedTenantCode = tenantCode.toUpperCase();
      if (normalizedTenantCode === 'AC') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    }
  };

  const handleBackToCredentials = () => {
    clearError();
    setStep('credentials');
    setTotpCode('');
    setSessionToken('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md bg-white/80 backdrop-blur-md shadow-medium border-white/50 animate-fade-in z-10 transition-all duration-300">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 rotate-3 transition-transform duration-500 hover:rotate-6">
                <span className="text-3xl font-bold text-white">T</span>
              </div>
              <Sparkles className="absolute -top-2 -right-2 text-yellow-400 fill-yellow-400 animate-pulse" size={24} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            {step === 'credentials' ? 'TCRN TMS' : t('twoFactorAuth') || 'Two-Factor Authentication'}
          </CardTitle>
          <CardDescription className="text-slate-500">
            {step === 'credentials' 
              ? (t('loginDescription') || 'Talent Management System for VTubers')
              : (t('enterTotpCode') || 'Please enter the code from your authenticator app')
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4 animate-fade-in">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg animate-slide-up">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tenant" className="text-slate-600 font-medium">{t('tenant') || 'Tenant Code'}</Label>
                <Input
                  id="tenant"
                  type="text"
                  placeholder={t('tenantCodePlaceholder') || 'e.g. HOLOLIVE'}
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="organization"
                  className="bg-white/50 focus:bg-white transition-all border-slate-200"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-600 font-medium">{t('username') || 'Username'}</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={t('usernamePlaceholder') || 'Enter your username'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="username"
                  className="bg-white/50 focus:bg-white transition-all border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-600 font-medium">{t('password') || 'Password'}</Label>
                  <a href="/forgot-password" className="text-xs text-primary hover:underline" tabIndex={-1}>
                    {t('forgotPasswordLink') || 'Forgot password?'}
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('passwordPlaceholder') || '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                   className="bg-white/50 focus:bg-white transition-all border-slate-200"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white shadow-lg shadow-blue-500/20 border-none h-11" 
                loading={isLoading} 
                disabled={!tenantCode || !username || !password}
              >
                {t('signIn') || 'Sign In'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleTotpSubmit} className="space-y-6 animate-fade-in">
              <div className="flex items-center mb-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-auto hover:bg-transparent text-slate-400 hover:text-slate-600"
                  onClick={handleBackToCredentials}
                  disabled={isLoading}
                >
                  <ArrowLeft size={16} className="mr-1" />
                  {t('back') || 'Back'}
                </Button>
              </div>

              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg animate-slide-up">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="totp" className="text-slate-600 font-medium text-center block w-full">
                  {t('authCode') || 'Authentication Code'}
                </Label>
                <div className="flex justify-center">
                  <Input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length <= 6) setTotpCode(val);
                    }}
                    disabled={isLoading}
                    required
                    autoComplete="one-time-code"
                    className="bg-white/50 focus:bg-white transition-all border-slate-200 text-center text-2xl tracking-[0.5em] h-14 w-48 font-mono"
                    autoFocus
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white shadow-lg shadow-blue-500/20 border-none h-11" 
                loading={isLoading} 
                disabled={totpCode.length !== 6}
              >
                {t('verify') || 'Verify'}
              </Button>
              
              <div className="text-center">
                <button type="button" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  {t('useRecoveryCode') || 'Use recovery code instead'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
             <p className="text-xs text-slate-400">Copyright © 2026 月球厨师莱恩 (TPMOONCHEFRYAN)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { LoginSchema, TotpVerifySchema } from '@tcrn/shared';
import { ArrowLeft, Globe, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { STAGING_BANNER_HEIGHT } from '@/components/staging-banner';
import { setUserLocale } from '@/i18n/locale';
import { userApi } from '@/lib/api/modules/user';
import { useZodForm } from '@/lib/form';
import { isStaging } from '@/lib/utils';
import { useAuthStore } from '@/platform/state/auth-store';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
} from '@/platform/ui';

// Language options
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'zh', name: '简体中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
] as const;

type LocaleCode = 'en' | 'zh' | 'ja';

export function LoginScreen() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const router = useRouter();
  const currentLocale = useLocale();
  const {
    login,
    verifyTotp,
    isLoading,
    error,
    clearError,
    tenantCode: savedTenantCode,
    _hasHydrated,
  } = useAuthStore();

  // Steps: 'credentials' | 'totp'
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');

  // Session token for TOTP step
  const [_sessionToken, setSessionToken] = useState('');

  // Credentials Form with Zod validation
  const credentialsForm = useZodForm(LoginSchema, {
    defaultValues: {
      tenantCode: '',
      login: '',
      password: '',
      rememberMe: false,
    },
  });

  // TOTP Form with Zod validation
  const totpForm = useZodForm(TotpVerifySchema, {
    defaultValues: {
      sessionToken: '',
      code: '',
    },
  });

  // Language selection state - default to current locale
  const [selectedLanguage, setSelectedLanguage] = useState<LocaleCode>(currentLocale as LocaleCode);

  // Sync saved tenant code after hydration
  useEffect(() => {
    if (_hasHydrated && savedTenantCode && !credentialsForm.getValues('tenantCode')) {
      credentialsForm.setValue('tenantCode', savedTenantCode);
    }
  }, [_hasHydrated, savedTenantCode, credentialsForm]);

  // Handle language change
  const handleLanguageChange = async (code: LocaleCode) => {
    setSelectedLanguage(code);
    // Update cookie immediately so UI refreshes
    await setUserLocale(code);
    router.refresh();
  };

  // Update user preference after successful login
  const updateLanguagePreference = async () => {
    try {
      await userApi.update({ preferredLanguage: selectedLanguage });
      // Ensure cookie is set
      await setUserLocale(selectedLanguage);
    } catch {
      // Silently fail - language preference update is not critical
    }
  };

  const currentLang = LANGUAGES.find((l) => l.code === selectedLanguage) || LANGUAGES[0];

  // Calculate top offset for staging banner
  const topOffset = isStaging() ? STAGING_BANNER_HEIGHT + 16 : 16; // 16px base margin

  const handleCredentialsSubmit = credentialsForm.handleSubmit(async (data) => {
    clearError();

    const result = await login(data.login, data.password, data.tenantCode);

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
        totpForm.setValue('sessionToken', result.sessionToken);
        setStep('totp');
      } else {
        // Update language preference after successful login
        await updateLanguagePreference();

        // AC tenant goes to admin console, others go to home
        const normalizedTenantCode = data.tenantCode.toUpperCase();
        if (normalizedTenantCode === 'AC') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      }
    }
  });

  const handleTotpSubmit = totpForm.handleSubmit(async (data) => {
    clearError();

    const success = await verifyTotp(data.sessionToken, data.code);
    if (success) {
      // Update language preference after successful TOTP verification
      await updateLanguagePreference();

      // AC tenant goes to admin console, others go to home
      const normalizedTenantCode = credentialsForm.getValues('tenantCode').toUpperCase();
      if (normalizedTenantCode === 'AC') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    }
  });

  const handleBackToCredentials = () => {
    clearError();
    setStep('credentials');
    totpForm.reset();
    setSessionToken('');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-pink-50 p-4 dark:from-slate-900 dark:to-slate-800">
      {/* Background Decor */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-300/20 blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-pink-300/20 blur-3xl"></div>
      </div>

      {/* Language Switcher - Top Right (adjusts for staging banner) */}
      <div className="absolute right-4 z-20" style={{ top: topOffset }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 bg-white/60 text-slate-600 shadow-sm backdrop-blur-sm hover:bg-white/80"
            >
              <Globe size={14} />
              <span>{currentLang.flag}</span>
              <span className="hidden sm:inline">{currentLang.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[200]">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={lang.code === selectedLanguage ? 'bg-slate-100' : ''}
              >
                <span className="mr-2">{lang.flag}</span>
                {lang.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="shadow-medium animate-fade-in z-10 w-full max-w-md border-white/50 bg-white/80 backdrop-blur-md transition-all duration-300">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="flex h-20 w-20 rotate-3 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-pink-400 shadow-lg shadow-blue-500/20 transition-transform duration-500 hover:rotate-6">
                <span className="text-3xl font-bold text-white">T</span>
              </div>
              <Sparkles
                className="absolute -right-2 -top-2 animate-pulse fill-yellow-400 text-yellow-400"
                size={24}
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            {step === 'credentials' ? tc('appName') : t('twoFactorAuth')}
          </CardTitle>
          <CardDescription className="text-slate-500">
            {step === 'credentials' ? t('loginDescription') : t('enterTotpCode')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="animate-fade-in space-y-4">
              {error && (
                <div className="text-destructive bg-destructive/10 animate-slide-up rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tenantCode" className="font-medium text-slate-600">
                  {t('tenant')}
                </Label>
                <Input
                  id="tenantCode"
                  type="text"
                  placeholder={t('tenantCodePlaceholder')}
                  {...credentialsForm.register('tenantCode')}
                  disabled={isLoading}
                  autoComplete="organization"
                  className="border-slate-200 bg-white/50 transition-all focus:bg-white"
                />
                {credentialsForm.formState.errors.tenantCode && (
                  <p className="text-destructive text-xs">
                    {credentialsForm.formState.errors.tenantCode.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login" className="font-medium text-slate-600">
                  {t('username')}
                </Label>
                <Input
                  id="login"
                  type="text"
                  placeholder={t('usernamePlaceholder')}
                  {...credentialsForm.register('login')}
                  disabled={isLoading}
                  autoComplete="username"
                  className="border-slate-200 bg-white/50 transition-all focus:bg-white"
                />
                {credentialsForm.formState.errors.login && (
                  <p className="text-destructive text-xs">
                    {credentialsForm.formState.errors.login.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="font-medium text-slate-600">
                    {t('password')}
                  </Label>
                  <a
                    href="/forgot-password"
                    className="text-primary text-xs hover:underline"
                    tabIndex={-1}
                  >
                    {t('forgotPasswordLink')}
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  {...credentialsForm.register('password')}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="border-slate-200 bg-white/50 transition-all focus:bg-white"
                />
                {credentialsForm.formState.errors.password && (
                  <p className="text-destructive text-xs">
                    {credentialsForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="h-11 w-full border-none bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-pink-600"
                loading={isLoading}
                disabled={!credentialsForm.formState.isValid || isLoading}
              >
                {t('signIn')}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleTotpSubmit} className="animate-fade-in space-y-6">
              <div className="mb-4 flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-slate-400 hover:bg-transparent hover:text-slate-600"
                  onClick={handleBackToCredentials}
                  disabled={isLoading}
                >
                  <ArrowLeft size={16} className="mr-1" />
                  {tc('back')}
                </Button>
              </div>

              {error && (
                <div className="text-destructive bg-destructive/10 animate-slide-up rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="code"
                  className="block w-full text-center font-medium text-slate-600"
                >
                  {t('totpCode')}
                </Label>
                <div className="flex justify-center">
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    {...totpForm.register('code', {
                      onChange: (e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length <= 6) {
                          totpForm.setValue('code', val);
                        }
                      },
                    })}
                    disabled={isLoading}
                    autoComplete="one-time-code"
                    className="h-14 w-48 border-slate-200 bg-white/50 text-center font-mono text-2xl tracking-[0.5em] transition-all focus:bg-white"
                    autoFocus
                  />
                </div>
                {totpForm.formState.errors.code && (
                  <p className="text-destructive text-center text-xs">
                    {totpForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="h-11 w-full border-none bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-pink-600"
                loading={isLoading}
                disabled={totpForm.watch('code')?.length !== 6 || isLoading}
              >
                {t('verify')}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-xs text-slate-400 transition-colors hover:text-slate-600"
                >
                  {t('useRecoveryCode')}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 border-t border-slate-100 pt-6 text-center">
            <p className="text-xs text-slate-400">
              {tc('copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useMemo, useState } from 'react';

import {
  type AuthenticatedSessionResult,
  forceResetPassword,
  login,
  verifyTotp,
} from '@/domains/auth-identity/api/auth.api';
import { ApiRequestError } from '@/platform/http/api';
import { resolvePostLoginPath } from '@/platform/routing/workspace-paths';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { useSession } from '@/platform/runtime/session/session-provider';
import { LocaleSwitcher } from '@/platform/ui';

type AuthStep = 'credentials' | 'totp' | 'password-reset';

interface FormState {
  tenantCode: string;
  login: string;
  password: string;
  rememberMe: boolean;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { copy, selectedLocale, localeOptions, setLocale } = useRuntimeLocale();
  const { authenticate } = useSession();
  const loginCopy = copy.auth.login;
  const [step, setStep] = useState<AuthStep>('credentials');
  const [credentials, setCredentials] = useState<FormState>({
    tenantCode: '',
    login: '',
    password: '',
    rememberMe: true,
  });
  const [sessionToken, setSessionToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextHref = searchParams.get('next');
  const ctaLabel = useMemo(() => {
    if (step === 'totp') {
      return loginCopy.verifyTotp;
    }

    if (step === 'password-reset') {
      return loginCopy.setNewPassword;
    }

    return loginCopy.signIn;
  }, [loginCopy, step]);

  const stepTitle = useMemo(() => {
    if (step === 'totp') {
      return loginCopy.totpTitle;
    }

    if (step === 'password-reset') {
      return loginCopy.passwordResetTitle;
    }

    return loginCopy.credentialsTitle;
  }, [loginCopy, step]);

  const stepDescription = useMemo(() => {
    if (step === 'totp') {
      return loginCopy.totpDescription;
    }

    if (step === 'password-reset') {
      return loginCopy.passwordResetDescription;
    }

    return loginCopy.credentialsDescription;
  }, [loginCopy, step]);

  const heroTitle = loginCopy.heroTitle.trim();
  const heroDescription = loginCopy.heroDescription.trim();
  const surfaceNote = loginCopy.surfaceNote.trim();

  function finishAuthentication(result: AuthenticatedSessionResult) {
    authenticate(result, credentials.tenantCode.trim().toUpperCase());

    const target = resolvePostLoginPath(nextHref, {
      tenantId: result.user.tenant.id,
      tenantTier: result.user.tenant.tier,
    });
    startTransition(() => {
      router.replace(target);
    });
  }

  async function handlePrimarySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (step === 'credentials') {
        const result = await login(credentials);

        if (result.kind === 'authenticated') {
          finishAuthentication(result.data);
          return;
        }

        if (result.kind === 'totp_required') {
          setSessionToken(result.sessionToken);
          setStep('totp');
          return;
        }

        setSessionToken(result.sessionToken);
        setStep('password-reset');
        return;
      }

      if (step === 'totp') {
        const result = await verifyTotp(sessionToken, totpCode);
        finishAuthentication(result);
        return;
      }

      const result = await forceResetPassword(sessionToken, newPassword, newPasswordConfirm);
      finishAuthentication(result);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(loginCopy.errorFallback);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.18),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)]">
      <div className="mx-auto flex w-full max-w-6xl justify-end px-6 pt-6">
        <LocaleSwitcher
          currentLocale={selectedLocale}
          options={localeOptions}
          onChange={setLocale}
          ariaLabelPrefix={copy.common.languageSwitcherLabel}
        />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl gap-10 px-6 pb-12 pt-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,28rem)] lg:items-center">
        <section className="space-y-6">
          {loginCopy.brandEyebrow ? (
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 shadow-sm backdrop-blur">
              {loginCopy.brandEyebrow}
            </div>
          ) : null}

          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{loginCopy.appName}</p>
            {heroTitle ? (
              <p className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">{heroTitle}</p>
            ) : null}
            {heroDescription ? (
              <p className="max-w-2xl text-base leading-7 text-slate-600">{heroDescription}</p>
            ) : null}
          </div>

          {surfaceNote || loginCopy.boundaryNote ? (
            <div className="flex flex-wrap gap-3">
              {surfaceNote ? (
                <div className="rounded-2xl border border-slate-200 bg-white/78 px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm backdrop-blur">
                  {surfaceNote}
                </div>
              ) : null}
              {loginCopy.boundaryNote ? (
                <div className="rounded-2xl border border-slate-200 bg-white/78 px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm backdrop-blur">
                  {loginCopy.boundaryNote}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="w-full rounded-[2rem] border border-slate-200 bg-white/92 p-8 shadow-[0_24px_90px_-45px_rgba(15,23,42,0.45)] backdrop-blur sm:p-10">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-slate-950">{stepTitle}</h1>
              <p className="text-sm leading-6 text-slate-600">{stepDescription}</p>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handlePrimarySubmit}>
            {step === 'credentials' && (
              <>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">{loginCopy.tenantCodeLabel}</span>
                  <input
                    value={credentials.tenantCode}
                    onChange={(event) =>
                      setCredentials((current) => ({
                        ...current,
                        tenantCode: event.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder="AC"
                    autoComplete="organization"
                    spellCheck={false}
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">{loginCopy.usernameLabel}</span>
                  <input
                    value={credentials.login}
                    onChange={(event) =>
                      setCredentials((current) => ({
                        ...current,
                        login: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder={loginCopy.usernamePlaceholder}
                    autoComplete="username"
                    spellCheck={false}
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">{loginCopy.passwordLabel}</span>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(event) =>
                      setCredentials((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder={loginCopy.passwordPlaceholder}
                    autoComplete="current-password"
                    required
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={credentials.rememberMe}
                    onChange={(event) =>
                      setCredentials((current) => ({
                        ...current,
                        rememberMe: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {loginCopy.rememberMe}
                </label>
              </>
            )}

            {step === 'totp' && (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">{loginCopy.totpLabel}</span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-lg tracking-[0.35em] text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  placeholder={loginCopy.totpPlaceholder}
                  aria-label={loginCopy.totpLabel}
                  required
                />
              </label>
            )}

            {step === 'password-reset' && (
              <>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">{loginCopy.newPasswordLabel}</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder={loginCopy.passwordPlaceholder}
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">{loginCopy.confirmNewPasswordLabel}</span>
                  <input
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(event) => setNewPasswordConfirm(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder={loginCopy.confirmNewPasswordPlaceholder}
                    required
                  />
                </label>
              </>
            )}

            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {step === 'credentials' ? <ShieldCheck className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
              {isSubmitting ? loginCopy.submitPending : ctaLabel}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

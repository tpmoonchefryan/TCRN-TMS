'use client';

import { ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';

import { exchangeSsoResult } from '@/domains/auth-identity/api/auth.api';
import { completeSsoAccountLink } from '@/domains/profile/api/profile.api';
import { ApiRequestError } from '@/platform/http/api';
import {
  buildAcProfileSecurityPath,
  buildTenantOrganizationStructurePath,
  buildTenantProfileSecurityPath,
  normalizeInternalWorkspacePath,
} from '@/platform/routing/workspace-paths';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';

type CallbackState = 'checking' | 'failed';

export function SsoCallbackScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticate, request, session } = useSession();
  const { locale } = useUiLocale();
  const callbackCopy = useMemo(
    () => ({
      signInTitle: pickLocaleText(locale, {
        en: 'SSO sign-in',
        zh_HANS: 'SSO 登录',
        zh_HANT: 'SSO 登入',
        ja: 'SSO サインイン',
        ko: 'SSO 로그인',
        fr: 'Connexion SSO',
      }),
      linkTitle: pickLocaleText(locale, {
        en: 'SSO account link',
        zh_HANS: 'SSO 账号链接',
        zh_HANT: 'SSO 帳號連結',
        ja: 'SSO アカウントリンク',
        ko: 'SSO 계정 연결',
        fr: 'Liaison du compte SSO',
      }),
      failedTitle: pickLocaleText(locale, {
        en: 'SSO failed',
        zh_HANS: 'SSO 失败',
        zh_HANT: 'SSO 失敗',
        ja: 'SSO に失敗しました',
        ko: 'SSO 실패',
        fr: 'Echec SSO',
      }),
      completingSignIn: pickLocaleText(locale, {
        en: 'Completing SSO sign-in...',
        zh_HANS: '正在完成 SSO 登录...',
        zh_HANT: '正在完成 SSO 登入...',
        ja: 'SSO サインインを完了しています...',
        ko: 'SSO 로그인을 완료하는 중...',
        fr: 'Finalisation de la connexion SSO...',
      }),
      completingLink: pickLocaleText(locale, {
        en: 'Completing SSO account linking...',
        zh_HANS: '正在完成 SSO 账号链接...',
        zh_HANT: '正在完成 SSO 帳號連結...',
        ja: 'SSO アカウントリンクを完了しています...',
        ko: 'SSO 계정 연결을 완료하는 중...',
        fr: 'Finalisation de la liaison du compte SSO...',
      }),
      missingResult: pickLocaleText(locale, {
        en: 'SSO result is missing or expired.',
        zh_HANS: 'SSO 结果缺失或已过期。',
        zh_HANT: 'SSO 結果缺失或已過期。',
        ja: 'SSO 結果が見つからないか期限切れです。',
        ko: 'SSO 결과가 없거나 만료되었습니다.',
        fr: 'Le resultat SSO est manquant ou expire.',
      }),
      signInFailed: pickLocaleText(locale, {
        en: 'SSO sign-in could not be completed.',
        zh_HANS: '无法完成 SSO 登录。',
        zh_HANT: '無法完成 SSO 登入。',
        ja: 'SSO サインインを完了できませんでした。',
        ko: 'SSO 로그인을 완료할 수 없습니다.',
        fr: 'La connexion SSO n’a pas pu etre terminee.',
      }),
      authRequired: pickLocaleText(locale, {
        en: 'Sign in again before linking SSO.',
        zh_HANS: '请重新登录后再链接 SSO。',
        zh_HANT: '請重新登入後再連結 SSO。',
        ja: 'SSO をリンクする前に再度サインインしてください。',
        ko: 'SSO를 연결하기 전에 다시 로그인하세요.',
        fr: 'Reconnectez-vous avant de lier le SSO.',
      }),
      returnToSignIn: pickLocaleText(locale, {
        en: 'Return to sign-in',
        zh_HANS: '返回登录',
        zh_HANT: '返回登入',
        ja: 'サインインに戻る',
        ko: '로그인으로 돌아가기',
        fr: 'Retour a la connexion',
      }),
    }),
    [locale]
  );
  const [state, setState] = useState<CallbackState>('checking');
  const [message, setMessage] = useState('');
  const returnButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const resultCode = searchParams.get('result');
    const linkResultCode = searchParams.get('linkResult');
    const nextPath = normalizeInternalWorkspacePath(searchParams.get('next'));

    if (!resultCode && !linkResultCode) {
      setState('failed');
      setMessage(callbackCopy.missingResult);
      return;
    }
    const opaqueResultCode = resultCode;
    const opaqueLinkResultCode = linkResultCode;
    setState('checking');
    setMessage(opaqueLinkResultCode ? callbackCopy.completingLink : callbackCopy.completingSignIn);

    let cancelled = false;

    async function finish() {
      try {
        if (opaqueLinkResultCode) {
          if (!session) {
            throw new ApiRequestError(callbackCopy.authRequired, 'AUTH_REQUIRED', 401);
          }

          await completeSsoAccountLink(request, opaqueLinkResultCode);
          if (cancelled) {
            return;
          }

          const fallback =
            session.tenantTier === 'ac'
              ? buildAcProfileSecurityPath(session.tenantId)
              : buildTenantProfileSecurityPath(session.tenantId);

          startTransition(() => {
            router.replace(nextPath || fallback);
          });
          return;
        }

        const result = await exchangeSsoResult(opaqueResultCode || '');
        if (cancelled) {
          return;
        }

        authenticate(result, result.user.tenant.code || '');
        const target = nextPath || buildTenantOrganizationStructurePath(result.user.tenant.id);
        startTransition(() => {
          router.replace(target);
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState('failed');
        setMessage(
          error instanceof ApiRequestError ? error.message : callbackCopy.signInFailed
        );
      }
    }

    void finish();

    return () => {
      cancelled = true;
    };
  }, [authenticate, callbackCopy, request, router, searchParams, session]);

  useEffect(() => {
    if (state === 'failed') {
      returnButtonRef.current?.focus();
    }
  }, [state]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-950">
              {state === 'failed'
                ? callbackCopy.failedTitle
                : searchParams.get('linkResult')
                  ? callbackCopy.linkTitle
                  : callbackCopy.signInTitle}
            </h1>
            <p
              role={state === 'failed' ? 'alert' : 'status'}
              aria-live="polite"
              className="mt-1 text-sm leading-6 text-slate-600"
            >
              {message || callbackCopy.completingSignIn}
            </p>
            {state === 'failed' ? (
              <button
                ref={returnButtonRef}
                type="button"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
                onClick={() => router.replace('/login')}
              >
                {callbackCopy.returnToSignIn}
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

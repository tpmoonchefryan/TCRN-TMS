'use client';

import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type CSSProperties, startTransition, useMemo, useRef, useState } from 'react';

import {
  type AuthenticatedSessionResult,
  forceResetPassword,
  login,
  readPostLoginOrganizationTree,
  verifyTotp,
} from '@/domains/auth-identity/api/auth.api';
import type {
  OrganizationNode,
  OrganizationTalent,
  OrganizationTreeResponse,
} from '@/domains/organization-access/api/organization.api';
import { ApiRequestError } from '@/platform/http/api';
import {
  buildAcWorkspacePath,
  buildTalentWorkspacePath,
  buildTenantOrganizationStructurePath,
  isAcTenantTier,
  normalizeInternalWorkspacePath,
} from '@/platform/routing/workspace-paths';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';
import { LocaleSwitcher, useBodyScrollLock, useModalFocus } from '@/platform/ui';

type AuthStep = 'credentials' | 'totp' | 'password-reset';

interface FormState {
  tenantCode: string;
  login: string;
  password: string;
  rememberMe: boolean;
}

interface PostLoginTalentOption {
  id: string;
  code: string;
  displayName: string;
  subsidiaryName?: string | null;
}

interface TalentSelectorState {
  tenantId: string;
  talents: PostLoginTalentOption[];
}

const LOGIN_HERO_TYPEWRITER_CSS = `
@keyframes loginHeroCharacterReveal {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes loginHeroCaretBlink {
  0%, 45% { opacity: 1; }
  46%, 100% { opacity: 0; }
}

.login-hero-typewriter-character {
  opacity: 0;
  animation: loginHeroCharacterReveal 1ms linear forwards;
  animation-delay: calc(var(--login-hero-character-index) * 55ms);
}

.login-hero-typewriter-caret {
  animation: loginHeroCaretBlink 900ms steps(2, start) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .login-hero-typewriter-character {
    opacity: 1;
    animation: none;
  }

  .login-hero-typewriter-caret {
    display: none;
  }
}
`;

function isBusinessSelectableTalent(talent: OrganizationTalent) {
  return talent.isActive && talent.lifecycleStatus === 'published';
}

function collectBusinessSelectableTalents(tree: OrganizationTreeResponse): PostLoginTalentOption[] {
  const talentsById = new Map<string, PostLoginTalentOption>();

  function addTalent(talent: OrganizationTalent) {
    if (!isBusinessSelectableTalent(talent)) {
      return;
    }

    talentsById.set(talent.id, {
      id: talent.id,
      code: talent.code,
      displayName: talent.displayName || talent.name || talent.code,
      subsidiaryName: talent.subsidiaryName,
    });
  }

  function visitNode(node: OrganizationNode) {
    node.talents.forEach(addTalent);
    node.children.forEach(visitNode);
  }

  tree.directTalents.forEach(addTalent);
  tree.subsidiaries.forEach(visitNode);

  return Array.from(talentsById.values());
}

function buildPostLoginSelectorCopy(locale: string) {
  return {
    title: pickLocaleText(locale, {
      en: 'Choose a talent workspace',
      zh_HANS: '选择艺人工作区',
      zh_HANT: '選擇藝人工作區',
      ja: 'タレントワークスペースを選択',
      ko: '탤런트 워크스페이스 선택',
      fr: 'Choisir un espace talent',
    }),
    description: pickLocaleText(locale, {
      en: 'You have access to multiple published talents. Choose where to start.',
      zh_HANS: '你可以进入多个已发布艺人，请选择本次要进入的工作区。',
      zh_HANT: '你可以進入多個已發布藝人，請選擇本次要進入的工作區。',
      ja: '複数の公開済みタレントにアクセスできます。開始するワークスペースを選択してください。',
      ko: '여러 공개된 탤런트에 접근할 수 있습니다. 시작할 워크스페이스를 선택하세요.',
      fr: 'Vous avez accès à plusieurs talents publiés. Choisissez par où commencer.',
    }),
    publishedLabel: pickLocaleText(locale, {
      en: 'Published',
      zh_HANS: '已发布',
      zh_HANT: '已發布',
      ja: '公開済み',
      ko: '게시됨',
      fr: 'Publié',
    }),
    openTalentAriaLabel: (talentName: string) =>
      pickLocaleText(locale, {
        en: `Open ${talentName} workspace`,
        zh_HANS: `打开 ${talentName} 工作区`,
        zh_HANT: `開啟 ${talentName} 工作區`,
        ja: `${talentName} ワークスペースを開く`,
        ko: `${talentName} 워크스페이스 열기`,
        fr: `Ouvrir l’espace ${talentName}`,
      }),
  };
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
  const [talentSelector, setTalentSelector] = useState<TalentSelectorState | null>(null);
  const talentSelectorRef = useRef<HTMLElement | null>(null);
  const firstTalentButtonRef = useRef<HTMLButtonElement | null>(null);

  const nextHref = searchParams.get('next');
  const postLoginSelectorCopy = useMemo(
    () => buildPostLoginSelectorCopy(selectedLocale),
    [selectedLocale],
  );

  useBodyScrollLock(talentSelector !== null);
  useModalFocus({
    active: talentSelector !== null,
    containerRef: talentSelectorRef,
    initialFocusRef: firstTalentButtonRef,
    restoreFocus: false,
  });

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
  const heroDescriptionCharacters = useMemo(() => Array.from(heroDescription), [heroDescription]);
  const surfaceNote = loginCopy.surfaceNote.trim();

  async function resolvePostLoginTarget(result: AuthenticatedSessionResult) {
    const tenantId = result.user.tenant.id;
    const safeNextHref = normalizeInternalWorkspacePath(nextHref);

    if (safeNextHref) {
      return { kind: 'path' as const, path: safeNextHref };
    }

    if (isAcTenantTier(result.user.tenant.tier)) {
      return { kind: 'path' as const, path: buildAcWorkspacePath(tenantId) };
    }

    try {
      const tree = await readPostLoginOrganizationTree(result.accessToken);
      const businessTalents = collectBusinessSelectableTalents(tree);

      if (businessTalents.length === 1) {
        return {
          kind: 'path' as const,
          path: buildTalentWorkspacePath(tenantId, businessTalents[0].id),
        };
      }

      if (businessTalents.length > 1) {
        return {
          kind: 'selector' as const,
          tenantId,
          talents: businessTalents,
        };
      }
    } catch {
      // Organization tree lookup is a post-login routing enhancement; fall back to governance.
    }

    return { kind: 'path' as const, path: buildTenantOrganizationStructurePath(tenantId) };
  }

  async function finishAuthentication(result: AuthenticatedSessionResult) {
    authenticate(result, credentials.tenantCode.trim().toUpperCase());

    const target = await resolvePostLoginTarget(result);

    if (target.kind === 'selector') {
      setTalentSelector({
        tenantId: target.tenantId,
        talents: target.talents,
      });
      return;
    }

    startTransition(() => {
      router.replace(target.path);
    });
  }

  function openSelectedTalent(talentId: string) {
    if (!talentSelector) {
      return;
    }

    const target = buildTalentWorkspacePath(talentSelector.tenantId, talentId);
    setTalentSelector(null);
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
          await finishAuthentication(result.data);
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
        await finishAuthentication(result);
        return;
      }

      const result = await forceResetPassword(sessionToken, newPassword, newPasswordConfirm);
      await finishAuthentication(result);
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
          ariaLabel={`${copy.common.languageSwitcherLabel}: ${
            localeOptions.find((option) => option.code === selectedLocale)?.label || selectedLocale
          }`}
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
              <p className="max-w-2xl text-base leading-7 text-slate-700 [text-shadow:0_1px_0_rgba(255,255,255,0.7)]">
                <span className="sr-only">{heroDescription}</span>
                <style>{LOGIN_HERO_TYPEWRITER_CSS}</style>
                <span
                  aria-hidden="true"
                  className="login-hero-description login-hero-typewriter inline-flex max-w-full flex-wrap items-baseline align-bottom"
                >
                  {heroDescriptionCharacters.map((character, index) => (
                    <span
                      key={`${character}-${index}`}
                      className="login-hero-typewriter-character"
                      style={{ '--login-hero-character-index': index } as CSSProperties}
                    >
                      {character === ' ' ? '\u00A0' : character}
                    </span>
                  ))}
                  <span
                    aria-hidden="true"
                    className="login-hero-typewriter-caret ml-1 inline-block h-[1.1em] w-0.5 flex-none translate-y-0.5 rounded-full bg-current"
                  />
                </span>
              </p>
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
                    autoFocus
                    name="tenantCode"
                    value={credentials.tenantCode}
                    onChange={(event) =>
                      setCredentials((current) => ({
                        ...current,
                        tenantCode: event.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder="AC"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">{loginCopy.usernameLabel}</span>
                  <input
                    name="login"
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
                    name="password"
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
                  autoFocus
                  name="totpCode"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-lg tracking-[0.35em] text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  placeholder={loginCopy.totpPlaceholder}
                  autoComplete="one-time-code"
                  aria-label={loginCopy.totpLabel}
                  spellCheck={false}
                  required
                />
              </label>
            )}

            {step === 'password-reset' && (
              <>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">{loginCopy.newPasswordLabel}</span>
                  <input
                    autoFocus
                    name="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder={loginCopy.passwordPlaceholder}
                    autoComplete="new-password"
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">{loginCopy.confirmNewPasswordLabel}</span>
                  <input
                    name="newPasswordConfirm"
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(event) => setNewPasswordConfirm(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder={loginCopy.confirmNewPasswordPlaceholder}
                    autoComplete="new-password"
                    required
                  />
                </label>
              </>
            )}

            {errorMessage && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {errorMessage}
              </div>
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

      {talentSelector ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" aria-hidden="true" />
          <section
            ref={talentSelectorRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-login-talent-selector-title"
            aria-describedby="post-login-talent-selector-description"
            tabIndex={-1}
            className="relative max-h-[min(42rem,calc(100vh-3rem))] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_120px_-45px_rgba(15,23,42,0.7)] outline-none sm:p-8"
          >
            <div className="space-y-2">
              <h2 id="post-login-talent-selector-title" className="text-2xl font-semibold text-slate-950">
                {postLoginSelectorCopy.title}
              </h2>
              <p id="post-login-talent-selector-description" className="text-sm leading-6 text-slate-600">
                {postLoginSelectorCopy.description}
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              {talentSelector.talents.map((talent, index) => (
                <button
                  key={talent.id}
                  ref={index === 0 ? firstTalentButtonRef : undefined}
                  type="button"
                  aria-label={postLoginSelectorCopy.openTalentAriaLabel(talent.displayName)}
                  onClick={() => openSelectedTalent(talent.id)}
                  className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  <span className="min-w-0 space-y-1">
                    <span className="block truncate text-sm font-semibold text-slate-950">{talent.displayName}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {talent.subsidiaryName ? `${talent.subsidiaryName} · ${talent.code}` : talent.code}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                    {postLoginSelectorCopy.publishedLabel}
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

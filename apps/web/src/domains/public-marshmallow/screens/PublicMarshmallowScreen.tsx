'use client';

import {
  resolveTrilingualLocaleFamily,
  type SupportedUiLocale,
} from '@tcrn/shared';
import { Send, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  type PublicMarshmallowConfigResponse,
  type PublicMarshmallowMessageRecord,
  readPublicMarshmallowConfig,
  readPublicMarshmallowMessages,
  submitPublicMarshmallowMessage,
  togglePublicMarshmallowReaction,
} from '@/domains/public-marshmallow/api/public-marshmallow.api';
import { PublicMarshmallowMessageCard } from '@/domains/public-marshmallow/components/PublicMarshmallowMessageCard';
import { PublicMarshmallowNotice } from '@/domains/public-marshmallow/components/PublicMarshmallowNotice';
import { TurnstileWidget } from '@/domains/public-marshmallow/components/TurnstileWidget';
import { derivePublicMarshmallowThemeSurface } from '@/domains/public-marshmallow/public-marshmallow-theme';
import {
  PublicPresenceBadge,
  PublicPresenceHero,
  PublicPresenceShell,
  PublicPresenceStateView,
  PublicPresenceSurface,
} from '@/domains/public-presence';
import { ApiRequestError } from '@/platform/http/api';
import { type RuntimeLocale, useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleNumber,
  pickLocaleText,
} from '@/platform/runtime/locale/locale-text';

interface NoticeState {
  tone: 'success' | 'error' | 'info';
  message: string;
}

type MarshmallowLocale = SupportedUiLocale | RuntimeLocale;

function getApiErrorMessage(reason: unknown) {
  if (!(reason instanceof ApiRequestError)) {
    return null;
  }

  return reason.message && reason.message !== 'Request failed' ? reason.message : null;
}

function getErrorMessage(reason: unknown, fallback: string) {
  return getApiErrorMessage(reason) ?? fallback;
}

function isUnavailableError(reason: unknown) {
  return reason instanceof ApiRequestError && reason.status === 404;
}

function asFilledString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function getFingerprintStorageKey(path: string) {
  return `tcrn.public.marshmallow.fingerprint.${path}`;
}

function createFingerprint() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `fp_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  return `fp_${Math.random().toString(36).slice(2, 12)}`;
}

function readOrCreateFingerprint(path: string) {
  if (typeof window === 'undefined') {
    return createFingerprint();
  }

  const key = getFingerprintStorageKey(path);
  const existing = window.localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const nextValue = createFingerprint();
  window.localStorage.setItem(key, nextValue);
  return nextValue;
}

function pickLocalizedLegalCopy(
  source: PublicMarshmallowConfigResponse['terms'] | PublicMarshmallowConfigResponse['privacy'],
  locale: MarshmallowLocale,
) {
  const localeFamily = resolveTrilingualLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return asFilledString(source.zh) || asFilledString(source.en) || asFilledString(source.ja) || null;
  }

  if (localeFamily === 'ja') {
    return asFilledString(source.ja) || asFilledString(source.en) || asFilledString(source.zh) || null;
  }

  return asFilledString(source.en) || asFilledString(source.zh) || asFilledString(source.ja) || null;
}

function formatLoadedCount(count: number, locale: MarshmallowLocale, label: string) {
  const formattedCount = formatLocaleNumber(locale, count);

  return pickLocaleText(locale, {
    en: `${formattedCount} message${count === 1 ? '' : 's'} ${label}`,
    zh_HANS: `${label} ${formattedCount} 条消息`,
    zh_HANT: `${label} ${formattedCount} 則訊息`,
    ja: `${label} ${formattedCount}件のメッセージ`,
    ko: `${label} ${formattedCount}개 메시지`,
    fr: `${formattedCount} message${count === 1 ? '' : 's'} ${label}`,
  });
}

function formatVisibleCount(count: number, locale: MarshmallowLocale) {
  const formattedCount = formatLocaleNumber(locale, count);

  return pickLocaleText(locale, {
    en: `${formattedCount} currently visible`,
    zh_HANS: `当前可见 ${formattedCount} 条`,
    zh_HANT: `目前可見 ${formattedCount} 則`,
    ja: `現在表示中 ${formattedCount} 件`,
    ko: `현재 ${formattedCount}개 표시 중`,
    fr: `${formattedCount} actuellement visibles`,
  });
}

function formatCharacterCount(current: number, maximum: number, locale: MarshmallowLocale) {
  const formattedCurrent = formatLocaleNumber(locale, current);
  const formattedMaximum = formatLocaleNumber(locale, maximum);

  return pickLocaleText(locale, {
    en: `${formattedCurrent}/${formattedMaximum} characters`,
    zh_HANS: `已输入 ${formattedCurrent}/${formattedMaximum} 个字符`,
    zh_HANT: `已輸入 ${formattedCurrent}/${formattedMaximum} 個字元`,
    ja: `${formattedCurrent}/${formattedMaximum} 文字`,
    ko: `${formattedCurrent}/${formattedMaximum}자`,
    fr: `${formattedCurrent}/${formattedMaximum} caractères`,
  });
}

function formatCaptchaMode(
  mode: PublicMarshmallowConfigResponse['captchaMode'],
  copy: ReturnType<typeof useRuntimeLocale>['copy']['publicMarshmallow'],
) {
  switch (mode) {
    case 'always':
      return copy.captchaModeAlways;
    case 'auto':
      return copy.captchaModeAuto;
    default:
      return copy.captchaModeNever;
  }
}

export function PublicMarshmallowScreen({
  path,
  turnstileSiteKey,
}: Readonly<{
  path: string;
  turnstileSiteKey: string;
}>) {
  const { copy, selectedLocale } = useRuntimeLocale();
  const [config, setConfig] = useState<PublicMarshmallowConfigResponse | null>(null);
  const [messages, setMessages] = useState<PublicMarshmallowMessageRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [pendingReaction, setPendingReaction] = useState<string | null>(null);
  const [senderName, setSenderName] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [honeypot, setHoneypot] = useState('');
  const [fingerprint, setFingerprint] = useState(() => readOrCreateFingerprint(path));
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const messageFeedFailedRef = useRef(copy.publicMarshmallow.messageFeedFailed);

  useEffect(() => {
    setFingerprint(readOrCreateFingerprint(path));
  }, [path]);

  useEffect(() => {
    messageFeedFailedRef.current = copy.publicMarshmallow.messageFeedFailed;
  }, [copy.publicMarshmallow.messageFeedFailed]);

  useEffect(() => {
    let cancelled = false;

    async function loadSurface() {
      setLoading(true);
      setError(null);
      setIsUnavailable(false);

      const [configResult, messagesResult] = await Promise.allSettled([
        readPublicMarshmallowConfig(path),
        readPublicMarshmallowMessages(path, {
          fingerprint,
          limit: 20,
        }),
      ]);

      if (cancelled) {
        return;
      }

      if (configResult.status !== 'fulfilled') {
        const unavailable = isUnavailableError(configResult.reason);
        setConfig(null);
        setMessages([]);
        setCursor(null);
        setHasMore(false);
        setIsUnavailable(unavailable);
        setError(getApiErrorMessage(configResult.reason));
        setLoading(false);
        return;
      }

      setConfig(configResult.value);
      setIsAnonymous(configResult.value.allowAnonymous);

      if (messagesResult.status === 'fulfilled') {
        setMessages(messagesResult.value.messages);
        setCursor(messagesResult.value.cursor);
        setHasMore(messagesResult.value.hasMore);
      } else {
        setMessages([]);
        setCursor(null);
        setHasMore(false);
        setNotice({
          tone: 'error',
          message: getApiErrorMessage(messagesResult.reason) ?? messageFeedFailedRef.current,
        });
      }

      setLoading(false);
    }

    void loadSurface();

    return () => {
      cancelled = true;
    };
  }, [fingerprint, path]);

  const theme = useMemo(() => derivePublicMarshmallowThemeSurface(config?.theme || {}), [config?.theme]);
  const localizedTerms = useMemo(
    () => (config ? pickLocalizedLegalCopy(config.terms, selectedLocale) : null),
    [config, selectedLocale],
  );
  const localizedPrivacy = useMemo(
    () => (config ? pickLocalizedLegalCopy(config.privacy, selectedLocale) : null),
    [config, selectedLocale],
  );
  const captchaRuntimeBypass = config?.turnstile?.runtimeBypass === true;
  const requiresCaptchaWidget = config?.captchaMode !== 'never' && !captchaRuntimeBypass;
  const turnstileRuntimeReady = config?.turnstile?.ready ?? true;
  const effectiveTurnstileSiteKey = config?.turnstile?.siteKey || turnstileSiteKey;
  const cannotSubmitDueToMissingCaptcha = Boolean(
    config && requiresCaptchaWidget && (!effectiveTurnstileSiteKey || !turnstileRuntimeReady),
  );

  async function refreshMessages(options: { append?: boolean; nextCursor?: string | null; cacheBust?: string } = {}) {
    const result = await readPublicMarshmallowMessages(path, {
      fingerprint,
      limit: 20,
      cursor: options.nextCursor || undefined,
      cacheBust: options.cacheBust,
    });

    setMessages((current) => (options.append ? [...current, ...result.messages] : result.messages));
    setCursor(result.cursor);
    setHasMore(result.hasMore);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!config) {
      return;
    }

    if (cannotSubmitDueToMissingCaptcha) {
      setNotice({
        tone: 'error',
        message: copy.publicMarshmallow.missingCaptchaError,
      });
      return;
    }

    if (requiresCaptchaWidget && !turnstileToken) {
      setNotice({
        tone: 'error',
        message: copy.publicMarshmallow.completeCaptchaError,
      });
      return;
    }

    setPendingSubmit(true);
    setNotice(null);

    try {
      const result = await submitPublicMarshmallowMessage(path, {
        content,
        senderName: isAnonymous ? undefined : senderName.trim() || undefined,
        isAnonymous,
        fingerprint,
        honeypot,
        turnstileToken: turnstileToken || undefined,
      });

      setContent('');
      setSenderName('');
      setHoneypot('');
      setTurnstileToken(null);
      setTurnstileResetSignal((current) => current + 1);
      await refreshMessages({
        cacheBust: String(Date.now()),
      });
      setNotice({
        tone: 'success',
        message: result.message,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.publicMarshmallow.submitFailed),
      });
    } finally {
      setPendingSubmit(false);
    }
  }

  async function handleLoadMore() {
    if (!hasMore || !cursor) {
      return;
    }

    setLoadingMore(true);

    try {
      await refreshMessages({
        append: true,
        nextCursor: cursor,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.publicMarshmallow.loadOlderFailed),
      });
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleReaction(messageId: string, reaction: string) {
    if (!config?.reactionsEnabled) {
      return;
    }

    const reactionKey = `${messageId}:${reaction}`;
    setPendingReaction(reactionKey);

    try {
      const result = await togglePublicMarshmallowReaction(messageId, {
        reaction,
        fingerprint,
      });

      setMessages((current) =>
        current.map((message) => {
          if (message.id !== messageId) {
            return message;
          }

          const currentUserReactions = new Set(message.userReactions);

          if (result.added) {
            currentUserReactions.add(reaction);
          } else {
            currentUserReactions.delete(reaction);
          }

          return {
            ...message,
            reactionCounts: result.counts,
            userReactions: [...currentUserReactions],
          };
        }),
      );
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.publicMarshmallow.reactionUpdateFailed),
      });
    } finally {
      setPendingReaction(null);
    }
  }

  if (loading && !config) {
    return (
      <PublicPresenceShell contentClassName="flex min-h-[70vh] items-center" decorationDensity="calm">
        <div className="w-full space-y-5">
          <PublicPresenceSurface className="p-8">
            <PublicPresenceBadge icon={<Sparkles />} tone="rose">
              {copy.publicMarshmallow.loading}
            </PublicPresenceBadge>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="h-40 animate-pulse rounded-lg bg-white/70" />
              <div className="h-40 animate-pulse rounded-lg bg-white/70" />
            </div>
          </PublicPresenceSurface>
        </div>
      </PublicPresenceShell>
    );
  }

  if (!config) {
    return (
      <PublicPresenceShell
        contentClassName="flex min-h-[70vh] items-center justify-center"
        decorationDensity="calm"
        width="sm"
      >
          <PublicPresenceStateView
            tone={isUnavailable ? 'unavailable' : 'error'}
            title={isUnavailable ? copy.publicMarshmallow.unavailableTitle : copy.publicMarshmallow.failedTitle}
            description={
              isUnavailable
                ? copy.publicMarshmallow.unavailableDescription
                : error || copy.publicMarshmallow.failedDescription
            }
          />
      </PublicPresenceShell>
    );
  }

  return (
    <PublicPresenceShell decorationDensity="calm" style={{ background: theme.pageBackground }}>
      <div className="space-y-8">
        <PublicPresenceSurface className="overflow-hidden p-8" style={{ backgroundColor: theme.panelBackground }}>
          <PublicPresenceHero
            badge={(
              <PublicPresenceBadge icon={<Sparkles />} tone="rose">
                {copy.publicMarshmallow.badge}
              </PublicPresenceBadge>
            )}
            title={config.title || `${config.talent.displayName} ${copy.publicMarshmallow.titleSuffix}`}
            description={config.welcomeText ? <p>{config.welcomeText}</p> : null}
            meta={(
              <>
                <PublicPresenceBadge tone={config.allowAnonymous ? 'rose' : 'slate'} variant="outline">
                  {config.allowAnonymous ? copy.publicMarshmallow.anonymousBadgeAllowed : copy.publicMarshmallow.namedOnlyBadge}
                </PublicPresenceBadge>
                <PublicPresenceBadge tone="sky" variant="outline">
                  {copy.publicMarshmallow.captchaModeLabel}: {formatCaptchaMode(config.captchaMode, copy.publicMarshmallow)}
                </PublicPresenceBadge>
                <PublicPresenceBadge tone="amber" variant="outline">
                  {formatLoadedCount(messages.length, selectedLocale, copy.publicMarshmallow.loadedCountLabel)}
                </PublicPresenceBadge>
              </>
            )}
            media={config.talent.avatarUrl ? (
              <img
                src={config.talent.avatarUrl}
                alt={`${config.talent.displayName} ${copy.publicMarshmallow.avatarSuffix}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-5xl font-semibold text-slate-500">
                {config.talent.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          />
        </PublicPresenceSurface>

        {notice ? <PublicMarshmallowNotice tone={notice.tone} message={notice.message} /> : null}
        {cannotSubmitDueToMissingCaptcha ? (
          <PublicMarshmallowNotice
            tone="info"
            message={copy.publicMarshmallow.missingCaptchaDisabledNotice}
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <PublicPresenceSurface variant="note" className="p-6" style={{ backgroundColor: theme.noteBackground }}>
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-500">{copy.publicMarshmallow.sendSectionEyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{copy.publicMarshmallow.sendSectionTitle}</h2>
              </div>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label htmlFor="public-marshmallow-message" className="text-sm font-medium text-slate-700">
                    {copy.publicMarshmallow.messageLabel}
                  </label>
                  <textarea
                    id="public-marshmallow-message"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder={config.placeholderText || copy.publicMarshmallow.messagePlaceholder}
                    minLength={config.minMessageLength}
                    maxLength={config.maxMessageLength}
                    rows={7}
                    className="w-full rounded-lg border border-rose-100 bg-white/85 px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100 motion-reduce:transition-none"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    {formatCharacterCount(content.length, config.maxMessageLength, selectedLocale)}
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-rose-100 bg-white/70 px-4 py-3">
                  <input
                    id="public-marshmallow-anonymous"
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(event) => setIsAnonymous(event.target.checked)}
                    disabled={!config.allowAnonymous}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor="public-marshmallow-anonymous" className="text-sm text-slate-700">
                    {copy.publicMarshmallow.submitAnonymously}
                  </label>
                </div>

                {!isAnonymous ? (
                  <div className="space-y-2">
                    <label htmlFor="public-marshmallow-sender" className="text-sm font-medium text-slate-700">
                      {copy.publicMarshmallow.displayNameLabel}
                    </label>
                    <input
                      id="public-marshmallow-sender"
                      value={senderName}
                      onChange={(event) => setSenderName(event.target.value)}
                      className="w-full rounded-lg border border-rose-100 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100 motion-reduce:transition-none"
                      maxLength={64}
                      required={!isAnonymous}
                    />
                  </div>
                ) : null}

                <input
                  tabIndex={-1}
                  aria-hidden="true"
                  autoComplete="off"
                  className="hidden"
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                  name="homepage"
                />

                {requiresCaptchaWidget && effectiveTurnstileSiteKey && turnstileRuntimeReady ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">{copy.publicMarshmallow.turnstileLabel}</p>
                    <TurnstileWidget
                      siteKey={effectiveTurnstileSiteKey}
                      resetSignal={turnstileResetSignal}
                      onTokenChange={setTurnstileToken}
                    />
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={pendingSubmit || cannotSubmitDueToMissingCaptcha}
                  className="inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  style={{ backgroundColor: theme.accentColor, color: theme.accentText }}
                >
                  <Send className="h-4 w-4" />
                  {pendingSubmit ? copy.publicMarshmallow.sendButtonPending : copy.publicMarshmallow.sendButton}
                </button>
              </form>
            </div>
          </PublicPresenceSurface>

          <div className="space-y-5">
            <PublicPresenceSurface className="p-6" style={{ backgroundColor: theme.panelBackground }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{copy.publicMarshmallow.feedEyebrow}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">{copy.publicMarshmallow.feedTitle}</h2>
                </div>
                <div className="text-right text-sm text-slate-500">{formatVisibleCount(messages.length, selectedLocale)}</div>
              </div>
            </PublicPresenceSurface>

            {messages.length === 0 ? (
              <PublicPresenceStateView
                tone="neutral"
                title={copy.publicMarshmallow.emptyTitle}
                description={copy.publicMarshmallow.emptyDescription}
              />
            ) : (
              messages.map((message) => (
                <PublicMarshmallowMessageCard
                  key={message.id}
                  message={message}
                  accentColor={theme.accentColor}
                  locale={selectedLocale}
                  copy={copy.publicMarshmallow}
                  reactionsEnabled={config.reactionsEnabled}
                  allowedReactions={config.allowedReactions}
                  pendingReaction={pendingReaction}
                  onReact={handleReaction}
                />
              ))
            )}

            {hasMore ? (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void handleLoadMore()}
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              >
                {loadingMore ? copy.publicMarshmallow.loadMorePending : copy.publicMarshmallow.loadMore}
              </button>
            ) : null}
          </div>
        </div>

        {(localizedTerms || localizedPrivacy) ? (
          <PublicPresenceSurface className="p-6" style={{ backgroundColor: theme.panelBackground }}>
            <div className="grid gap-6 md:grid-cols-2">
              {localizedTerms ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500">{copy.publicMarshmallow.termsLabel}</p>
                  <div className="space-y-3 text-sm leading-7 text-slate-700">
                    <p>{localizedTerms}</p>
                  </div>
                </div>
              ) : null}
              {localizedPrivacy ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500">{copy.publicMarshmallow.privacyLabel}</p>
                  <div className="space-y-3 text-sm leading-7 text-slate-700">
                    <p>{localizedPrivacy}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </PublicPresenceSurface>
        ) : null}
      </div>
    </PublicPresenceShell>
  );
}

'use client';

import {
  resolveTrilingualLocaleFamily,
  type SupportedUiLocale,
} from '@tcrn/shared';
import { Send, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  type PublicMarshmallowConfigResponse,
  type PublicMarshmallowMessageRecord,
  readPublicMarshmallowConfig,
  readPublicMarshmallowMessages,
  submitPublicMarshmallowMessage,
  togglePublicMarshmallowReaction,
} from '@/domains/public-marshmallow/api/public-marshmallow.api';
import { TurnstileWidget } from '@/domains/public-marshmallow/components/TurnstileWidget';
import { ApiRequestError } from '@/platform/http/api';
import { type RuntimeLocale, useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  formatLocaleNumber,
  pickLocaleText,
} from '@/platform/runtime/locale/locale-text';
import { GlassSurface, StateView } from '@/platform/ui';

interface NoticeState {
  tone: 'success' | 'error' | 'info';
  message: string;
}

type MarshmallowLocale = SupportedUiLocale | RuntimeLocale;

function getErrorMessage(reason: unknown, fallback: string) {
  if (!(reason instanceof ApiRequestError)) {
    return fallback;
  }

  return reason.message && reason.message !== 'Request failed' ? reason.message : fallback;
}

function isUnavailableError(reason: unknown) {
  return reason instanceof ApiRequestError && reason.status === 404;
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
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
    ja: `${formattedCount}件のメッセージを${label}`,
    ko: `메시지 ${formattedCount}개 ${label}`,
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

function formatReplyHeading(replyLabel: string, repliedBy: string | null, locale: MarshmallowLocale) {
  if (!repliedBy) {
    return replyLabel;
  }

  return pickLocaleText(locale, {
    en: `${replyLabel} by ${repliedBy}`,
    zh_HANS: `${replyLabel} · ${repliedBy}`,
    zh_HANT: `${replyLabel} · ${repliedBy}`,
    ja: `${replyLabel} · ${repliedBy}`,
    ko: `${replyLabel} · ${repliedBy}`,
    fr: `${replyLabel} par ${repliedBy}`,
  });
}

function formatAttachmentAlt(index: number, locale: MarshmallowLocale) {
  const order = formatLocaleNumber(locale, index + 1);

  return pickLocaleText(locale, {
    en: `Attachment ${order}`,
    zh_HANS: `附件 ${order}`,
    zh_HANT: `附件 ${order}`,
    ja: `添付画像 ${order}`,
    ko: `첨부 이미지 ${order}`,
    fr: `Pièce jointe ${order}`,
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

function deriveThemeSurface(rawTheme: Record<string, unknown>) {
  const theme = asRecord(rawTheme);

  return {
    pageBackground:
      asString(theme.backgroundColor) ||
      'linear-gradient(180deg, rgba(253, 242, 248, 1) 0%, rgba(239, 246, 255, 1) 100%)',
    panelBackground: asString(theme.cardBackground) || 'rgba(255, 255, 255, 0.78)',
    accentColor: asString(theme.accentColor) || '#9333ea',
    accentText: asString(theme.accentTextColor) || '#ffffff',
  };
}

function NoticeBanner({
  tone,
  message,
}: Readonly<{
  tone: NoticeState['tone'];
  message: string;
}>) {
  const toneClasses =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'info'
        ? 'border-sky-200 bg-sky-50 text-sky-800'
        : 'border-rose-200 bg-rose-50 text-rose-800';

  return <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClasses}`}>{message}</div>;
}

function MessageCard({
  message,
  accentColor,
  locale,
  copy,
  reactionsEnabled,
  allowedReactions,
  onReact,
  pendingReaction,
}: Readonly<{
  message: PublicMarshmallowMessageRecord;
  accentColor: string;
  locale: MarshmallowLocale;
  copy: ReturnType<typeof useRuntimeLocale>['copy']['publicMarshmallow'];
  reactionsEnabled: boolean;
  allowedReactions: string[];
  onReact: (messageId: string, reaction: string) => Promise<void>;
  pendingReaction: string | null;
}>) {
  const activeReactions = new Set(message.userReactions);
  const visibleReactions = allowedReactions.length > 0 ? allowedReactions : Object.keys(message.reactionCounts);

  return (
    <GlassSurface variant="solid" className="p-5">
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        <span>{message.isAnonymous ? copy.anonymousSender : message.senderName || copy.namedFanFallback}</span>
        <span>{formatLocaleDateTime(locale, message.createdAt, message.createdAt)}</span>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-800">{message.content}</p>
      {message.imageUrls.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {message.imageUrls.map((url, index) => (
            <img
              key={`${url}-${index}`}
              src={url}
              alt={formatAttachmentAlt(index, locale)}
              className="h-40 w-full rounded-2xl object-cover"
            />
          ))}
        </div>
      ) : null}
      {message.replyContent ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {formatReplyHeading(copy.replyLabel, message.repliedBy?.displayName || null, locale)}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{message.replyContent}</p>
        </div>
      ) : null}
      {reactionsEnabled && visibleReactions.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {visibleReactions.map((reaction) => {
            const isActive = activeReactions.has(reaction);
            const count = message.reactionCounts[reaction] || 0;
            const disabled = pendingReaction === `${message.id}:${reaction}`;

            return (
              <button
                key={reaction}
                type="button"
                disabled={disabled}
                onClick={() => void onReact(message.id, reaction)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? 'border-transparent text-white'
                    : 'border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white'
                } disabled:cursor-not-allowed disabled:opacity-60`}
                style={isActive ? { backgroundColor: accentColor } : undefined}
              >
                <span>{reaction}</span>
                <span>{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </GlassSurface>
  );
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

  useEffect(() => {
    setFingerprint(readOrCreateFingerprint(path));
  }, [path]);

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
        setError(
          getErrorMessage(
            configResult.reason,
            unavailable ? copy.publicMarshmallow.unavailableDescription : copy.publicMarshmallow.failedDescription,
          ),
        );
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
          message: getErrorMessage(messagesResult.reason, copy.publicMarshmallow.messageFeedFailed),
        });
      }

      setLoading(false);
    }

    void loadSurface();

    return () => {
      cancelled = true;
    };
  }, [
    copy.publicMarshmallow.failedDescription,
    copy.publicMarshmallow.messageFeedFailed,
    copy.publicMarshmallow.unavailableDescription,
    fingerprint,
    path,
  ]);

  const theme = useMemo(() => deriveThemeSurface(config?.theme || {}), [config?.theme]);
  const localizedTerms = useMemo(
    () => (config ? pickLocalizedLegalCopy(config.terms, selectedLocale) : null),
    [config, selectedLocale],
  );
  const localizedPrivacy = useMemo(
    () => (config ? pickLocalizedLegalCopy(config.privacy, selectedLocale) : null),
    [config, selectedLocale],
  );
  const requiresCaptchaWidget = config?.captchaMode !== 'never';
  const cannotSubmitDueToMissingCaptcha = Boolean(config && requiresCaptchaWidget && !turnstileSiteKey);

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
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-4xl space-y-5">
          <GlassSurface variant="solid" className="p-8">
            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Sparkles className="h-4 w-4" />
              {copy.publicMarshmallow.loading}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="h-40 animate-pulse rounded-3xl bg-slate-200/70" />
              <div className="h-40 animate-pulse rounded-3xl bg-slate-200/70" />
            </div>
          </GlassSurface>
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">
          <StateView
            status={isUnavailable ? 'unavailable' : 'error'}
            title={isUnavailable ? copy.publicMarshmallow.unavailableTitle : copy.publicMarshmallow.failedTitle}
            description={
              error ||
              (isUnavailable
                ? copy.publicMarshmallow.unavailableDescription
                : copy.publicMarshmallow.failedDescription)
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-10 md:py-14" style={{ background: theme.pageBackground }}>
      <div className="mx-auto max-w-6xl space-y-8">
        <GlassSurface variant="solid" className="overflow-hidden p-8" style={{ backgroundColor: theme.panelBackground }}>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white" style={{ backgroundColor: theme.accentColor }}>
                <Sparkles className="h-3.5 w-3.5" />
                {copy.publicMarshmallow.badge}
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                  {config.title || `${config.talent.displayName} ${copy.publicMarshmallow.titleSuffix}`}
                </h1>
                {config.welcomeText ? (
                  <p className="max-w-3xl text-base leading-8 text-slate-600">{config.welcomeText}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                <span className="rounded-full bg-white/70 px-3 py-2">
                  {config.allowAnonymous ? copy.publicMarshmallow.anonymousBadgeAllowed : copy.publicMarshmallow.namedOnlyBadge}
                </span>
                <span className="rounded-full bg-white/70 px-3 py-2">
                  {copy.publicMarshmallow.captchaModeLabel}: {formatCaptchaMode(config.captchaMode, copy.publicMarshmallow)}
                </span>
                <span className="rounded-full bg-white/70 px-3 py-2">
                  {formatLoadedCount(messages.length, selectedLocale, copy.publicMarshmallow.loadedCountLabel)}
                </span>
              </div>
            </div>
            <div className="flex items-start justify-start lg:justify-end">
              <div className="h-44 w-44 overflow-hidden rounded-[34px] border border-white/80 bg-slate-200 shadow-xl">
                {config.talent.avatarUrl ? (
                  <img
                    src={config.talent.avatarUrl}
                    alt={`${config.talent.displayName} ${copy.publicMarshmallow.avatarSuffix}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-slate-500">
                    {config.talent.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassSurface>

        {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}
        {cannotSubmitDueToMissingCaptcha ? (
          <NoticeBanner
            tone="info"
            message={copy.publicMarshmallow.missingCaptchaDisabledNotice}
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <GlassSurface variant="solid" className="p-6" style={{ backgroundColor: theme.panelBackground }}>
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.publicMarshmallow.sendSectionEyebrow}</p>
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
                    className="w-full rounded-3xl border border-slate-200 bg-white/80 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    {formatCharacterCount(content.length, config.maxMessageLength, selectedLocale)}
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
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
                      className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
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

                {requiresCaptchaWidget && turnstileSiteKey ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">{copy.publicMarshmallow.turnstileLabel}</p>
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      resetSignal={turnstileResetSignal}
                      onTokenChange={setTurnstileToken}
                    />
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={pendingSubmit || cannotSubmitDueToMissingCaptcha}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: theme.accentColor, color: theme.accentText }}
                >
                  <Send className="h-4 w-4" />
                  {pendingSubmit ? copy.publicMarshmallow.sendButtonPending : copy.publicMarshmallow.sendButton}
                </button>
              </form>
            </div>
          </GlassSurface>

          <div className="space-y-5">
            <GlassSurface variant="solid" className="p-6" style={{ backgroundColor: theme.panelBackground }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.publicMarshmallow.feedEyebrow}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">{copy.publicMarshmallow.feedTitle}</h2>
                </div>
                <div className="text-right text-sm text-slate-500">{formatVisibleCount(messages.length, selectedLocale)}</div>
              </div>
            </GlassSurface>

            {messages.length === 0 ? (
              <StateView
                status="empty"
                title={copy.publicMarshmallow.emptyTitle}
                description={copy.publicMarshmallow.emptyDescription}
              />
            ) : (
              messages.map((message) => (
                <MessageCard
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
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? copy.publicMarshmallow.loadMorePending : copy.publicMarshmallow.loadMore}
              </button>
            ) : null}
          </div>
        </div>

        {(localizedTerms || localizedPrivacy) ? (
          <GlassSurface variant="solid" className="p-6" style={{ backgroundColor: theme.panelBackground }}>
            <div className="grid gap-6 md:grid-cols-2">
              {localizedTerms ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.publicMarshmallow.termsLabel}</p>
                  <div className="space-y-3 text-sm leading-7 text-slate-700">
                    <p>{localizedTerms}</p>
                  </div>
                </div>
              ) : null}
              {localizedPrivacy ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.publicMarshmallow.privacyLabel}</p>
                  <div className="space-y-3 text-sm leading-7 text-slate-700">
                    <p>{localizedPrivacy}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </GlassSurface>
        ) : null}
      </div>
    </main>
  );
}

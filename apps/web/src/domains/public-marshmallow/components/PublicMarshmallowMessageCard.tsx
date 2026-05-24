import type { SupportedUiLocale } from '@tcrn/shared';

import { type PublicMarshmallowMessageRecord } from '@/domains/public-marshmallow/api/public-marshmallow.api';
import { PublicPresenceBadge, PublicPresenceSurface } from '@/domains/public-presence';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  formatLocaleNumber,
  pickLocaleText,
} from '@/platform/runtime/locale/locale-text';

type MarshmallowLocale = SupportedUiLocale;
type PublicMarshmallowCopy = ReturnType<typeof useUiLocale>['copy']['publicMarshmallow'];

function formatReplyHeading(
  replyLabel: string,
  repliedBy: string | null,
  locale: MarshmallowLocale
) {
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

export function PublicMarshmallowMessageCard({
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
  copy: PublicMarshmallowCopy;
  reactionsEnabled: boolean;
  allowedReactions: string[];
  onReact: (messageId: string, reaction: string) => Promise<void>;
  pendingReaction: string | null;
}>) {
  const activeReactions = new Set(message.userReactions);
  const visibleReactions =
    allowedReactions.length > 0 ? allowedReactions : Object.keys(message.reactionCounts);

  return (
    <PublicPresenceSurface as="article" variant="note" className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <PublicPresenceBadge tone="rose">
          {message.isAnonymous ? copy.anonymousSender : message.senderName || copy.namedFanFallback}
        </PublicPresenceBadge>
        <span className="text-xs font-medium text-slate-500">
          {formatLocaleDateTime(locale, message.createdAt, message.createdAt)}
        </span>
      </div>
      <p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-slate-800">{message.content}</p>
      {message.imageUrls.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {message.imageUrls.map((url, index) => (
            <img
              key={`${url}-${index}`}
              src={url}
              alt={formatAttachmentAlt(index, locale)}
              className="h-40 w-full rounded-lg object-cover"
            />
          ))}
        </div>
      ) : null}
      {message.replyContent ? (
        <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50/70 px-4 py-3">
          <p className="text-xs font-semibold text-sky-800">
            {formatReplyHeading(copy.replyLabel, message.repliedBy?.displayName || null, locale)}
          </p>
          <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-slate-700">
            {message.replyContent}
          </p>
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
                aria-pressed={isActive}
                disabled={disabled}
                onClick={() => void onReact(message.id, reaction)}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition focus:ring-2 focus:ring-rose-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
                  isActive
                    ? 'border-transparent text-white'
                    : 'border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white'
                }`}
                style={isActive ? { backgroundColor: accentColor } : undefined}
              >
                <span>{reaction}</span>
                <span>{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </PublicPresenceSurface>
  );
}

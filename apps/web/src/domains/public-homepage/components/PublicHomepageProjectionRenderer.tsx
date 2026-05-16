'use client';

import {
  DEFAULT_THEME,
  normalizeTheme,
  type PublicPresenceProjectedSection,
  type PublicPresenceProjection,
  type PublicPresencePublicProjection,
  type ThemeConfig,
} from '@tcrn/shared';
import { ExternalLink, Sparkles } from 'lucide-react';
import {
  type CSSProperties,
  type ReactNode,
} from 'react';

import {
  PublicPresenceBadge,
  PublicPresenceHero,
  PublicPresenceSurface,
} from '@/domains/public-presence';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';

type PublicHomepageCopy = ReturnType<typeof useRuntimeLocale>['copy']['publicHomepage'];

function resolveBorderRadius(value: ThemeConfig['card']['borderRadius']) {
  switch (value) {
    case 'none':
      return '0px';
    case 'small':
      return '14px';
    case 'medium':
      return '22px';
    case 'large':
      return '30px';
    case 'full':
      return '999px';
    default:
      return '22px';
  }
}

function resolveShadow(value: ThemeConfig['card']['shadow']) {
  switch (value) {
    case 'none':
      return 'none';
    case 'small':
      return '0 10px 30px rgba(15, 23, 42, 0.08)';
    case 'medium':
      return '0 18px 40px rgba(15, 23, 42, 0.12)';
    case 'large':
      return '0 24px 56px rgba(15, 23, 42, 0.16)';
    case 'glow':
      return '0 18px 44px rgba(99, 102, 241, 0.22)';
    case 'soft':
      return '0 12px 36px rgba(15, 23, 42, 0.10)';
    default:
      return '0 10px 30px rgba(15, 23, 42, 0.08)';
  }
}

function SectionSurface({
  children,
  className = '',
  theme,
}: Readonly<{
  children: ReactNode;
  className?: string;
  theme: ThemeConfig;
}>) {
  return (
    <PublicPresenceSurface
      as="section"
      className={`border-white/60 ${className}`}
      style={{
        backgroundColor: theme.card.background,
        borderRadius: resolveBorderRadius(theme.card.borderRadius),
        boxShadow: resolveShadow(theme.card.shadow),
        border: theme.card.border || undefined,
        backdropFilter: theme.card.backdropBlur ? `blur(${theme.card.backdropBlur}px)` : undefined,
      }}
    >
      {children}
    </PublicPresenceSurface>
  );
}

function SectionTitle({
  title,
  theme,
}: Readonly<{
  title: string;
  theme: ThemeConfig;
}>) {
  return (
    <h2
      className="text-xl font-semibold"
      style={{ color: theme.colors.text }}
    >
      {title}
    </h2>
  );
}

function ActionLink({
  href,
  label,
}: Readonly<{
  href: string;
  label: string;
}>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {label}
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}

function resolveActionLabel(
  action: { label: string; slot: string },
  copy: PublicHomepageCopy,
) {
  const trimmed = action.label.trim();
  const isSentinel = (value: string) => trimmed === value;

  if (action.slot === 'videoFallback') {
    return !trimmed || trimmed === 'Open video' || isSentinel('__openVideo__')
      ? copy.openVideoInNewTab
      : trimmed;
  }

  if (action.slot === 'stream') {
    return !trimmed || trimmed === 'Open stream' || isSentinel('__openStream__')
      ? copy.openStream
      : trimmed;
  }

  if (action.slot === 'bilibiliProfile') {
    return (
      !trimmed
      || trimmed === 'View Bilibili dynamics'
      || isSentinel('__viewBilibiliDynamics__')
    )
      ? copy.viewBilibiliDynamics
      : trimmed;
  }

  if (
    action.slot === 'compatibility'
    || action.slot === 'currentAction'
    || (
      action.slot === 'officialChannel'
      && (trimmed === 'Official channel' || isSentinel('__officialChannel__'))
    )
  ) {
    return !trimmed || isSentinel('__openLink__') ? copy.openLink : trimmed;
  }

  return !trimmed || isSentinel('__openLink__') ? copy.openLink : trimmed;
}

function resolveCountdownTitle(
  locale: string,
  title: string,
) {
  if (title === '__debutPreview__') {
    return pickLocaleText(locale, {
      en: 'Debut preview',
      zh: '出道预告',
      ja: 'デビュー予告',
    });
  }

  if (title === '__debutReveal__') {
    return pickLocaleText(locale, {
      en: 'Debut reveal',
      zh: '出道揭晓',
      ja: 'デビュー公開',
    });
  }

  if (title === '__publicPresence__') {
    return pickLocaleText(locale, {
      en: 'Public Presence',
      zh: '公开形象页',
      ja: '公開プレゼンス',
    });
  }

  if (title === 'Reveal is live' || title === '__revealLive__') {
    return pickLocaleText(locale, {
      en: 'Reveal is live',
      zh: '揭晓已上线',
      ja: '公開中',
    });
  }

  if (title === 'Reveal countdown' || title === '__revealCountdown__') {
    return pickLocaleText(locale, {
      en: 'Reveal countdown',
      zh: '揭晓倒计时',
      ja: '公開カウントダウン',
    });
  }

  return title;
}

function resolveCountdownDescription(
  locale: string,
  description: string | null,
) {
  if (!description) {
    return null;
  }

  const [phase, ...rest] = description.split(' · ');
  const normalizedPhase = (() => {
    switch (phase) {
      case 'always':
        return pickLocaleText(locale, { en: 'Always', zh: '始终', ja: '常時' });
      case 'teaser':
        return pickLocaleText(locale, { en: 'Teaser', zh: '预热', ja: 'ティーザー' });
      case 'countdown':
        return pickLocaleText(locale, { en: 'Countdown', zh: '倒计时', ja: 'カウントダウン' });
      case 'preRevealHold':
        return pickLocaleText(locale, {
          en: 'Pre-reveal hold',
          zh: '揭晓前保持',
          ja: '公開前ホールド',
        });
      case 'revealed':
        return pickLocaleText(locale, { en: 'Revealed', zh: '已揭晓', ja: '公開済み' });
      case 'liveLaunch':
        return pickLocaleText(locale, { en: 'Live launch', zh: '正式上线', ja: '本番公開' });
      case 'postLaunch':
        return pickLocaleText(locale, { en: 'Post launch', zh: '上线后', ja: '公開後' });
      case 'expiredFallback':
        return pickLocaleText(locale, {
          en: 'Expired fallback',
          zh: '过期回退',
          ja: '期限切れフォールバック',
        });
      default:
        return phase;
    }
  })();

  return [normalizedPhase, ...rest].join(' · ');
}

function resolveSectionTitle(
  section: PublicPresenceProjectedSection,
  copy: PublicHomepageCopy,
  locale: string,
) {
  switch (section.sectionType) {
    case 'socialLinks':
      return !section.title || section.title === 'Official channels'
        ? copy.socialLinks
        : section.title;
    case 'imageGallery':
      return !section.title || section.title === 'Gallery' || section.title === '__gallery__'
        ? copy.gallery
        : section.title;
    case 'videoEmbed':
      return !section.title || section.title === 'Video' || section.title === '__video__'
        ? copy.video
        : section.title;
    case 'marshmallow':
      return !section.title || section.title === 'Marshmallow'
        ? copy.marshmallow
        : section.title;
    case 'schedule':
      return section.title || copy.schedule;
    case 'musicPlayer':
      return section.title || copy.music;
    case 'liveStatus':
      return section.title || copy.liveStatus;
    case 'bilibiliDynamic':
      return !section.title || section.title === 'Bilibili Dynamic'
        ? copy.bilibiliDynamic
        : section.title;
    case 'fallbackCard':
      if (section.kind === 'officialChannels') {
        return !section.title || section.title === 'Official channels'
          ? copy.socialLinks
          : section.title;
      }

      if (section.kind === 'firstEncounter') {
        return section.title ? resolveCountdownTitle(locale, section.title) : copy.openLink;
      }

      if (section.kind === 'countdownReveal') {
        return resolveCountdownTitle(locale, section.title);
      }

      if (section.kind === 'fanInteraction') {
        return !section.title || section.title === 'Marshmallow'
          ? copy.marshmallow
          : section.title;
      }

      if (section.kind === 'officialUpdatesFeed') {
        return !section.title || section.title === 'Bilibili Dynamic'
          ? copy.bilibiliDynamic
          : section.title;
      }

      if (section.title === 'Gallery') {
        return copy.gallery;
      }

      if (section.title === 'Video' || section.title === '__video__') {
        return copy.video;
      }

      if (
        section.title === 'Link'
        || section.title === 'Primary action'
        || section.title === 'LinkButton'
        || section.title === '__openLink__'
      ) {
        return copy.openLink;
      }

      return section.title;
    default:
      return null;
  }
}

function resolveSectionDescription(
  section: PublicPresenceProjectedSection,
  copy: PublicHomepageCopy,
  locale: string,
) {
  switch (section.sectionType) {
    case 'marshmallow':
      return !section.description
        || section.description === 'Public messages remain available on the dedicated marshmallow page.'
        ? copy.marshmallowDescription
        : section.description;
    case 'musicPlayer':
      return section.description === 'Embedded music playback is not enabled in the public projection yet.'
        ? null
        : section.description;
    case 'bilibiliDynamic':
      return !section.description
        || section.description === 'This block links to the source Bilibili profile.'
        ? copy.bilibiliDescription
        : section.description;
    case 'fallbackCard':
      if (section.kind === 'countdownReveal') {
        return resolveCountdownDescription(locale, section.description);
      }

      if (
        !section.description
        && section.kind === 'legacyCompatibility'
        && section.title !== '__openLink__'
        && section.title !== 'Link'
      ) {
        return copy.unsupportedDescription;
      }

      if (
        section.description === 'Some homepage content is shown here in a simplified view.'
      ) {
        return copy.unsupportedDescription;
      }

      if (
        section.description === 'This block links to the source Bilibili profile.'
      ) {
        return copy.bilibiliDescription;
      }

      return section.description;
    default:
      return null;
  }
}

function renderSection(
  section: PublicPresenceProjectedSection,
  theme: ThemeConfig,
  copy: PublicHomepageCopy,
  locale: string,
) {
  const primaryText = { color: theme.colors.text } as CSSProperties;
  const secondaryText = { color: theme.colors.textSecondary } as CSSProperties;

  switch (section.sectionType) {
    case 'hero':
      return (
        <SectionSurface key={section.id} theme={theme} className="p-8 md:p-10">
          <PublicPresenceHero
            badge={(
              <PublicPresenceBadge icon={<Sparkles />} tone="rose">
                {copy.badge}
              </PublicPresenceBadge>
            )}
            title={section.title}
            titleStyle={primaryText}
            description={section.description ? (
              <p style={secondaryText}>{section.description}</p>
            ) : null}
            meta={section.timezone ? (
              <PublicPresenceBadge tone="slate" variant="outline">
                {copy.timezoneLabel}: {section.timezone}
              </PublicPresenceBadge>
            ) : null}
            actions={
              section.primaryAction?.href ? (
                <ActionLink
                  href={section.primaryAction.href}
                  label={resolveActionLabel(section.primaryAction, copy)}
                />
              ) : null
            }
            media={
              section.avatar?.url ? (
                <img
                  src={section.avatar.url}
                  alt={section.avatar.alt || copy.profileAvatar}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-6xl font-semibold text-slate-500">
                  {section.title.charAt(0).toUpperCase()}
                </div>
              )
            }
          />
        </SectionSurface>
      );
    case 'profileCard':
      return (
        <SectionSurface key={section.id} theme={theme} className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            {section.avatar?.url ? (
              <img
                src={section.avatar.url}
                alt={section.avatar.alt || copy.profileAvatar}
                className="h-28 w-28 rounded-3xl object-cover"
              />
            ) : null}
            <div className="space-y-2">
              <SectionTitle
                title={section.displayName || copy.untitledProfile}
                theme={theme}
              />
              {section.bio ? (
                <p className="text-sm leading-7" style={secondaryText}>
                  {section.bio}
                </p>
              ) : null}
            </div>
          </div>
        </SectionSurface>
      );
    case 'socialLinks':
      return (
        <SectionSurface key={section.id} theme={theme} className="p-6">
          <div className="space-y-4">
            <SectionTitle
              title={resolveSectionTitle(section, copy, locale) || copy.socialLinks}
              theme={theme}
            />
            <div className="flex flex-wrap gap-3">
              {section.links.map((link) =>
                link.href ? (
                  <ActionLink
                    key={link.id}
                    href={link.href}
                    label={resolveActionLabel(link, copy)}
                  />
                ) : null,
              )}
            </div>
          </div>
        </SectionSurface>
      );
    case 'imageGallery':
      return (
        <SectionSurface key={section.id} theme={theme} className="p-6">
          <div className="space-y-4">
            <SectionTitle
              title={resolveSectionTitle(section, copy, locale) || copy.gallery}
              theme={theme}
            />
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              style={{ '--homepage-gallery-columns': section.columns } as CSSProperties}
            >
              {section.images.map((image) =>
                image.url ? (
                  <figure key={image.id} className="overflow-hidden rounded-2xl bg-white/70">
                    <img
                      src={image.url}
                      alt={image.alt || copy.galleryImageLabel}
                      className="h-56 w-full object-cover"
                    />
                    {section.showCaptions && image.alt ? (
                      <figcaption
                        className="px-4 py-3 text-sm"
                        style={secondaryText}
                      >
                        {image.alt}
                      </figcaption>
                    ) : null}
                  </figure>
                ) : null,
              )}
            </div>
          </div>
        </SectionSurface>
      );
    case 'videoEmbed':
      return (
        <SectionSurface key={section.id} theme={theme} className="p-6">
          <div className="space-y-4">
            <SectionTitle
              title={resolveSectionTitle(section, copy, locale) || copy.video}
              theme={theme}
            />
            {section.iframeSrc ? (
              <div
                className={
                  section.aspectRatio === '4:3'
                    ? 'aspect-[4/3]'
                    : section.aspectRatio === '1:1'
                      ? 'aspect-square'
                      : 'aspect-video'
                }
              >
                <iframe
                  src={section.iframeSrc}
                  title={resolveSectionTitle(section, copy, locale) || copy.embeddedVideo}
                  className="h-full w-full rounded-2xl border-0"
                  allow={section.allow || undefined}
                  loading="lazy"
                  referrerPolicy={
                    section.referrerPolicy === 'strict-origin-when-cross-origin'
                      ? 'strict-origin-when-cross-origin'
                      : undefined
                  }
                  sandbox={section.sandbox || undefined}
                  allowFullScreen
                />
              </div>
            ) : null}
            {section.fallbackAction?.href ? (
              <ActionLink
                href={section.fallbackAction.href}
                label={resolveActionLabel(section.fallbackAction, copy)}
              />
            ) : null}
          </div>
        </SectionSurface>
      );
    case 'richText':
      return (
        <SectionSurface key={section.id} theme={theme} className="p-6">
          <div
            className="prose prose-slate max-w-none prose-headings:mb-3 prose-headings:mt-0 prose-p:leading-7"
            style={{
              color: theme.colors.text,
              textAlign: section.textAlign,
            }}
            dangerouslySetInnerHTML={{ __html: section.html }}
          />
        </SectionSurface>
      );
    case 'linkButton':
      return (
        <SectionSurface key={section.id} theme={theme} className="p-6">
          {section.action.href ? (
            <ActionLink
              href={section.action.href}
              label={resolveActionLabel(section.action, copy)}
            />
          ) : null}
        </SectionSurface>
      );
    case 'marshmallow':
      return (
        <SectionSurface key={section.id} theme={theme} className="p-6">
          <div className="space-y-3">
            <SectionTitle
              title={resolveSectionTitle(section, copy, locale) || copy.marshmallow}
              theme={theme}
            />
            <p className="text-sm leading-7" style={secondaryText}>
              {resolveSectionDescription(section, copy, locale) || copy.marshmallowDescription}
            </p>
          </div>
        </SectionSurface>
      );
    case 'schedule':
      return (
        <SectionSurface key={section.id} theme={theme} className="p-6">
          <div className="space-y-4">
            <SectionTitle
              title={resolveSectionTitle(section, copy, locale) || copy.schedule}
              theme={theme}
            />
            {section.events.length === 0 ? (
              <p className="text-sm leading-7" style={secondaryText}>
                {copy.noScheduleEntries}
              </p>
            ) : (
              <div className="space-y-3">
                {section.events.map((event, index) => (
                  <div
                    key={`${section.id}-${event.day}-${event.time}-${index}`}
                    className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3"
                  >
                    <p className="text-sm font-semibold" style={primaryText}>
                      {event.title}
                    </p>
                    <p className="text-sm" style={secondaryText}>
                      {copy.dayLabel}: {event.day} · {event.time}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionSurface>
      );
    case 'musicPlayer':
      return (
        <SectionSurface key={section.id} theme={theme} className="p-6">
          <div className="space-y-3">
            <SectionTitle
              title={resolveSectionTitle(section, copy, locale) || copy.music}
              theme={theme}
            />
            {section.artist ? (
              <p className="text-sm font-medium" style={primaryText}>
                {section.artist}
              </p>
            ) : null}
            {resolveSectionDescription(section, copy, locale) ? (
              <p className="text-sm leading-7" style={secondaryText}>
                {resolveSectionDescription(section, copy, locale)}
              </p>
            ) : null}
          </div>
        </SectionSurface>
      );
    case 'liveStatus':
      return (
        <SectionSurface key={section.id} theme={theme} className="p-6">
          <div className="space-y-3">
            <SectionTitle
              title={resolveSectionTitle(section, copy, locale) || copy.liveStatus}
              theme={theme}
            />
            <p className="text-sm font-semibold" style={primaryText}>
              {section.isLive ? copy.liveNow : copy.currentlyOffline}
            </p>
            {section.viewers ? (
              <p className="text-sm" style={secondaryText}>
                {section.viewers} {copy.watchingSuffix}
              </p>
            ) : null}
            {section.streamAction?.href ? (
              <ActionLink
                href={section.streamAction.href}
                label={resolveActionLabel(section.streamAction, copy)}
              />
            ) : null}
          </div>
        </SectionSurface>
      );
    case 'divider':
      return (
        <div key={section.id} className="py-2">
          <hr
            className="border-white/70"
            style={{
              borderTopStyle: section.style,
              marginTop: section.spacing === 'large' ? '2.5rem' : section.spacing === 'small' ? '1rem' : '1.5rem',
              marginBottom: section.spacing === 'large' ? '2.5rem' : section.spacing === 'small' ? '1rem' : '1.5rem',
            }}
          />
        </div>
      );
    case 'spacer':
      return (
        <div
          key={section.id}
          style={{
            height:
              section.height === 'small'
                ? '1rem'
                : section.height === 'large'
                  ? '3rem'
                  : section.height === 'xlarge'
                    ? '5rem'
                    : '2rem',
          }}
        />
      );
    case 'bilibiliDynamic':
      return (
        <SectionSurface key={section.id} theme={theme} className="p-6">
          <div className="space-y-3">
            <SectionTitle
              title={resolveSectionTitle(section, copy, locale) || copy.bilibiliDynamic}
              theme={theme}
            />
            <p className="text-sm leading-7" style={secondaryText}>
              {resolveSectionDescription(section, copy, locale) || copy.bilibiliDescription}
            </p>
            {section.profileAction?.href ? (
              <ActionLink
                href={section.profileAction.href}
                label={resolveActionLabel(section.profileAction, copy)}
              />
            ) : null}
          </div>
        </SectionSurface>
      );
    case 'fallbackCard':
      return (
        <SectionSurface key={section.id} theme={theme} className="p-6">
          <div className="space-y-3">
            <SectionTitle
              title={resolveSectionTitle(section, copy, locale) || section.kind}
              theme={theme}
            />
            {resolveSectionDescription(section, copy, locale) ? (
              <p className="text-sm leading-7" style={secondaryText}>
                {resolveSectionDescription(section, copy, locale)}
              </p>
            ) : null}
          </div>
        </SectionSurface>
      );
    default:
      return null;
  }
}

export function PublicHomepageProjectionRenderer({
  projection,
}: Readonly<{
  projection: PublicPresencePublicProjection | PublicPresenceProjection;
}>) {
  const { copy, selectedLocale } = useRuntimeLocale();
  const theme = normalizeTheme(projection.appearance.theme || DEFAULT_THEME);

  return (
    <div className="space-y-8">
      {projection.sections.map((section) =>
        renderSection(section, theme, copy.publicHomepage, selectedLocale),
      )}
    </div>
  );
}

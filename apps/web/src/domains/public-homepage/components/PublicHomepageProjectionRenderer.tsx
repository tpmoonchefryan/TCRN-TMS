'use client';

import {
  DEFAULT_THEME,
  normalizeTheme,
  type PublicPresenceProjectedAction,
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
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';

type PublicHomepageCopy = ReturnType<typeof useUiLocale>['copy']['publicHomepage'];
type PublicHomepageResponsiveMode = 'auto' | 'desktop' | 'mobile';

type GroupedActionKind = 'currentAction' | 'fanActions' | 'goodsSupport';

interface GroupedActionSection {
  actions: PublicPresenceProjectedAction[];
  groupKind: GroupedActionKind;
  id: string;
  type: 'groupedActionSection';
}

type RenderableSection = PublicPresenceProjectedSection | GroupedActionSection;

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
      <ExternalLink aria-hidden="true" className="h-4 w-4" />
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
      zh_HANS: '出道预告',
      zh_HANT: '出道預告',
      ja: 'デビュー予告',
      ko: '데뷔 프리뷰',
      fr: 'Apercu des debuts',
    });
  }

  if (title === '__debutReveal__') {
    return pickLocaleText(locale, {
      en: 'Debut reveal',
      zh_HANS: '出道揭晓',
      zh_HANT: '出道揭曉',
      ja: 'デビュー公開',
      ko: '데뷔 공개',
      fr: 'Revelation des debuts',
    });
  }

  if (title === '__publicPresence__') {
    return pickLocaleText(locale, {
      en: 'Public Presence',
      zh_HANS: '公开形象页',
      zh_HANT: '公開形象頁',
      ja: '公開プレゼンス',
      ko: '퍼블릭 프레즌스',
      fr: 'Presence publique',
    });
  }

  if (title === 'Reveal is live' || title === '__revealLive__') {
    return pickLocaleText(locale, {
      en: 'Reveal is live',
      zh_HANS: '揭晓已上线',
      zh_HANT: '揭曉已上線',
      ja: '公開中',
      ko: '리빌이 시작되었습니다',
      fr: 'La revelation est en ligne',
    });
  }

  if (title === 'Reveal countdown' || title === '__revealCountdown__') {
    return pickLocaleText(locale, {
      en: 'Reveal countdown',
      zh_HANS: '揭晓倒计时',
      zh_HANT: '揭曉倒數計時',
      ja: '公開カウントダウン',
      ko: '리빌 카운트다운',
      fr: 'Compte a rebours avant la revelation',
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
        return pickLocaleText(locale, {
          en: 'Always',
          zh_HANS: '始终',
          zh_HANT: '始終',
          ja: '常時',
          ko: '항상',
          fr: 'Toujours',
        });
      case 'teaser':
        return pickLocaleText(locale, {
          en: 'Teaser',
          zh_HANS: '预热',
          zh_HANT: '預熱',
          ja: 'ティーザー',
          ko: '티저',
          fr: 'Teaser',
        });
      case 'countdown':
        return pickLocaleText(locale, {
          en: 'Countdown',
          zh_HANS: '倒计时',
          zh_HANT: '倒數計時',
          ja: 'カウントダウン',
          ko: '카운트다운',
          fr: 'Compte a rebours',
        });
      case 'preRevealHold':
        return pickLocaleText(locale, {
          en: 'Pre-reveal hold',
          zh_HANS: '揭晓前保持',
          zh_HANT: '揭曉前保持',
          ja: '公開前ホールド',
          ko: '리빌 전 대기',
          fr: 'Attente avant revelation',
        });
      case 'revealed':
        return pickLocaleText(locale, {
          en: 'Revealed',
          zh_HANS: '已揭晓',
          zh_HANT: '已揭曉',
          ja: '公開済み',
          ko: '공개됨',
          fr: 'Revele',
        });
      case 'liveLaunch':
        return pickLocaleText(locale, {
          en: 'Live launch',
          zh_HANS: '正式上线',
          zh_HANT: '正式上線',
          ja: '本番公開',
          ko: '라이브 공개',
          fr: 'Mise en ligne',
        });
      case 'postLaunch':
        return pickLocaleText(locale, {
          en: 'Post launch',
          zh_HANS: '上线后',
          zh_HANT: '上線後',
          ja: '公開後',
          ko: '공개 후',
          fr: 'Apres lancement',
        });
      case 'expiredFallback':
        return pickLocaleText(locale, {
          en: 'Expired fallback',
          zh_HANS: '过期回退',
          zh_HANT: '過期回退',
          ja: '期限切れフォールバック',
          ko: '만료 후 대체 상태',
          fr: 'Repli apres expiration',
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
  responsiveMode: PublicHomepageResponsiveMode,
) {
  const primaryText = { color: theme.colors.text } as CSSProperties;
  const secondaryText = { color: theme.colors.textSecondary } as CSSProperties;
  const useMobileLayout = responsiveMode === 'mobile';

  switch (section.sectionType) {
    case 'hero':
      return (
        <SectionSurface
          key={section.id}
          theme={theme}
          className={useMobileLayout ? 'p-8' : 'p-8 md:p-10'}
        >
          <PublicPresenceHero
            badge={(
              <PublicPresenceBadge icon={<Sparkles />} tone="rose">
                {copy.badge}
              </PublicPresenceBadge>
            )}
            responsiveMode={responsiveMode}
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
                  decoding="sync"
                  fetchPriority="high"
                  height={800}
                  loading="eager"
                  width={800}
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
          <div
            className={
              useMobileLayout
                ? 'flex flex-col gap-5'
                : 'flex flex-col gap-5 md:flex-row md:items-center'
            }
          >
            {section.avatar?.url ? (
              <img
                src={section.avatar.url}
                alt={section.avatar.alt || copy.profileAvatar}
                className="h-28 w-28 rounded-3xl object-cover"
                height={800}
                width={800}
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
              className={
                useMobileLayout
                  ? 'grid gap-4'
                  : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
              }
              style={{ '--homepage-gallery-columns': section.columns } as CSSProperties}
            >
              {section.images.map((image) =>
                image.url ? (
                  <figure key={image.id} className="overflow-hidden rounded-2xl bg-white/70">
                    <img
                      src={image.url}
                      alt={image.alt || copy.galleryImageLabel}
                      className="h-56 w-full object-cover"
                      height={900}
                      width={1200}
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

function resolveGroupedActionKind(
  section: PublicPresenceProjectedSection,
): GroupedActionKind | null {
  if (section.sectionType !== 'linkButton' || !section.action.href) {
    return null;
  }

  if (section.kind === 'firstEncounter' || section.kind === 'currentLaunchAction') {
    return 'currentAction';
  }

  if (section.kind === 'goodsSupport') {
    return 'goodsSupport';
  }

  if (section.kind === 'fanActions') {
    return 'fanActions';
  }

  return null;
}

function dedupeProjectedActions(actions: PublicPresenceProjectedAction[]) {
  const seen = new Set<string>();
  const deduped: PublicPresenceProjectedAction[] = [];

  for (const action of actions) {
    const key = `${action.href}::${action.label}::${action.slot}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(action);
  }

  return deduped;
}

function resolveGroupedActionTitle(
  locale: string,
  kind: GroupedActionKind,
) {
  switch (kind) {
    case 'currentAction':
      return pickLocaleText(locale, {
        en: 'Current / Next Action',
        zh_HANS: '当前 / 下一步动作',
        zh_HANT: '目前 / 下一步動作',
        ja: '今の導線 / 次のアクション',
        ko: '지금 / 다음 액션',
        fr: 'Action en cours / suivante',
      });
    case 'goodsSupport':
      return pickLocaleText(locale, {
        en: 'Goods & Support',
        zh_HANS: '商品与支持',
        zh_HANT: '商品與支持',
        ja: 'グッズとサポート',
        ko: '굿즈 및 지원',
        fr: 'Produits et soutien',
      });
    case 'fanActions':
      return pickLocaleText(locale, {
        en: 'Fan Actions',
        zh_HANS: '粉丝动作',
        zh_HANT: '粉絲動作',
        ja: 'ファンアクション',
        ko: '팬 액션',
        fr: 'Actions des fans',
      });
    default:
      return kind;
  }
}

function resolveGroupedActionDescription(
  locale: string,
  kind: GroupedActionKind,
) {
  switch (kind) {
    case 'currentAction':
      return pickLocaleText(locale, {
        en: 'Start with the stream, archive, or next moment waiting for you here.',
        zh_HANS: '从这里进入直播、回放，或下一段值得一起见证的时刻。',
        zh_HANT: '從這裡進入直播、回放，或下一段值得一起見證的時刻。',
        ja: '配信、アーカイブ、次の見どころへ、ここからすぐに入れます。',
        ko: '라이브, 아카이브, 다음 하이라이트로 여기서 바로 들어가세요.',
        fr: 'Retrouvez ici le live, l’archive ou le prochain moment a ne pas manquer.',
      });
    case 'goodsSupport':
      return pickLocaleText(locale, {
        en: 'Membership, shop, and other official support links are all together here.',
        zh_HANS: '会员、周边和其他官方支持入口都整理在这里。',
        zh_HANT: '會員、周邊和其他官方支持入口都整理在這裡。',
        ja: 'メンバーシップやグッズなど、公式サポート導線をここにまとめています。',
        ko: '멤버십, 굿즈, 기타 공식 응원 링크를 여기에서 함께 확인할 수 있습니다.',
        fr: 'Retrouvez ici l’adhesion, la boutique et les autres liens officiels de soutien.',
      });
    case 'fanActions':
      return pickLocaleText(locale, {
        en: 'More ways to cheer, follow updates, and stay close to the next stream live here.',
        zh_HANS: '更多应援方式、更新入口和下一场直播前的集合点都在这里。',
        zh_HANT: '更多應援方式、更新入口和下一場直播前的集合點都在這裡。',
        ja: '応援の導線や更新チェック、次の配信前に見ておきたい入口をここにまとめています。',
        ko: '응원 방법, 업데이트 확인, 다음 방송 전 체크할 링크를 여기에서 모아 볼 수 있습니다.',
        fr: 'Retrouvez ici plus de facons d’encourager, de suivre les nouvelles et de preparer le prochain stream.',
      });
    default:
      return null;
  }
}

function buildRenderableSections(
  sections: PublicPresenceProjectedSection[],
): RenderableSection[] {
  const renderable: RenderableSection[] = [];
  let hasGroupedCurrentAction = false;

  for (const section of sections) {
    const groupedKind = resolveGroupedActionKind(section);

    if (!groupedKind || section.sectionType !== 'linkButton') {
      renderable.push(section);
      continue;
    }

    if (groupedKind === 'currentAction') {
      hasGroupedCurrentAction = true;
    }

    const lastSection = renderable.at(-1);

    if (lastSection && 'type' in lastSection && lastSection.type === 'groupedActionSection' && lastSection.groupKind === groupedKind) {
      lastSection.actions = dedupeProjectedActions([
        ...lastSection.actions,
        section.action,
      ]);
      continue;
    }

    renderable.push({
      type: 'groupedActionSection',
      id: `${groupedKind}:${section.id}`,
      groupKind: groupedKind,
      actions: dedupeProjectedActions([section.action]),
    });
  }

  if (!hasGroupedCurrentAction) {
    return renderable;
  }

  return renderable.map((section) => {
    if ('type' in section) {
      return section;
    }

    if (section.sectionType !== 'hero') {
      return section;
    }

    return {
      ...section,
      primaryAction: null,
    };
  });
}

function renderGroupedActionSection(
  section: GroupedActionSection,
  theme: ThemeConfig,
  copy: PublicHomepageCopy,
  locale: string,
) {
  return (
    <SectionSurface key={section.id} theme={theme} className="p-6">
      <div className="space-y-4">
        <SectionTitle
          title={resolveGroupedActionTitle(locale, section.groupKind)}
          theme={theme}
        />
        {resolveGroupedActionDescription(locale, section.groupKind) ? (
          <p className="text-sm leading-7" style={{ color: theme.colors.textSecondary }}>
            {resolveGroupedActionDescription(locale, section.groupKind)}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {section.actions.map((action) =>
            action.href ? (
              <ActionLink
                key={action.id}
                href={action.href}
                label={resolveActionLabel(action, copy)}
              />
            ) : null,
          )}
        </div>
      </div>
    </SectionSurface>
  );
}

export function PublicHomepageProjectionRenderer({
  projection,
  responsiveMode = 'auto',
}: Readonly<{
  projection: PublicPresencePublicProjection | PublicPresenceProjection;
  responsiveMode?: PublicHomepageResponsiveMode;
}>) {
  const { copy, locale } = useUiLocale();
  const theme = normalizeTheme(projection.appearance.theme || DEFAULT_THEME);
  const renderableSections = buildRenderableSections(projection.sections);

  return (
    <div className="space-y-8">
      {renderableSections.map((section) => (
        'type' in section
          ? renderGroupedActionSection(
              section,
              theme,
              copy.publicHomepage,
              locale,
            )
          : renderSection(
              section,
              theme,
              copy.publicHomepage,
              locale,
              responsiveMode,
            )
      ))}
    </div>
  );
}

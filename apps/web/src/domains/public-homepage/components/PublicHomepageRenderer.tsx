'use client';

import {
  DEFAULT_THEME,
  normalizeTheme,
  type ThemeConfig,
} from '@tcrn/shared';
import {
  Activity,
  CalendarRange,
  ExternalLink,
  Image as ImageIcon,
  MessageCircleMore,
  Music4,
  PlayCircle,
  Radio,
  Sparkles,
} from 'lucide-react';
import { type CSSProperties, type ReactNode, useMemo } from 'react';

import {
  type PublicHomepageComponentRecord,
  type PublicHomepageContent,
} from '@/domains/public-homepage/api/public-homepage.api';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  formatLocaleNumber,
} from '@/platform/runtime/locale/locale-text';
import { GlassSurface } from '@/platform/ui';

type VisibleHomepageComponent = PublicHomepageComponentRecord;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asFilledString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

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

function resolveBackground(theme: ThemeConfig) {
  if (theme.background.type === 'gradient') {
    return theme.background.value;
  }

  if (theme.background.type === 'image') {
    const overlay = theme.background.overlay || 'rgba(15, 23, 42, 0.35)';
    return `linear-gradient(${overlay}, ${overlay}), url(${theme.background.value}) center / cover no-repeat`;
  }

  return theme.background.value;
}

function toCssTextAlign(value: unknown): CSSProperties['textAlign'] {
  return value === 'center' || value === 'right' ? value : 'left';
}

function sanitizeRichText(html: string) {
  if (typeof document === 'undefined') {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '');
  }

  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('script, style, iframe, object, embed').forEach((node) => {
    node.remove();
  });

  template.content.querySelectorAll('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const normalizedName = attribute.name.toLowerCase();
      const normalizedValue = attribute.value.trim().toLowerCase();

      if (normalizedName.startsWith('on')) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (
        (normalizedName === 'href' || normalizedName === 'src') &&
        normalizedValue.startsWith('javascript:')
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  });

  return template.innerHTML;
}

function RichTextCard({
  html,
  textAlign,
}: Readonly<{
  html: string;
  textAlign: CSSProperties['textAlign'];
}>) {
  const sanitized = useMemo(() => sanitizeRichText(html), [html]);

  if (!sanitized.trim()) {
    return null;
  }

  return (
    <div
      className="prose prose-slate max-w-none prose-headings:mb-3 prose-headings:mt-0 prose-p:leading-7"
      style={{ textAlign }}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

function extractVisibleComponents(content: PublicHomepageContent) {
  return [...content.components]
    .filter((component) => component.visible !== false)
    .sort((left, right) => {
      const leftOrder = typeof left.order === 'number' ? left.order : Number.MAX_SAFE_INTEGER;
      const rightOrder = typeof right.order === 'number' ? right.order : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
}

function getSocialPlatformLabel(platformCode: string) {
  const normalized = platformCode.trim().toLowerCase();

  if (normalized === 'x') {
    return 'X';
  }

  return normalized
    .split(/[_-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function resolveVideoEmbedUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.hostname.includes('youtube.com') && url.pathname === '/watch') {
      const videoId = url.searchParams.get('v');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : value;
    }

    if (url.hostname === 'youtu.be') {
      const videoId = url.pathname.replace('/', '');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : value;
    }

    if (url.hostname.includes('bilibili.com') && !url.hostname.startsWith('player.')) {
      return value;
    }

    return value;
  } catch {
    return value;
  }
}

function resolveMusicEmbedUrl(platform: string, embedValue: string) {
  if (!embedValue) {
    return null;
  }

  if (platform === 'spotify') {
    if (embedValue.startsWith('https://')) {
      return embedValue;
    }

    return `https://open.spotify.com/embed/track/${embedValue}`;
  }

  return null;
}

function SectionSurface({
  theme,
  children,
  className = '',
}: Readonly<{
  theme: ThemeConfig;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <GlassSurface
      variant="solid"
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
    </GlassSurface>
  );
}

function UnsupportedComponent({
  type,
  props,
  description,
}: Readonly<{
  type: string;
  props: Record<string, unknown>;
  description: string;
}>) {
  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
        <Sparkles className="h-3.5 w-3.5" />
        {type}
      </div>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
      <pre className="overflow-x-auto rounded-2xl bg-slate-950/95 p-4 text-xs leading-6 text-slate-100">
        {JSON.stringify(props, null, 2)}
      </pre>
    </div>
  );
}

function HomepageComponentCard({
  component,
  theme,
  copy,
}: Readonly<{
  component: VisibleHomepageComponent;
  theme: ThemeConfig;
  copy: ReturnType<typeof useRuntimeLocale>['copy']['publicHomepage'];
}>) {
  const props = asRecord(component.props);

  switch (component.type) {
    case 'ProfileCard': {
      const displayName = asString(props.displayName);
      const bio = asString(props.bio);
      const avatarUrl = asString(props.avatarUrl);
      const avatarShape = asString(props.avatarShape, 'circle');
      const avatarClassName =
        avatarShape === 'square' ? 'rounded-3xl' : avatarShape === 'rounded' ? 'rounded-[28px]' : 'rounded-full';

      return (
        <SectionSurface theme={theme} className="p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className={`h-28 w-28 overflow-hidden bg-slate-200 ${avatarClassName}`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName || copy.profileAvatar} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-slate-500">
                  {(displayName || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                {displayName || copy.untitledProfile}
              </h2>
              {bio ? <p className="max-w-3xl text-sm leading-7 text-slate-600">{bio}</p> : null}
            </div>
          </div>
        </SectionSurface>
      );
    }
    case 'SocialLinks': {
      const platforms = Array.isArray(props.platforms)
        ? props.platforms.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        : [];

      if (platforms.length === 0) {
        return null;
      }

      return (
        <SectionSurface theme={theme} className="p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ExternalLink className="h-4 w-4" />
            {copy.socialLinks}
          </div>
          <div className="flex flex-wrap gap-3">
            {platforms.map((entry, index) => {
              const url = asString(entry.url);

              if (!url) {
                return null;
              }

              const platformCode = asString(entry.platformCode, `link-${index}`);
              const label = asString(entry.label) || getSocialPlatformLabel(platformCode);

              return (
                <a
                  key={`${platformCode}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  {label}
                </a>
              );
            })}
          </div>
        </SectionSurface>
      );
    }
    case 'ImageGallery': {
      const images = Array.isArray(props.images)
        ? props.images.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        : [];

      if (images.length === 0) {
        return null;
      }

      const columns = Math.min(Math.max(asNumber(props.columns, 3), 2), 4);

      return (
        <SectionSurface theme={theme} className="p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ImageIcon className="h-4 w-4" />
            {copy.gallery}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {images.map((entry, index) => {
              const url = asString(entry.url);

              if (!url) {
                return null;
              }

              const alt = asString(entry.alt, `${copy.galleryImageLabel} ${index + 1}`);
              const caption = asString(entry.caption);

              return (
                <figure key={`${url}-${index}`} className="overflow-hidden rounded-[24px] bg-slate-900/5">
                  <img src={url} alt={alt} className="h-64 w-full object-cover" />
                  {caption ? <figcaption className="px-4 py-3 text-sm text-slate-600">{caption}</figcaption> : null}
                </figure>
              );
            })}
          </div>
        </SectionSurface>
      );
    }
    case 'VideoEmbed': {
      const videoUrl = asString(props.videoUrl);

      if (!videoUrl) {
        return null;
      }

      const embedUrl = resolveVideoEmbedUrl(videoUrl);

      return (
        <SectionSurface theme={theme} className="p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <PlayCircle className="h-4 w-4" />
            {copy.video}
          </div>
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[24px] bg-slate-950">
              {embedUrl.includes('youtube.com/embed') || embedUrl.includes('open.spotify.com/embed') ? (
                <iframe
                  title={asFilledString(props.title, copy.embeddedVideo)}
                  src={embedUrl}
                  className="aspect-video w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex aspect-video w-full items-center justify-center gap-3 text-sm font-semibold text-white"
                >
                  <PlayCircle className="h-6 w-6" />
                  {copy.openVideoInNewTab}
                </a>
              )}
            </div>
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {videoUrl}
            </a>
          </div>
        </SectionSurface>
      );
    }
    case 'RichText': {
      const contentHtml = asString(props.contentHtml);

      if (!contentHtml) {
        return null;
      }

      return (
        <SectionSurface theme={theme} className="p-8">
          <RichTextCard html={contentHtml} textAlign={toCssTextAlign(props.textAlign)} />
        </SectionSurface>
      );
    }
    case 'LinkButton': {
      const label = asFilledString(props.label, copy.openLink);
      const url = asString(props.url);

      if (!url) {
        return null;
      }

      return (
        <SectionSurface theme={theme} className="p-6">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-slate-800"
          >
            {label}
            <ExternalLink className="h-4 w-4" />
          </a>
        </SectionSurface>
      );
    }
    case 'MarshmallowWidget': {
      return (
        <SectionSurface theme={theme} className="p-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              <MessageCircleMore className="h-4 w-4" />
              {copy.marshmallow}
            </div>
            <p className="text-sm leading-7 text-slate-600">{copy.marshmallowDescription}</p>
          </div>
        </SectionSurface>
      );
    }
    case 'Schedule': {
      const title = asFilledString(props.title, copy.schedule);
      const events = Array.isArray(props.events)
        ? props.events.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        : [];

      return (
        <SectionSurface theme={theme} className="p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <CalendarRange className="h-4 w-4" />
            {title}
          </div>
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-slate-500">{copy.noScheduleEntries}</p>
            ) : (
              events.map((event, index) => (
                <div key={`${asString(event.day)}-${asString(event.time)}-${index}`} className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {asFilledString(event.day, copy.dayLabel)}
                    </span>
                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                      {asString(event.time, '--:--')}
                    </span>
                    <span className="font-medium text-slate-900">{asFilledString(event.title, copy.untitledEvent)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionSurface>
      );
    }
    case 'MusicPlayer': {
      const platform = asFilledString(props.platform, 'spotify');
      const title = asFilledString(props.title, copy.nowPlaying);
      const artist = asString(props.artist);
      const embedUrl = resolveMusicEmbedUrl(platform, asString(props.embedValue));

      return (
        <SectionSurface theme={theme} className="p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Music4 className="h-4 w-4" />
            {copy.music}
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-slate-950">{title}</p>
              {artist ? <p className="text-sm text-slate-500">{artist}</p> : null}
            </div>
            {embedUrl ? (
              <iframe
                title={`${title} embed`}
                src={embedUrl}
                className="h-[152px] w-full rounded-2xl border-0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            ) : null}
          </div>
        </SectionSurface>
      );
    }
    case 'LiveStatus': {
      const isLive = asBoolean(props.isLive);
      const title = asString(props.title);
      const viewers = asString(props.viewers);
      const streamUrl = asString(props.streamUrl);

      return (
        <SectionSurface theme={theme} className="p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Radio className="h-4 w-4" />
            {copy.liveStatus}
          </div>
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white" style={{ backgroundColor: isLive ? '#dc2626' : '#475569' }}>
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${isLive ? 'bg-white' : 'bg-slate-300'}`} />
              {isLive ? copy.liveNow : copy.currentlyOffline}
            </div>
            {title ? <p className="text-lg font-semibold text-slate-950">{title}</p> : null}
            {viewers ? <p className="text-sm text-slate-500">{viewers} {copy.watchingSuffix}</p> : null}
            {streamUrl ? (
              <a
                href={streamUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                {copy.openStream}
              </a>
            ) : null}
          </div>
        </SectionSurface>
      );
    }
    case 'Divider': {
      const dividerStyle = asString(props.style, 'solid');
      const borderStyle =
        dividerStyle === 'dotted' ? 'dotted' : dividerStyle === 'dashed' ? 'dashed' : 'solid';

      return <div aria-hidden="true" className="mx-4 border-t border-slate-300/80" style={{ borderTopStyle: borderStyle }} />;
    }
    case 'Spacer': {
      const height = asString(props.height, 'medium');
      const size = height === 'small' ? '1.5rem' : height === 'large' ? '4rem' : height === 'xlarge' ? '6rem' : '2.5rem';
      return <div aria-hidden="true" style={{ height: size }} />;
    }
    case 'BilibiliDynamic': {
      const uid = asString(props.uid);
      const title = asFilledString(props.title, copy.bilibiliDynamic);

      return (
        <SectionSurface theme={theme} className="p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Activity className="h-4 w-4" />
            {title}
          </div>
          <p className="text-sm leading-7 text-slate-600">{copy.bilibiliDescription}</p>
          {uid ? (
            <a
              href={`https://space.bilibili.com/${uid}/dynamic`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {copy.viewBilibiliDynamics}
            </a>
          ) : null}
        </SectionSurface>
      );
    }
    default:
      return (
        <SectionSurface theme={theme} className="p-6">
          <UnsupportedComponent type={component.type} props={props} description={copy.unsupportedDescription} />
        </SectionSurface>
      );
  }
}

export function getHomepageCanvasStyle(theme: ThemeConfig): CSSProperties {
  return {
    background: resolveBackground(theme),
    color: theme.colors.text,
  };
}

export function PublicHomepageRenderer({
  content,
  theme: rawTheme,
  updatedAt,
  hero,
}: Readonly<{
  content: PublicHomepageContent;
  theme: ThemeConfig | null | undefined;
  updatedAt: string;
  hero: {
    displayName: string;
    avatarUrl: string | null;
    timezone?: string | null;
    description: string | null;
  };
}>) {
  const { copy, selectedLocale } = useRuntimeLocale();
  const theme = useMemo(() => normalizeTheme(rawTheme || DEFAULT_THEME), [rawTheme]);
  const components = useMemo(() => extractVisibleComponents(content), [content]);
  const publicCopy = copy.publicHomepage;
  const heroAvatarAlt = hero.displayName ? `${hero.displayName} ${publicCopy.avatarSuffix}` : publicCopy.profileAvatar;

  return (
    <div className="space-y-8">
      <SectionSurface theme={theme} className="p-8 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
              <Sparkles className="h-3.5 w-3.5" />
              {publicCopy.badge}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">{hero.displayName}</h1>
              {hero.description ? <p className="max-w-3xl text-base leading-8 text-slate-600">{hero.description}</p> : null}
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              {hero.timezone ? (
                <span className="rounded-full bg-white/70 px-3 py-2">
                  {publicCopy.timezoneLabel}: {hero.timezone}
                </span>
              ) : null}
              <span className="rounded-full bg-white/70 px-3 py-2">
                {publicCopy.updatedLabel}: {formatLocaleDateTime(selectedLocale, updatedAt, updatedAt)}
              </span>
              <span className="rounded-full bg-white/70 px-3 py-2">
                {publicCopy.publishedBlocksLabel}: {formatLocaleNumber(selectedLocale, components.length)}
              </span>
            </div>
          </div>
          <div className="flex justify-start lg:justify-end">
            <div className="h-48 w-48 overflow-hidden rounded-[38px] border border-white/80 bg-slate-200 shadow-xl md:h-56 md:w-56">
              {hero.avatarUrl ? (
                <img src={hero.avatarUrl} alt={heroAvatarAlt} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-6xl font-semibold text-slate-500">
                  {hero.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionSurface>

      {components.map((component) => (
        <HomepageComponentCard key={component.id} component={component} theme={theme} copy={publicCopy} />
      ))}
    </div>
  );
}

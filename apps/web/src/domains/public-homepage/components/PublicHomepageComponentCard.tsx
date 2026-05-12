'use client';

import { type ThemeConfig } from '@tcrn/shared';
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
  normalizeHomepageLayoutProps,
  resolveHomepageLayoutSurfaceStyle,
  resolveHomepageLayoutWrapperStyle,
} from '@/domains/homepage-management/editor/puck/homepage-layout-presets';
import {
  type PublicHomepageComponentRecord,
} from '@/domains/public-homepage/api/public-homepage.api';
import {
  PublicPresenceBadge,
  PublicPresenceSurface,
} from '@/domains/public-presence';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';

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

function applyVideoEmbedOptions(
  value: string,
  options: {
    autoplay: boolean;
    showControls: boolean;
  },
) {
  if (!value.includes('youtube.com/embed')) {
    return value;
  }

  try {
    const url = new URL(value);

    if (options.autoplay) {
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('mute', '1');
    }

    if (!options.showControls) {
      url.searchParams.set('controls', '0');
    }

    return url.toString();
  } catch {
    return value;
  }
}

function resolveVideoAspectRatioClass(value: string) {
  if (value === '4:3') {
    return 'aspect-[4/3]';
  }

  if (value === '1:1') {
    return 'aspect-square';
  }

  return 'aspect-video';
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

function resolveDividerSpacing(value: string) {
  if (value === 'small') {
    return '1rem';
  }

  if (value === 'large') {
    return '2.5rem';
  }

  return '1.5rem';
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

function SectionSurface({
  theme,
  children,
  className = '',
  style,
}: Readonly<{
  theme: ThemeConfig;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}>) {
  return (
    <PublicPresenceSurface
      as="article"
      className={`border-white/60 ${className}`}
      style={{
        backgroundColor: theme.card.background,
        borderRadius: '22px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
        border: theme.card.border || undefined,
        backdropFilter: theme.card.backdropBlur ? `blur(${theme.card.backdropBlur}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </PublicPresenceSurface>
  );
}

function UnsupportedComponent({
  type,
  description,
  descriptionStyle,
}: Readonly<{
  type: string;
  description: string;
  descriptionStyle?: CSSProperties;
}>) {
  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
        {type}
      </div>
      <p className="text-sm leading-6" style={descriptionStyle}>
        {description}
      </p>
    </div>
  );
}

function getThemeTextStyles(
  theme: ThemeConfig,
): Record<'primary' | 'secondary' | 'link', CSSProperties> {
  return {
    primary: { color: theme.colors.text },
    secondary: { color: theme.colors.textSecondary },
    link: { color: theme.colors.text },
  };
}

function CardFrame({
  children,
  layout,
  theme,
  className = '',
}: Readonly<{
  children: ReactNode;
  layout: ReturnType<typeof normalizeHomepageLayoutProps>;
  theme: ThemeConfig;
  className?: string;
}>) {
  return (
    <div style={resolveHomepageLayoutWrapperStyle(layout)}>
      <SectionSurface
        theme={theme}
        className={className}
        style={resolveHomepageLayoutSurfaceStyle(layout)}
      >
        {children}
      </SectionSurface>
    </div>
  );
}

function PlainFrame({
  children,
  layout,
}: Readonly<{
  children: ReactNode;
  layout: ReturnType<typeof normalizeHomepageLayoutProps>;
}>) {
  return <div style={resolveHomepageLayoutWrapperStyle(layout)}>{children}</div>;
}

function RichTextCard({
  html,
  textAlign,
  theme,
}: Readonly<{
  html: string;
  textAlign: CSSProperties['textAlign'];
  theme: ThemeConfig;
}>) {
  const sanitized = useMemo(() => sanitizeRichText(html), [html]);
  const richTextStyle = useMemo(
    () =>
      ({
        textAlign,
        color: theme.colors.text,
        '--tw-prose-body': theme.colors.text,
        '--tw-prose-headings': theme.colors.text,
        '--tw-prose-links': theme.colors.text,
        '--tw-prose-bold': theme.colors.text,
        '--tw-prose-counters': theme.colors.textSecondary,
        '--tw-prose-bullets': theme.colors.textSecondary,
        '--tw-prose-hr': theme.colors.textSecondary,
        '--tw-prose-quotes': theme.colors.text,
        '--tw-prose-captions': theme.colors.textSecondary,
        '--tw-prose-code': theme.colors.text,
      }) as CSSProperties,
    [textAlign, theme.colors.text, theme.colors.textSecondary],
  );

  if (!sanitized.trim()) {
    return null;
  }

  return (
    <div
      className="prose prose-slate prose-headings:mb-3 prose-headings:mt-0 prose-p:leading-7 max-w-none"
      style={richTextStyle}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

export function PublicHomepageComponentCard({
  component,
  theme,
  copy: providedCopy,
}: Readonly<{
  component: VisibleHomepageComponent;
  theme: ThemeConfig;
  copy?: ReturnType<typeof useRuntimeLocale>['copy']['publicHomepage'];
}>) {
  const { copy: runtimeCopy } = useRuntimeLocale();
  const copy = providedCopy ?? runtimeCopy.publicHomepage;
  const props = asRecord(component.props);
  const textStyles = getThemeTextStyles(theme);
  const layout = normalizeHomepageLayoutProps(props);

  switch (component.type) {
    case 'ProfileCard': {
      const displayName = asString(props.displayName);
      const bio = asString(props.bio);
      const avatarUrl = asString(props.avatarUrl);
      const avatarShape = asString(props.avatarShape, 'circle');
      const avatarClassName =
        avatarShape === 'square'
          ? 'rounded-3xl'
          : avatarShape === 'rounded'
            ? 'rounded-[28px]'
            : 'rounded-full';

      return (
        <CardFrame theme={theme} layout={layout} className="p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className={`h-28 w-28 overflow-hidden bg-slate-200 ${avatarClassName}`}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName || copy.profileAvatar}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-slate-500">
                  {(displayName || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight" style={textStyles.primary}>
                {displayName || copy.untitledProfile}
              </h2>
              {bio ? (
                <p className="max-w-3xl text-sm leading-7" style={textStyles.secondary}>
                  {bio}
                </p>
              ) : null}
            </div>
          </div>
        </CardFrame>
      );
    }
    case 'SocialLinks': {
      const platforms = Array.isArray(props.platforms)
        ? props.platforms.filter(
            (item): item is Record<string, unknown> => !!item && typeof item === 'object',
          )
        : [];

      if (platforms.length === 0) {
        return null;
      }

        return (
          <CardFrame theme={theme} layout={layout} className="p-6">
            <div
              className="mb-4 flex items-center gap-2 text-sm font-semibold"
              style={textStyles.secondary}
            >
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
                    className="inline-flex items-center gap-2 rounded-md border border-dashed border-sky-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 motion-reduce:transition-none"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {label}
                  </a>
                );
              })}
            </div>
          </CardFrame>
        );
      }
    case 'ImageGallery': {
      const images = Array.isArray(props.images)
        ? props.images.filter(
            (item): item is Record<string, unknown> => !!item && typeof item === 'object',
          )
        : [];

      if (images.length === 0) {
        return null;
      }

      const columns = Math.min(Math.max(asNumber(props.columns, 3), 2), 4);

      return (
        <CardFrame theme={theme} layout={layout} className="p-6">
          <div
            className="mb-4 flex items-center gap-2 text-sm font-semibold"
            style={textStyles.secondary}
          >
            <ImageIcon className="h-4 w-4" />
            {copy.gallery}
          </div>
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(var(--homepage-gallery-columns),minmax(0,1fr))]"
            style={{ '--homepage-gallery-columns': String(columns) } as CSSProperties}
          >
            {images.map((entry, index) => {
              const url = asString(entry.url);

              if (!url) {
                return null;
              }

              const alt = asString(entry.alt, `${copy.galleryImageLabel} ${index + 1}`);
              const caption = asString(entry.caption);

              return (
                <figure
                  key={`${url}-${index}`}
                  className="overflow-hidden rounded-lg border border-white/70 bg-slate-900/5"
                >
                  <img src={url} alt={alt} className="h-64 w-full object-cover" />
                  {caption ? (
                    <figcaption className="px-4 py-3 text-sm" style={textStyles.secondary}>
                      {caption}
                    </figcaption>
                  ) : null}
                </figure>
              );
            })}
          </div>
        </CardFrame>
      );
    }
    case 'VideoEmbed': {
      const videoUrl = asString(props.videoUrl);
      const aspectRatio = asString(props.aspectRatio, '16:9');
      const embedUrl = applyVideoEmbedOptions(resolveVideoEmbedUrl(videoUrl), {
        autoplay: asBoolean(props.autoplay),
        showControls: asBoolean(props.showControls, true),
      });

      if (!videoUrl) {
        return null;
      }

      return (
        <CardFrame theme={theme} layout={layout} className="p-6">
          <div
            className="mb-4 flex items-center gap-2 text-sm font-semibold"
            style={textStyles.secondary}
          >
            <PlayCircle className="h-4 w-4" />
            {copy.video}
          </div>
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[24px] bg-slate-950">
              {embedUrl.includes('youtube.com/embed') ||
              embedUrl.includes('open.spotify.com/embed') ? (
                <iframe
                  title={asFilledString(props.title, copy.embeddedVideo)}
                  src={embedUrl}
                  className={`w-full border-0 ${resolveVideoAspectRatioClass(aspectRatio)}`}
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
              className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
              style={textStyles.link}
            >
              <ExternalLink className="h-4 w-4" />
              {videoUrl}
            </a>
          </div>
        </CardFrame>
      );
    }
    case 'RichText': {
      const contentHtml = asString(props.contentHtml);

      if (!contentHtml) {
        return null;
      }

      return (
        <CardFrame theme={theme} layout={layout} className="p-8">
          <RichTextCard
            html={contentHtml}
            textAlign={toCssTextAlign(props.textAlign)}
            theme={theme}
          />
        </CardFrame>
      );
    }
    case 'LinkButton': {
      const label = asFilledString(props.label, copy.openLink);
      const url = asString(props.url);

      if (!url) {
        return null;
      }

      return (
        <CardFrame theme={theme} layout={layout} className="p-6">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {label}
            <ExternalLink className="h-4 w-4" />
          </a>
        </CardFrame>
      );
    }
    case 'MarshmallowWidget': {
      const marshmallowUrl = asString(props.url) || asString(props.href);
      const showSubmitButton = asBoolean(props.showSubmitButton, true);

      return (
        <CardFrame theme={theme} layout={layout} className="p-6">
          <div className="space-y-3">
            <PublicPresenceBadge icon={<MessageCircleMore />} tone="amber">
              {copy.marshmallow}
            </PublicPresenceBadge>
            <p className="text-sm leading-7" style={textStyles.secondary}>
              {copy.marshmallowDescription}
            </p>
            {showSubmitButton && marshmallowUrl ? (
              <a
                href={marshmallowUrl}
                className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-white/85 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200 motion-reduce:transition-none"
              >
                <MessageCircleMore className="h-4 w-4" />
                {copy.marshmallow}
              </a>
            ) : null}
          </div>
        </CardFrame>
      );
    }
    case 'Schedule': {
      const title = asFilledString(props.title, copy.schedule);
      const weekOf = asString(props.weekOf);
      const events = Array.isArray(props.events)
        ? props.events.filter(
            (item): item is Record<string, unknown> => !!item && typeof item === 'object',
          )
        : [];

      return (
        <CardFrame theme={theme} layout={layout} className="p-6">
          <div
            className="mb-4 flex items-center gap-2 text-sm font-semibold"
            style={textStyles.secondary}
          >
            <CalendarRange className="h-4 w-4" />
            {title}
          </div>
          {weekOf ? (
            <p className="-mt-2 mb-4 text-xs font-medium" style={textStyles.secondary}>
              {weekOf}
            </p>
          ) : null}
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm" style={textStyles.secondary}>
                {copy.noScheduleEntries}
              </p>
            ) : (
              events.map((event, index) => (
                <div
                  key={`${asString(event.day)}-${asString(event.time)}-${index}`}
                  className="rounded-lg border border-dashed border-sky-200 bg-white/75 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-semibold text-slate-500">
                      {asFilledString(event.day, copy.dayLabel)}
                    </span>
                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                      {asString(event.time, '--:--')}
                    </span>
                    <span className="font-medium text-slate-900">
                      {asFilledString(event.title, copy.untitledEvent)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardFrame>
      );
    }
    case 'MusicPlayer': {
      const platform = asFilledString(props.platform, 'spotify');
      const title = asFilledString(props.title, copy.nowPlaying);
      const artist = asString(props.artist);
      const embedUrl = resolveMusicEmbedUrl(platform, asString(props.embedValue));

      return (
        <CardFrame theme={theme} layout={layout} className="p-6">
          <div
            className="mb-4 flex items-center gap-2 text-sm font-semibold"
            style={textStyles.secondary}
          >
            <Music4 className="h-4 w-4" />
            {copy.music}
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold" style={textStyles.primary}>
                {title}
              </p>
              {artist ? (
                <p className="text-sm" style={textStyles.secondary}>
                  {artist}
                </p>
              ) : null}
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
        </CardFrame>
      );
    }
    case 'LiveStatus': {
      const isLive = asBoolean(props.isLive);
      const platform = asString(props.platform);
      const channelName = asString(props.channelName);
      const title = asString(props.title);
      const viewers = asString(props.viewers);
      const streamUrl = asString(props.streamUrl);

      return (
        <CardFrame theme={theme} layout={layout} className="p-6">
          <div
            className="mb-4 flex items-center gap-2 text-sm font-semibold"
            style={textStyles.secondary}
          >
            <Radio className="h-4 w-4" />
            {copy.liveStatus}
          </div>
          <div className="space-y-3">
            {platform || channelName ? (
              <p className="text-xs font-medium" style={textStyles.secondary}>
                {[channelName, platform].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            <div
              className="inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: isLive ? '#dc2626' : '#475569' }}
            >
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${isLive ? 'bg-white' : 'bg-slate-300'}`}
              />
              {isLive ? copy.liveNow : copy.currentlyOffline}
            </div>
            {title ? (
              <p className="text-lg font-semibold" style={textStyles.primary}>
                {title}
              </p>
            ) : null}
            {viewers ? (
              <p className="text-sm" style={textStyles.secondary}>
                {viewers} {copy.watchingSuffix}
              </p>
            ) : null}
            {streamUrl ? (
              <a
                href={streamUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
                style={textStyles.link}
              >
                <ExternalLink className="h-4 w-4" />
                {copy.openStream}
              </a>
            ) : null}
          </div>
        </CardFrame>
      );
    }
    case 'Divider': {
      const dividerStyle = asString(props.style, 'solid');
      const spacing = asString(props.spacing, 'medium');
      const borderStyle =
        dividerStyle === 'dotted' ? 'dotted' : dividerStyle === 'dashed' ? 'dashed' : 'solid';

      return (
        <PlainFrame layout={layout}>
          <div
            aria-hidden="true"
            className="mx-4 border-t border-slate-300/80"
            style={{
              borderTopStyle: borderStyle,
              marginBlock: resolveDividerSpacing(spacing),
            }}
          />
        </PlainFrame>
      );
    }
    case 'Spacer': {
      const height = asString(props.height, 'medium');
      const size =
        height === 'small'
          ? '1.5rem'
          : height === 'large'
            ? '4rem'
            : height === 'xlarge'
              ? '6rem'
              : '2.5rem';

      return (
        <PlainFrame layout={layout}>
          <div aria-hidden="true" style={{ height: size }} />
        </PlainFrame>
      );
    }
    case 'BilibiliDynamic': {
      const uid = asString(props.uid);
      const title = asFilledString(props.title, copy.bilibiliDynamic);
      const cardStyle = asString(props.cardStyle, 'standard');
      const showHeader = asBoolean(props.showHeader, true);
      const maxItems = asNumber(props.maxItems, 5);
      const filterType = asString(props.filterType, 'all');
      const refreshInterval = asNumber(props.refreshInterval, 0);

      return (
        <CardFrame theme={theme} layout={layout} className={cardStyle === 'compact' ? 'p-5' : 'p-6'}>
          {showHeader ? (
            <div
              className="mb-4 flex items-center gap-2 text-sm font-semibold"
              style={textStyles.secondary}
            >
              <Activity className="h-4 w-4" />
              {title}
            </div>
          ) : null}
          <p className="text-sm leading-7" style={textStyles.secondary}>
            {copy.bilibiliDescription}
          </p>
          <p className="mt-3 text-xs font-medium" style={textStyles.secondary}>
            {`Max ${maxItems} · ${filterType}${refreshInterval > 0 ? ` · ${refreshInterval}s refresh` : ''}`}
          </p>
          {uid ? (
            <a
              href={`https://space.bilibili.com/${uid}/dynamic`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
              style={textStyles.link}
            >
              <ExternalLink className="h-4 w-4" />
              {copy.viewBilibiliDynamics}
            </a>
          ) : null}
        </CardFrame>
      );
    }
    default:
      return (
        <CardFrame theme={theme} layout={layout} className="p-6">
          <UnsupportedComponent
            type={component.type}
            description={copy.unsupportedDescription}
            descriptionStyle={textStyles.secondary}
          />
        </CardFrame>
      );
  }
}

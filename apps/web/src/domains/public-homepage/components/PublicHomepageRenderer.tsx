'use client';

import { DEFAULT_THEME, normalizeTheme, type ThemeConfig } from '@tcrn/shared';
import { ExternalLink, Sparkles } from 'lucide-react';
import { type CSSProperties, type ReactNode, useMemo } from 'react';

import {
  type PublicHomepageComponentRecord,
  type PublicHomepageContent,
} from '@/domains/public-homepage/api/public-homepage.api';
import { PublicHomepageComponentCard } from '@/domains/public-homepage/components/PublicHomepageComponentCard';
import {
  PublicPresenceBadge,
  PublicPresenceHero,
  PublicPresenceSurface,
} from '@/domains/public-presence';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';

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

function extractVisibleComponents(content: PublicHomepageContent) {
  return [...content.components]
    .filter((component) => component.visible !== false)
    .sort((left, right) => {
      const leftOrder = typeof left.order === 'number' ? left.order : Number.MAX_SAFE_INTEGER;
      const rightOrder = typeof right.order === 'number' ? right.order : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
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

function getThemeTextStyles(
  theme: ThemeConfig
): Record<'primary' | 'secondary' | 'link', CSSProperties> {
  return {
    primary: { color: theme.colors.text },
    secondary: { color: theme.colors.textSecondary },
    link: { color: theme.colors.text },
  };
}

export function getHomepageCanvasStyle(theme: ThemeConfig): CSSProperties {
  return {
    background: resolveBackground(theme),
    color: theme.colors.text,
  };
}

function getHeroPrimaryAction(
  components: PublicHomepageComponentRecord[],
  publicCopy: ReturnType<typeof useUiLocale>['copy']['publicHomepage'],
) {
  for (const component of components) {
    const props = component.props || {};

    if (component.type === 'LiveStatus') {
      const streamUrl = typeof props.streamUrl === 'string' ? props.streamUrl.trim() : '';

      if (streamUrl) {
        return {
          href: streamUrl,
          label: publicCopy.openStream,
        };
      }
    }

    if (component.type === 'LinkButton') {
      const url = typeof props.url === 'string' ? props.url.trim() : '';
      const label = typeof props.label === 'string' && props.label.trim()
        ? props.label.trim()
        : publicCopy.openLink;

      if (url) {
        return {
          href: url,
          label,
        };
      }
    }

    if (component.type === 'SocialLinks' && Array.isArray(props.platforms)) {
      const firstLink = props.platforms.find(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object',
      );
      const url = typeof firstLink?.url === 'string' ? firstLink.url.trim() : '';
      const label = typeof firstLink?.label === 'string' && firstLink.label.trim()
        ? firstLink.label.trim()
        : publicCopy.socialLinks;

      if (url) {
        return {
          href: url,
          label,
        };
      }
    }

    if (component.type === 'VideoEmbed') {
      const videoUrl = typeof props.videoUrl === 'string' ? props.videoUrl.trim() : '';

      if (videoUrl) {
        return {
          href: videoUrl,
          label: publicCopy.openVideoInNewTab,
        };
      }
    }
  }

  return null;
}

export function PublicHomepageRenderer({
  content,
  theme: rawTheme,
  updatedAt: _updatedAt,
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
  const { copy } = useUiLocale();
  const theme = useMemo(() => normalizeTheme(rawTheme || DEFAULT_THEME), [rawTheme]);
  const components = useMemo(() => extractVisibleComponents(content), [content]);
  const publicCopy = copy.publicHomepage;
  const heroAvatarAlt = hero.displayName
    ? `${hero.displayName} ${publicCopy.avatarSuffix}`
    : publicCopy.profileAvatar;
  const textStyles = getThemeTextStyles(theme);
  const heroPrimaryAction = useMemo(
    () => getHeroPrimaryAction(components, publicCopy),
    [components, publicCopy],
  );

  return (
    <div className="space-y-8">
      <SectionSurface theme={theme} className="p-8 md:p-10">
        <PublicPresenceHero
          badge={(
            <PublicPresenceBadge icon={<Sparkles />} tone="rose">
              {publicCopy.badge}
            </PublicPresenceBadge>
          )}
          title={hero.displayName}
          titleStyle={textStyles.primary}
          description={hero.description ? (
            <p style={textStyles.secondary}>{hero.description}</p>
          ) : null}
          meta={hero.timezone ? (
            <PublicPresenceBadge tone="slate" variant="outline">
              {publicCopy.timezoneLabel}: {hero.timezone}
            </PublicPresenceBadge>
          ) : null}
          actions={heroPrimaryAction ? (
            <a
              href={heroPrimaryAction.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {heroPrimaryAction.label}
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
          media={hero.avatarUrl ? (
            <img
              src={hero.avatarUrl}
              alt={heroAvatarAlt}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-6xl font-semibold text-slate-500">
              {hero.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        />
      </SectionSurface>

      {components.map((component) => (
        <PublicHomepageComponentCard
          key={component.id}
          component={component}
          theme={theme}
          copy={publicCopy}
        />
      ))}
    </div>
  );
}

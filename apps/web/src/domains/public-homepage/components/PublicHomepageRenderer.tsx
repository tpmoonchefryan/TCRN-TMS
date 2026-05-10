'use client';

import { DEFAULT_THEME, normalizeTheme, type ThemeConfig } from '@tcrn/shared';
import { Sparkles } from 'lucide-react';
import { type CSSProperties, type ReactNode, useMemo } from 'react';

import {
  type PublicHomepageContent,
} from '@/domains/public-homepage/api/public-homepage.api';
import { PublicHomepageComponentCard } from '@/domains/public-homepage/components/PublicHomepageComponentCard';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { GlassSurface } from '@/platform/ui';

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
  const { copy } = useRuntimeLocale();
  const theme = useMemo(() => normalizeTheme(rawTheme || DEFAULT_THEME), [rawTheme]);
  const components = useMemo(() => extractVisibleComponents(content), [content]);
  const publicCopy = copy.publicHomepage;
  const heroAvatarAlt = hero.displayName
    ? `${hero.displayName} ${publicCopy.avatarSuffix}`
    : publicCopy.profileAvatar;
  const textStyles = getThemeTextStyles(theme);

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
              <h1
                className="text-4xl font-semibold tracking-tight md:text-5xl"
                style={textStyles.primary}
              >
                {hero.displayName}
              </h1>
              {hero.description ? (
                <p className="max-w-3xl text-base leading-8" style={textStyles.secondary}>
                  {hero.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              {hero.timezone ? (
                <span className="rounded-full bg-white/70 px-3 py-2">
                  {publicCopy.timezoneLabel}: {hero.timezone}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex justify-start lg:justify-end">
            <div className="h-48 w-48 overflow-hidden rounded-[38px] border border-white/80 bg-slate-200 shadow-xl md:h-56 md:w-56">
              {hero.avatarUrl ? (
                <img
                  src={hero.avatarUrl}
                  alt={heroAvatarAlt}
                  className="h-full w-full object-cover"
                />
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

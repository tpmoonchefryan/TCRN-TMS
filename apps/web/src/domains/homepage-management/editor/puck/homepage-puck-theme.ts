import {
  DEFAULT_THEME,
  normalizeTheme,
  type ThemeBackground,
  type ThemeConfig,
} from '@tcrn/shared';

export const HOMEPAGE_PUCK_DEFAULT_BACKGROUND_OVERLAY = 'rgba(15, 23, 42, 0.35)';

export interface HomepagePuckRootProps {
  title: string;
  backgroundType: ThemeBackground['type'];
  backgroundValue: string;
  backgroundOverlay: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeBackgroundType(value: unknown, fallback: ThemeBackground['type']) {
  const nextValue = asString(value, fallback);

  return (['solid', 'gradient', 'image'] as const).includes(nextValue as ThemeBackground['type'])
    ? (nextValue as ThemeBackground['type'])
    : fallback;
}

export function mapHomepageThemeToPuckRootProps(
  theme: ThemeConfig | null | undefined,
): HomepagePuckRootProps {
  const normalizedTheme = normalizeTheme(theme || DEFAULT_THEME);

  return {
    title: 'Homepage',
    backgroundType: normalizedTheme.background.type,
    backgroundValue: normalizedTheme.background.value,
    backgroundOverlay:
      normalizedTheme.background.overlay || HOMEPAGE_PUCK_DEFAULT_BACKGROUND_OVERLAY,
  };
}

export function mapHomepagePuckRootPropsToTheme(
  root: Partial<HomepagePuckRootProps> | null | undefined,
  baseTheme: ThemeConfig | null | undefined,
): ThemeConfig {
  const normalizedTheme = normalizeTheme(baseTheme || DEFAULT_THEME);
  const record = asRecord(root);
  const backgroundType = normalizeBackgroundType(
    record.backgroundType,
    normalizedTheme.background.type,
  );
  const backgroundValue = asString(
    record.backgroundValue,
    normalizedTheme.background.value,
  ).trim() || normalizedTheme.background.value;
  const backgroundOverlay = asString(
    record.backgroundOverlay,
    normalizedTheme.background.overlay || HOMEPAGE_PUCK_DEFAULT_BACKGROUND_OVERLAY,
  ).trim() || HOMEPAGE_PUCK_DEFAULT_BACKGROUND_OVERLAY;

  return {
    ...normalizedTheme,
    background: {
      ...normalizedTheme.background,
      type: backgroundType,
      value: backgroundValue,
      overlay: backgroundType === 'image' ? backgroundOverlay : undefined,
    },
  };
}

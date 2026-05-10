import type { CSSProperties } from 'react';

export type HomepageLayoutMode = 'default' | 'stack' | 'row' | 'grid';
export type HomepageLayoutGapToken = 'none' | 'xs' | 'sm' | 'md' | 'lg';
export type HomepageLayoutPaddingToken = 'none' | 'xs' | 'sm' | 'md' | 'lg';
export type HomepageLayoutRadiusToken = 'none' | 'sm' | 'md' | 'lg' | 'full';
export type HomepageLayoutWidthPreset = 'full' | 'wide' | 'content' | 'narrow' | 'custom';
export type HomepageLayoutAlign = 'left' | 'center' | 'right';
export type HomepageLayoutHeightPreset = 'auto' | 'small' | 'medium' | 'large' | 'custom';
export type HomepageLayoutPaddingPreset = 'none' | 'small' | 'medium' | 'large';

export interface HomepageLayoutProps {
  layoutMode: HomepageLayoutMode;
  gapToken: HomepageLayoutGapToken;
  paddingToken: HomepageLayoutPaddingToken;
  radiusToken: HomepageLayoutRadiusToken;
  widthPreset: HomepageLayoutWidthPreset;
  customWidthPx: number | null;
  align: HomepageLayoutAlign;
  heightPreset: HomepageLayoutHeightPreset;
  customHeightPx: number | null;
  paddingPreset: HomepageLayoutPaddingPreset;
}

export const DEFAULT_HOMEPAGE_LAYOUT_PROPS: HomepageLayoutProps = {
  layoutMode: 'default',
  gapToken: 'md',
  paddingToken: 'md',
  radiusToken: 'md',
  widthPreset: 'full',
  customWidthPx: null,
  align: 'center',
  heightPreset: 'auto',
  customHeightPx: null,
  paddingPreset: 'medium',
};

const GAP_TOKEN_PX: Record<HomepageLayoutGapToken, number> = {
  none: 0,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
};

const PADDING_TOKEN_PX: Record<HomepageLayoutPaddingToken, number> = {
  none: 0,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
};

const PADDING_PRESET_PX: Record<HomepageLayoutPaddingPreset, number> = {
  none: 0,
  small: 12,
  medium: 16,
  large: 24,
};

const WIDTH_PRESET_PX: Record<Exclude<HomepageLayoutWidthPreset, 'custom'>, number | null> = {
  full: null,
  wide: 1200,
  content: 960,
  narrow: 720,
};

const HEIGHT_PRESET_PX: Record<Exclude<HomepageLayoutHeightPreset, 'custom'>, number | null> = {
  auto: null,
  small: 160,
  medium: 240,
  large: 360,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeEnum<T extends string>(
  value: unknown,
  fallback: T,
  options: readonly T[],
): T {
  const nextValue = asString(value, fallback);

  return options.includes(nextValue as T) ? (nextValue as T) : fallback;
}

function normalizeCustomDimension(value: unknown, min: number, max: number) {
  const nextValue = asNumber(value, null);

  if (typeof nextValue !== 'number' || nextValue <= 0) {
    return null;
  }

  return Math.max(min, Math.min(max, Math.round(nextValue)));
}

export function normalizeHomepageLayoutProps(value: unknown): HomepageLayoutProps {
  const record = asRecord(value);
  const widthPreset = normalizeEnum(
    record.widthPreset,
    DEFAULT_HOMEPAGE_LAYOUT_PROPS.widthPreset,
    ['full', 'wide', 'content', 'narrow', 'custom'] as const,
  );
  const heightPreset = normalizeEnum(
    record.heightPreset,
    DEFAULT_HOMEPAGE_LAYOUT_PROPS.heightPreset,
    ['auto', 'small', 'medium', 'large', 'custom'] as const,
  );

  return {
    layoutMode: normalizeEnum(
      record.layoutMode,
      DEFAULT_HOMEPAGE_LAYOUT_PROPS.layoutMode,
      ['default', 'stack', 'row', 'grid'] as const,
    ),
    gapToken: normalizeEnum(
      record.gapToken,
      DEFAULT_HOMEPAGE_LAYOUT_PROPS.gapToken,
      ['none', 'xs', 'sm', 'md', 'lg'] as const,
    ),
    paddingToken: normalizeEnum(
      record.paddingToken,
      DEFAULT_HOMEPAGE_LAYOUT_PROPS.paddingToken,
      ['none', 'xs', 'sm', 'md', 'lg'] as const,
    ),
    radiusToken: normalizeEnum(
      record.radiusToken,
      DEFAULT_HOMEPAGE_LAYOUT_PROPS.radiusToken,
      ['none', 'sm', 'md', 'lg', 'full'] as const,
    ),
    widthPreset,
    customWidthPx:
      widthPreset === 'custom'
        ? normalizeCustomDimension(record.customWidthPx, 240, 1440)
        : null,
    align: normalizeEnum(
      record.align,
      DEFAULT_HOMEPAGE_LAYOUT_PROPS.align,
      ['left', 'center', 'right'] as const,
    ),
    heightPreset,
    customHeightPx:
      heightPreset === 'custom'
        ? normalizeCustomDimension(record.customHeightPx, 80, 1200)
        : null,
    paddingPreset: normalizeEnum(
      record.paddingPreset,
      DEFAULT_HOMEPAGE_LAYOUT_PROPS.paddingPreset,
      ['none', 'small', 'medium', 'large'] as const,
    ),
  };
}

function resolveWidthMaxWidth(layout: HomepageLayoutProps) {
  if (layout.widthPreset === 'custom') {
    return layout.customWidthPx ? `${layout.customWidthPx}px` : null;
  }

  const presetWidth = WIDTH_PRESET_PX[layout.widthPreset];

  return typeof presetWidth === 'number' ? `${presetWidth}px` : null;
}

function resolveHeightMinHeight(layout: HomepageLayoutProps) {
  if (layout.heightPreset === 'custom') {
    return layout.customHeightPx ? `${layout.customHeightPx}px` : null;
  }

  const presetHeight = HEIGHT_PRESET_PX[layout.heightPreset];

  return typeof presetHeight === 'number' ? `${presetHeight}px` : null;
}

function resolveGapSize(layout: HomepageLayoutProps) {
  return `${GAP_TOKEN_PX[layout.gapToken]}px`;
}

function resolvePaddingInline(layout: HomepageLayoutProps) {
  return `${PADDING_TOKEN_PX[layout.paddingToken]}px`;
}

function resolvePaddingBlock(layout: HomepageLayoutProps) {
  return `${PADDING_PRESET_PX[layout.paddingPreset]}px`;
}

export function resolveHomepageLayoutWrapperStyle(layout: HomepageLayoutProps): CSSProperties {
  const width = resolveWidthMaxWidth(layout);
  const height = resolveHeightMinHeight(layout);
  const gap = resolveGapSize(layout);
  const paddingInline = resolvePaddingInline(layout);
  const paddingBlock = resolvePaddingBlock(layout);

  return {
    display:
      layout.layoutMode === 'row'
        ? 'flex'
        : layout.layoutMode === 'grid'
          ? 'grid'
          : layout.layoutMode === 'stack'
            ? 'flex'
            : 'block',
    flexDirection: layout.layoutMode === 'stack' ? 'column' : layout.layoutMode === 'row' ? 'row' : undefined,
    flexWrap: layout.layoutMode === 'row' ? 'wrap' : undefined,
    gap: layout.layoutMode === 'default' ? undefined : gap,
    justifyItems: layout.layoutMode === 'grid' ? 'stretch' : undefined,
    gridTemplateColumns: layout.layoutMode === 'grid' ? 'repeat(auto-fit, minmax(220px, 1fr))' : undefined,
    width: '100%',
    maxWidth: width || '100%',
    minHeight: height || undefined,
    marginInline: layout.align === 'center' ? 'auto' : undefined,
    marginInlineStart: layout.align === 'right' ? 'auto' : undefined,
    marginInlineEnd: layout.align === 'left' ? 'auto' : undefined,
    paddingInline,
    paddingBlock,
  };
}

export function resolveHomepageLayoutSurfaceStyle(layout: HomepageLayoutProps): CSSProperties {
  const radius =
    layout.radiusToken === 'none'
      ? '0px'
      : layout.radiusToken === 'sm'
        ? '14px'
        : layout.radiusToken === 'lg'
          ? '30px'
          : layout.radiusToken === 'full'
            ? '999px'
            : '22px';

  return {
    borderRadius: radius,
  };
}

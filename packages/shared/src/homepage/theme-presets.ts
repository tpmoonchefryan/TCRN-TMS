// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Homepage Theme System
 * Based on PRD §16 外部用户界面
 */

// =============================================================================
// Theme Types
// =============================================================================

export enum ThemePreset {
  DEFAULT = 'default',
  DARK = 'dark',
  SOFT = 'soft',
  CUTE = 'cute',
  MINIMAL = 'minimal',
}

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  text: string;
  textSecondary: string;
}

export interface ThemeBackground {
  type: 'solid' | 'gradient' | 'image';
  value: string;
  overlay?: string;
}

export interface ThemeCard {
  background: string;
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  shadow: 'none' | 'small' | 'medium' | 'large';
}

export interface ThemeTypography {
  fontFamily: 'system' | 'noto-sans' | 'inter';
  headingWeight: 'normal' | 'medium' | 'bold';
}

export interface ThemeConfig {
  preset: ThemePreset;
  colors: ThemeColors;
  background: ThemeBackground;
  card: ThemeCard;
  typography: ThemeTypography;
}

// =============================================================================
// Theme Presets
// =============================================================================

export const THEME_PRESETS: Record<ThemePreset, ThemeConfig> = {
  [ThemePreset.DEFAULT]: {
    preset: ThemePreset.DEFAULT,
    colors: {
      primary: '#5599FF',
      accent: '#FF88CC',
      background: '#FFFFFF',
      text: '#1A1A1A',
      textSecondary: '#666666',
    },
    background: { type: 'solid', value: '#F5F7FA' },
    card: { background: '#FFFFFF', borderRadius: 'medium', shadow: 'small' },
    typography: { fontFamily: 'system', headingWeight: 'bold' },
  },
  [ThemePreset.DARK]: {
    preset: ThemePreset.DARK,
    colors: {
      primary: '#5599FF',
      accent: '#FF88CC',
      background: '#1A1A1A',
      text: '#FFFFFF',
      textSecondary: '#AAAAAA',
    },
    background: { type: 'solid', value: '#0D0D0D' },
    card: { background: '#2A2A2A', borderRadius: 'medium', shadow: 'medium' },
    typography: { fontFamily: 'system', headingWeight: 'bold' },
  },
  [ThemePreset.SOFT]: {
    preset: ThemePreset.SOFT,
    colors: {
      primary: '#7B9EE0',
      accent: '#E0A0C0',
      background: '#FAFBFC',
      text: '#333333',
      textSecondary: '#888888',
    },
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #F5F7FA 0%, #E8ECF1 100%)',
    },
    card: { background: '#FFFFFF', borderRadius: 'large', shadow: 'small' },
    typography: { fontFamily: 'noto-sans', headingWeight: 'medium' },
  },
  [ThemePreset.CUTE]: {
    preset: ThemePreset.CUTE,
    colors: {
      primary: '#FF88CC',
      accent: '#88CCFF',
      background: '#FFF5F8',
      text: '#4A4A4A',
      textSecondary: '#888888',
    },
    background: { type: 'solid', value: '#FFF5F8' },
    card: { background: '#FFFFFF', borderRadius: 'large', shadow: 'medium' },
    typography: { fontFamily: 'noto-sans', headingWeight: 'bold' },
  },
  [ThemePreset.MINIMAL]: {
    preset: ThemePreset.MINIMAL,
    colors: {
      primary: '#333333',
      accent: '#666666',
      background: '#FFFFFF',
      text: '#1A1A1A',
      textSecondary: '#666666',
    },
    background: { type: 'solid', value: '#FFFFFF' },
    card: { background: '#FFFFFF', borderRadius: 'none', shadow: 'none' },
    typography: { fontFamily: 'inter', headingWeight: 'normal' },
  },
};

// =============================================================================
// Theme Utilities
// =============================================================================

/**
 * Merge user theme overrides with preset
 */
export function mergeTheme(
  preset: ThemePreset,
  overrides?: Partial<ThemeConfig>,
): ThemeConfig {
  const base = THEME_PRESETS[preset];
  if (!overrides) return base;

  return {
    ...base,
    colors: { ...base.colors, ...overrides.colors },
    background: { ...base.background, ...overrides.background },
    card: { ...base.card, ...overrides.card },
    typography: { ...base.typography, ...overrides.typography },
  };
}

/**
 * Generate CSS variables from theme
 */
export function generateCssVariables(theme: ThemeConfig): Record<string, string> {
  return {
    '--color-primary': theme.colors.primary,
    '--color-accent': theme.colors.accent,
    '--color-background': theme.colors.background,
    '--color-text': theme.colors.text,
    '--color-text-secondary': theme.colors.textSecondary,
    '--bg-type': theme.background.type,
    '--bg-value': theme.background.value,
    '--card-background': theme.card.background,
    '--card-border-radius': getBorderRadiusValue(theme.card.borderRadius),
    '--card-shadow': getShadowValue(theme.card.shadow),
    '--font-family': getFontFamilyValue(theme.typography.fontFamily),
    '--heading-weight': getHeadingWeightValue(theme.typography.headingWeight),
  };
}

function getBorderRadiusValue(radius: ThemeCard['borderRadius']): string {
  switch (radius) {
    case 'none':
      return '0';
    case 'small':
      return '4px';
    case 'medium':
      return '8px';
    case 'large':
      return '16px';
    default:
      return '8px';
  }
}

function getShadowValue(shadow: ThemeCard['shadow']): string {
  switch (shadow) {
    case 'none':
      return 'none';
    case 'small':
      return '0 1px 3px rgba(0,0,0,0.1)';
    case 'medium':
      return '0 4px 6px rgba(0,0,0,0.1)';
    case 'large':
      return '0 10px 25px rgba(0,0,0,0.15)';
    default:
      return '0 1px 3px rgba(0,0,0,0.1)';
  }
}

function getFontFamilyValue(fontFamily: ThemeTypography['fontFamily']): string {
  switch (fontFamily) {
    case 'system':
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'noto-sans':
      return '"Noto Sans SC", "Noto Sans JP", sans-serif';
    case 'inter':
      return '"Inter", sans-serif';
    default:
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }
}

function getHeadingWeightValue(weight: ThemeTypography['headingWeight']): string {
  switch (weight) {
    case 'normal':
      return '400';
    case 'medium':
      return '500';
    case 'bold':
      return '700';
    default:
      return '700';
  }
}

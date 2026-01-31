// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ThemeCard, ThemeConfig, ThemePreset, ThemeTypography } from './schema';

export const THEME_PRESETS: Record<ThemePreset, ThemeConfig> = {
  [ThemePreset.DEFAULT]: {
    preset: ThemePreset.DEFAULT,
    visualStyle: 'simple',
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
    animation: { enableEntrance: true, enableHover: true, intensity: 'medium' },
    decorations: { type: 'none' },
  },
  [ThemePreset.DARK]: {
    preset: ThemePreset.DARK,
    visualStyle: 'simple',
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
    animation: { enableEntrance: true, enableHover: true, intensity: 'medium' },
    decorations: { type: 'none' },
  },
  [ThemePreset.SOFT]: {
    preset: ThemePreset.SOFT,
    visualStyle: 'flat',
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
    animation: { enableEntrance: true, enableHover: true, intensity: 'low' },
    decorations: { type: 'none' },
  },
  [ThemePreset.CUTE]: {
    preset: ThemePreset.CUTE,
    visualStyle: 'glass',
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
    animation: { enableEntrance: true, enableHover: true, intensity: 'high' },
    decorations: { type: 'dots', density: 'medium', color: '#FF88CC', opacity: 0.2 },
  },
  [ThemePreset.MINIMAL]: {
    preset: ThemePreset.MINIMAL,
    visualStyle: 'simple',
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
    animation: { enableEntrance: false, enableHover: true, intensity: 'low' },
    decorations: { type: 'none' },
  },
};

export const DEFAULT_THEME = THEME_PRESETS[ThemePreset.DEFAULT];

// =============================================================================
// Helper Functions
// =============================================================================

export function generateCssVariables(theme: ThemeConfig): Record<string, string> {
  return {
    '--color-primary': theme.colors.primary,
    '--color-accent': theme.colors.accent,
    '--color-background': theme.colors.background,
    '--color-text': theme.colors.text,
    '--color-text-secondary': theme.colors.textSecondary || (theme.colors as any).text_secondary,
    '--bg-type': theme.background.type,
    '--bg-value': theme.background.value,
    '--card-background': theme.card.background,
    '--card-border-radius': getBorderRadiusValue(theme.card.borderRadius || (theme.card as any).border_radius),
    '--card-shadow': getShadowValue(theme.card.shadow),
    '--font-family': getFontFamilyValue(theme.typography.fontFamily || (theme.typography as any).font_family),
    '--heading-weight': getHeadingWeightValue(theme.typography.headingWeight || (theme.typography as any).heading_weight),
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
    case 'full':
      return '9999px';
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
    case 'glow':
      return '0 0 15px var(--color-primary)';
    case 'soft':
      return '0 20px 40px -10px rgba(0,0,0,0.1)';
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
    case 'outfit':
      return '"Outfit", sans-serif';
    case 'space-grotesk':
      return '"Space Grotesk", sans-serif';
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
    case 'black':
      return '900';
    default:
      return '700';
  }
}

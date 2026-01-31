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


/**
 * Normalize theme object to ensure it has valid nested structure,
 * handling legacy snake_case keys if present.
 */
export function normalizeTheme(theme: any): ThemeConfig {
  // If theme is null or undefined, return default
  if (!theme) return DEFAULT_THEME;
  
  // Determine base theme from preset
  const presetKey = (theme.preset as ThemePreset) || ThemePreset.DEFAULT;
  const baseTheme = THEME_PRESETS[presetKey] || DEFAULT_THEME;
  
  // Clone to avoid mutation issues
  const normalized = { ...baseTheme, ...theme };

  // 1. Handle Colors (mix of camel and snake)
  if (normalized.colors) {
    const colors = normalized.colors;
    normalized.colors = {
      ...baseTheme.colors,
      ...colors,
      textSecondary: colors.textSecondary || colors.text_secondary || baseTheme.colors.textSecondary,
    };
  }

  // 2. Handle Background (nested vs flat snake_case)
  // Check raw theme for legacy background_type since normalized already has default background
  const legacyBgType = theme.background_type;

  if (legacyBgType) {
      if (['dots', 'grid', 'text'].includes(legacyBgType)) {
        normalized.decorations = {
          ...baseTheme.decorations,
          ...(normalized.decorations || {}),
          type: legacyBgType as any,
          // migrate other potential legacy decoration props if they exist on root
          color: theme.decorations_color || theme.background_color || normalized.decorations?.color || baseTheme.decorations.color,
        };
        
        // Background becomes solid/gradient fallback if not explicitly set in nested object
        if (!theme.background || !theme.background.type) {
             normalized.background = { 
                type: 'solid', 
                value: theme.background_value || baseTheme.background.value 
             };
        }
      } else {
        // Legacy background type (solid, gradient, image)
        // Only apply if nested background is missing
        if (!theme.background || !theme.background.type) {
            normalized.background = {
              type: legacyBgType,
              value: theme.background_value || theme.background?.value || baseTheme.background.value,
            };
        }
      }
  } else if (!normalized.background || !normalized.background.type) {
       // Ensure defaults if partial object and no background_type override
       normalized.background = { ...baseTheme.background, ...(normalized.background || {}) };
  }

  // 3. Handle Card (nested vs flat snake_case)
  if (!normalized.card || !normalized.card.borderRadius) {
     const card = normalized.card || {};
     normalized.card = {
       ...baseTheme.card,
       ...card,
       borderRadius: card.borderRadius || theme.card_border_radius || (card as any).border_radius || baseTheme.card.borderRadius,
       shadow: card.shadow || theme.card_shadow || baseTheme.card.shadow,
       background: card.background || theme.card_background || baseTheme.card.background,
     };
  }

  // 4. Handle Typography (nested vs flat snake_case)
  if (!normalized.typography || !normalized.typography.fontFamily) {
    const typography = normalized.typography || {};
    normalized.typography = {
      ...baseTheme.typography,
      ...typography,
      fontFamily: typography.fontFamily || theme.font_family || (typography as any).font_family || baseTheme.typography.fontFamily,
      headingWeight: typography.headingWeight || theme.heading_weight || (typography as any).heading_weight || baseTheme.typography.headingWeight,
    };
  }

  return normalized;
}

export function generateCssVariables(rawTheme: ThemeConfig): Record<string, string> {
  const theme = normalizeTheme(rawTheme);
  
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

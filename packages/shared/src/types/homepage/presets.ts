// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { 
  ThemeBackground,
  ThemeCard, 
  ThemeColors,
  ThemeConfig, 
  ThemeDecoration,
  ThemePreset, 
  ThemeTypography} from './schema';

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
 * Type to handle legacy incoming theme data which may contain snake_case properties
 * or be partial/loose.
 */
interface LegacyThemeInput extends Partial<Omit<ThemeConfig, 'colors' | 'card' | 'typography'>> {
  // Legacy root props
  background_type?: 'solid' | 'gradient' | 'image' | 'dots' | 'grid' | 'text';
  background_value?: string;
  background_color?: string; // used for decoration color
  card_border_radius?: string; // legacy string or mismatch
  card_shadow?: string;
  card_background?: string;
  font_family?: string;
  heading_weight?: string;
  decorations_color?: string;

  // Nested overrides with potential legacy keys
  colors?: Partial<ThemeColors> & { text_secondary?: string };
  card?: Partial<ThemeCard> & { border_radius?: string };
  typography?: Partial<ThemeTypography> & { font_family?: string; heading_weight?: string };
  
  // Implicit allowance for other props (though we try to be specific above)
  [key: string]: unknown;
}

/**
 * Normalize theme object to ensure it has valid nested structure,
 * handling legacy snake_case keys if present.
 */
export function normalizeTheme(input: unknown): ThemeConfig {
  // If theme is null or undefined, return default
  if (!input) return DEFAULT_THEME;
  
  const theme = input as LegacyThemeInput;
  
  // Determine base theme from preset
  const presetKey = (theme.preset as ThemePreset) || ThemePreset.DEFAULT;
  const baseTheme = THEME_PRESETS[presetKey] || DEFAULT_THEME;
  
  // Clone to avoid mutation issues
  // We start with baseTheme and overlay what we can verify
  const normalized: ThemeConfig = { ...baseTheme };
  
  // Copy over direct matches if they exist and match type (shallow copy parts)
  if (theme.visualStyle) normalized.visualStyle = theme.visualStyle;
  if (theme.animation) normalized.animation = { ...baseTheme.animation, ...theme.animation };
  // Decorations might need merging logic below, but simple copy first
  if (theme.decorations) normalized.decorations = { ...baseTheme.decorations, ...theme.decorations };

  // 1. Handle Colors (mix of camel and snake)
  if (theme.colors) {
    const colors = theme.colors;
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
          type: legacyBgType as ThemeDecoration['type'],
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
            // We know legacyBgType is one of 'solid' | 'gradient' | 'image' here effectively
            // but TS sees the union. Cast or check is fine.
            normalized.background = {
              type: legacyBgType as ThemeBackground['type'],
              value: theme.background_value || theme.background?.value || baseTheme.background.value,
            };
        }
      }
  } else if (theme.background) {
       // Ensure defaults if partial object and no background_type override
       normalized.background = { ...baseTheme.background, ...theme.background };
  }

  // 3. Handle Card (nested vs flat snake_case)
  const themeCard = theme.card || {};
  // Check for root legacy props first or nested legacy props
  const borderRadiusRaw = themeCard.borderRadius || theme.card_border_radius || themeCard.border_radius;
  const shadowRaw = themeCard.shadow || theme.card_shadow;
  const backgroundRaw = themeCard.background || theme.card_background;

  if (themeCard || borderRadiusRaw || shadowRaw || backgroundRaw) {
     normalized.card = {
       ...baseTheme.card,
       ...themeCard,
       borderRadius: (borderRadiusRaw as ThemeCard['borderRadius']) || baseTheme.card.borderRadius,
       shadow: (shadowRaw as ThemeCard['shadow']) || baseTheme.card.shadow,
       background: backgroundRaw || baseTheme.card.background,
     };
  }

  // 4. Handle Typography (nested vs flat snake_case)
  const themeTypography = theme.typography || {};
  const fontFamilyRaw = themeTypography.fontFamily || theme.font_family || themeTypography.font_family;
  const headingWeightRaw = themeTypography.headingWeight || theme.heading_weight || themeTypography.heading_weight;

  if (themeTypography || fontFamilyRaw || headingWeightRaw) {
    normalized.typography = {
      ...baseTheme.typography,
      ...themeTypography,
      fontFamily: (fontFamilyRaw as ThemeTypography['fontFamily']) || baseTheme.typography.fontFamily,
      headingWeight: (headingWeightRaw as ThemeTypography['headingWeight']) || baseTheme.typography.headingWeight,
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

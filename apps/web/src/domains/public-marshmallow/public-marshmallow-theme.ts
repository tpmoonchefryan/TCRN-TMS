export interface PublicMarshmallowThemeSurface {
  accentColor: string;
  accentSoft: string;
  accentText: string;
  noteBackground: string;
  pageBackground: string;
  panelBackground: string;
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function derivePublicMarshmallowThemeSurface(
  rawTheme: Record<string, unknown>,
): PublicMarshmallowThemeSurface {
  const theme = asRecord(rawTheme);
  const accentColor = asString(theme.accentColor) || '#be185d';

  return {
    pageBackground:
      asString(theme.backgroundColor) ||
      'linear-gradient(180deg, rgba(255, 247, 237, 1) 0%, rgba(253, 242, 248, 1) 52%, rgba(239, 246, 255, 1) 100%)',
    panelBackground: asString(theme.cardBackground) || 'rgba(255, 255, 255, 0.88)',
    noteBackground: asString(theme.noteBackground) || 'rgba(255, 253, 248, 0.94)',
    accentColor,
    accentSoft: asString(theme.accentSoftColor) || 'rgba(255, 241, 242, 0.86)',
    accentText: asString(theme.accentTextColor) || '#ffffff',
  };
}

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ThemeConfig } from './schema';

export const THEME_PRESETS: Record<string, Partial<ThemeConfig>> = {
  default: {
    preset: 'default',
    colors: {
      primary: '#5599FF',
      accent: '#FF88CC',
      background: '#F5F7FA',
      text: '#1A1A1A',
      text_secondary: '#666666'
    },
    background: { type: 'solid', value: '#F5F7FA' },
    card: { background: '#FFFFFF', border_radius: 'medium', shadow: 'small' },
    typography: { font_family: 'system', heading_weight: 'bold' }
  },
  dark: {
    preset: 'dark',
    colors: {
      primary: '#5599FF',
      accent: '#FF88CC',
      background: '#1A1A1A',
      text: '#FFFFFF',
      text_secondary: '#AAAAAA'
    },
    background: { type: 'solid', value: '#0D0D0D' },
    card: { background: '#2A2A2A', border_radius: 'medium', shadow: 'medium' },
    typography: { font_family: 'system', heading_weight: 'bold' }
  },
  cute: {
    preset: 'cute',
    colors: {
      primary: '#FF88CC',
      accent: '#88CCFF',
      background: '#FFF5F8',
      text: '#4A4A4A',
      text_secondary: '#888888'
    },
    background: { type: 'solid', value: '#FFF5F8' },
    card: { background: '#FFFFFF', border_radius: 'large', shadow: 'medium' },
    typography: { font_family: 'noto-sans', heading_weight: 'bold' }
  },
  // Add other presets
};

export const DEFAULT_THEME = THEME_PRESETS.default as ThemeConfig;

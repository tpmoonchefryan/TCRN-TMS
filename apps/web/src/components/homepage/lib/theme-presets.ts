// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ThemeConfig, ThemePresetName } from './types';

export const THEME_PRESETS: Record<ThemePresetName, ThemeConfig> = {
  default: {
    preset: 'default',
    colors: {
      primary: '#5599FF',
      accent: '#FF88CC',
      background: '#FFFFFF',
      text: '#1A1A1A',
      textSecondary: '#666666'
    },
    background: { type: 'solid', value: '#F5F7FA' },
    card: { background: '#FFFFFF', borderRadius: 'medium', shadow: 'small' },
    typography: { fontFamily: 'system', headingWeight: 'medium' }
  },
  dark: {
    preset: 'dark',
    colors: {
      primary: '#5599FF',
      accent: '#FF88CC',
      background: '#1A1A1A',
      text: '#FFFFFF',
      textSecondary: '#AAAAAA'
    },
    background: { type: 'solid', value: '#0D0D0D' },
    card: { background: '#2A2A2A', borderRadius: 'medium', shadow: 'medium' },
    typography: { fontFamily: 'system', headingWeight: 'medium' }
  },
  soft: {
    preset: 'soft',
    colors: {
      primary: '#7B9EE0',
      accent: '#E0A0C0',
      background: '#FAFBFC',
      text: '#333333',
      textSecondary: '#888888'
    },
    background: { type: 'gradient', value: 'linear-gradient(135deg, #F5F7FA 0%, #E8ECF1 100%)' },
    card: { background: '#FFFFFF', borderRadius: 'large', shadow: 'small' },
    typography: { fontFamily: 'noto-sans', headingWeight: 'normal' }
  },
  cute: {
    preset: 'cute',
    colors: {
      primary: '#FF88CC',
      accent: '#88CCFF',
      background: '#FFF5F8',
      text: '#4A4A4A',
      textSecondary: '#888888'
    },
    background: { type: 'solid', value: '#FFF5F8' },
    card: { background: '#FFFFFF', borderRadius: 'large', shadow: 'medium' },
    typography: { fontFamily: 'noto-sans', headingWeight: 'bold' }
  },
  minimal: {
    preset: 'minimal',
    colors: {
      primary: '#333333',
      accent: '#666666',
      background: '#FFFFFF',
      text: '#1A1A1A',
      textSecondary: '#666666'
    },
    background: { type: 'solid', value: '#FFFFFF' },
    card: { background: '#FFFFFF', borderRadius: 'none', shadow: 'none' },
    typography: { fontFamily: 'inter', headingWeight: 'normal' }
  }
};

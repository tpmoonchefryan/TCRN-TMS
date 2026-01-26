// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ThemeConfig } from './schema';

export const THEME_PRESETS: Record<string, Partial<ThemeConfig>> = {
  default: {
    preset: 'default',
    visual_style: 'simple',
    colors: {
      primary: '#5599FF',
      accent: '#FF88CC',
      background: '#F5F7FA',
      text: '#1A1A1A',
      text_secondary: '#666666'
    },
    background: { type: 'solid', value: '#F5F7FA' },
    card: { background: '#FFFFFF', border_radius: 'medium', shadow: 'small' },
    typography: { font_family: 'system', heading_weight: 'bold' },
    animation: { enable_entrance: true, enable_hover: true, intensity: 'medium' },
    decorations: { type: 'none' }
  },
  dark: {
    preset: 'dark',
    visual_style: 'flat',
    colors: {
      primary: '#5599FF',
      accent: '#FF88CC',
      background: '#1A1A1A',
      text: '#FFFFFF',
      text_secondary: '#AAAAAA'
    },
    background: { type: 'solid', value: '#0D0D0D' },
    card: { background: '#2A2A2A', border_radius: 'medium', shadow: 'medium' },
    typography: { font_family: 'system', heading_weight: 'bold' },
    animation: { enable_entrance: true, enable_hover: true, intensity: 'medium' },
    decorations: { type: 'none' }
  },
  cute: {
    preset: 'cute',
    visual_style: 'simple',
    colors: {
      primary: '#FF88CC',
      accent: '#88CCFF',
      background: '#FFF5F8',
      text: '#4A4A4A',
      text_secondary: '#888888'
    },
    background: { type: 'solid', value: '#FFF5F8' },
    card: { background: '#FFFFFF', border_radius: 'large', shadow: 'medium' },
    typography: { font_family: 'noto-sans', heading_weight: 'bold' },
    animation: { enable_entrance: true, enable_hover: true, intensity: 'high' },
    decorations: { type: 'dots', color: '#FF88CC', opacity: 0.1 }
  },
  soft: {
    preset: 'soft',
    visual_style: 'neo',
    colors: {
      primary: '#7C83FD',
      accent: '#96BAFF',
      background: '#F2F6FF',
      text: '#455A64',
      text_secondary: '#90A4AE'
    },
    background: { type: 'solid', value: '#F2F6FF' },
    card: { background: '#FFFFFF', border_radius: 'large', shadow: 'soft' },
    typography: { font_family: 'outfit', heading_weight: 'normal' },
    animation: { enable_entrance: true, enable_hover: true, intensity: 'low' },
    decorations: { type: 'none' }
  },
  minimal: {
    preset: 'minimal',
    visual_style: 'simple',
    colors: {
      primary: '#000000',
      accent: '#666666',
      background: '#FFFFFF',
      text: '#000000',
      text_secondary: '#666666'
    },
    background: { type: 'solid', value: '#FFFFFF' },
    card: { background: '#FFFFFF', border_radius: 'none', shadow: 'none' },
    typography: { font_family: 'space-grotesk', heading_weight: 'bold' },
    animation: { enable_entrance: false, enable_hover: true, intensity: 'low' },
    decorations: { type: 'grid', color: '#E5E5E5', opacity: 0.5 }
  }
  // Add other presets
};

export const DEFAULT_THEME = THEME_PRESETS.default as ThemeConfig;

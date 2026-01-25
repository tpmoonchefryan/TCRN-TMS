// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

// Component Types
export type ComponentType = 
  | 'ProfileCard'
  | 'SocialLinks'
  | 'ImageGallery'
  | 'VideoEmbed'
  | 'RichText'
  | 'LinkButton'
  | 'MarshmallowWidget'
  | 'Divider'
  | 'Spacer';

// Component Instance Structure
export interface ComponentInstance {
  id: string;               // UUID
  type: ComponentType;
  props: Record<string, any>;
  visible: boolean;
}

// Homepage Content Structure
export interface HomepageContent {
  version: string;          // e.g. "1.0"
  components: ComponentInstance[];
}

// Theme Configuration
export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  text: string;
  text_secondary: string;
}

export interface ThemeBackground {
  type: 'solid' | 'gradient' | 'image';
  value: string;
  overlay?: string;
}

export interface ThemeCard {
  background: string;
  border_radius: 'none' | 'small' | 'medium' | 'large';
  shadow: 'none' | 'small' | 'medium' | 'large';
}

export interface ThemeConfig {
  preset: 'default' | 'dark' | 'soft' | 'cute' | 'minimal';
  colors: ThemeColors;
  background: ThemeBackground;
  card: ThemeCard;
  typography: {
    font_family: 'system' | 'noto-sans' | 'inter';
    heading_weight: 'normal' | 'medium' | 'bold';
  };
}

// Component Registry Definition
export interface ComponentDefinition {
  type: ComponentType;
  name_en: string;
  name_zh: string;
  name_ja: string;
  icon: string; // Lucide icon name
  category: 'core' | 'media' | 'content' | 'layout' | 'interactive';
  defaultProps: Record<string, any>;
}

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
  | 'Schedule'
  | 'MusicPlayer'
  | 'LiveStatus'
  | 'Divider'
  | 'Spacer';

// Component Instance Structure
export interface ComponentInstance {
  id: string;               // UUID
  type: ComponentType;
  props: Record<string, unknown>;
  visible: boolean;
  
  // New: Component-level overrides
  styleOverrides?: {
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
  };
  animation?: {
    type: 'fade' | 'slide' | 'scale' | 'none';
    delay?: number;
    duration?: number;
  };
  
  // New: Internationalization
  // Map of locale code (e.g., 'zh', 'ja') to partial props override
  i18n?: Record<string, Record<string, unknown>>;
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
  value: string; // CSS color, gradient string, or Image URL
  overlay?: string; // CSS Generic Color for overlay (e.g. rgba(0,0,0,0.5))
  blur?: number; // Blur amount in px
}

export interface ThemeCard {
  background: string;
  border_radius: 'none' | 'small' | 'medium' | 'large' | 'full';
  shadow: 'none' | 'small' | 'medium' | 'large' | 'glow' | 'soft';
  border?: string; // CSS border property
  backdrop_blur?: number; // For glassmorphism settings
}

export interface ThemeAnimation {
  enable_entrance: boolean;
  enable_hover: boolean;
  intensity: 'low' | 'medium' | 'high';
}

export interface ThemeDecoration {
  type: 'grid' | 'dots' | 'gradient-blobs' | 'text' | 'none';
  color?: string;
  opacity?: number;
  
  // Text Decoration Props
  text?: string;
  fontSize?: number; // px
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  fontFamily?: string;
  textDecoration?: 'none' | 'underline' | 'line-through';
  rotation?: number; // degrees
}

export interface ThemeConfig {
  preset: 'default' | 'dark' | 'soft' | 'cute' | 'minimal';
  visual_style: 'simple' | 'glass' | 'neo' | 'retro' | 'flat';
  
  colors: ThemeColors;
  background: ThemeBackground;
  card: ThemeCard;
  
  typography: {
    font_family: 'system' | 'noto-sans' | 'inter' | 'outfit' | 'space-grotesk';
    heading_weight: 'normal' | 'medium' | 'bold' | 'black';
  };
  
  animation: ThemeAnimation;
  decorations: ThemeDecoration;
}

// Component Registry Definition
export interface ComponentDefinition {
  type: ComponentType;
  name_en: string;
  name_zh: string;
  name_ja: string;
  icon: string; // Lucide icon name
  category: 'core' | 'media' | 'content' | 'layout' | 'interactive';
  defaultProps: Record<string, unknown>;
}

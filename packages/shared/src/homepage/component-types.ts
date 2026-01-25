// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Homepage Component System
 * Based on PRD §16 外部用户界面
 */

// =============================================================================
// Component Types
// =============================================================================

export enum ComponentType {
  PROFILE_CARD = 'ProfileCard',
  SOCIAL_LINKS = 'SocialLinks',
  IMAGE_GALLERY = 'ImageGallery',
  VIDEO_EMBED = 'VideoEmbed',
  RICH_TEXT = 'RichText',
  LINK_BUTTON = 'LinkButton',
  MARSHMALLOW_WIDGET = 'MarshmallowWidget',
  DIVIDER = 'Divider',
  SPACER = 'Spacer',
}

export type ComponentCategory = 'core' | 'media' | 'content' | 'layout' | 'interactive';

export interface ComponentInstance {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
  order: number;
  visible: boolean;
}

export interface HomepageContent {
  version: string;
  components: ComponentInstance[];
}

// =============================================================================
// Component Props Interfaces
// =============================================================================

export interface ProfileCardProps {
  avatarUrl: string;
  displayName: string;
  bio: string;
  avatarShape: 'circle' | 'rounded' | 'square';
  nameFontSize: 'small' | 'medium' | 'large';
  bioMaxLines: number;
}

export interface SocialLinksProps {
  platforms: Array<{
    platformCode: string;
    url: string;
    label?: string;
  }>;
  style: 'icon' | 'button' | 'pill';
  layout: 'horizontal' | 'vertical' | 'grid';
  iconSize: 'small' | 'medium' | 'large';
}

export interface ImageGalleryProps {
  images: Array<{
    url: string;
    alt?: string;
    caption?: string;
  }>;
  layoutMode: 'carousel' | 'grid' | 'masonry';
  columns: 2 | 3 | 4;
  gap: 'small' | 'medium' | 'large';
  showCaptions: boolean;
}

export interface VideoEmbedProps {
  videoUrl: string;
  aspectRatio: '16:9' | '4:3' | '1:1';
  autoplay: boolean;
  showControls: boolean;
}

export interface RichTextProps {
  contentHtml: string;
  textAlign: 'left' | 'center' | 'right';
}

export interface LinkButtonProps {
  label: string;
  url: string;
  style: 'primary' | 'secondary' | 'outline' | 'ghost';
  icon?: string;
  fullWidth: boolean;
}

export interface MarshmallowWidgetProps {
  displayMode: 'compact' | 'full';
  showRecentCount: number;
  showSubmitButton: boolean;
}

export interface DividerProps {
  style: 'solid' | 'dashed' | 'dotted';
  spacing: 'small' | 'medium' | 'large';
}

export interface SpacerProps {
  height: 'small' | 'medium' | 'large' | 'xlarge';
}

// =============================================================================
// Component Definition
// =============================================================================

export interface ComponentDefinition {
  type: ComponentType;
  nameEn: string;
  nameZh: string;
  nameJa: string;
  icon: string;
  category: ComponentCategory;
  defaultProps: Record<string, unknown>;
}

export const COMPONENT_DEFINITIONS: Record<ComponentType, ComponentDefinition> = {
  [ComponentType.PROFILE_CARD]: {
    type: ComponentType.PROFILE_CARD,
    nameEn: 'Profile Card',
    nameZh: '个人资料卡',
    nameJa: 'プロフィールカード',
    icon: 'User',
    category: 'core',
    defaultProps: {
      avatarUrl: '',
      displayName: '',
      bio: '',
      avatarShape: 'circle',
      nameFontSize: 'large',
      bioMaxLines: 3,
    },
  },
  [ComponentType.SOCIAL_LINKS]: {
    type: ComponentType.SOCIAL_LINKS,
    nameEn: 'Social Links',
    nameZh: '社交媒体链接',
    nameJa: 'ソーシャルリンク',
    icon: 'Share2',
    category: 'core',
    defaultProps: {
      platforms: [],
      style: 'icon',
      layout: 'horizontal',
      iconSize: 'medium',
    },
  },
  [ComponentType.IMAGE_GALLERY]: {
    type: ComponentType.IMAGE_GALLERY,
    nameEn: 'Image Gallery',
    nameZh: '图片画廊',
    nameJa: '画像ギャラリー',
    icon: 'Images',
    category: 'media',
    defaultProps: {
      images: [],
      layoutMode: 'grid',
      columns: 3,
      gap: 'medium',
      showCaptions: false,
    },
  },
  [ComponentType.VIDEO_EMBED]: {
    type: ComponentType.VIDEO_EMBED,
    nameEn: 'Video Embed',
    nameZh: '视频嵌入',
    nameJa: '動画埋め込み',
    icon: 'Video',
    category: 'media',
    defaultProps: {
      videoUrl: '',
      aspectRatio: '16:9',
      autoplay: false,
      showControls: true,
    },
  },
  [ComponentType.RICH_TEXT]: {
    type: ComponentType.RICH_TEXT,
    nameEn: 'Rich Text',
    nameZh: '富文本',
    nameJa: 'リッチテキスト',
    icon: 'FileText',
    category: 'content',
    defaultProps: {
      contentHtml: '',
      textAlign: 'left',
    },
  },
  [ComponentType.LINK_BUTTON]: {
    type: ComponentType.LINK_BUTTON,
    nameEn: 'Link Button',
    nameZh: '链接按钮',
    nameJa: 'リンクボタン',
    icon: 'ExternalLink',
    category: 'interactive',
    defaultProps: {
      label: 'Click Me',
      url: '',
      style: 'primary',
      fullWidth: false,
    },
  },
  [ComponentType.MARSHMALLOW_WIDGET]: {
    type: ComponentType.MARSHMALLOW_WIDGET,
    nameEn: 'Marshmallow Widget',
    nameZh: '棉花糖入口',
    nameJa: 'マシュマロウィジェット',
    icon: 'MessageCircle',
    category: 'interactive',
    defaultProps: {
      displayMode: 'compact',
      showRecentCount: 3,
      showSubmitButton: true,
    },
  },
  [ComponentType.DIVIDER]: {
    type: ComponentType.DIVIDER,
    nameEn: 'Divider',
    nameZh: '分隔线',
    nameJa: '区切り線',
    icon: 'Minus',
    category: 'layout',
    defaultProps: {
      style: 'solid',
      spacing: 'medium',
    },
  },
  [ComponentType.SPACER]: {
    type: ComponentType.SPACER,
    nameEn: 'Spacer',
    nameZh: '空白间距',
    nameJa: 'スペーサー',
    icon: 'Square',
    category: 'layout',
    defaultProps: {
      height: 'medium',
    },
  },
};

/**
 * Get components by category
 */
export function getComponentsByCategory(category: ComponentCategory): ComponentDefinition[] {
  return Object.values(COMPONENT_DEFINITIONS).filter((c) => c.category === category);
}

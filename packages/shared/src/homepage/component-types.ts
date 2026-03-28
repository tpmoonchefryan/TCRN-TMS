// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Homepage Component System
 * Based on PRD §16 外部用户界面
 */

import type { HomepageComponentType } from '../types/homepage/schema';

// =============================================================================
// Component Types
// =============================================================================

export type ComponentType = HomepageComponentType;

export const COMPONENT_TYPE = {
  PROFILE_CARD: 'ProfileCard',
  SOCIAL_LINKS: 'SocialLinks',
  IMAGE_GALLERY: 'ImageGallery',
  VIDEO_EMBED: 'VideoEmbed',
  RICH_TEXT: 'RichText',
  LINK_BUTTON: 'LinkButton',
  MARSHMALLOW_WIDGET: 'MarshmallowWidget',
  SCHEDULE: 'Schedule',
  MUSIC_PLAYER: 'MusicPlayer',
  LIVE_STATUS: 'LiveStatus',
  DIVIDER: 'Divider',
  SPACER: 'Spacer',
  BILIBILI_DYNAMIC: 'BilibiliDynamic',
} as const satisfies Record<string, HomepageComponentType>;

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
  [COMPONENT_TYPE.PROFILE_CARD]: {
    type: COMPONENT_TYPE.PROFILE_CARD,
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
  [COMPONENT_TYPE.SOCIAL_LINKS]: {
    type: COMPONENT_TYPE.SOCIAL_LINKS,
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
  [COMPONENT_TYPE.IMAGE_GALLERY]: {
    type: COMPONENT_TYPE.IMAGE_GALLERY,
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
  [COMPONENT_TYPE.VIDEO_EMBED]: {
    type: COMPONENT_TYPE.VIDEO_EMBED,
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
  [COMPONENT_TYPE.RICH_TEXT]: {
    type: COMPONENT_TYPE.RICH_TEXT,
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
  [COMPONENT_TYPE.LINK_BUTTON]: {
    type: COMPONENT_TYPE.LINK_BUTTON,
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
  [COMPONENT_TYPE.MARSHMALLOW_WIDGET]: {
    type: COMPONENT_TYPE.MARSHMALLOW_WIDGET,
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
  [COMPONENT_TYPE.SCHEDULE]: {
    type: COMPONENT_TYPE.SCHEDULE,
    nameEn: 'Schedule',
    nameZh: '日程表',
    nameJa: 'スケジュール',
    icon: 'Calendar',
    category: 'interactive',
    defaultProps: {
      title: 'Weekly Schedule',
      weekOf: '2026-01-26',
      events: [
        { day: 'mon', time: '20:00', title: 'Chatting Stream', type: 'chat' },
        { day: 'wed', time: '21:00', title: 'Minecraft', type: 'game' },
      ],
    },
  },
  [COMPONENT_TYPE.MUSIC_PLAYER]: {
    type: COMPONENT_TYPE.MUSIC_PLAYER,
    nameEn: 'Music Player',
    nameZh: '音乐播放器',
    nameJa: '音楽プレーヤー',
    icon: 'Music',
    category: 'media',
    defaultProps: {
      platform: 'spotify',
      embedValue: '4cOdK2wGLETKBW3PvgPWqT',
      title: 'Starry Sky',
      artist: 'Moon Chef Ryan',
    },
  },
  [COMPONENT_TYPE.LIVE_STATUS]: {
    type: COMPONENT_TYPE.LIVE_STATUS,
    nameEn: 'Live Status',
    nameZh: '直播状态',
    nameJa: '配信ステータス',
    icon: 'Radio',
    category: 'core',
    defaultProps: {
      platform: 'youtube',
      channelName: 'Moon Chef Ryan Ch.',
      streamUrl: 'https://youtube.com',
      isLive: true,
      viewers: '1,234',
      title: '🔴 [KAROKE] Singing untill I drop! come join!',
    },
  },
  [COMPONENT_TYPE.DIVIDER]: {
    type: COMPONENT_TYPE.DIVIDER,
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
  [COMPONENT_TYPE.SPACER]: {
    type: COMPONENT_TYPE.SPACER,
    nameEn: 'Spacer',
    nameZh: '空白间距',
    nameJa: 'スペーサー',
    icon: 'Square',
    category: 'layout',
    defaultProps: {
      height: 'medium',
    },
  },
  [COMPONENT_TYPE.BILIBILI_DYNAMIC]: {
    type: COMPONENT_TYPE.BILIBILI_DYNAMIC,
    nameEn: 'Bilibili Dynamic',
    nameZh: 'B站动态',
    nameJa: 'Bilibili投稿',
    icon: 'Activity',
    category: 'interactive',
    defaultProps: {
      uid: '401742377',
      title: 'Bilibili Dynamics',
      maxItems: 5,
      filterType: 'all',
      cardStyle: 'standard',
      refreshInterval: 0,
      showHeader: true,
    },
  },
};

/**
 * Get components by category
 */
export function getComponentsByCategory(category: ComponentCategory): ComponentDefinition[] {
  return Object.values(COMPONENT_DEFINITIONS).filter((c) => c.category === category);
}

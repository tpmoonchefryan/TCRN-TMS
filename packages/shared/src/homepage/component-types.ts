// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
/**
 * Homepage Component System
 * Based on PRD §16 外部用户界面
 */
import type { LocalizedText } from '../constants/locale';
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
  name: LocalizedText;
  icon: string;
  category: ComponentCategory;
  defaultProps: Record<string, unknown>;
}

export const COMPONENT_DEFINITIONS: Record<ComponentType, ComponentDefinition> = {
  [COMPONENT_TYPE.PROFILE_CARD]: {
    type: COMPONENT_TYPE.PROFILE_CARD,
    name: {
      en: 'Profile Card',
      zh_HANS: '个人资料卡',
      zh_HANT: '個人資料卡',
      ja: 'プロフィールカード',
      ko: 'Profile Card',
      fr: 'Profile Card',
    },
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
    name: {
      en: 'Social Links',
      zh_HANS: '社交媒体链接',
      zh_HANT: '社交媒體連結',
      ja: 'ソーシャルリンク',
      ko: 'Social Links',
      fr: 'Social Links',
    },
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
    name: {
      en: 'Image Gallery',
      zh_HANS: '图片画廊',
      zh_HANT: '圖片藝廊',
      ja: '画像ギャラリー',
      ko: 'Image Gallery',
      fr: 'Image Gallery',
    },
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
    name: {
      en: 'Video Embed',
      zh_HANS: '视频嵌入',
      zh_HANT: '影片嵌入',
      ja: '動画埋め込み',
      ko: 'Video Embed',
      fr: 'Video Embed',
    },
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
    name: {
      en: 'Rich Text',
      zh_HANS: '富文本',
      zh_HANT: '富文字',
      ja: 'リッチテキスト',
      ko: 'Rich Text',
      fr: 'Rich Text',
    },
    icon: 'FileText',
    category: 'content',
    defaultProps: {
      contentHtml: '',
      textAlign: 'left',
    },
  },
  [COMPONENT_TYPE.LINK_BUTTON]: {
    type: COMPONENT_TYPE.LINK_BUTTON,
    name: {
      en: 'Link Button',
      zh_HANS: '链接按钮',
      zh_HANT: '連結按鈕',
      ja: 'リンクボタン',
      ko: 'Link Button',
      fr: 'Link Button',
    },
    icon: 'ExternalLink',
    category: 'interactive',
    defaultProps: {
      label: '',
      url: '',
      style: 'primary',
      fullWidth: false,
    },
  },
  [COMPONENT_TYPE.MARSHMALLOW_WIDGET]: {
    type: COMPONENT_TYPE.MARSHMALLOW_WIDGET,
    name: {
      en: 'Marshmallow Widget',
      zh_HANS: '棉花糖入口',
      zh_HANT: '棉花糖入口',
      ja: 'マシュマロウィジェット',
      ko: 'Marshmallow Widget',
      fr: 'Marshmallow Widget',
    },
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
    name: {
      en: 'Schedule',
      zh_HANS: '日程表',
      zh_HANT: '行程表',
      ja: 'スケジュール',
      ko: 'Schedule',
      fr: 'Schedule',
    },
    icon: 'Calendar',
    category: 'interactive',
    defaultProps: {
      title: '',
      weekOf: '',
      events: [],
    },
  },
  [COMPONENT_TYPE.MUSIC_PLAYER]: {
    type: COMPONENT_TYPE.MUSIC_PLAYER,
    name: {
      en: 'Music Player',
      zh_HANS: '音乐播放器',
      zh_HANT: '音樂播放器',
      ja: '音楽プレーヤー',
      ko: 'Music Player',
      fr: 'Music Player',
    },
    icon: 'Music',
    category: 'media',
    defaultProps: {
      platform: 'spotify',
      embedValue: '',
      title: '',
      artist: '',
    },
  },
  [COMPONENT_TYPE.LIVE_STATUS]: {
    type: COMPONENT_TYPE.LIVE_STATUS,
    name: {
      en: 'Live Status',
      zh_HANS: '直播状态',
      zh_HANT: '直播狀態',
      ja: '配信ステータス',
      ko: 'Live Status',
      fr: 'Live Status',
    },
    icon: 'Radio',
    category: 'core',
    defaultProps: {
      platform: 'youtube',
      channelName: '',
      streamUrl: '',
      isLive: false,
      viewers: '',
      title: '',
    },
  },
  [COMPONENT_TYPE.DIVIDER]: {
    type: COMPONENT_TYPE.DIVIDER,
    name: {
      en: 'Divider',
      zh_HANS: '分隔线',
      zh_HANT: '分隔線',
      ja: '区切り線',
      ko: 'Divider',
      fr: 'Divider',
    },
    icon: 'Minus',
    category: 'layout',
    defaultProps: {
      style: 'solid',
      spacing: 'medium',
    },
  },
  [COMPONENT_TYPE.SPACER]: {
    type: COMPONENT_TYPE.SPACER,
    name: {
      en: 'Spacer',
      zh_HANS: '空白间距',
      zh_HANT: '空白間距',
      ja: 'スペーサー',
      ko: 'Spacer',
      fr: 'Spacer',
    },
    icon: 'Square',
    category: 'layout',
    defaultProps: {
      height: 'medium',
    },
  },
  [COMPONENT_TYPE.BILIBILI_DYNAMIC]: {
    type: COMPONENT_TYPE.BILIBILI_DYNAMIC,
    name: {
      en: 'Bilibili Dynamic',
      zh_HANS: 'B站动态',
      zh_HANT: 'B站動態',
      ja: 'Bilibili投稿',
      ko: 'Bilibili Dynamic',
      fr: 'Bilibili Dynamic',
    },
    icon: 'Activity',
    category: 'interactive',
    defaultProps: {
      uid: '',
      title: '',
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

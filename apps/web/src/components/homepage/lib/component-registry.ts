/* eslint-disable @typescript-eslint/no-unused-vars */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Activity, Calendar, Image, Link, MessageCircle, Minus, MoveVertical, Music, Radio, Share2, Type, User, Youtube } from 'lucide-react';

import {
    BilibiliDynamic,
    defaultProps as BilibiliDynamicDefaultProps,
    BilibiliDynamicEditor
} from '../components/BilibiliDynamic';
import {
    Divider,
    defaultProps as DividerDefaultProps,
    DividerEditor
} from '../components/Divider';
import {
    ImageGallery,
    defaultProps as ImageGalleryDefaultProps,
    ImageGalleryEditor
} from '../components/ImageGallery';
import {
    LinkButton,
    defaultProps as LinkButtonDefaultProps,
    LinkButtonEditor
} from '../components/LinkButton';
import {
    LiveStatus,
    defaultProps as LiveStatusDefaultProps,
    LiveStatusEditor
} from '../components/LiveStatus';
import {
    MarshmallowWidget,
    defaultProps as MarshmallowWidgetDefaultProps,
    MarshmallowWidgetEditor
} from '../components/MarshmallowWidget';
import {
    MusicPlayer,
    defaultProps as MusicPlayerDefaultProps,
    MusicPlayerEditor
} from '../components/MusicPlayer';
import {
    ProfileCard,
    defaultProps as ProfileCardDefaultProps,
    ProfileCardEditor
} from '../components/ProfileCard';
import {
    RichText,
    defaultProps as RichTextDefaultProps,
    RichTextEditor
} from '../components/RichText';
import {
    Schedule,
    defaultProps as ScheduleDefaultProps,
    ScheduleEditor
} from '../components/Schedule';
import {
    SocialLinks,
    defaultProps as SocialLinksDefaultProps,
    SocialLinksEditor
} from '../components/SocialLinks';
import {
    Spacer,
    defaultProps as SpacerDefaultProps,
    SpacerEditor
} from '../components/Spacer';
import {
    VideoEmbed,
    defaultProps as VideoEmbedDefaultProps,
    VideoEmbedEditor
} from '../components/VideoEmbed';

import { ComponentDefinition, ComponentType } from './types';

// Placeholder components (will be replaced by actual implementations)
const PlaceholderPreview = () => null;
const PlaceholderEditor = () => null;

export const COMPONENT_REGISTRY: Record<ComponentType, ComponentDefinition> = {
  ProfileCard: {
    type: 'ProfileCard',
    nameEn: 'Profile Card',
    nameZh: '个人资料卡',
    nameJa: 'プロフィールカード',
    icon: User,
    category: 'core',
    defaultProps: ProfileCardDefaultProps,
    preview: ProfileCard,
    editor: ProfileCardEditor
  },
  SocialLinks: {
    type: 'SocialLinks',
    nameEn: 'Social Links',
    nameZh: '社交媒体',
    nameJa: 'ソーシャルリンク',
    icon: Share2,
    category: 'core',
    defaultProps: SocialLinksDefaultProps,
    preview: SocialLinks,
    editor: SocialLinksEditor
  },
  ImageGallery: {
    type: 'ImageGallery',
    nameEn: 'Image Gallery',
    nameZh: '图片画廊',
    nameJa: '画像ギャラリー',
    icon: Image,
    category: 'media',
    defaultProps: ImageGalleryDefaultProps,
    preview: ImageGallery,
    editor: ImageGalleryEditor
  },
  VideoEmbed: {
    type: 'VideoEmbed',
    nameEn: 'Video Embed',
    nameZh: '视频嵌入',
    nameJa: '動画埋め込み',
    icon: Youtube,
    category: 'media',
    defaultProps: VideoEmbedDefaultProps,
    preview: VideoEmbed,
    editor: VideoEmbedEditor
  },
  RichText: {
    type: 'RichText',
    nameEn: 'Rich Text',
    nameZh: '富文本',
    nameJa: 'リッチテキスト',
    icon: Type,
    category: 'content',
    defaultProps: RichTextDefaultProps,
    preview: RichText,
    editor: RichTextEditor
  },
  LinkButton: {
    type: 'LinkButton',
    nameEn: 'Link Button',
    nameZh: '链接按钮',
    nameJa: 'リンクボタン',
    icon: Link,
    category: 'interactive',
    defaultProps: LinkButtonDefaultProps,
    preview: LinkButton,
    editor: LinkButtonEditor
  },
  MarshmallowWidget: {
    type: 'MarshmallowWidget',
    nameEn: 'Marshmallow',
    nameZh: '棉花糖',
    nameJa: 'マシュマロ',
    icon: MessageCircle,
    category: 'interactive',
    defaultProps: MarshmallowWidgetDefaultProps,
    preview: MarshmallowWidget,
    editor: MarshmallowWidgetEditor
  },
  Divider: {
    type: 'Divider',
    nameEn: 'Divider',
    nameZh: '分隔线',
    nameJa: '区切り線',
    icon: Minus,
    category: 'layout',
    defaultProps: DividerDefaultProps,
    preview: Divider,
    editor: DividerEditor
  },
  Spacer: {
    type: 'Spacer',
    nameEn: 'Spacer',
    nameZh: '空白间距',
    nameJa: 'スペーサー',
    icon: MoveVertical,
    category: 'layout',
    defaultProps: SpacerDefaultProps,
    preview: Spacer,
    editor: SpacerEditor
  },
  Schedule: {
    type: 'Schedule',
    nameEn: 'Schedule',
    nameZh: '日程表',
    nameJa: 'スケジュール',
    icon: Calendar,
    category: 'interactive',
    defaultProps: ScheduleDefaultProps,
    preview: Schedule,
    editor: ScheduleEditor
  },
  MusicPlayer: {
    type: 'MusicPlayer',
    nameEn: 'Music Player',
    nameZh: '音乐播放器',
    nameJa: '音楽プレーヤー',
    icon: Music,
    category: 'media',
    defaultProps: MusicPlayerDefaultProps,
    preview: MusicPlayer,
    editor: MusicPlayerEditor
  },
  LiveStatus: {
    type: 'LiveStatus',
    nameEn: 'Live Status',
    nameZh: '直播状态',
    nameJa: '配信ステータス',
    icon: Radio,
    category: 'core',
    defaultProps: LiveStatusDefaultProps,
    preview: LiveStatus,
    editor: LiveStatusEditor
  },
  BilibiliDynamic: {
    type: 'BilibiliDynamic',
    nameEn: 'Bilibili Dynamic',
    nameZh: 'B站动态',
    nameJa: 'Bilibili投稿',
    icon: Activity,
    category: 'interactive',
    defaultProps: BilibiliDynamicDefaultProps,
    preview: BilibiliDynamic,
    editor: BilibiliDynamicEditor
  }
};

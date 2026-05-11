import { type Data } from '@puckeditor/core';
import { type ThemeConfig } from '@tcrn/shared';

import {
  type HomepageDraftComponentRecord,
  type HomepageDraftContent,
} from '@/domains/homepage-management/api/homepage.api';
import {
  DEFAULT_HOMEPAGE_LAYOUT_PROPS,
  type HomepageLayoutProps,
  normalizeHomepageLayoutProps,
} from '@/domains/homepage-management/editor/puck/homepage-layout-presets';
import {
  type HomepagePuckRootProps,
  mapHomepagePuckRootPropsToTheme,
  mapHomepageThemeToPuckRootProps,
} from '@/domains/homepage-management/editor/puck/homepage-puck-theme';
import { normalizeHomepageDraftContent } from '@/domains/homepage-management/editor/source/homepage-source-dsl';

export const HOMEPAGE_PUCK_SUPPORTED_TYPES = [
  'ProfileCard',
  'SocialLinks',
  'ImageGallery',
  'RichText',
  'LinkButton',
  'MarshmallowWidget',
  'VideoEmbed',
  'MusicPlayer',
  'Schedule',
  'LiveStatus',
  'Divider',
  'Spacer',
  'BilibiliDynamic',
] as const;

export const HOMEPAGE_PUCK_UNSUPPORTED_TYPE = 'UnsupportedHomepageBlock';

export type HomepagePuckSupportedType = (typeof HOMEPAGE_PUCK_SUPPORTED_TYPES)[number];
export type HomepagePuckComponentType = HomepagePuckSupportedType | typeof HOMEPAGE_PUCK_UNSUPPORTED_TYPE;

export interface HomepagePuckBaseProps {
  id: string;
  visible: boolean;
}

export interface HomepagePuckUnsupportedProps extends HomepagePuckBaseProps {
  originalType: string;
  serializedProps: string;
}

export interface HomepagePuckComponents {
  ProfileCard: HomepagePuckBaseProps & HomepageLayoutProps & {
    avatarShape: string;
    avatarUrl: string;
    bio: string;
    bioMaxLines: number;
    displayName: string;
    nameFontSize: string;
  };
  SocialLinks: HomepagePuckBaseProps & HomepageLayoutProps & {
    iconSize: string;
    layout: string;
    platforms: Array<{ label: string; platformCode: string; url: string }>;
    style: string;
  };
  ImageGallery: HomepagePuckBaseProps & HomepageLayoutProps & {
    columns: number;
    gap: string;
    images: Array<{ alt: string; caption: string; url: string }>;
    layoutMode: string;
    showCaptions: boolean;
  };
  RichText: HomepagePuckBaseProps & HomepageLayoutProps & {
    contentHtml: string;
    textAlign: string;
  };
  LinkButton: HomepagePuckBaseProps & HomepageLayoutProps & {
    fullWidth: boolean;
    label: string;
    style: string;
    url: string;
  };
  MarshmallowWidget: HomepagePuckBaseProps & HomepageLayoutProps & {
    displayMode: string;
    showRecentCount: number;
    showSubmitButton: boolean;
  };
  VideoEmbed: HomepagePuckBaseProps & HomepageLayoutProps & {
    aspectRatio: string;
    autoplay: boolean;
    showControls: boolean;
    title: string;
    videoUrl: string;
  };
  MusicPlayer: HomepagePuckBaseProps & HomepageLayoutProps & {
    artist: string;
    embedValue: string;
    platform: string;
    title: string;
  };
  Schedule: HomepagePuckBaseProps & HomepageLayoutProps & {
    events: Array<{ day: string; time: string; title: string }>;
    title: string;
    weekOf: string;
  };
  LiveStatus: HomepagePuckBaseProps & HomepageLayoutProps & {
    channelName: string;
    isLive: boolean;
    platform: string;
    streamUrl: string;
    title: string;
    viewers: string;
  };
  Divider: HomepagePuckBaseProps & HomepageLayoutProps & {
    spacing: 'small' | 'medium' | 'large';
    style: 'solid' | 'dashed' | 'dotted';
  };
  Spacer: HomepagePuckBaseProps & HomepageLayoutProps & {
    height: 'small' | 'medium' | 'large' | 'xlarge';
  };
  BilibiliDynamic: HomepagePuckBaseProps & HomepageLayoutProps & {
    cardStyle: string;
    filterType: string;
    maxItems: number;
    refreshInterval: number;
    showHeader: boolean;
    title: string;
    uid: string;
  };
  UnsupportedHomepageBlock: HomepagePuckUnsupportedProps;
}

export type HomepagePuckData = Data<HomepagePuckComponents, HomepagePuckRootProps>;
type HomepagePuckContentItem = HomepagePuckData['content'][number];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeStringChoice<T extends string>(
  value: unknown,
  fallback: T,
  options: readonly T[],
): T {
  const nextValue = asString(value, fallback);

  return options.includes(nextValue as T) ? (nextValue as T) : fallback;
}

function mapLayoutPropsToPuckProps(props: Record<string, unknown>): HomepageLayoutProps {
  const normalized = normalizeHomepageLayoutProps(props);

  return {
    ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
    ...normalized,
  };
}

function asRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function safeParseRecord(input: string) {
  try {
    const value = JSON.parse(input) as unknown;

    return asRecord(value);
  } catch {
    return {};
  }
}

export function isHomepagePuckSupportedType(type: string): type is HomepagePuckSupportedType {
  return (HOMEPAGE_PUCK_SUPPORTED_TYPES as readonly string[]).includes(type);
}

function mapPropsToPuckProps(component: HomepageDraftComponentRecord) {
  const props = asRecord(component.props);
  const baseProps = {
    id: component.id,
    visible: component.visible !== false,
  };
  const layoutProps = mapLayoutPropsToPuckProps(props);

  switch (component.type) {
    case 'ProfileCard':
      return {
        ...baseProps,
        ...layoutProps,
        avatarShape: asString(props.avatarShape, 'circle'),
        avatarUrl: asString(props.avatarUrl),
        bio: asString(props.bio),
        bioMaxLines: asNumber(props.bioMaxLines, 3),
        displayName: asString(props.displayName),
        nameFontSize: asString(props.nameFontSize, 'large'),
      } satisfies HomepagePuckComponents['ProfileCard'];
    case 'SocialLinks':
      return {
        ...baseProps,
        ...layoutProps,
        iconSize: asString(props.iconSize, 'medium'),
        layout: asString(props.layout, 'horizontal'),
        platforms: asRecordArray(props.platforms).map((platform) => ({
          label: asString(platform.label),
          platformCode: asString(platform.platformCode),
          url: asString(platform.url),
        })),
        style: asString(props.style, 'icon'),
      } satisfies HomepagePuckComponents['SocialLinks'];
    case 'ImageGallery':
      return {
        ...baseProps,
        ...layoutProps,
        columns: asNumber(props.columns, 3),
        gap: asString(props.gap, 'medium'),
        images: asRecordArray(props.images).map((image) => ({
          alt: asString(image.alt),
          caption: asString(image.caption),
          url: asString(image.url),
        })),
        showCaptions: asBoolean(props.showCaptions),
      } satisfies HomepagePuckComponents['ImageGallery'];
    case 'RichText':
      return {
        ...baseProps,
        ...layoutProps,
        contentHtml: asString(props.contentHtml),
        textAlign: asString(props.textAlign, 'left'),
      } satisfies HomepagePuckComponents['RichText'];
    case 'LinkButton':
      return {
        ...baseProps,
        ...layoutProps,
        fullWidth: asBoolean(props.fullWidth),
        label: asString(props.label),
        style: asString(props.style, 'primary'),
        url: asString(props.url),
      } satisfies HomepagePuckComponents['LinkButton'];
    case 'MarshmallowWidget':
      return {
        ...baseProps,
        ...layoutProps,
        displayMode: asString(props.displayMode, 'compact'),
        showRecentCount: asNumber(props.showRecentCount, 3),
        showSubmitButton: asBoolean(props.showSubmitButton, true),
      } satisfies HomepagePuckComponents['MarshmallowWidget'];
    case 'VideoEmbed':
      return {
        ...baseProps,
        ...layoutProps,
        aspectRatio: asString(props.aspectRatio, '16:9'),
        autoplay: asBoolean(props.autoplay),
        showControls: asBoolean(props.showControls, true),
        title: asString(props.title),
        videoUrl: asString(props.videoUrl),
      } satisfies HomepagePuckComponents['VideoEmbed'];
    case 'MusicPlayer':
      return {
        ...baseProps,
        ...layoutProps,
        artist: asString(props.artist),
        embedValue: asString(props.embedValue),
        platform: asString(props.platform, 'spotify'),
        title: asString(props.title),
      } satisfies HomepagePuckComponents['MusicPlayer'];
    case 'Schedule':
      return {
        ...baseProps,
        ...layoutProps,
        events: asRecordArray(props.events).map((event) => ({
          day: asString(event.day),
          time: asString(event.time),
          title: asString(event.title),
        })),
        title: asString(props.title),
        weekOf: asString(props.weekOf),
      } satisfies HomepagePuckComponents['Schedule'];
    case 'LiveStatus':
      return {
        ...baseProps,
        ...layoutProps,
        channelName: asString(props.channelName),
        isLive: asBoolean(props.isLive),
        platform: asString(props.platform, 'youtube'),
        streamUrl: asString(props.streamUrl),
        title: asString(props.title),
        viewers: asString(props.viewers),
      } satisfies HomepagePuckComponents['LiveStatus'];
    case 'Divider':
      return {
        ...baseProps,
        ...layoutProps,
        spacing: normalizeStringChoice(props.spacing, 'medium', ['small', 'medium', 'large'] as const),
        style: normalizeStringChoice(props.style, 'solid', ['solid', 'dashed', 'dotted'] as const),
      } satisfies HomepagePuckComponents['Divider'];
    case 'Spacer':
      return {
        ...baseProps,
        ...layoutProps,
        height: normalizeStringChoice(props.height, 'medium', ['small', 'medium', 'large', 'xlarge'] as const),
      } satisfies HomepagePuckComponents['Spacer'];
    case 'BilibiliDynamic':
      return {
        ...baseProps,
        ...layoutProps,
        cardStyle: asString(props.cardStyle, 'standard'),
        filterType: asString(props.filterType, 'all'),
        maxItems: asNumber(props.maxItems, 5),
        refreshInterval: asNumber(props.refreshInterval, 0),
        showHeader: asBoolean(props.showHeader, true),
        title: asString(props.title),
        uid: asString(props.uid),
      } satisfies HomepagePuckComponents['BilibiliDynamic'];
    default:
      return {
        ...baseProps,
        originalType: component.type,
        serializedProps: JSON.stringify(component.props || {}, null, 2),
      } satisfies HomepagePuckUnsupportedProps;
  }
}

function mapComponentToPuckItem(component: HomepageDraftComponentRecord): HomepagePuckContentItem {
  switch (component.type) {
    case 'ProfileCard':
      return {
        type: 'ProfileCard',
        props: mapPropsToPuckProps(component) as HomepagePuckComponents['ProfileCard'],
      };
    case 'SocialLinks':
      return {
        type: 'SocialLinks',
        props: mapPropsToPuckProps(component) as HomepagePuckComponents['SocialLinks'],
      };
    case 'ImageGallery':
      return {
        type: 'ImageGallery',
        props: mapPropsToPuckProps(component) as HomepagePuckComponents['ImageGallery'],
      };
    case 'RichText':
      return {
        type: 'RichText',
        props: mapPropsToPuckProps(component) as HomepagePuckComponents['RichText'],
      };
    case 'LinkButton':
      return {
        type: 'LinkButton',
        props: mapPropsToPuckProps(component) as HomepagePuckComponents['LinkButton'],
      };
    case 'MarshmallowWidget':
      return {
        type: 'MarshmallowWidget',
        props: mapPropsToPuckProps(component) as HomepagePuckComponents['MarshmallowWidget'],
      };
    case 'VideoEmbed':
      return {
        type: 'VideoEmbed',
        props: mapPropsToPuckProps(component) as HomepagePuckComponents['VideoEmbed'],
      };
    case 'MusicPlayer':
      return {
        type: 'MusicPlayer',
        props: mapPropsToPuckProps(component) as HomepagePuckComponents['MusicPlayer'],
      };
    case 'Schedule':
      return {
        type: 'Schedule',
        props: mapPropsToPuckProps(component) as HomepagePuckComponents['Schedule'],
      };
    case 'LiveStatus':
      return {
        type: 'LiveStatus',
        props: mapPropsToPuckProps(component) as HomepagePuckComponents['LiveStatus'],
      };
    case 'Divider':
      return {
        type: 'Divider',
        props: mapPropsToPuckProps(component) as HomepagePuckComponents['Divider'],
      };
    case 'Spacer':
      return {
        type: 'Spacer',
        props: mapPropsToPuckProps(component) as HomepagePuckComponents['Spacer'],
      };
    case 'BilibiliDynamic':
      return {
        type: 'BilibiliDynamic',
        props: mapPropsToPuckProps(component) as HomepagePuckComponents['BilibiliDynamic'],
      };
    default:
      return {
        type: HOMEPAGE_PUCK_UNSUPPORTED_TYPE,
        props: mapPropsToPuckProps(component) as HomepagePuckUnsupportedProps,
      };
  }
}

export function mapHomepageContentToPuckData(
  content: HomepageDraftContent,
  theme?: ThemeConfig | null,
): HomepagePuckData {
  const normalized = normalizeHomepageDraftContent(content);

  return {
    root: {
      props: mapHomepageThemeToPuckRootProps(theme),
    },
    content: normalized.components.map((component) => mapComponentToPuckItem(component)),
  } satisfies HomepagePuckData;
}

export function mapPuckDataToHomepageTheme(
  data: Partial<HomepagePuckData>,
  baseTheme: ThemeConfig,
) {
  return mapHomepagePuckRootPropsToTheme(data.root?.props, baseTheme);
}

function mapPuckPropsToHomepageProps(type: HomepagePuckSupportedType, props: Record<string, unknown>) {
  const layoutProps = mapLayoutPropsToPuckProps(props);

  switch (type) {
    case 'ProfileCard':
      return {
        ...layoutProps,
        avatarShape: asString(props.avatarShape, 'circle'),
        avatarUrl: asString(props.avatarUrl),
        bio: asString(props.bio),
        bioMaxLines: asNumber(props.bioMaxLines, 3),
        displayName: asString(props.displayName),
        nameFontSize: asString(props.nameFontSize, 'large'),
      };
    case 'SocialLinks':
      return {
        ...layoutProps,
        iconSize: asString(props.iconSize, 'medium'),
        layout: asString(props.layout, 'horizontal'),
        platforms: asRecordArray(props.platforms).map((platform) => ({
          label: asString(platform.label),
          platformCode: asString(platform.platformCode),
          url: asString(platform.url),
        })),
        style: asString(props.style, 'icon'),
      };
    case 'ImageGallery':
      return {
        ...layoutProps,
        columns: asNumber(props.columns, 3),
        gap: asString(props.gap, 'medium'),
        images: asRecordArray(props.images).map((image) => ({
          alt: asString(image.alt),
          caption: asString(image.caption),
          url: asString(image.url),
        })),
        showCaptions: asBoolean(props.showCaptions),
      };
    case 'RichText':
      return {
        ...layoutProps,
        contentHtml: asString(props.contentHtml),
        textAlign: asString(props.textAlign, 'left'),
      };
    case 'LinkButton':
      return {
        ...layoutProps,
        fullWidth: asBoolean(props.fullWidth),
        label: asString(props.label),
        style: asString(props.style, 'primary'),
        url: asString(props.url),
      };
    case 'MarshmallowWidget':
      return {
        ...layoutProps,
        displayMode: asString(props.displayMode, 'compact'),
        showRecentCount: asNumber(props.showRecentCount, 3),
        showSubmitButton: asBoolean(props.showSubmitButton, true),
      };
    case 'VideoEmbed':
      return {
        ...layoutProps,
        aspectRatio: asString(props.aspectRatio, '16:9'),
        autoplay: asBoolean(props.autoplay),
        showControls: asBoolean(props.showControls, true),
        title: asString(props.title),
        videoUrl: asString(props.videoUrl),
      };
    case 'MusicPlayer':
      return {
        ...layoutProps,
        artist: asString(props.artist),
        embedValue: asString(props.embedValue),
        platform: asString(props.platform, 'spotify'),
        title: asString(props.title),
      };
    case 'Schedule':
      return {
        ...layoutProps,
        events: asRecordArray(props.events).map((event) => ({
          day: asString(event.day),
          time: asString(event.time),
          title: asString(event.title),
        })),
        title: asString(props.title),
        weekOf: asString(props.weekOf),
      };
    case 'LiveStatus':
      return {
        ...layoutProps,
        channelName: asString(props.channelName),
        isLive: asBoolean(props.isLive),
        platform: asString(props.platform, 'youtube'),
        streamUrl: asString(props.streamUrl),
        title: asString(props.title),
        viewers: asString(props.viewers),
      };
    case 'Divider':
      return {
        ...layoutProps,
        spacing: normalizeStringChoice(props.spacing, 'medium', ['small', 'medium', 'large'] as const),
        style: normalizeStringChoice(props.style, 'solid', ['solid', 'dashed', 'dotted'] as const),
      };
    case 'Spacer':
      return {
        ...layoutProps,
        height: normalizeStringChoice(props.height, 'medium', ['small', 'medium', 'large', 'xlarge'] as const),
      };
    case 'BilibiliDynamic':
      return {
        ...layoutProps,
        cardStyle: asString(props.cardStyle, 'standard'),
        filterType: asString(props.filterType, 'all'),
        maxItems: asNumber(props.maxItems, 5),
        refreshInterval: asNumber(props.refreshInterval, 0),
        showHeader: asBoolean(props.showHeader, true),
        title: asString(props.title),
        uid: asString(props.uid),
      };
  }
}

export function mapPuckDataToHomepageContent(
  data: Partial<HomepagePuckData>,
  baseVersion = '1.0',
): HomepageDraftContent {
  const content = Array.isArray(data.content) ? data.content : [];

  return {
    version: baseVersion,
    components: content.map((component, index) => {
      const props = asRecord(component.props);
      const type = asString(component.type);
      const id = asString(props.id, `puck-component-${index + 1}`);

      if (type === HOMEPAGE_PUCK_UNSUPPORTED_TYPE) {
        const originalType = asString(props.originalType, HOMEPAGE_PUCK_UNSUPPORTED_TYPE);

        return {
          id,
          type: originalType,
          props: safeParseRecord(asString(props.serializedProps, '{}')),
          order: index + 1,
          visible: asBoolean(props.visible, true),
        };
      }

      if (!isHomepagePuckSupportedType(type)) {
        return {
          id,
          type,
          props: {},
          order: index + 1,
          visible: asBoolean(props.visible, true),
        };
      }

      return {
        id,
        type,
        props: mapPuckPropsToHomepageProps(type, props),
        order: index + 1,
        visible: asBoolean(props.visible, true),
      };
    }),
  };
}

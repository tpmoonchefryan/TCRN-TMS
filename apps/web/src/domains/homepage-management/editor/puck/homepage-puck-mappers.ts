import { type Data } from '@puckeditor/core';

import {
  type HomepageDraftComponentRecord,
  type HomepageDraftContent,
} from '@/domains/homepage-management/api/homepage.api';
import {
  DEFAULT_HOMEPAGE_LAYOUT_PROPS,
  type HomepageLayoutProps,
  normalizeHomepageLayoutProps,
} from '@/domains/homepage-management/editor/puck/homepage-layout-presets';
import { normalizeHomepageDraftContent } from '@/domains/homepage-management/editor/source/homepage-source-dsl';

export const HOMEPAGE_PUCK_SUPPORTED_TYPES = [
  'ProfileCard',
  'SocialLinks',
  'ImageGallery',
  'RichText',
  'LinkButton',
  'MarshmallowWidget',
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
  UnsupportedHomepageBlock: HomepagePuckUnsupportedProps;
}

export type HomepagePuckData = Data<HomepagePuckComponents, { title?: string }>;
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
    default:
      return {
        type: HOMEPAGE_PUCK_UNSUPPORTED_TYPE,
        props: mapPropsToPuckProps(component) as HomepagePuckUnsupportedProps,
      };
  }
}

export function mapHomepageContentToPuckData(content: HomepageDraftContent): HomepagePuckData {
  const normalized = normalizeHomepageDraftContent(content);

  return {
    root: {
      props: {
        title: 'Homepage',
      },
    },
    content: normalized.components.map((component) => mapComponentToPuckItem(component)),
  } satisfies HomepagePuckData;
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

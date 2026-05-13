import { type Config, type Permissions } from '@puckeditor/core';
import { type ThemeConfig } from '@tcrn/shared';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Columns2,
  Grid2x2,
  Square,
  TableRowsSplit,
} from 'lucide-react';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

import { DEFAULT_HOMEPAGE_LAYOUT_PROPS } from '@/domains/homepage-management/editor/puck/homepage-layout-presets';
import {
  type HomepagePuckRootProps,
  mapHomepagePuckRootPropsToTheme,
  mapHomepageThemeToPuckRootProps,
} from '@/domains/homepage-management/editor/puck/homepage-puck-theme';
import { HomepagePuckBlockPreview } from '@/domains/homepage-management/editor/puck/HomepagePuckBlockPreview';
import { createHomepagePuckChoiceField } from '@/domains/homepage-management/editor/puck/HomepagePuckChoiceField';
import { createHomepagePuckDimensionField } from '@/domains/homepage-management/editor/puck/HomepagePuckDimensionField';
import {
  createHomepagePuckBackgroundField,
  createHomepagePuckBackgroundOverlayField,
  createHomepagePuckImageField,
  type HomepagePuckImageUpload,
} from '@/domains/homepage-management/editor/puck/HomepagePuckMediaField';
import { type HomepageEditorCopy } from '@/domains/homepage-management/screens/homepage-editor.copy';
import { getHomepageCanvasStyle } from '@/domains/public-homepage/components/PublicHomepageRenderer';

import {
  HOMEPAGE_PUCK_UNSUPPORTED_TYPE,
  type HomepagePuckComponents,
} from './homepage-puck-mappers';

const READ_ONLY_PERMISSIONS: Partial<Permissions> = {
  delete: false,
  drag: false,
  duplicate: false,
  edit: false,
  insert: false,
};

function textOption<T extends string>(copy: HomepageEditorCopy, value: T) {
  return {
    label: copy.structured.options[value] || value,
    value,
  };
}

function booleanOption(label: string, value: boolean) {
  return {
    label,
    value,
  };
}

function booleanOptions(onLabel: string, offLabel: string) {
  return [booleanOption(onLabel, true), booleanOption(offLabel, false)] as const;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function resolveFieldProps(value: unknown) {
  const record = asRecord(value);
  const nestedProps = asRecord(record.props);

  return Object.keys(nestedProps).length > 0 ? nestedProps : record;
}

function setFieldVisibility<
  TFields extends Record<string, { visible?: boolean }>,
  TKey extends keyof TFields,
>(fields: TFields, key: TKey, visible: boolean): TFields {
  return {
    ...fields,
    [key]: {
      ...fields[key],
      visible,
    },
  };
}

function resolveHomepagePuckLayoutFields<TFields extends Record<string, { visible?: boolean }>>(
  data: unknown,
  fields: TFields,
): TFields {
  const props = resolveFieldProps(data);

  return setFieldVisibility(
    setFieldVisibility(fields, 'customWidthPx' as keyof TFields, props.widthPreset === 'custom'),
    'customHeightPx' as keyof TFields,
    props.heightPreset === 'custom',
  );
}

function resolveHomepagePuckRootFields<TFields extends Record<string, { visible?: boolean }>>(
  data: unknown,
  fields: TFields,
): TFields {
  const props = resolveFieldProps(data);

  return setFieldVisibility(fields, 'backgroundOverlay' as keyof TFields, props.backgroundType === 'image');
}

function createLayoutFields(copy: HomepageEditorCopy) {
  return {
    layoutMode: createHomepagePuckChoiceField(copy.structured.layoutMode, [
      { icon: Square, label: copy.structured.options.default, value: 'default' },
      { icon: TableRowsSplit, label: copy.structured.options.stack, value: 'stack' },
      { icon: Columns2, label: copy.structured.options.row, value: 'row' },
      { icon: Grid2x2, label: copy.structured.options.grid, value: 'grid' },
    ] as const),
    align: createHomepagePuckChoiceField(copy.structured.align, [
      { icon: AlignLeft, label: copy.structured.options.left, value: 'left' },
      { icon: AlignCenter, label: copy.structured.options.center, value: 'center' },
      { icon: AlignRight, label: copy.structured.options.right, value: 'right' },
    ] as const),
    widthPreset: createHomepagePuckChoiceField(copy.structured.widthPreset, [
      { label: copy.structured.options.full, value: 'full' },
      { label: copy.structured.options.wide, value: 'wide' },
      { label: copy.structured.options.content, value: 'content' },
      { label: copy.structured.options.narrow, value: 'narrow' },
      { label: copy.structured.options.custom, value: 'custom' },
    ] as const),
    customWidthPx: {
      ...createHomepagePuckDimensionField(copy.structured.customWidth, {
        max: 1440,
        min: 240,
        step: 1,
      }),
      visible: false,
    },
    heightPreset: createHomepagePuckChoiceField(copy.structured.heightPreset, [
      { label: copy.structured.options.auto, value: 'auto' },
      { label: copy.structured.options.small, value: 'small' },
      { label: copy.structured.options.medium, value: 'medium' },
      { label: copy.structured.options.large, value: 'large' },
      { label: copy.structured.options.custom, value: 'custom' },
    ] as const),
    customHeightPx: {
      ...createHomepagePuckDimensionField(copy.structured.customHeight, {
        max: 1200,
        min: 80,
        step: 1,
      }),
      visible: false,
    },
    gapToken: createHomepagePuckChoiceField(copy.structured.gapToken, [
      { label: copy.structured.options.none, shortLabel: '0', value: 'none' },
      { label: copy.structured.options.xs, shortLabel: 'XS', value: 'xs' },
      { label: copy.structured.options.sm, shortLabel: 'S', value: 'sm' },
      { label: copy.structured.options.md, shortLabel: 'M', value: 'md' },
      { label: copy.structured.options.lg, shortLabel: 'L', value: 'lg' },
    ] as const),
    paddingToken: createHomepagePuckChoiceField(copy.structured.paddingToken, [
      { label: copy.structured.options.none, shortLabel: '0', value: 'none' },
      { label: copy.structured.options.xs, shortLabel: 'XS', value: 'xs' },
      { label: copy.structured.options.sm, shortLabel: 'S', value: 'sm' },
      { label: copy.structured.options.md, shortLabel: 'M', value: 'md' },
      { label: copy.structured.options.lg, shortLabel: 'L', value: 'lg' },
    ] as const),
    radiusToken: createHomepagePuckChoiceField(copy.structured.radiusToken, [
      { label: copy.structured.options.none, shortLabel: '0', value: 'none' },
      { label: copy.structured.options.sm, shortLabel: 'S', value: 'sm' },
      { label: copy.structured.options.md, shortLabel: 'M', value: 'md' },
      { label: copy.structured.options.lg, shortLabel: 'L', value: 'lg' },
      { label: copy.structured.options.full, shortLabel: 'Full', value: 'full' },
    ] as const),
    paddingPreset: createHomepagePuckChoiceField(copy.structured.paddingPreset, [
      { label: copy.structured.options.none, shortLabel: '0', value: 'none' },
      { label: copy.structured.options.small, shortLabel: 'S', value: 'small' },
      { label: copy.structured.options.medium, shortLabel: 'M', value: 'medium' },
      { label: copy.structured.options.large, shortLabel: 'L', value: 'large' },
    ] as const),
  } as const;
}

function renderPreviewBlock(
  type: keyof Omit<HomepagePuckComponents, typeof HOMEPAGE_PUCK_UNSUPPORTED_TYPE>,
  props: Record<string, unknown>,
  theme: ThemeConfig,
  copy: HomepageEditorCopy,
) {
  return (
    <HomepagePuckBlockPreview
      description={copy.catalog.entries[type]?.description}
      label={copy.catalog.entries[type]?.label}
      props={props}
      theme={theme}
      type={type}
    />
  );
}

interface HomepagePuckRootDropZoneElementProps {
  className?: string;
  minEmptyHeight?: number | string;
  zone: string;
}

interface HomepagePuckConfigOptions {
  onUploadImage?: HomepagePuckImageUpload;
}

function renderRootPreview(
  children: ReactNode,
  rootProps: HomepagePuckRootProps,
  theme: ThemeConfig,
) {
  const rootTheme = mapHomepagePuckRootPropsToTheme(rootProps, theme);
  const rootChildren =
    isValidElement(children) && typeof children.props === 'object' && children.props !== null && 'zone' in children.props
      ? cloneElement(
        children as ReactElement<HomepagePuckRootDropZoneElementProps>,
        {
          className: [
            (children.props as HomepagePuckRootDropZoneElementProps).className,
            'flex-1',
          ].filter(Boolean).join(' '),
          minEmptyHeight: '100%',
        },
      )
      : children;

  return (
    <div
      data-homepage-puck-root
      className="flex h-full min-h-full flex-col p-6 md:p-8"
      style={getHomepageCanvasStyle(rootTheme)}
    >
      {rootChildren}
    </div>
  );
}

export function createHomepagePuckConfig(
  copy: HomepageEditorCopy,
  theme: ThemeConfig,
  options: HomepagePuckConfigOptions = {},
): Config<
  HomepagePuckComponents,
  HomepagePuckRootProps,
  'content' | 'core' | 'interactive' | 'layout' | 'media' | 'unsupported'
> {
  const visibilityOptions = [
    booleanOption(copy.block.visible, true),
    booleanOption(copy.block.hidden, false),
  ];
  const layoutFields = createLayoutFields(copy);
  const imageField = createHomepagePuckImageField({
    clearLabel: copy.block.remove,
    label: copy.structured.imageUrl,
    onUpload: options.onUploadImage,
    placeholder: 'https://cdn.example.com/image.png',
    uploadErrorLabel: copy.structured.imageUploadFailed,
    uploadLabel: copy.structured.addImage,
    uploadingLabel: copy.structured.imageUploading,
  });
  const backgroundValueFields = {
    solid: createHomepagePuckBackgroundField({
      clearLabel: copy.block.remove,
      kind: 'solid',
      label: copy.structured.backgroundValue,
      onUpload: options.onUploadImage,
      placeholder: '#FAFBFC',
      uploadErrorLabel: copy.structured.imageUploadFailed,
      uploadLabel: copy.structured.addImage,
      uploadingLabel: copy.structured.imageUploading,
    }),
    gradient: createHomepagePuckBackgroundField({
      clearLabel: copy.block.remove,
      kind: 'gradient',
      label: copy.structured.backgroundValue,
      onUpload: options.onUploadImage,
      placeholder: 'linear-gradient(135deg, #FAFBFC 0%, #E0E7FF 100%)',
      uploadErrorLabel: copy.structured.imageUploadFailed,
      uploadLabel: copy.structured.addImage,
      uploadingLabel: copy.structured.imageUploading,
    }),
    image: createHomepagePuckBackgroundField({
      clearLabel: copy.block.remove,
      kind: 'image',
      label: copy.structured.backgroundValue,
      onUpload: options.onUploadImage,
      placeholder: 'https://cdn.example.com/background.jpg',
      uploadErrorLabel: copy.structured.imageUploadFailed,
      uploadLabel: copy.structured.addImage,
      uploadingLabel: copy.structured.imageUploading,
    }),
  } as const;
  const rootFields = {
    title: { type: 'text', visible: false },
    backgroundType: createHomepagePuckChoiceField(copy.structured.backgroundType, [
      { label: copy.structured.options.solid, value: 'solid' },
      { label: copy.structured.options.gradient, value: 'gradient' },
      { label: copy.structured.options.image, value: 'image' },
    ] as const),
    backgroundValue: backgroundValueFields.solid,
    backgroundOverlay: {
      ...createHomepagePuckBackgroundOverlayField({
        description: copy.structured.backgroundOverlay,
        label: copy.structured.backgroundOverlay,
      }),
      visible: false,
    },
  } as const;

  return {
    categories: {
      core: {
        title: copy.catalog.categories.core,
        components: ['ProfileCard', 'SocialLinks'],
        defaultExpanded: true,
      },
      media: {
        title: copy.catalog.categories.media,
        components: ['ImageGallery', 'VideoEmbed', 'MusicPlayer'],
      },
      content: {
        title: copy.catalog.categories.content,
        components: ['RichText', 'Schedule'],
      },
      layout: {
        title: copy.catalog.categories.layout,
        components: ['Divider', 'Spacer'],
      },
      interactive: {
        title: copy.catalog.categories.interactive,
        components: ['LinkButton', 'MarshmallowWidget', 'LiveStatus', 'BilibiliDynamic'],
      },
      unsupported: {
        title: copy.structured.unsupportedCategory,
        components: [HOMEPAGE_PUCK_UNSUPPORTED_TYPE],
        visible: false,
      },
    },
    root: {
      defaultProps: mapHomepageThemeToPuckRootProps(theme),
      fields: rootFields,
      render: ({ backgroundOverlay, backgroundType, backgroundValue, children, title }) => renderRootPreview(
        children,
        {
          title,
          backgroundType,
          backgroundValue,
          backgroundOverlay,
        },
        theme,
      ),
      resolveFields: (data, { fields }) => {
        const props = resolveFieldProps(data);

        return {
          ...resolveHomepagePuckRootFields(data, fields),
          backgroundValue:
            props.backgroundType === 'image'
              ? backgroundValueFields.image
              : props.backgroundType === 'gradient'
                ? backgroundValueFields.gradient
                : backgroundValueFields.solid,
        };
      },
    },
    components: {
      ProfileCard: {
        label: copy.catalog.entries.ProfileCard.label,
        defaultProps: {
          ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
          id: '',
          visible: true,
          avatarShape: 'circle',
          avatarUrl: '',
          bio: '',
          bioMaxLines: 3,
          displayName: '',
          nameFontSize: 'large',
        },
        fields: {
          id: { type: 'text', visible: false },
          layoutMode: layoutFields.layoutMode,
          align: layoutFields.align,
          widthPreset: layoutFields.widthPreset,
          customWidthPx: layoutFields.customWidthPx,
          heightPreset: layoutFields.heightPreset,
          customHeightPx: layoutFields.customHeightPx,
          gapToken: layoutFields.gapToken,
          paddingToken: layoutFields.paddingToken,
          radiusToken: layoutFields.radiusToken,
          paddingPreset: layoutFields.paddingPreset,
          displayName: { type: 'text', label: copy.structured.displayName },
          avatarUrl: imageField,
          avatarShape: {
            type: 'select',
            label: copy.structured.shape,
            options: ['circle', 'rounded', 'square'].map((value) => textOption(copy, value)),
          },
          nameFontSize: {
            type: 'select',
            label: copy.structured.nameFontSize,
            options: ['small', 'medium', 'large'].map((value) => textOption(copy, value)),
          },
          bio: { type: 'textarea', label: copy.structured.bio },
          bioMaxLines: { type: 'number', label: copy.structured.bioMaxLines, min: 1 },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('ProfileCard', props, theme, copy),
      },
      SocialLinks: {
        label: copy.catalog.entries.SocialLinks.label,
        defaultProps: {
          ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
          id: '',
          visible: true,
          iconSize: 'medium',
          layout: 'horizontal',
          platforms: [],
          style: 'icon',
        },
        fields: {
          id: { type: 'text', visible: false },
          layoutMode: layoutFields.layoutMode,
          align: layoutFields.align,
          widthPreset: layoutFields.widthPreset,
          customWidthPx: layoutFields.customWidthPx,
          heightPreset: layoutFields.heightPreset,
          customHeightPx: layoutFields.customHeightPx,
          gapToken: layoutFields.gapToken,
          paddingToken: layoutFields.paddingToken,
          radiusToken: layoutFields.radiusToken,
          paddingPreset: layoutFields.paddingPreset,
          style: {
            type: 'select',
            label: copy.structured.style,
            options: ['icon', 'button', 'pill'].map((value) => textOption(copy, value)),
          },
          layout: {
            type: 'select',
            label: copy.structured.layout,
            options: ['horizontal', 'vertical', 'grid'].map((value) => textOption(copy, value)),
          },
          iconSize: {
            type: 'select',
            label: 'Icon size',
            options: ['small', 'medium', 'large'].map((value) => textOption(copy, value)),
          },
          platforms: {
            type: 'array',
            label: copy.catalog.entries.SocialLinks.label,
            arrayFields: {
              platformCode: { type: 'text', label: copy.structured.platformCode },
              url: { type: 'text', label: copy.structured.url },
              label: { type: 'text', label: copy.structured.label },
            },
            defaultItemProps: {
              platformCode: '',
              url: '',
              label: '',
            },
            getItemSummary: (item) => item.label || item.platformCode || copy.catalog.entries.SocialLinks.label,
          },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('SocialLinks', props, theme, copy),
      },
      ImageGallery: {
        label: copy.catalog.entries.ImageGallery.label,
        defaultProps: {
          ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
          id: '',
          visible: true,
          columns: 3,
          gap: 'medium',
          images: [],
          layoutMode: 'default',
          showCaptions: false,
        },
        fields: {
          id: { type: 'text', visible: false },
          layoutMode: layoutFields.layoutMode,
          align: layoutFields.align,
          widthPreset: layoutFields.widthPreset,
          customWidthPx: layoutFields.customWidthPx,
          heightPreset: layoutFields.heightPreset,
          customHeightPx: layoutFields.customHeightPx,
          gapToken: layoutFields.gapToken,
          paddingToken: layoutFields.paddingToken,
          radiusToken: layoutFields.radiusToken,
          paddingPreset: layoutFields.paddingPreset,
          columns: { type: 'number', label: copy.structured.columns, min: 1, max: 4 },
          gap: {
            type: 'select',
            label: copy.structured.gap,
            options: ['small', 'medium', 'large'].map((value) => textOption(copy, value)),
          },
          showCaptions: {
            type: 'radio',
            label: copy.structured.showCaptions,
            options: booleanOptions('Show captions', 'Hide captions'),
          },
          images: {
            type: 'array',
            label: copy.catalog.entries.ImageGallery.label,
            arrayFields: {
              url: imageField,
              alt: { type: 'text', label: copy.structured.imageAlt },
              caption: { type: 'text', label: copy.structured.caption },
            },
            defaultItemProps: {
              url: '',
              alt: '',
              caption: '',
            },
            getItemSummary: (item) => item.caption || item.alt || copy.catalog.entries.ImageGallery.label,
          },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('ImageGallery', props, theme, copy),
      },
      RichText: {
        label: copy.catalog.entries.RichText.label,
        defaultProps: {
          ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
          id: '',
          visible: true,
          contentHtml: '',
          textAlign: 'left',
        },
        fields: {
          id: { type: 'text', visible: false },
          layoutMode: layoutFields.layoutMode,
          align: layoutFields.align,
          widthPreset: layoutFields.widthPreset,
          customWidthPx: layoutFields.customWidthPx,
          heightPreset: layoutFields.heightPreset,
          customHeightPx: layoutFields.customHeightPx,
          gapToken: layoutFields.gapToken,
          paddingToken: layoutFields.paddingToken,
          radiusToken: layoutFields.radiusToken,
          paddingPreset: layoutFields.paddingPreset,
          textAlign: {
            type: 'select',
            label: copy.structured.textAlign,
            options: ['left', 'center', 'right'].map((value) => textOption(copy, value)),
          },
          contentHtml: { type: 'textarea', label: copy.structured.content },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('RichText', props, theme, copy),
      },
      LinkButton: {
        label: copy.catalog.entries.LinkButton.label,
        defaultProps: {
          ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
          id: '',
          visible: true,
          fullWidth: false,
          label: '',
          style: 'primary',
          url: '',
        },
        fields: {
          id: { type: 'text', visible: false },
          layoutMode: layoutFields.layoutMode,
          align: layoutFields.align,
          widthPreset: layoutFields.widthPreset,
          customWidthPx: layoutFields.customWidthPx,
          heightPreset: layoutFields.heightPreset,
          customHeightPx: layoutFields.customHeightPx,
          gapToken: layoutFields.gapToken,
          paddingToken: layoutFields.paddingToken,
          radiusToken: layoutFields.radiusToken,
          paddingPreset: layoutFields.paddingPreset,
          label: { type: 'text', label: copy.structured.label },
          url: { type: 'text', label: copy.structured.url },
          style: {
            type: 'select',
            label: copy.structured.style,
            options: ['primary', 'secondary', 'outline', 'ghost'].map((value) => textOption(copy, value)),
          },
          fullWidth: {
            type: 'radio',
            label: copy.structured.fullWidth,
            options: booleanOptions('Full width', 'Auto width'),
          },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('LinkButton', props, theme, copy),
      },
      MarshmallowWidget: {
        label: copy.catalog.entries.MarshmallowWidget.label,
        defaultProps: {
          ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
          id: '',
          visible: true,
          displayMode: 'compact',
          showRecentCount: 3,
          showSubmitButton: true,
        },
        fields: {
          id: { type: 'text', visible: false },
          layoutMode: layoutFields.layoutMode,
          align: layoutFields.align,
          widthPreset: layoutFields.widthPreset,
          customWidthPx: layoutFields.customWidthPx,
          heightPreset: layoutFields.heightPreset,
          customHeightPx: layoutFields.customHeightPx,
          gapToken: layoutFields.gapToken,
          paddingToken: layoutFields.paddingToken,
          radiusToken: layoutFields.radiusToken,
          paddingPreset: layoutFields.paddingPreset,
          displayMode: {
            type: 'select',
            label: copy.structured.displayMode,
            options: ['compact', 'full'].map((value) => textOption(copy, value)),
          },
          showRecentCount: { type: 'number', label: copy.structured.showRecentCount, min: 0 },
          showSubmitButton: {
            type: 'radio',
            label: copy.structured.showSubmitButton,
            options: [booleanOption(copy.block.visible, true), booleanOption(copy.block.hidden, false)],
          },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('MarshmallowWidget', props, theme, copy),
      },
      VideoEmbed: {
        label: copy.catalog.entries.VideoEmbed.label,
        defaultProps: {
          ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
          aspectRatio: '16:9',
          autoplay: false,
          id: '',
          visible: true,
          showControls: true,
          title: '',
          videoUrl: '',
        },
        fields: {
          id: { type: 'text', visible: false },
          layoutMode: layoutFields.layoutMode,
          align: layoutFields.align,
          widthPreset: layoutFields.widthPreset,
          customWidthPx: layoutFields.customWidthPx,
          heightPreset: layoutFields.heightPreset,
          customHeightPx: layoutFields.customHeightPx,
          gapToken: layoutFields.gapToken,
          paddingToken: layoutFields.paddingToken,
          radiusToken: layoutFields.radiusToken,
          paddingPreset: layoutFields.paddingPreset,
          title: { type: 'text', label: copy.structured.title },
          videoUrl: { type: 'text', label: copy.structured.videoUrl },
          aspectRatio: {
            type: 'select',
            label: 'Aspect ratio',
            options: ['16:9', '4:3', '1:1'].map((value) => ({ label: value, value })),
          },
          autoplay: {
            type: 'radio',
            label: 'Autoplay',
            options: booleanOptions('On', 'Off'),
          },
          showControls: {
            type: 'radio',
            label: 'Show controls',
            options: booleanOptions('Show controls', 'Hide controls'),
          },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('VideoEmbed', props, theme, copy),
      },
      MusicPlayer: {
        label: copy.catalog.entries.MusicPlayer.label,
        defaultProps: {
          ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
          id: '',
          visible: true,
          artist: '',
          embedValue: '',
          platform: 'spotify',
          title: '',
        },
        fields: {
          id: { type: 'text', visible: false },
          layoutMode: layoutFields.layoutMode,
          align: layoutFields.align,
          widthPreset: layoutFields.widthPreset,
          customWidthPx: layoutFields.customWidthPx,
          heightPreset: layoutFields.heightPreset,
          customHeightPx: layoutFields.customHeightPx,
          gapToken: layoutFields.gapToken,
          paddingToken: layoutFields.paddingToken,
          radiusToken: layoutFields.radiusToken,
          paddingPreset: layoutFields.paddingPreset,
          title: { type: 'text', label: copy.structured.title },
          artist: { type: 'text', label: copy.structured.artist },
          platform: { type: 'text', label: copy.structured.platform },
          embedValue: { type: 'text', label: copy.structured.embedValue },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('MusicPlayer', props, theme, copy),
      },
      Schedule: {
        label: copy.catalog.entries.Schedule.label,
        defaultProps: {
          ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
          events: [],
          id: '',
          title: '',
          weekOf: '',
          visible: true,
        },
        fields: {
          id: { type: 'text', visible: false },
          layoutMode: layoutFields.layoutMode,
          align: layoutFields.align,
          widthPreset: layoutFields.widthPreset,
          customWidthPx: layoutFields.customWidthPx,
          heightPreset: layoutFields.heightPreset,
          customHeightPx: layoutFields.customHeightPx,
          gapToken: layoutFields.gapToken,
          paddingToken: layoutFields.paddingToken,
          radiusToken: layoutFields.radiusToken,
          paddingPreset: layoutFields.paddingPreset,
          title: { type: 'text', label: copy.structured.title },
          weekOf: { type: 'text', label: 'Week of' },
          events: {
            type: 'array',
            label: copy.catalog.entries.Schedule.label,
            arrayFields: {
              day: { type: 'text', label: copy.structured.day },
              time: { type: 'text', label: copy.structured.time },
              title: { type: 'text', label: copy.structured.title },
            },
            defaultItemProps: {
              day: '',
              time: '',
              title: '',
            },
            getItemSummary: (item) => item.title || item.day || copy.catalog.entries.Schedule.label,
          },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('Schedule', props, theme, copy),
      },
      LiveStatus: {
        label: copy.catalog.entries.LiveStatus.label,
        defaultProps: {
          ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
          channelName: '',
          id: '',
          isLive: false,
          platform: 'youtube',
          streamUrl: '',
          title: '',
          viewers: '',
          visible: true,
        },
        fields: {
          id: { type: 'text', visible: false },
          layoutMode: layoutFields.layoutMode,
          align: layoutFields.align,
          widthPreset: layoutFields.widthPreset,
          customWidthPx: layoutFields.customWidthPx,
          heightPreset: layoutFields.heightPreset,
          customHeightPx: layoutFields.customHeightPx,
          gapToken: layoutFields.gapToken,
          paddingToken: layoutFields.paddingToken,
          radiusToken: layoutFields.radiusToken,
          paddingPreset: layoutFields.paddingPreset,
          platform: {
            type: 'select',
            label: 'Platform',
            options: ['youtube', 'twitch', 'bilibili'].map((value) => ({
              label: value.charAt(0).toUpperCase() + value.slice(1),
              value,
            })),
          },
          channelName: { type: 'text', label: 'Channel name' },
          isLive: {
            type: 'radio',
            label: copy.structured.isLive,
            options: [
              booleanOption(copy.structured.options.live, true),
              booleanOption(copy.structured.options.offline, false),
            ],
          },
          title: { type: 'text', label: copy.structured.title },
          viewers: { type: 'text', label: copy.structured.viewers },
          streamUrl: { type: 'text', label: copy.structured.streamUrl },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('LiveStatus', props, theme, copy),
      },
      Divider: {
        label: copy.catalog.entries.Divider.label,
        defaultProps: {
          ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
          id: '',
          spacing: 'medium',
          style: 'solid',
          visible: true,
        },
        fields: {
          id: { type: 'text', visible: false },
          layoutMode: layoutFields.layoutMode,
          align: layoutFields.align,
          widthPreset: layoutFields.widthPreset,
          customWidthPx: layoutFields.customWidthPx,
          heightPreset: layoutFields.heightPreset,
          customHeightPx: layoutFields.customHeightPx,
          gapToken: layoutFields.gapToken,
          paddingToken: layoutFields.paddingToken,
          radiusToken: layoutFields.radiusToken,
          paddingPreset: layoutFields.paddingPreset,
          spacing: {
            type: 'select',
            label: 'Spacing',
            options: ['small', 'medium', 'large'].map((value) => textOption(copy, value)),
          },
          style: createHomepagePuckChoiceField(copy.structured.style, [
            { label: copy.structured.options.solid, value: 'solid' },
            { label: copy.structured.options.dashed, value: 'dashed' },
            { label: copy.structured.options.dotted, value: 'dotted' },
          ] as const),
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('Divider', props, theme, copy),
      },
      Spacer: {
        label: copy.catalog.entries.Spacer.label,
        defaultProps: {
          ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
          height: 'medium',
          id: '',
          visible: true,
        },
        fields: {
          id: { type: 'text', visible: false },
          layoutMode: layoutFields.layoutMode,
          align: layoutFields.align,
          widthPreset: layoutFields.widthPreset,
          customWidthPx: layoutFields.customWidthPx,
          heightPreset: layoutFields.heightPreset,
          customHeightPx: layoutFields.customHeightPx,
          gapToken: layoutFields.gapToken,
          paddingToken: layoutFields.paddingToken,
          radiusToken: layoutFields.radiusToken,
          paddingPreset: layoutFields.paddingPreset,
          height: createHomepagePuckChoiceField(copy.structured.height, [
            { label: copy.structured.options.small, value: 'small' },
            { label: copy.structured.options.medium, value: 'medium' },
            { label: copy.structured.options.large, value: 'large' },
            { label: copy.structured.options.xlarge, value: 'xlarge' },
          ] as const),
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('Spacer', props, theme, copy),
      },
      BilibiliDynamic: {
        label: copy.catalog.entries.BilibiliDynamic.label,
        defaultProps: {
          ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
          cardStyle: 'standard',
          filterType: 'all',
          id: '',
          maxItems: 5,
          refreshInterval: 0,
          showHeader: true,
          title: '',
          uid: '',
          visible: true,
        },
        fields: {
          id: { type: 'text', visible: false },
          layoutMode: layoutFields.layoutMode,
          align: layoutFields.align,
          widthPreset: layoutFields.widthPreset,
          customWidthPx: layoutFields.customWidthPx,
          heightPreset: layoutFields.heightPreset,
          customHeightPx: layoutFields.customHeightPx,
          gapToken: layoutFields.gapToken,
          paddingToken: layoutFields.paddingToken,
          radiusToken: layoutFields.radiusToken,
          paddingPreset: layoutFields.paddingPreset,
          title: { type: 'text', label: copy.structured.title },
          uid: { type: 'text', label: copy.structured.uid },
          maxItems: { type: 'number', label: 'Max items', min: 1, max: 20 },
          filterType: {
            type: 'select',
            label: 'Filter type',
            options: ['all', 'posts', 'videos'].map((value) => ({
              label: value.charAt(0).toUpperCase() + value.slice(1),
              value,
            })),
          },
          cardStyle: {
            type: 'select',
            label: 'Card style',
            options: ['standard', 'compact'].map((value) => ({
              label: value.charAt(0).toUpperCase() + value.slice(1),
              value,
            })),
          },
          refreshInterval: { type: 'number', label: 'Refresh interval', min: 0, step: 1 },
          showHeader: {
            type: 'radio',
            label: 'Show header',
            options: booleanOptions('Show header', 'Hide header'),
          },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('BilibiliDynamic', props, theme, copy),
      },
      UnsupportedHomepageBlock: {
        label: copy.structured.unsupportedAdvancedOnly,
        permissions: READ_ONLY_PERMISSIONS,
        defaultProps: {
          id: '',
          originalType: '',
          serializedProps: '{}',
          visible: true,
        },
        fields: {
          id: { type: 'text', visible: false },
          originalType: { type: 'text', label: copy.structured.originalType },
          serializedProps: { type: 'textarea', label: copy.structured.advancedJson },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        render: ({ originalType }) => (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {copy.structured.unsupportedAdvancedOnly} {originalType ? `(${originalType})` : null}
          </div>
        ),
      },
    },
  };
}

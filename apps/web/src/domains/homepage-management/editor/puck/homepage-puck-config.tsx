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
import { type ReactNode } from 'react';

import { DEFAULT_HOMEPAGE_LAYOUT_PROPS } from '@/domains/homepage-management/editor/puck/homepage-layout-presets';
import {
  type HomepagePuckRootProps,
  mapHomepagePuckRootPropsToTheme,
  mapHomepageThemeToPuckRootProps,
} from '@/domains/homepage-management/editor/puck/homepage-puck-theme';
import { HomepagePuckBlockPreview } from '@/domains/homepage-management/editor/puck/HomepagePuckBlockPreview';
import { createHomepagePuckChoiceField } from '@/domains/homepage-management/editor/puck/HomepagePuckChoiceField';
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

function textOption(copy: HomepageEditorCopy, value: string) {
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
      type: 'number',
      label: copy.structured.customWidth,
      min: 240,
      max: 1440,
      step: 1,
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
      type: 'number',
      label: copy.structured.customHeight,
      min: 80,
      max: 1200,
      step: 1,
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
) {
  return <HomepagePuckBlockPreview props={props} theme={theme} type={type} />;
}

function renderRootPreview(
  children: ReactNode,
  rootProps: HomepagePuckRootProps,
  theme: ThemeConfig,
) {
  const rootTheme = mapHomepagePuckRootPropsToTheme(rootProps, theme);

  return (
    <div
      data-homepage-puck-root
      className="min-h-full p-6 md:p-8"
      style={getHomepageCanvasStyle(rootTheme)}
    >
      {children}
    </div>
  );
}

export function createHomepagePuckConfig(
  copy: HomepageEditorCopy,
  theme: ThemeConfig,
): Config<
  HomepagePuckComponents,
  HomepagePuckRootProps,
  'content' | 'core' | 'interactive' | 'media' | 'unsupported'
> {
  const visibilityOptions = [
    booleanOption(copy.block.visible, true),
    booleanOption(copy.block.hidden, false),
  ];
  const layoutFields = createLayoutFields(copy);
  const rootFields = {
    title: { type: 'text', visible: false },
    backgroundType: createHomepagePuckChoiceField(copy.structured.backgroundType, [
      { label: copy.structured.options.solid, value: 'solid' },
      { label: copy.structured.options.gradient, value: 'gradient' },
      { label: copy.structured.options.image, value: 'image' },
    ] as const),
    backgroundValue: { type: 'text', label: copy.structured.backgroundValue },
    backgroundOverlay: {
      type: 'text',
      label: copy.structured.backgroundOverlay,
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
        components: ['ImageGallery'],
      },
      content: {
        title: copy.catalog.categories.content,
        components: ['RichText'],
      },
      interactive: {
        title: copy.catalog.categories.interactive,
        components: ['LinkButton', 'MarshmallowWidget'],
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
      resolveFields: (data, { fields }) => resolveHomepagePuckRootFields(data, fields),
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
          avatarUrl: { type: 'text', label: copy.structured.imageUrl },
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
        render: (props) => renderPreviewBlock('ProfileCard', props, theme),
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
            label: copy.structured.nameFontSize,
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
        render: (props) => renderPreviewBlock('SocialLinks', props, theme),
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
            options: [booleanOption(copy.block.visible, true), booleanOption(copy.block.hidden, false)],
          },
          images: {
            type: 'array',
            label: copy.catalog.entries.ImageGallery.label,
            arrayFields: {
              url: { type: 'text', label: copy.structured.imageUrl },
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
        render: (props) => renderPreviewBlock('ImageGallery', props, theme),
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
        render: (props) => renderPreviewBlock('RichText', props, theme),
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
            options: [booleanOption(copy.block.visible, true), booleanOption(copy.block.hidden, false)],
          },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
        resolveFields: (data, { fields }) => resolveHomepagePuckLayoutFields(data, fields),
        render: (props) => renderPreviewBlock('LinkButton', props, theme),
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
        render: (props) => renderPreviewBlock('MarshmallowWidget', props, theme),
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

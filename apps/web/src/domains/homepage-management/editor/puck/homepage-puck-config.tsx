import { type Config, type Permissions } from '@puckeditor/core';
import { type ThemeConfig } from '@tcrn/shared';

import { DEFAULT_HOMEPAGE_LAYOUT_PROPS } from '@/domains/homepage-management/editor/puck/homepage-layout-presets';
import { HomepagePuckBlockPreview } from '@/domains/homepage-management/editor/puck/HomepagePuckBlockPreview';
import { type HomepageEditorCopy } from '@/domains/homepage-management/screens/homepage-editor.copy';

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

function createLayoutFields(copy: HomepageEditorCopy) {
  return {
    layoutMode: {
      type: 'select',
      label: copy.structured.layoutMode,
      options: ['default', 'stack', 'row', 'grid'].map((value) => textOption(copy, value)),
    },
    gapToken: {
      type: 'select',
      label: copy.structured.gapToken,
      options: ['none', 'xs', 'sm', 'md', 'lg'].map((value) => textOption(copy, value)),
    },
    paddingToken: {
      type: 'select',
      label: copy.structured.paddingToken,
      options: ['none', 'xs', 'sm', 'md', 'lg'].map((value) => textOption(copy, value)),
    },
    radiusToken: {
      type: 'select',
      label: copy.structured.radiusToken,
      options: ['none', 'sm', 'md', 'lg', 'full'].map((value) => textOption(copy, value)),
    },
    widthPreset: {
      type: 'select',
      label: copy.structured.widthPreset,
      options: ['full', 'wide', 'content', 'narrow', 'custom'].map((value) => textOption(copy, value)),
    },
    customWidthPx: {
      type: 'number',
      label: copy.structured.customWidth,
      min: 240,
      max: 1440,
      step: 1,
    },
    align: {
      type: 'select',
      label: copy.structured.align,
      options: ['left', 'center', 'right'].map((value) => textOption(copy, value)),
    },
    heightPreset: {
      type: 'select',
      label: copy.structured.heightPreset,
      options: ['auto', 'small', 'medium', 'large', 'custom'].map((value) => textOption(copy, value)),
    },
    customHeightPx: {
      type: 'number',
      label: copy.structured.customHeight,
      min: 80,
      max: 1200,
      step: 1,
    },
    paddingPreset: {
      type: 'select',
      label: copy.structured.paddingPreset,
      options: ['none', 'small', 'medium', 'large'].map((value) => textOption(copy, value)),
    },
  } as const;
}

function renderPreviewBlock(
  type: keyof Omit<HomepagePuckComponents, typeof HOMEPAGE_PUCK_UNSUPPORTED_TYPE>,
  props: Record<string, unknown>,
  theme: ThemeConfig,
) {
  return <HomepagePuckBlockPreview props={props} theme={theme} type={type} />;
}

export function createHomepagePuckConfig(
  copy: HomepageEditorCopy,
  theme: ThemeConfig,
): Config<HomepagePuckComponents, { title?: string }, 'content' | 'core' | 'interactive' | 'media' | 'unsupported'> {
  const visibilityOptions = [
    booleanOption(copy.block.visible, true),
    booleanOption(copy.block.hidden, false),
  ];
  const layoutFields = createLayoutFields(copy);

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
          ...layoutFields,
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
          ...layoutFields,
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
          ...layoutFields,
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
          ...layoutFields,
          textAlign: {
            type: 'select',
            label: copy.structured.textAlign,
            options: ['left', 'center', 'right'].map((value) => textOption(copy, value)),
          },
          contentHtml: { type: 'textarea', label: copy.structured.content },
          visible: { type: 'radio', label: copy.block.visible, options: visibilityOptions },
        },
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
          ...layoutFields,
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
          ...layoutFields,
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

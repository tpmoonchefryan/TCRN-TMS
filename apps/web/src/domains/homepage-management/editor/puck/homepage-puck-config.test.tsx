import { DEFAULT_THEME, normalizeTheme } from '@tcrn/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createHomepagePuckConfig } from '@/domains/homepage-management/editor/puck/homepage-puck-config';
import { useHomepageEditorCopy } from '@/domains/homepage-management/screens/homepage-editor.copy';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: {
      user: {
        preferredLanguage: 'en',
      },
    },
  }),
}));

function getHomepageEditorCopy() {
  let copy = null as ReturnType<typeof useHomepageEditorCopy>['copy'] | null;

  function CaptureCopy() {
    copy = useHomepageEditorCopy().copy;
    return null;
  }

  render(
    <RuntimeLocaleProvider>
      <CaptureCopy />
    </RuntimeLocaleProvider>,
  );

  if (!copy) {
    throw new Error('Failed to resolve homepage editor copy');
  }

  return copy;
}

function createResolveFieldsParams(fields: unknown) {
  return {
    appState: {} as never,
    changed: {} as never,
    fields,
    lastData: null,
    lastFields: fields,
    metadata: {},
    parent: null,
  } as never;
}

function MockRootDropZone({
  className,
  children,
  minEmptyHeight,
  zone,
}: Readonly<{
  className?: string;
  children?: ReactNode;
  minEmptyHeight?: number | string;
  zone: string;
}>) {
  return (
    <div
      className={className}
      data-class-name={className ?? ''}
      data-min-empty-height={minEmptyHeight == null ? '' : String(minEmptyHeight)}
      data-testid="root-dropzone"
      data-zone={zone}
    >
      {children}
    </div>
  );
}

describe('homepage Puck config', () => {
  it('prioritizes compact layout controls and hides custom px fields until needed', async () => {
    const config = createHomepagePuckConfig(
      getHomepageEditorCopy(),
      normalizeTheme(DEFAULT_THEME),
    );
    const profileCard = config.components.ProfileCard;
    const fields = (profileCard.fields ?? {}) as Record<string, { type?: string; visible?: boolean }>;
    const orderedKeys = Object.keys(fields).slice(0, 10);

    expect(orderedKeys).toEqual([
      'id',
      'layoutMode',
      'align',
      'widthPreset',
      'customWidthPx',
      'heightPreset',
      'customHeightPx',
      'gapToken',
      'paddingToken',
      'radiusToken',
    ]);
    expect(fields.layoutMode?.type).toBe('custom');
    expect(fields.align?.type).toBe('custom');
    expect(fields.widthPreset?.type).toBe('custom');
    expect(fields.customWidthPx?.type).toBe('custom');
    expect(fields.customHeightPx?.type).toBe('custom');
    expect(fields.gapToken?.type).toBe('custom');
    expect(fields.paddingToken?.type).toBe('custom');
    expect(fields.radiusToken?.type).toBe('custom');

    const resolvedDefault = (await profileCard.resolveFields?.(
      {
        props: {
          widthPreset: 'full',
          heightPreset: 'auto',
        },
      } as never,
      createResolveFieldsParams(fields),
    )) as Record<string, { visible?: boolean }>;
    const resolvedCustom = (await profileCard.resolveFields?.(
      {
        props: {
          widthPreset: 'custom',
          heightPreset: 'custom',
        },
      } as never,
      createResolveFieldsParams(fields),
    )) as Record<string, { visible?: boolean }>;

    expect(resolvedDefault?.customWidthPx?.visible).toBe(false);
    expect(resolvedDefault?.customHeightPx?.visible).toBe(false);
    expect(resolvedCustom?.customWidthPx?.visible).toBe(true);
    expect(resolvedCustom?.customHeightPx?.visible).toBe(true);
  });

  it('renders root background styling and only shows image overlay when the background uses an image', async () => {
    const config = createHomepagePuckConfig(
      getHomepageEditorCopy(),
      normalizeTheme(DEFAULT_THEME),
    );
    const root = config.root;
    const fields = (root?.fields ?? {}) as Record<string, { type?: string; visible?: boolean }>;
    const rootRender = root?.render;

    expect(fields.backgroundType?.type).toBe('custom');

    const resolvedSolid = (await root?.resolveFields?.(
      {
        props: {
          backgroundType: 'solid',
        },
      } as never,
      createResolveFieldsParams(fields),
    )) as Record<string, { visible?: boolean }>;
    const resolvedImage = (await root?.resolveFields?.(
      {
        props: {
          backgroundType: 'image',
        },
      } as never,
      createResolveFieldsParams(fields),
    )) as Record<string, { visible?: boolean }>;

    expect(resolvedSolid?.backgroundOverlay?.visible).toBe(false);
    expect(resolvedImage?.backgroundOverlay?.visible).toBe(true);
    expect((resolvedSolid?.backgroundValue as { type?: string } | undefined)?.type).toBe('custom');
    expect((resolvedImage?.backgroundValue as { type?: string } | undefined)?.type).toBe('custom');

    render(rootRender?.({
      backgroundOverlay: 'rgba(15, 23, 42, 0.55)',
      backgroundType: 'image',
      backgroundValue: 'https://cdn.example.com/background.jpg',
      children: createElement(
        MockRootDropZone,
        { zone: 'root' },
        'Root preview child',
      ) as ReactNode,
      id: 'root',
      puck: {} as never,
      title: 'Homepage',
    }) ?? null);

    const rootNode = screen.getByText('Root preview child').closest('[data-homepage-puck-root]');
    const rootDropZone = screen.getByTestId('root-dropzone');

    expect(rootNode).not.toBeNull();
    expect(rootNode?.className).toContain('flex');
    expect(rootNode?.className).toContain('h-full');
    expect(rootNode?.getAttribute('style')).toContain('background');
    expect(rootNode?.getAttribute('style')).toContain('background.jpg');
    expect(rootDropZone).toHaveAttribute('data-class-name', 'flex-1');
    expect(rootDropZone).toHaveAttribute('data-zone', 'root');
    expect(rootDropZone).toHaveAttribute('data-min-empty-height', '100%');
  });

  it('uses upload-capable custom image fields for avatars and gallery items', () => {
    const config = createHomepagePuckConfig(
      getHomepageEditorCopy(),
      normalizeTheme(DEFAULT_THEME),
    );
    const profileCard = config.components.ProfileCard;
    const imageGallery = config.components.ImageGallery;
    const profileFields = (profileCard.fields ?? {}) as Record<string, { type?: string }>;
    const galleryFields = ((imageGallery.fields ?? {}) as Record<string, unknown>).images as {
      arrayFields?: Record<string, { type?: string }>;
    };

    expect(profileFields.avatarUrl?.type).toBe('custom');
    expect(galleryFields.arrayFields?.url?.type).toBe('custom');
  });

  it('accepts direct numeric entry for compact custom width controls', () => {
    const copy = getHomepageEditorCopy();
    const config = createHomepagePuckConfig(
      copy,
      normalizeTheme(DEFAULT_THEME),
    );
    const profileCard = config.components.ProfileCard;
    const fields = (profileCard.fields ?? {}) as Record<string, { render?: (...args: never[]) => ReactNode }>;
    const onChange = vi.fn();
    const customWidthField = fields.customWidthPx as {
      render: (props: {
        field: unknown;
        id: string;
        name: string;
        onChange: (value: number | null) => void;
        value: number | null;
      }) => ReactNode;
    };

    render(customWidthField.render({
      field: customWidthField,
      id: 'custom-width',
      name: 'customWidthPx',
      onChange,
      value: null,
    }));

    fireEvent.change(screen.getByLabelText(copy.structured.customWidth), {
      target: {
        value: '960',
      },
    });

    expect(onChange).toHaveBeenCalledWith(960);
    expect(screen.getByLabelText(copy.structured.customWidth)).toHaveAttribute('name', 'customWidthPx');
  });

  it('exposes the additional supported homepage blocks and keeps empty video blocks visible', () => {
    const copy = getHomepageEditorCopy();
    const config = createHomepagePuckConfig(
      copy,
      normalizeTheme(DEFAULT_THEME),
    );
    const categories = config.categories as Record<string, { components?: string[] }>;
    const videoPreview = config.components.VideoEmbed.render;

    expect(categories.media?.components).toEqual(
      expect.arrayContaining(['ImageGallery', 'VideoEmbed', 'MusicPlayer']),
    );
    expect(categories.content?.components).toEqual(
      expect.arrayContaining(['RichText', 'Schedule']),
    );
    expect(categories.interactive?.components).toEqual(
      expect.arrayContaining(['LinkButton', 'MarshmallowWidget', 'LiveStatus', 'BilibiliDynamic']),
    );
    expect(categories.layout?.components).toEqual(
      expect.arrayContaining(['Divider', 'Spacer']),
    );
    expect((config.components.Divider.fields ?? {}) as Record<string, { type?: string }>).toMatchObject({
      style: { type: 'custom' },
    });
    expect((config.components.Spacer.fields ?? {}) as Record<string, { type?: string }>).toMatchObject({
      height: { type: 'custom' },
    });

    render(createElement(videoPreview as never, {
      ...config.components.VideoEmbed.defaultProps,
      id: 'video-1',
      puck: {} as never,
      visible: true,
    } as never));

    expect(screen.getByText(copy.catalog.entries.VideoEmbed.label)).toBeInTheDocument();
    expect(screen.getByText('Add a video URL to preview this embed.')).toBeInTheDocument();
  });

  it('exposes semantic labels for compact control fields and the newly supported props', () => {
    const config = createHomepagePuckConfig(
      getHomepageEditorCopy(),
      normalizeTheme(DEFAULT_THEME),
    );

    const categories = config.categories as Record<
      'media' | 'content' | 'layout' | 'interactive',
      { components?: readonly string[] }
    >;

    expect(categories.media?.components).toEqual(
      expect.arrayContaining(['ImageGallery', 'VideoEmbed', 'MusicPlayer']),
    );
    expect(categories.content?.components).toEqual(
      expect.arrayContaining(['RichText', 'Schedule']),
    );
    expect(categories.layout?.components).toEqual(
      expect.arrayContaining(['Divider', 'Spacer']),
    );
    expect(categories.interactive?.components).toEqual(
      expect.arrayContaining(['LinkButton', 'MarshmallowWidget', 'LiveStatus', 'BilibiliDynamic']),
    );

    const socialFields = config.components.SocialLinks.fields as Record<string, { label?: string }>;
    const imageFields = config.components.ImageGallery.fields as Record<string, { options?: Array<{ label: string; value: boolean }> }>;
    const linkFields = config.components.LinkButton.fields as Record<string, { options?: Array<{ label: string; value: boolean }> }>;
    const videoFields = config.components.VideoEmbed.fields as Record<string, { type?: string }>;
    const liveFields = config.components.LiveStatus.fields as Record<string, { type?: string }>;
    const bilibiliFields = config.components.BilibiliDynamic.fields as Record<string, { type?: string }>;

    expect(socialFields.iconSize?.label).toBe('Icon size');
    expect(imageFields.showCaptions?.options).toEqual([
      { label: 'Show captions', value: true },
      { label: 'Hide captions', value: false },
    ]);
    expect(linkFields.fullWidth?.options).toEqual([
      { label: 'Full width', value: true },
      { label: 'Auto width', value: false },
    ]);
    expect(videoFields.aspectRatio?.type).toBe('select');
    expect(videoFields.autoplay?.type).toBe('radio');
    expect(videoFields.showControls?.type).toBe('radio');
    expect(liveFields.platform?.type).toBe('select');
    expect(liveFields.channelName?.type).toBe('text');
    expect(bilibiliFields.maxItems?.type).toBe('number');
    expect(bilibiliFields.showHeader?.type).toBe('radio');
  });
});

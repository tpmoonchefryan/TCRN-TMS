import { DEFAULT_THEME, normalizeTheme } from '@tcrn/shared';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
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

    render(rootRender?.({
      backgroundOverlay: 'rgba(15, 23, 42, 0.55)',
      backgroundType: 'image',
      backgroundValue: 'https://cdn.example.com/background.jpg',
      children: <div>Root preview child</div> as ReactNode,
      id: 'root',
      puck: {} as never,
      title: 'Homepage',
    }) ?? null);

    const rootNode = screen.getByText('Root preview child').closest('[data-homepage-puck-root]');

    expect(rootNode).not.toBeNull();
    expect(rootNode?.getAttribute('style')).toContain('background');
    expect(rootNode?.getAttribute('style')).toContain('background.jpg');
  });
});

import { DEFAULT_THEME, normalizeTheme } from '@tcrn/shared';
import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_HOMEPAGE_LAYOUT_PROPS } from '@/domains/homepage-management/editor/puck/homepage-layout-presets';
import {
  mapHomepageContentToPuckData,
  mapPuckDataToHomepageContent,
} from '@/domains/homepage-management/editor/puck/homepage-puck-mappers';
import { PublicHomepageRenderer } from '@/domains/public-homepage/components/PublicHomepageRenderer';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: null,
  }),
}));

describe('homepage Puck mappers', () => {
  it('maps existing homepage content into Puck data without dropping unsupported blocks', () => {
    const puckData = mapHomepageContentToPuckData({
      version: '1.0',
      components: [
        {
          id: 'profile-1',
          type: 'ProfileCard',
          visible: true,
          order: 2,
          props: {
            displayName: 'Tokino Sora',
            bio: 'Official homepage',
            avatarShape: 'circle',
          },
        },
        {
          id: 'schedule-1',
          type: 'Schedule',
          visible: false,
          order: 1,
          props: {
            title: 'Weekly plan',
          },
        },
      ],
    });

    expect(puckData.content).toEqual([
      expect.objectContaining({
        type: 'UnsupportedHomepageBlock',
        props: expect.objectContaining({
          id: 'schedule-1',
          originalType: 'Schedule',
          serializedProps: JSON.stringify({ title: 'Weekly plan' }, null, 2),
          visible: false,
        }),
      }),
      expect.objectContaining({
        type: 'ProfileCard',
        props: expect.objectContaining({
          id: 'profile-1',
          displayName: 'Tokino Sora',
          bio: 'Official homepage',
        }),
      }),
    ]);
  });

  it('maps Puck output back to the existing homepage renderer payload', () => {
    const content = mapPuckDataToHomepageContent({
      content: [
        {
          type: 'ProfileCard',
          props: {
            ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
            id: 'profile-1',
            visible: true,
            avatarShape: 'circle',
            avatarUrl: '',
            bio: 'Profile body',
            bioMaxLines: 3,
            displayName: 'Tokino Sora',
            nameFontSize: 'large',
          },
        },
        {
          type: 'LinkButton',
          props: {
            ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
            id: 'link-1',
            visible: true,
            fullWidth: false,
            label: 'Visit store',
            style: 'primary',
            url: 'https://example.com/store',
          },
        },
      ],
    });

    expect(content).toEqual({
      version: '1.0',
      components: [
        expect.objectContaining({
          id: 'profile-1',
          order: 1,
          type: 'ProfileCard',
          props: expect.objectContaining({
            displayName: 'Tokino Sora',
          }),
        }),
        expect.objectContaining({
          id: 'link-1',
          order: 2,
          type: 'LinkButton',
          props: expect.objectContaining({
            label: 'Visit store',
            url: 'https://example.com/store',
          }),
        }),
      ],
    });

    render(createElement(
      RuntimeLocaleProvider,
      null,
      createElement(PublicHomepageRenderer, {
        content,
        hero: {
          avatarUrl: null,
          description: null,
          displayName: 'Tokino Sora',
          timezone: null,
        },
        theme: normalizeTheme(DEFAULT_THEME),
        updatedAt: '2026-05-09T00:00:00.000Z',
      }),
    ));
  });

  it('round-trips normalized layout props with bounded custom sizes', () => {
    const content = mapPuckDataToHomepageContent({
      content: [
        {
          type: 'ProfileCard',
          props: {
            id: 'profile-1',
            visible: true,
            avatarShape: 'circle',
            avatarUrl: '',
            bio: 'Profile body',
            bioMaxLines: 3,
            displayName: 'Tokino Sora',
            nameFontSize: 'large',
            layoutMode: 'row',
            gapToken: 'lg',
            paddingToken: 'sm',
            radiusToken: 'full',
            widthPreset: 'custom',
            customWidthPx: 1920,
            align: 'right',
            heightPreset: 'custom',
            customHeightPx: -32,
            paddingPreset: 'large',
          },
        },
      ],
    });

    expect(content.components[0]).toMatchObject({
      id: 'profile-1',
      props: {
        layoutMode: 'row',
        gapToken: 'lg',
        paddingToken: 'sm',
        radiusToken: 'full',
        widthPreset: 'custom',
        customWidthPx: 1440,
        align: 'right',
        heightPreset: 'custom',
        customHeightPx: null,
        paddingPreset: 'large',
      },
    });
  });

  it('applies layout defaults when mapping legacy homepage content into Puck data', () => {
    const puckData = mapHomepageContentToPuckData({
      version: '1.0',
      components: [
        {
          id: 'profile-1',
          type: 'ProfileCard',
          visible: true,
          order: 1,
          props: {
            displayName: 'Tokino Sora',
          },
        },
      ],
    });

    expect(puckData.content[0]).toMatchObject({
      type: 'ProfileCard',
      props: {
        layoutMode: 'default',
        gapToken: 'md',
        paddingToken: 'md',
        radiusToken: 'md',
        widthPreset: 'full',
        customWidthPx: null,
        align: 'center',
        heightPreset: 'auto',
        customHeightPx: null,
        paddingPreset: 'medium',
      },
    });
  });

  it('round-trips unsupported Puck blocks through their original type and props', () => {
    const content = mapPuckDataToHomepageContent({
      content: [
        {
          type: 'UnsupportedHomepageBlock',
          props: {
            id: 'schedule-1',
            originalType: 'Schedule',
            serializedProps: JSON.stringify({ title: 'Weekly plan' }),
            visible: true,
          },
        },
      ],
    });

    expect(content.components).toEqual([
      {
        id: 'schedule-1',
        order: 1,
        props: {
          title: 'Weekly plan',
        },
        type: 'Schedule',
        visible: true,
      },
    ]);
  });
});

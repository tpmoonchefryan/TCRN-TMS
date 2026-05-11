import { DEFAULT_THEME, normalizeTheme } from '@tcrn/shared';
import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type HomepageDraftContent } from '@/domains/homepage-management/api/homepage.api';
import { DEFAULT_HOMEPAGE_LAYOUT_PROPS } from '@/domains/homepage-management/editor/puck/homepage-layout-presets';
import {
  type HomepagePuckData,
  mapHomepageContentToPuckData,
  mapPuckDataToHomepageContent,
  mapPuckDataToHomepageTheme,
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
        type: 'Schedule',
        props: expect.objectContaining({
          id: 'schedule-1',
          title: 'Weekly plan',
          weekOf: '',
          events: [],
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

  it('round-trips the newly supported homepage blocks without falling back to unsupported records', () => {
    const content = {
      version: '1.0',
      components: [
        {
          id: 'video-1',
          type: 'VideoEmbed',
          visible: true,
          order: 1,
          props: {
            ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
            aspectRatio: '4:3',
            autoplay: true,
            title: 'Promo clip',
            videoUrl: 'https://youtu.be/abc123',
            showControls: false,
          },
        },
        {
          id: 'schedule-1',
          type: 'Schedule',
          visible: true,
          order: 2,
          props: {
            ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
            events: [{ day: 'Mon', time: '18:00', title: 'Live stream' }],
            title: 'Weekly plan',
            weekOf: '2026-05-11',
          },
        },
        {
          id: 'music-1',
          type: 'MusicPlayer',
          visible: false,
          order: 3,
          props: {
            ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
            artist: 'Astel',
            embedValue: 'track-123',
            platform: 'spotify',
            title: 'Now playing',
          },
        },
        {
          id: 'live-1',
          type: 'LiveStatus',
          visible: true,
          order: 4,
          props: {
            ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
            channelName: 'Main channel',
            isLive: true,
            platform: 'youtube',
            streamUrl: 'https://example.com/live',
            title: 'Live now',
            viewers: '1.2k',
          },
        },
        {
          id: 'divider-1',
          type: 'Divider',
          visible: true,
          order: 5,
          props: {
            ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
            style: 'dashed',
          },
        },
        {
          id: 'spacer-1',
          type: 'Spacer',
          visible: true,
          order: 6,
          props: {
            ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
            height: 'xlarge',
          },
        },
        {
          id: 'bilibili-1',
          type: 'BilibiliDynamic',
          visible: true,
          order: 7,
          props: {
            ...DEFAULT_HOMEPAGE_LAYOUT_PROPS,
            cardStyle: 'compact',
            filterType: 'posts',
            maxItems: 8,
            refreshInterval: 30,
            showHeader: false,
            title: 'Bilibili updates',
            uid: '123456',
          },
        },
      ],
    } satisfies HomepageDraftContent;

    const puckData = mapHomepageContentToPuckData(content);

    expect(puckData.content.map((component) => component.type)).toEqual([
      'VideoEmbed',
      'Schedule',
      'MusicPlayer',
      'LiveStatus',
      'Divider',
      'Spacer',
      'BilibiliDynamic',
    ]);
    const roundTripped = mapPuckDataToHomepageContent(puckData, '1.0');

    expect(roundTripped.version).toBe('1.0');
    expect(roundTripped.components.map((component) => component.type)).toEqual([
      'VideoEmbed',
      'Schedule',
      'MusicPlayer',
      'LiveStatus',
      'Divider',
      'Spacer',
      'BilibiliDynamic',
    ]);
    expect(roundTripped.components).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'video-1',
        type: 'VideoEmbed',
        props: expect.objectContaining({
          aspectRatio: '4:3',
          autoplay: true,
          showControls: false,
          title: 'Promo clip',
          videoUrl: 'https://youtu.be/abc123',
        }),
      }),
      expect.objectContaining({
        id: 'schedule-1',
        type: 'Schedule',
        props: expect.objectContaining({
          title: 'Weekly plan',
          weekOf: '2026-05-11',
        }),
      }),
      expect.objectContaining({
        id: 'live-1',
        type: 'LiveStatus',
        props: expect.objectContaining({
          channelName: 'Main channel',
          platform: 'youtube',
        }),
      }),
      expect.objectContaining({
        id: 'bilibili-1',
        type: 'BilibiliDynamic',
        props: expect.objectContaining({
          cardStyle: 'compact',
          filterType: 'posts',
          maxItems: 8,
          refreshInterval: 30,
          showHeader: false,
        }),
      }),
    ]));
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

  it('round-trips the newly supported visual blocks without dropping schema fields', () => {
    const puckData = mapHomepageContentToPuckData({
      version: '1.0',
      components: [
        {
          id: 'video-1',
          type: 'VideoEmbed',
          visible: true,
          order: 1,
          props: {
            aspectRatio: '4:3',
            autoplay: true,
            title: 'Trailer',
            videoUrl: 'https://youtu.be/example',
            showControls: false,
          },
        },
        {
          id: 'schedule-1',
          type: 'Schedule',
          visible: true,
          order: 2,
          props: {
            events: [{ day: 'Mon', time: '19:00', title: 'Live' }],
            title: 'Weekly plan',
            weekOf: '2026-05-11',
          },
        },
        {
          id: 'live-1',
          type: 'LiveStatus',
          visible: true,
          order: 3,
          props: {
            channelName: 'Main channel',
            isLive: true,
            platform: 'youtube',
            streamUrl: 'https://example.com/live',
            title: 'Live now',
            viewers: '128',
          },
        },
        {
          id: 'bilibili-1',
          type: 'BilibiliDynamic',
          visible: true,
          order: 4,
          props: {
            cardStyle: 'compact',
            filterType: 'posts',
            maxItems: 8,
            refreshInterval: 30,
            showHeader: false,
            title: 'Bilibili updates',
            uid: '123456',
          },
        },
      ],
    });

    expect(puckData.content).toEqual([
      expect.objectContaining({
        type: 'VideoEmbed',
        props: expect.objectContaining({
          aspectRatio: '4:3',
          autoplay: true,
          showControls: false,
        }),
      }),
      expect.objectContaining({
        type: 'Schedule',
        props: expect.objectContaining({
          weekOf: '2026-05-11',
          events: [{ day: 'Mon', time: '19:00', title: 'Live' }],
        }),
      }),
      expect.objectContaining({
        type: 'LiveStatus',
        props: expect.objectContaining({
          channelName: 'Main channel',
          platform: 'youtube',
        }),
      }),
      expect.objectContaining({
        type: 'BilibiliDynamic',
        props: expect.objectContaining({
          cardStyle: 'compact',
          filterType: 'posts',
          maxItems: 8,
          refreshInterval: 30,
          showHeader: false,
        }),
      }),
    ]);

    expect(mapPuckDataToHomepageContent(puckData)).toEqual({
      version: '1.0',
      components: [
        expect.objectContaining({
          type: 'VideoEmbed',
          props: expect.objectContaining({
            aspectRatio: '4:3',
            autoplay: true,
            showControls: false,
          }),
        }),
        expect.objectContaining({
          type: 'Schedule',
          props: expect.objectContaining({
            weekOf: '2026-05-11',
          }),
        }),
        expect.objectContaining({
          type: 'LiveStatus',
          props: expect.objectContaining({
            channelName: 'Main channel',
            isLive: true,
          }),
        }),
        expect.objectContaining({
          type: 'BilibiliDynamic',
          props: expect.objectContaining({
            showHeader: false,
            uid: '123456',
          }),
        }),
      ],
    });
  });

  it('round-trips page background root props into theme without mutating component payloads', () => {
    const baseTheme = normalizeTheme(DEFAULT_THEME);
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
    }, baseTheme);

    const rootProps = puckData.root.props;

    expect(rootProps).toBeDefined();

    if (!rootProps) {
      throw new Error('Expected Puck root props to be defined');
    }

    expect(rootProps).toMatchObject({
      backgroundType: baseTheme.background.type,
      backgroundValue: baseTheme.background.value,
    });

    const nextData: Partial<HomepagePuckData> = {
      ...puckData,
      root: {
        props: {
          ...rootProps,
          title: rootProps.title || 'Homepage',
          backgroundType: 'image' as const,
          backgroundValue: 'https://cdn.example.com/background.jpg',
          backgroundOverlay: 'rgba(15, 23, 42, 0.55)',
        },
      },
    };

    const nextContent = mapPuckDataToHomepageContent(nextData, '1.0');
    const nextTheme = mapPuckDataToHomepageTheme(nextData, baseTheme);

    expect(nextContent.components).toEqual([
      expect.objectContaining({
        id: 'profile-1',
        props: expect.objectContaining({
          displayName: 'Tokino Sora',
        }),
      }),
    ]);
    expect(nextTheme.background).toEqual({
      ...baseTheme.background,
      type: 'image',
      value: 'https://cdn.example.com/background.jpg',
      overlay: 'rgba(15, 23, 42, 0.55)',
    });
    expect(nextTheme.card).toEqual(baseTheme.card);
    expect(nextTheme.colors).toEqual(baseTheme.colors);
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

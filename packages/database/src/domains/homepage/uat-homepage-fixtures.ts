// SPDX-License-Identifier: Apache-2.0
import {
  DEFAULT_THEME,
  type HomepageContentInput,
  HomepageContentSchema,
  type ThemeConfig,
  ThemeConfigSchema,
  ThemePreset,
} from '@tcrn/shared';

export interface UatHomepageFixture {
  content: HomepageContentInput;
  seoDescription: string;
  seoTitle: string;
  theme: ThemeConfig;
}

function createFixture(input: UatHomepageFixture): UatHomepageFixture {
  return {
    ...input,
    content: HomepageContentSchema.parse(input.content),
    theme: ThemeConfigSchema.parse(input.theme) as ThemeConfig,
  };
}

const BASIC_THEME: ThemeConfig = {
  ...DEFAULT_THEME,
  colors: {
    ...DEFAULT_THEME.colors,
    accent: '#E8B8D5',
    primary: '#7B9EE0',
  },
  decorations: {
    type: 'none',
  },
  preset: ThemePreset.SOFT,
  visualStyle: 'flat',
};

const ALL_COMPONENTS_THEME: ThemeConfig = {
  ...DEFAULT_THEME,
  animation: {
    enableEntrance: true,
    enableHover: true,
    intensity: 'low',
  },
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, #F8FAFC 0%, #E0E7FF 50%, #FCE7F3 100%)',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 'large',
    shadow: 'soft',
  },
  colors: {
    accent: '#F472B6',
    background: '#F8FAFC',
    primary: '#4F46E5',
    text: '#0F172A',
    textSecondary: '#475569',
  },
  decorations: {
    color: '#C7D2FE',
    density: 'low',
    opacity: 0.4,
    scrollAngle: 90,
    scrollMode: 'parallel',
    speed: 'slow',
    type: 'grid',
  },
  preset: ThemePreset.SOFT,
  typography: {
    fontFamily: 'noto-sans',
    headingWeight: 'medium',
  },
  visualStyle: 'flat',
};

const BASIC_PUBLISHED_CONTENT = {
  version: '1.0',
  components: [
    {
      id: 'profile-1',
      order: 1,
      props: {
        avatarShape: 'circle',
        avatarUrl: 'https://cdn.example.com/uat/homepage/basic/avatar.webp',
        bio: 'Thanks for visiting this published sample homepage.',
        bioMaxLines: 3,
        displayName: 'UAT Homepage Sample',
        nameFontSize: 'large',
      },
      type: 'ProfileCard',
      visible: true,
    },
    {
      id: 'about-1',
      order: 2,
      props: {
        contentHtml:
          '<h2>About</h2><p>This sample stays intentionally small for non-canonical published homepages.</p>',
        textAlign: 'left',
      },
      type: 'RichText',
      visible: true,
    },
    {
      id: 'social-1',
      order: 3,
      props: {
        iconSize: 'medium',
        layout: 'horizontal',
        platforms: [
          { label: 'YouTube', platformCode: 'youtube', url: 'https://youtube.com/@uat-sample' },
          { label: 'X', platformCode: 'twitter', url: 'https://x.com/uat_sample' },
        ],
        style: 'pill',
      },
      type: 'SocialLinks',
      visible: true,
    },
  ],
} satisfies HomepageContentInput;

const ALL_COMPONENTS_PUBLISHED_CONTENT = {
  version: '1.0',
  components: [
    {
      id: 'profile-1',
      order: 1,
      props: {
        align: 'center',
        avatarShape: 'circle',
        avatarUrl: 'https://cdn.example.com/uat/homepage/sakura/avatar.webp',
        bio: 'Singer, streamer, and moonlit storyteller for acceptance proof.',
        bioMaxLines: 4,
        displayName: 'Sakura Ch.',
        gapToken: 'md',
        nameFontSize: 'large',
        paddingPreset: 'normal',
        radiusToken: 'lg',
        widthPreset: 'wide',
      },
      type: 'ProfileCard',
      visible: true,
    },
    {
      id: 'links-1',
      order: 2,
      props: {
        iconSize: 'medium',
        layout: 'horizontal',
        platforms: [
          { label: 'YouTube', platformCode: 'youtube', url: 'https://youtube.com/@sakura' },
          { label: 'Bilibili', platformCode: 'bilibili', url: 'https://space.bilibili.com/123456' },
          { label: 'X', platformCode: 'twitter', url: 'https://x.com/sakura' },
        ],
        style: 'pill',
      },
      type: 'SocialLinks',
      visible: true,
    },
    {
      id: 'gallery-1',
      order: 3,
      props: {
        columns: 3,
        images: [
          {
            alt: 'Stage key visual',
            caption: 'Spring live key visual',
            url: 'https://cdn.example.com/uat/homepage/sakura/gallery-01.webp',
          },
          {
            alt: 'Behind the scenes',
            caption: 'Studio rehearsal',
            url: 'https://cdn.example.com/uat/homepage/sakura/gallery-02.webp',
          },
          {
            alt: 'Merch preview',
            caption: 'Limited acrylic stand',
            url: 'https://cdn.example.com/uat/homepage/sakura/gallery-03.webp',
          },
        ],
        layoutMode: 'grid',
        showCaptions: true,
      },
      type: 'ImageGallery',
      visible: true,
    },
    {
      id: 'video-1',
      order: 4,
      props: {
        aspectRatio: '16:9',
        autoplay: false,
        showControls: true,
        title: 'Debut trailer',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
      type: 'VideoEmbed',
      visible: true,
    },
    {
      id: 'intro-1',
      order: 5,
      props: {
        contentHtml:
          '<h2>About Sakura</h2><p>Welcome to the canonical all-components homepage fixture used for acceptance reruns.</p><p>Every supported block type appears at least once with representative data.</p>',
        textAlign: 'left',
      },
      type: 'RichText',
      visible: true,
    },
    {
      id: 'cta-1',
      order: 6,
      props: {
        fullWidth: false,
        label: 'Join the membership',
        style: 'primary',
        url: 'https://example.com/membership/sakura',
      },
      type: 'LinkButton',
      visible: true,
    },
    {
      id: 'marshmallow-1',
      order: 7,
      props: {
        displayMode: 'full',
        showRecentCount: 5,
        showSubmitButton: true,
      },
      type: 'MarshmallowWidget',
      visible: true,
    },
    {
      id: 'schedule-1',
      order: 8,
      props: {
        events: [
          { day: 'Mon', time: '20:00 JST', title: 'Weekly karaoke' },
          { day: 'Wed', time: '21:00 JST', title: 'Chatting stream' },
          { day: 'Sat', time: '19:00 JST', title: 'Game collab' },
        ],
        title: 'This week',
        weekOf: '2026-05-11',
      },
      type: 'Schedule',
      visible: true,
    },
    {
      id: 'music-1',
      order: 9,
      props: {
        artist: 'Sakura Ch.',
        embedValue: 'https://open.spotify.com/track/5HCyWlXZPP0y6Gqq8TgA20',
        platform: 'spotify',
        title: 'Now playing',
      },
      type: 'MusicPlayer',
      visible: true,
    },
    {
      id: 'live-1',
      order: 10,
      props: {
        channelName: 'Sakura Ch.',
        isLive: true,
        platform: 'youtube',
        streamUrl: 'https://youtube.com/live/example-sakura',
        title: 'Anniversary countdown live',
        viewers: '12.4k',
      },
      type: 'LiveStatus',
      visible: true,
    },
    {
      id: 'divider-1',
      order: 11,
      props: {
        spacing: 'medium',
        style: 'dashed',
      },
      type: 'Divider',
      visible: true,
    },
    {
      id: 'spacer-1',
      order: 12,
      props: {
        height: 'large',
      },
      type: 'Spacer',
      visible: true,
    },
    {
      id: 'bilibili-1',
      order: 13,
      props: {
        cardStyle: 'standard',
        filterType: 'all',
        maxItems: 6,
        refreshInterval: 60,
        showHeader: true,
        title: 'Bilibili updates',
        uid: '123456',
      },
      type: 'BilibiliDynamic',
      visible: true,
    },
  ],
} satisfies HomepageContentInput;

export const UAT_HOMEPAGE_FIXTURES = {
  allComponentsPublished: createFixture({
    content: ALL_COMPONENTS_PUBLISHED_CONTENT,
    seoDescription: 'Canonical all-components published homepage fixture for acceptance reruns.',
    seoTitle: 'Sakura Ch. - Acceptance Fixture',
    theme: ALL_COMPONENTS_THEME,
  }),
  basicDraft: createFixture({
    content: BASIC_PUBLISHED_CONTENT,
    seoDescription: 'Small draft-only homepage fixture for non-published paths.',
    seoTitle: 'Draft Homepage Fixture',
    theme: BASIC_THEME,
  }),
  basicPublished: createFixture({
    content: BASIC_PUBLISHED_CONTENT,
    seoDescription: 'Published homepage fixture for non-canonical sample talents.',
    seoTitle: 'Published Homepage Fixture',
    theme: BASIC_THEME,
  }),
} as const;

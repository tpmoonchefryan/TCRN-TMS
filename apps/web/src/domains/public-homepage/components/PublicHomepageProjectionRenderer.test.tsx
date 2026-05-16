import { DEFAULT_THEME } from '@tcrn/shared';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicHomepageResponse } from '@/domains/public-homepage/api/public-homepage.api';
import { PublicHomepageProjectionRenderer } from '@/domains/public-homepage/components/PublicHomepageProjectionRenderer';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: null,
  }),
}));

function renderWithLocale(ui: ReactElement) {
  return render(<RuntimeLocaleProvider>{ui}</RuntimeLocaleProvider>);
}

const baseProjection: PublicHomepageResponse = {
  projectionSchemaVersion: '1.0',
  resolvedRevealPhase: 'always',
  route: {
    canonicalPath: '/p/suisei-home',
    legacyPath: 'suisei-home',
    tenantCode: null,
    talentCode: null,
    domainHostname: null,
  },
  metadata: {
    title: 'Suisei Official Homepage',
    description: 'Public profile and schedule.',
    canonicalPath: '/p/suisei-home',
    ogImage: null,
    ogImageAlt: null,
    locale: null,
  },
  appearance: {
    theme: DEFAULT_THEME,
  },
  sections: [
    {
      id: 'hero',
      kind: 'firstEncounter',
      sectionType: 'hero',
      visibility: 'visible',
      fallbackBehavior: 'safePlaceholder',
      validationIssueIds: [],
      title: 'Hoshimachi Suisei',
      description: 'Public profile and schedule.',
      timezone: 'Asia/Tokyo',
      avatar: {
        id: 'media-1',
        kind: 'avatar',
        providerId: null,
        assetId: null,
        url: 'https://cdn.example.com/suisei.png',
        alt: 'Hoshimachi Suisei avatar',
        phaseVisibility: 'always',
        fallbackBehavior: 'safePlaceholder',
      },
      primaryAction: {
        id: 'action-1',
        slot: 'officialChannel',
        label: 'YouTube',
        href: 'https://www.youtube.com/@suisei',
        providerId: 'youtube',
        category: 'officialChannelUrl',
        phaseVisibility: 'always',
        fallbackBehavior: 'safePlaceholder',
      },
    },
    {
      id: 'social-1',
      kind: 'officialChannels',
      sectionType: 'socialLinks',
      visibility: 'visible',
      fallbackBehavior: 'safePlaceholder',
      validationIssueIds: [],
      title: null,
      links: [
        {
          id: 'action-2',
          slot: 'officialChannel',
          label: 'YouTube',
          href: 'https://www.youtube.com/@suisei',
          providerId: 'youtube',
          category: 'officialChannelUrl',
          phaseVisibility: 'always',
          fallbackBehavior: 'safePlaceholder',
        },
      ],
      layout: 'horizontal',
      style: 'pill',
    },
    {
      id: 'rich-1',
      kind: 'legacyCompatibility',
      sectionType: 'richText',
      visibility: 'visible',
      fallbackBehavior: 'stripField',
      validationIssueIds: [],
      html: '<h2>About</h2><p>Official public homepage.</p>',
      textAlign: 'left',
    },
    {
      id: 'video-1',
      kind: 'teaserRevealMedia',
      sectionType: 'videoEmbed',
      visibility: 'visible',
      fallbackBehavior: 'safePlaceholder',
      validationIssueIds: [],
      title: 'Debut PV',
      providerId: 'youtube',
      iframeSrc: 'https://www.youtube.com/embed/abc123',
      aspectRatio: '16:9',
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      referrerPolicy: 'strict-origin-when-cross-origin',
      sandbox: 'allow-scripts allow-same-origin allow-presentation',
      fallbackAction: {
        id: 'action-3',
        slot: 'videoFallback',
        label: 'Open video',
        href: 'https://www.youtube.com/watch?v=abc123',
        providerId: 'youtube',
        category: 'embedUrl',
        phaseVisibility: 'always',
        fallbackBehavior: 'safePlaceholder',
      },
    },
  ],
  actions: [],
  media: [],
};

describe('PublicHomepageProjectionRenderer', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });
  });

  it('renders projection-safe hero, links, and structured rich text', () => {
    renderWithLocale(
      <PublicHomepageProjectionRenderer projection={baseProjection} />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Hoshimachi Suisei' })).toBeInTheDocument();
    expect(screen.getByText('Timezone: Asia/Tokyo')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'YouTube' })[0]).toHaveAttribute(
      'href',
      'https://www.youtube.com/@suisei',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'About' })).toBeInTheDocument();
    expect(screen.getByText('Official public homepage.')).toBeInTheDocument();
  });

  it('keeps YouTube embeds on the safe adapter contract with restrictive iframe attributes', () => {
    renderWithLocale(
      <PublicHomepageProjectionRenderer projection={baseProjection} />,
    );

    const iframe = screen.getByTitle('Debut PV');

    expect(iframe).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/abc123',
    );
    expect(iframe).toHaveAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-presentation',
    );
    expect(iframe).toHaveAttribute(
      'referrerpolicy',
      'strict-origin-when-cross-origin',
    );
  });

  it('localizes projection fallback labels and sentinel defaults for zh locale', () => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'zh-CN',
    });

    renderWithLocale(
      <PublicHomepageProjectionRenderer
        projection={{
          ...baseProjection,
          sections: [
            {
              id: 'cta-1',
              kind: 'legacyCompatibility',
              sectionType: 'linkButton',
              visibility: 'visible',
              fallbackBehavior: 'safePlaceholder',
              validationIssueIds: [],
              action: {
                id: 'action-4',
                slot: 'compatibility',
                label: '__openLink__',
                href: 'https://example.com/join',
                providerId: null,
                category: 'fanActionUrl',
                phaseVisibility: 'always',
                fallbackBehavior: 'safePlaceholder',
              },
            },
            {
              id: 'social-fallback',
              kind: 'officialChannels',
              sectionType: 'fallbackCard',
              visibility: 'fallback',
              fallbackBehavior: 'safePlaceholder',
              validationIssueIds: [],
              title: '',
              description: null,
            },
            {
              id: 'countdown-1',
              kind: 'countdownReveal',
              sectionType: 'fallbackCard',
              visibility: 'visible',
              fallbackBehavior: 'safePlaceholder',
              validationIssueIds: [],
              title: '__revealCountdown__',
              description: 'countdown · 2099-05-15T10:00:00.000Z · Asia/Tokyo',
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole('link', { name: '打开链接' })).toHaveAttribute(
      'href',
      'https://example.com/join',
    );
    expect(screen.getByRole('heading', { level: 2, name: '社交链接' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '揭晓倒计时' })).toBeInTheDocument();
    expect(screen.getByText(/倒计时 · 2099-05-15T10:00:00.000Z · Asia\/Tokyo/)).toBeInTheDocument();
  });
});

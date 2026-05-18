import { DEFAULT_THEME } from '@tcrn/shared';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicHomepageResponse } from '@/domains/public-homepage/api/public-homepage.api';
import { PublicHomepageProjectionRenderer } from '@/domains/public-homepage/components/PublicHomepageProjectionRenderer';
import { UiLocaleProvider } from '@/platform/runtime/locale/locale-provider';

vi.setConfig({
  testTimeout: 15_000,
});

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: null,
  }),
}));

function renderWithLocale(ui: ReactElement) {
  return render(<UiLocaleProvider>{ui}</UiLocaleProvider>);
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
    expect(screen.getAllByRole('link', { name: 'YouTube' })[0].querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('img', { name: 'Hoshimachi Suisei avatar' })).toHaveAttribute('loading', 'eager');
    expect(screen.getByRole('img', { name: 'Hoshimachi Suisei avatar' })).toHaveAttribute('decoding', 'sync');
    expect(screen.getByRole('img', { name: 'Hoshimachi Suisei avatar' })).toHaveAttribute('fetchpriority', 'high');
    expect(screen.getByRole('img', { name: 'Hoshimachi Suisei avatar' })).toHaveAttribute('width', '800');
    expect(screen.getByRole('img', { name: 'Hoshimachi Suisei avatar' })).toHaveAttribute('height', '800');
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

  it('forces compact hero layout when preview surfaces request mobile mode', () => {
    renderWithLocale(
      <PublicHomepageProjectionRenderer
        projection={baseProjection}
        responsiveMode="mobile"
      />,
    );

    const heroHeading = screen.getByRole('heading', { level: 1, name: 'Hoshimachi Suisei' });
    const heroSection = heroHeading.closest('section');

    expect(heroSection?.className).not.toContain('lg:grid-cols');
    expect(heroHeading.className).not.toContain('sm:text-5xl');
  });

  it('uses fan-facing grouped action descriptions instead of design-rationale copy', () => {
    renderWithLocale(
      <PublicHomepageProjectionRenderer
        projection={{
          ...baseProjection,
          sections: [
            baseProjection.sections[0],
            {
              id: 'current-action-1',
              kind: 'currentLaunchAction',
              sectionType: 'linkButton',
              visibility: 'visible',
              fallbackBehavior: 'safePlaceholder',
              validationIssueIds: [],
              action: {
                id: 'action-current-1',
                slot: 'currentAction',
                label: 'Watch on YouTube',
                href: 'https://www.youtube.com/@suisei/live',
                providerId: 'youtube',
                category: 'launchUrl',
                phaseVisibility: 'always',
                fallbackBehavior: 'safePlaceholder',
              },
            },
            {
              id: 'fan-action-1',
              kind: 'fanActions',
              sectionType: 'linkButton',
              visibility: 'visible',
              fallbackBehavior: 'safePlaceholder',
              validationIssueIds: [],
              action: {
                id: 'action-fan-1',
                slot: 'fanAction',
                label: 'Join fan club',
                href: 'https://example.com/fan-club',
                providerId: null,
                category: 'fanActionUrl',
                phaseVisibility: 'always',
                fallbackBehavior: 'safePlaceholder',
              },
            },
            {
              id: 'goods-support-1',
              kind: 'goodsSupport',
              sectionType: 'linkButton',
              visibility: 'visible',
              fallbackBehavior: 'safePlaceholder',
              validationIssueIds: [],
              action: {
                id: 'action-support-1',
                slot: 'support',
                label: 'Official shop',
                href: 'https://example.com/shop',
                providerId: null,
                category: 'supportUrl',
                phaseVisibility: 'always',
                fallbackBehavior: 'safePlaceholder',
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Start with the stream, archive, or next moment waiting for you here.')).toBeInTheDocument();
    expect(screen.getByText('More ways to cheer, follow updates, and stay close to the next stream live here.')).toBeInTheDocument();
    expect(screen.getByText('Membership, shop, and other official support links are all together here.')).toBeInTheDocument();
    expect(screen.queryByText(/keep the one most important next step easy to scan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/stay grouped so the page keeps a cleaner first scan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/official support paths stay grouped together/i)).not.toBeInTheDocument();
  });
});

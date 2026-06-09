import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BROWSER_PUBLIC_CONSUMER_CODE, BROWSER_PUBLIC_CONSUMER_HEADER } from '@tcrn/shared';

import { PublicHomepageScreen } from '@/domains/public-homepage/screens/PublicHomepageScreen';
import { UiLocaleProvider } from '@/platform/runtime/locale/locale-provider';

const mockFetch = vi.fn();

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: null,
  }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function renderWithLocale(ui: ReactElement) {
  return render(<UiLocaleProvider>{ui}</UiLocaleProvider>);
}

describe('PublicHomepageScreen', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    document.documentElement.lang = 'zh-Hans';
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });
  });

  afterEach(() => {
    document.documentElement.lang = 'zh-Hans';
    vi.unstubAllGlobals();
  });

  it('renders the published homepage projection sections', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          projectionSchemaVersion: '1.0',
          resolvedRevealPhase: 'always',
          route: {
            canonicalPath: '/p/aki-home',
            legacyPath: 'aki-home',
            tenantCode: null,
            talentCode: null,
            domainHostname: null,
          },
          metadata: {
            title: 'Aki Homepage',
            description: 'Official public homepage.',
            canonicalPath: '/p/aki-home',
            ogImage: null,
            ogImageAlt: null,
            locale: 'en',
          },
          appearance: {
            theme: {
              preset: 'soft',
              visualStyle: 'flat',
              colors: {
                primary: '#7B9EE0',
                accent: '#E0A0C0',
                background: '#FAFBFC',
                text: '#333333',
                textSecondary: '#888888',
              },
              background: {
                type: 'gradient',
                value: 'linear-gradient(135deg, #F5F7FA 0%, #E8ECF1 100%)',
              },
              card: {
                background: '#FFFFFF',
                borderRadius: 'large',
                shadow: 'small',
              },
              typography: {
                fontFamily: 'noto-sans',
                headingWeight: 'medium',
              },
              animation: {
                enableEntrance: true,
                enableHover: true,
                intensity: 'low',
              },
              decorations: {
                type: 'none',
              },
            },
          },
          sections: [
            {
              id: 'hero',
              kind: 'firstEncounter',
              sectionType: 'hero',
              visibility: 'visible',
              fallbackBehavior: 'safePlaceholder',
              title: 'Aki Rosenthal',
              description: 'Official public homepage.',
              timezone: 'Asia/Tokyo',
              avatar: {
                id: 'media-1',
                kind: 'avatar',
                providerId: null,
                assetId: null,
                url: 'https://cdn.example.com/aki.png',
                alt: 'Aki Rosenthal avatar',
                phaseVisibility: 'always',
                fallbackBehavior: 'safePlaceholder',
              },
              primaryAction: {
                id: 'action-1',
                slot: 'officialChannel',
                label: 'YouTube',
                href: 'https://youtube.com/@aki',
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
              title: null,
              links: [
                {
                  id: 'action-2',
                  slot: 'officialChannel',
                  label: 'YouTube',
                  href: 'https://youtube.com/@aki',
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
              id: 'richtext-1',
              kind: 'legacyCompatibility',
              sectionType: 'richText',
              visibility: 'visible',
              fallbackBehavior: 'stripField',
              html: '<h2>About</h2><p>Official public homepage.</p>',
              textAlign: 'left',
            },
          ],
          actions: [],
          media: [],
        },
      })
    );

    const view = renderWithLocale(<PublicHomepageScreen path="aki-home" />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Aki Rosenthal' })
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getAllByRole('link', { name: 'YouTube' })[0]).toHaveAttribute(
      'href',
      'https://youtube.com/@aki'
    );
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getAllByText('Official public homepage.')).toHaveLength(2);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/public/homepage/aki-home',
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    const headers = new Headers(mockFetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get(BROWSER_PUBLIC_CONSUMER_HEADER)).toBe(BROWSER_PUBLIC_CONSUMER_CODE);

    view.unmount();
    expect(document.documentElement.lang).toBe('zh-Hans');
  });

  it('shows the unavailable state when the public homepage is not published', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(
        {
          success: false,
          error: {
            code: 'RES_NOT_FOUND',
            message: 'Homepage not found or not published',
          },
        },
        404
      )
    );

    renderWithLocale(<PublicHomepageScreen path="missing-home" />);

    expect(await screen.findByText('Fan page unavailable')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(
      screen.getByText(
        'This fan page is not live yet, is not reachable right now, or has been turned off.'
      )
    ).toBeInTheDocument();
  });

  it('uses runtime locale copy for unavailable public homepage states even when the API returns English copy', async () => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'zh-CN',
    });

    mockFetch.mockResolvedValue(
      jsonResponse(
        {
          success: false,
          error: {
            code: 'RES_NOT_FOUND',
            message: 'Homepage not found or not published',
          },
        },
        404
      )
    );

    renderWithLocale(<PublicHomepageScreen path="missing-home" />);

    expect(await screen.findByText('粉丝页不可用')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByText('当前粉丝页尚未上线、暂时不可达，或已被关闭。')).toBeInTheDocument();
  });
});

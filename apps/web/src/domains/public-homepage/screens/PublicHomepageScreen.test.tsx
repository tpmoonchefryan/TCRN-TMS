import { BROWSER_PUBLIC_CONSUMER_CODE, BROWSER_PUBLIC_CONSUMER_HEADER } from '@tcrn/shared';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicHomepageScreen } from '@/domains/public-homepage/screens/PublicHomepageScreen';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';

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
  return render(<RuntimeLocaleProvider>{ui}</RuntimeLocaleProvider>);
}

describe('PublicHomepageScreen', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the published homepage content blocks', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          talent: {
            displayName: 'Aki Rosenthal',
            avatarUrl: 'https://cdn.example.com/aki.png',
            timezone: 'Asia/Tokyo',
          },
          content: {
            version: '1.0.0',
            components: [
              {
                id: 'profile-1',
                type: 'ProfileCard',
                visible: true,
                order: 1,
                props: {
                  displayName: 'Aki Rosenthal',
                  bio: 'Singing, streaming, and moonlit conversations.',
                  avatarUrl: 'https://cdn.example.com/aki.png',
                  avatarShape: 'circle',
                },
              },
              {
                id: 'links-1',
                type: 'SocialLinks',
                visible: true,
                order: 2,
                props: {
                  platforms: [
                    {
                      platformCode: 'youtube',
                      url: 'https://youtube.com/@aki',
                      label: 'YouTube',
                    },
                  ],
                },
              },
              {
                id: 'richtext-1',
                type: 'RichText',
                visible: true,
                order: 3,
                props: {
                  contentHtml: '<h2>About</h2><p>Official public homepage.</p>',
                  textAlign: 'left',
                },
              },
            ],
          },
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
          seo: {
            title: 'Aki Homepage',
            description: 'Official public homepage.',
            ogImageUrl: null,
          },
          updatedAt: '2026-04-17T12:00:00.000Z',
        },
      }),
    );

    renderWithLocale(<PublicHomepageScreen path="aki-home" />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Aki Rosenthal' })).toBeInTheDocument();
    expect(screen.getByText('Singing, streaming, and moonlit conversations.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/@aki');
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getAllByText('Official public homepage.')).toHaveLength(2);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/public/homepage/aki-home',
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });

    const headers = new Headers(mockFetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get(BROWSER_PUBLIC_CONSUMER_HEADER)).toBe(BROWSER_PUBLIC_CONSUMER_CODE);
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
        404,
      ),
    );

    renderWithLocale(<PublicHomepageScreen path="missing-home" />);

    expect(await screen.findByText('Homepage unavailable')).toBeInTheDocument();
    expect(screen.getByText('Homepage not found or not published')).toBeInTheDocument();
  });

  it('uses runtime locale copy for unavailable public homepage states', async () => {
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
            message: '',
          },
        },
        404,
      ),
    );

    renderWithLocale(<PublicHomepageScreen path="missing-home" />);

    expect(await screen.findByText('主页不可用')).toBeInTheDocument();
    expect(screen.getByText('当前主页尚未发布、暂时不可达，或已被停用。')).toBeInTheDocument();
  });
});

import { BROWSER_PUBLIC_CONSUMER_CODE, BROWSER_PUBLIC_CONSUMER_HEADER } from '@tcrn/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildPublicHomepageMetadata } from '@/domains/public-homepage/public-homepage.metadata';

const mockFetch = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('buildPublicHomepageMetadata', () => {
  const originalApiOrigin = process.env.TMS_API_ORIGIN;

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    process.env.TMS_API_ORIGIN = 'https://api.example.com';
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (originalApiOrigin === undefined) {
      delete process.env.TMS_API_ORIGIN;
      return;
    }

    process.env.TMS_API_ORIGIN = originalApiOrigin;
  });

  it('maps public homepage SEO data into route metadata', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          projectionSchemaVersion: '1.0',
          resolvedRevealPhase: 'always',
          route: {
            canonicalPath: '/tenant-a/suisei/homepage',
            legacyPath: null,
            tenantCode: 'tenant-a',
            talentCode: 'suisei',
            domainHostname: null,
          },
          metadata: {
            title: 'Suisei Official Homepage',
            description: 'Public profile and schedule.',
            canonicalPath: '/tenant-a/suisei/homepage',
            ogImage: {
              id: 'media-1',
              kind: 'ogImage',
              providerId: null,
              assetId: null,
              url: 'https://cdn.example.com/seo/suisei-og.png',
              alt: 'Hoshimachi Suisei public homepage preview',
              phaseVisibility: 'always',
              fallbackBehavior: 'safePlaceholder',
            },
            ogImageAlt: 'Hoshimachi Suisei public homepage preview',
            locale: null,
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
          sections: [],
          actions: [],
          media: [],
        },
      }),
    );

    const metadata = await buildPublicHomepageMetadata('tenant-a/suisei');

    expect(metadata).toMatchObject({
      title: 'Suisei Official Homepage',
      description: 'Public profile and schedule.',
      openGraph: {
        title: 'Suisei Official Homepage',
        description: 'Public profile and schedule.',
        type: 'website',
        images: [
          {
            url: 'https://cdn.example.com/seo/suisei-og.png',
            alt: 'Hoshimachi Suisei public homepage preview',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Suisei Official Homepage',
        description: 'Public profile and schedule.',
        images: ['https://cdn.example.com/seo/suisei-og.png'],
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/public/homepage/tenant-a/suisei',
      expect.objectContaining({
        next: {
          revalidate: 300,
        },
      }),
    );

    const headers = new Headers(mockFetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get(BROWSER_PUBLIC_CONSUMER_HEADER)).toBe(BROWSER_PUBLIC_CONSUMER_CODE);
  });

  it('localizes known public fallback metadata copy when the projection locale is provided', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          projectionSchemaVersion: '1.0',
          resolvedRevealPhase: 'teaser',
          route: {
            canonicalPath: '/tenant-a/sakura/homepage',
            legacyPath: null,
            tenantCode: 'tenant-a',
            talentCode: 'sakura',
            domainHostname: null,
          },
          metadata: {
            title: 'Debut preview',
            description: 'Countdown updates, reveal moments, and launch links for fans.',
            canonicalPath: '/tenant-a/sakura/homepage',
            ogImage: null,
            ogImageAlt: null,
            locale: 'zh_HANS',
          },
          appearance: {
            theme: null,
          },
          sections: [],
          actions: [],
          media: [],
        },
      }),
    );

    const metadata = await buildPublicHomepageMetadata('tenant-a/sakura');

    expect(metadata).toMatchObject({
      title: '出道预告',
      description: '在这里查看倒计时动态、揭晓时刻和面向粉丝的上线入口。',
      openGraph: {
        title: '出道预告',
        description: '在这里查看倒计时动态、揭晓时刻和面向粉丝的上线入口。',
      },
      twitter: {
        title: '出道预告',
        description: '在这里查看倒计时动态、揭晓时刻和面向粉丝的上线入口。',
      },
    });
  });

  it('falls back to inherited site metadata when the SEO fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('network unavailable'));

    await expect(buildPublicHomepageMetadata('tenant-a/suisei')).resolves.toEqual({});
  });
});

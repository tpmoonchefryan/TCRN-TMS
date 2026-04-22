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
          talent: {
            displayName: 'Hoshimachi Suisei',
            avatarUrl: 'https://cdn.example.com/suisei.png',
          },
          content: {
            version: '1.0.0',
            components: [],
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
            title: 'Suisei Official Homepage',
            description: 'Public profile and schedule.',
            ogImageUrl: 'https://cdn.example.com/seo/suisei-og.png',
          },
          updatedAt: '2026-04-23T00:00:00.000Z',
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

  it('falls back to inherited site metadata when the SEO fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('network unavailable'));

    await expect(buildPublicHomepageMetadata('tenant-a/suisei')).resolves.toEqual({});
  });
});

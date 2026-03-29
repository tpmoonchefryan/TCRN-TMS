// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchPublicHomepage } from '@/lib/api/modules/public-homepage-fetch';

const fetchMock = vi.fn();

describe('public homepage fetch helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('unwraps the current API envelope for canonical public homepage fetches', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          talent: { displayName: 'Sora', avatarUrl: null },
          content: { version: '1.0', components: [] },
          theme: { preset: 'default' },
          seo: { title: 'Sora', description: 'Homepage', ogImageUrl: null },
          updatedAt: '2026-03-29T00:00:00.000Z',
        },
      }),
    });

    const result = await fetchPublicHomepage('sora', { cache: 'no-store' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/public/homepage/sora',
      { cache: 'no-store' },
    );
    expect(result?.talent.displayName).toBe('Sora');
  });

  it('encodes multi-segment paths and applies revalidate options when caching is allowed', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        talent: { displayName: 'Multi Segment', avatarUrl: null },
        content: { version: '1.0', components: [] },
        theme: { preset: 'default' },
        seo: { title: null, description: null, ogImageUrl: null },
        updatedAt: '2026-03-29T00:00:00.000Z',
      }),
    });

    await fetchPublicHomepage('group name/member page', { revalidate: 120 });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/public/homepage/group%20name/member%20page',
      { next: { revalidate: 120 } },
    );
  });

  it('returns null for non-ok responses', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const result = await fetchPublicHomepage('missing-page');

    expect(result).toBeNull();
  });
});

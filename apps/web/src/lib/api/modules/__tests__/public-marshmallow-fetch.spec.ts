// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchPublicMarshmallowConfig,
  fetchPublicMarshmallowMessages,
} from '@/lib/api/modules/public-marshmallow-fetch';

const fetchMock = vi.fn();

describe('public marshmallow fetch helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the shared public fetch core for config reads with default revalidate behavior', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          talent: { displayName: 'Miko', avatarUrl: null },
          title: 'Marshmallow',
          welcomeText: null,
          placeholderText: null,
          allowAnonymous: true,
          maxMessageLength: 500,
          minMessageLength: 1,
          reactionsEnabled: true,
          allowedReactions: [],
          theme: {},
          terms: { en: null, zh: null, ja: null },
          privacy: { en: null, zh: null, ja: null },
        },
      }),
    });

    await fetchPublicMarshmallowConfig('talent path');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/public/marshmallow/talent%20path/config',
      { next: { revalidate: 300 } },
    );
  });

  it('serializes message query params while preserving no-store semantics', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [],
        cursor: null,
        hasMore: false,
      }),
    });

    await fetchPublicMarshmallowMessages(
      'talent-path',
      {
        limit: 200,
        cursor: '2026-03-29T00:00:00.000Z',
        fingerprint: 'fp-1',
        bustCache: true,
      },
      { cache: 'no-store' },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /^http:\/\/localhost:4000\/api\/v1\/public\/marshmallow\/talent-path\/messages\?/,
      ),
      { cache: 'no-store' },
    );

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('limit=200');
    expect(url).toContain('cursor=2026-03-29T00%3A00%3A00.000Z');
    expect(url).toContain('fingerprint=fp-1');
    expect(url).toMatch(/(?:\?|&)_t=\d+/);
  });
});

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { proxy, resetDomainCacheForTests } from './proxy';

const fetchMock = vi.fn();

const createRequest = (
  url: string,
  options?: {
    host?: string;
    cookie?: string;
  }
) => {
  const headers = new Headers();

  if (options?.host) {
    headers.set('host', options.host);
  }

  if (options?.cookie) {
    headers.set('cookie', options.cookie);
  }

  return new NextRequest(url, { headers });
};

const getRewriteUrl = (response: Response): URL | null => {
  const rewrite = response.headers.get('x-middleware-rewrite');
  return rewrite ? new URL(rewrite) : null;
};

describe('proxy integration with public domain lookup fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDomainCacheForTests();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubEnv('API_URL', 'http://internal-api:4000');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('uses the real domain lookup helper to rewrite custom-domain ask routes and cache the result', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          homepagePath: 'suisei',
          marshmallowPath: 'suisei-ask',
        },
      }),
    });

    const firstResponse = await proxy(
      createRequest('https://suisei.example.com/ask', {
        host: 'suisei.example.com',
      })
    );
    const secondResponse = await proxy(
      createRequest('https://suisei.example.com/news', {
        host: 'suisei.example.com',
      })
    );

    const firstRewriteUrl = getRewriteUrl(firstResponse);
    const secondRewriteUrl = getRewriteUrl(secondResponse);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://internal-api:4000/api/v1/public/domain-lookup?domain=suisei.example.com',
      expect.objectContaining({
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      })
    );
    expect(firstRewriteUrl?.pathname).toBe('/m/suisei-ask');
    expect(secondRewriteUrl?.pathname).toBe('/p/suisei/news');
  });

  it('falls back to locale handling when domain lookup returns not found', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const response = await proxy(
      createRequest('https://missing.example.com/', {
        host: 'missing.example.com',
        cookie: 'NEXT_LOCALE=ja',
      })
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('location')).toBeNull();
  });
});

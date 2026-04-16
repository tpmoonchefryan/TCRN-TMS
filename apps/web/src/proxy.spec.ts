// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const fetchPublicDomainLookupMock = vi.fn();

vi.mock('./lib/api/modules/public-domain-lookup-fetch', () => ({
  fetchPublicDomainLookup: (...args: unknown[]) => fetchPublicDomainLookupMock(...args),
}));

import { proxy, resetDomainCacheForTests } from './proxy';

const createRequest = (
  url: string,
  options?: {
    host?: string;
    cookie?: string;
    acceptLanguage?: string;
  }
) => {
  const headers = new Headers();

  if (options?.host) {
    headers.set('host', options.host);
  }

  if (options?.cookie) {
    headers.set('cookie', options.cookie);
  }

  if (options?.acceptLanguage) {
    headers.set('accept-language', options.acceptLanguage);
  }

  return new NextRequest(url, { headers });
};

const getRewriteUrl = (response: Response): URL | null => {
  const rewrite = response.headers.get('x-middleware-rewrite');
  return rewrite ? new URL(rewrite) : null;
};

describe('proxy public routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    resetDomainCacheForTests();
  });

  it('rewrites homepage system subdomains before main-domain skip', async () => {
    const response = await proxy(
      createRequest('https://sora.p.tcrn.app/about?tab=links', {
        host: 'sora.p.tcrn.app',
      })
    );

    const rewriteUrl = getRewriteUrl(response);

    expect(rewriteUrl).not.toBeNull();
    expect(rewriteUrl?.pathname).toBe('/p/sora/about');
    expect(rewriteUrl?.search).toBe('?tab=links');
    expect(fetchPublicDomainLookupMock).not.toHaveBeenCalled();
  });

  it('rewrites marshmallow system subdomains and preserves query parameters', async () => {
    const response = await proxy(
      createRequest('https://sora.m.tcrn.app/terms?sso=token-123', {
        host: 'sora.m.tcrn.app',
      })
    );

    const rewriteUrl = getRewriteUrl(response);

    expect(rewriteUrl).not.toBeNull();
    expect(rewriteUrl?.pathname).toBe('/m/sora/terms');
    expect(rewriteUrl?.search).toBe('?sso=token-123');
    expect(fetchPublicDomainLookupMock).not.toHaveBeenCalled();
  });

  it('rewrites custom-domain ask routes to the marshmallow path and reuses cache', async () => {
    fetchPublicDomainLookupMock.mockResolvedValue({
      homepagePath: 'sora',
      marshmallowPath: 'sora-ask',
    });

    const firstResponse = await proxy(
      createRequest('https://sora.example.com/ask', {
        host: 'sora.example.com',
      })
    );
    const secondResponse = await proxy(
      createRequest('https://sora.example.com/news', {
        host: 'sora.example.com',
      })
    );

    const firstRewriteUrl = getRewriteUrl(firstResponse);
    const secondRewriteUrl = getRewriteUrl(secondResponse);

    expect(firstRewriteUrl).not.toBeNull();
    expect(firstRewriteUrl?.pathname).toBe('/m/sora-ask');
    expect(secondRewriteUrl).not.toBeNull();
    expect(secondRewriteUrl?.pathname).toBe('/p/sora/news');
    expect(fetchPublicDomainLookupMock).toHaveBeenCalledTimes(1);
    expect(fetchPublicDomainLookupMock).toHaveBeenCalledWith('sora.example.com');
  });

  it('revalidates cached custom-domain mappings after the short TTL expires', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T00:00:00.000Z'));
    fetchPublicDomainLookupMock
      .mockResolvedValueOnce({
        homepagePath: 'sora',
        marshmallowPath: 'sora-ask',
      })
      .mockResolvedValueOnce({
        homepagePath: 'sora-v2',
        marshmallowPath: 'sora-ask-v2',
      });

    const firstResponse = await proxy(
      createRequest('https://ttl.example.com/news', {
        host: 'ttl.example.com',
      })
    );

    vi.setSystemTime(new Date('2026-04-14T00:00:20.000Z'));
    const secondResponse = await proxy(
      createRequest('https://ttl.example.com/news', {
        host: 'ttl.example.com',
      })
    );

    vi.setSystemTime(new Date('2026-04-14T00:00:31.000Z'));
    const thirdResponse = await proxy(
      createRequest('https://ttl.example.com/news', {
        host: 'ttl.example.com',
      })
    );

    expect(getRewriteUrl(firstResponse)?.pathname).toBe('/p/sora/news');
    expect(getRewriteUrl(secondResponse)?.pathname).toBe('/p/sora/news');
    expect(getRewriteUrl(thirdResponse)?.pathname).toBe('/p/sora-v2/news');
    expect(fetchPublicDomainLookupMock).toHaveBeenCalledTimes(2);
  });

  it('evicts the oldest cached custom-domain mapping once the cache reaches capacity', async () => {
    fetchPublicDomainLookupMock.mockImplementation(async (domain: string) => ({
      homepagePath: domain.replace(/\./g, '-'),
      marshmallowPath: `${domain.replace(/\./g, '-')}-ask`,
    }));

    for (let index = 0; index <= 256; index += 1) {
      const domain = `domain-${index}.example.com`;
      await proxy(
        createRequest(`https://${domain}/`, {
          host: domain,
        })
      );
    }

    await proxy(
      createRequest('https://domain-0.example.com/', {
        host: 'domain-0.example.com',
      })
    );

    expect(fetchPublicDomainLookupMock).toHaveBeenCalledTimes(258);
  });

  it('skips domain lookup for main domains and keeps locale handling in place', async () => {
    const response = await proxy(
      createRequest('http://localhost:3000/customers', {
        host: 'localhost:3000',
        cookie: 'NEXT_LOCALE=en',
      })
    );

    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('location')).toBeNull();
    expect(fetchPublicDomainLookupMock).not.toHaveBeenCalled();
  });
});

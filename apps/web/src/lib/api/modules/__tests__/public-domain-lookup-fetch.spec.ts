// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchPublicDomainLookup } from '@/lib/api/modules/public-domain-lookup-fetch';

const fetchMock = vi.fn();

describe('public domain lookup fetch helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('uses server-side API_URL fallback when NEXT_PUBLIC_API_URL is not available', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubEnv('API_URL', 'http://internal-api:4000');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          homepagePath: 'sora',
          marshmallowPath: 'sora-ask',
        },
      }),
    });

    const result = await fetchPublicDomainLookup('sora.example.com');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://internal-api:4000/api/v1/public/domain-lookup?domain=sora.example.com',
      expect.objectContaining({
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      }),
    );
    expect(result).toEqual({
      homepagePath: 'sora',
      marshmallowPath: 'sora-ask',
    });
  });

  it('accepts the current API envelope and path fallback shape', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          path: 'miko',
        },
      }),
    });

    const result = await fetchPublicDomainLookup('miko.example.com');

    expect(result).toEqual({
      homepagePath: 'miko',
      marshmallowPath: 'miko',
    });
  });

  it('returns null when the lookup response is not ok or lacks route paths', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(fetchPublicDomainLookup('missing.example.com')).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {},
      }),
    });

    await expect(fetchPublicDomainLookup('empty.example.com')).resolves.toBeNull();
  });
});

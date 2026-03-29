import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api/core';

const fetchMock = vi.fn();

describe('api core client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    apiClient.setAccessToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    apiClient.setAccessToken(null);
  });

  it('serializes primitive query params and omits empty values', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });

    await apiClient.get('/api/v1/example', {
      page: 2,
      enabled: false,
      q: 'idol',
      empty: '',
      skipped: undefined,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/example?page=2&enabled=false&q=idol',
      expect.objectContaining({
        credentials: 'include',
        method: 'GET',
      }),
    );
  });

  it('normalizes response errors with nested error payloads', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Nope',
        },
      }),
    });

    await expect(apiClient.get('/api/v1/example')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Nope',
      statusCode: 400,
    });
  });

  it('throws a network error payload when fetch itself fails', async () => {
    fetchMock.mockRejectedValue(new Error('boom'));

    await expect(apiClient.get('/api/v1/example')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Network error occurred',
      statusCode: 0,
    });
  });
});

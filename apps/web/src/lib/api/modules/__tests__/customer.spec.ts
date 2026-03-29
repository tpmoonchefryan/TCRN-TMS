// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { customerApi, customerImportApi } from '@/lib/api/modules/customer';

const mockBuildApiUrl = vi.fn((pathname: string) => `http://localhost:4000${pathname}`);
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
const fetchMock = vi.fn();

vi.mock('@/lib/api/core', () => ({
  buildApiUrl: (pathname: string) => mockBuildApiUrl(pathname),
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('customer api module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockBuildApiUrl.mockImplementation((pathname: string) => `http://localhost:4000${pathname}`);
  });

  it('does not send legacy profile store fields when creating an individual customer', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'customer-1' } });

    await customerApi.create({
      talentId: 'talent-1',
      nickname: 'John Doe',
      statusCode: 'active',
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/customers/individuals',
      expect.objectContaining({
        talentId: 'talent-1',
        nickname: 'John Doe',
        statusCode: 'active',
      }),
    );

    const [, body] = mockPost.mock.calls[0];
    expect(body).not.toHaveProperty('profileStoreId');
    expect(body).not.toHaveProperty('profileType');
  });

  it('uploads customer imports with the required wrapped payload shape and talent id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 'job-1',
          status: 'pending',
          fileName: 'customers.csv',
          totalRows: 3,
          createdAt: '2026-03-29T00:00:00.000Z',
        },
      }),
    });

    const file = new File(['nickname\nAqua'], 'customers.csv', { type: 'text/csv' });
    const result = await customerImportApi.uploadIndividual(file, 'talent-1');

    expect(result).toMatchObject({
      success: true,
      data: {
        id: 'job-1',
        status: 'pending',
      },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/api/v1/imports/customers/individuals');
    expect(init.headers).toEqual({ 'X-Talent-Id': 'talent-1' });

    const body = init.body as FormData;
    expect(body.get('talentId')).toBe('talent-1');
    expect(body.get('file')).toBeInstanceOf(File);
  });

  it('downloads individual import templates through the canonical api url helper', async () => {
    const createObjectUrl = vi.fn(() => 'blob:template');
    const revokeObjectUrl = vi.fn();
    const click = vi.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['nickname'], { type: 'text/csv' }),
    });
    vi.stubGlobal(
      'URL',
      Object.assign(globalThis.URL, {
        createObjectURL: createObjectUrl,
        revokeObjectURL: revokeObjectUrl,
      }),
    );
    vi.spyOn(document, 'createElement').mockReturnValue({
      click,
    } as unknown as HTMLAnchorElement);

    await customerImportApi.downloadIndividualTemplate();

    expect(mockBuildApiUrl).toHaveBeenCalledWith('/api/v1/imports/customers/individuals/template');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/imports/customers/individuals/template',
      { credentials: 'include' },
    );
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:template');
  });
});

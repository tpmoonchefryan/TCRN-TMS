// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  companyCustomerApi,
  customerApi,
  customerImportApi,
  externalIdApi,
  membershipApi,
  platformIdentityApi,
} from '@/lib/api/modules/customer';

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
      '/api/v1/talents/talent-1/customers/individuals',
      expect.objectContaining({
        nickname: 'John Doe',
        statusCode: 'active',
      }),
    );

    const [, body] = mockPost.mock.calls[0];
    expect(body).not.toHaveProperty('talentId');
    expect(body).not.toHaveProperty('profileStoreId');
    expect(body).not.toHaveProperty('profileType');
  });

  it('uses canonical talent-root customer urls without owner headers for reads and mutations', async () => {
    mockGet.mockResolvedValue({ success: true, data: { id: 'customer-1' } });
    mockPatch.mockResolvedValue({ success: true, data: { id: 'customer-1' } });
    mockPost.mockResolvedValue({ success: true, data: { id: 'customer-1' } });
    mockDelete.mockResolvedValue({ success: true });

    await customerApi.list({ talentId: 'talent-1', page: 2, pageSize: 10 });
    await customerApi.get('customer-1', 'talent-1');
    await customerApi.createPiiPortalSession('customer-1', 'talent-1');
    await customerApi.update(
      'customer-1',
      {
        nickname: 'Updated',
        expectedVersion: 3,
      },
      'talent-1',
    );
    await customerApi.deactivate('customer-1', 'inactive', 4, 'talent-1');
    await customerApi.reactivate('customer-1', 'talent-1');
    await customerApi.updatePii('customer-1', { givenName: 'Aqua' }, 5, 'talent-1');
    await platformIdentityApi.list('customer-1', 'talent-1');
    await membershipApi.list('customer-1', 'talent-1');
    await externalIdApi.delete('customer-1', 'external-1', 'talent-1');

    expect(mockGet).toHaveBeenNthCalledWith(
      1,
      '/api/v1/talents/talent-1/customers',
      expect.objectContaining({
        page: '2',
        pageSize: '10',
      }),
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      2,
      '/api/v1/talents/talent-1/customers/customer-1',
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      '/api/v1/talents/talent-1/customers/individuals/customer-1/pii-portal-session',
      {},
    );
    expect(mockPatch).toHaveBeenNthCalledWith(
      1,
      '/api/v1/talents/talent-1/customers/individuals/customer-1',
      expect.objectContaining({
        nickname: 'Updated',
        version: 3,
      }),
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      '/api/v1/talents/talent-1/customers/customer-1/deactivate',
      { reasonCode: 'inactive', version: 4 },
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      3,
      '/api/v1/talents/talent-1/customers/customer-1/reactivate',
      {},
    );
    expect(mockPatch).toHaveBeenNthCalledWith(
      2,
      '/api/v1/talents/talent-1/customers/individuals/customer-1/pii',
      { pii: { givenName: 'Aqua' }, version: 5 },
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      3,
      '/api/v1/talents/talent-1/customers/customer-1/platform-identities',
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      4,
      '/api/v1/talents/talent-1/customers/customer-1/memberships',
      undefined,
    );
    expect(mockDelete).toHaveBeenCalledWith(
      '/api/v1/talents/talent-1/customers/customer-1/external-ids/external-1',
    );
  });

  it('uses canonical talent-root company and nested customer routes without owner headers', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'company-1' } });
    mockPatch.mockResolvedValue({ success: true, data: { id: 'company-1' } });

    await companyCustomerApi.create({
      talentId: 'talent-1',
      nickname: 'Acme',
      companyLegalName: 'Acme Inc.',
      pii: {
        contactEmail: 'ops@acme.example.com',
      },
    });
    await companyCustomerApi.update(
      'company-1',
      {
        companyLegalName: 'Acme Intl.',
        pii: {
          contactName: 'Alice',
        },
        version: 2,
      },
      'talent-1',
    );
    await customerApi.createPiiPortalSession('company-1', 'talent-1', 'company');
    await platformIdentityApi.create(
      'customer-1',
      { platformCode: 'x', platformUid: 'u-1' },
      'talent-1',
    );
    await membershipApi.create(
      'customer-1',
      {
        platformCode: 'youtube',
        membershipLevelCode: 'gold',
        validFrom: '2026-01-01',
      },
      'talent-1',
    );
    await externalIdApi.create(
      'customer-1',
      { consumerCode: 'crm', externalId: 'crm-1' },
      'talent-1',
    );

    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      '/api/v1/talents/talent-1/customers/companies',
      expect.objectContaining({
        pii: {
          contactEmail: 'ops@acme.example.com',
        },
      }),
    );
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/v1/talents/talent-1/customers/companies/company-1',
      {
        companyLegalName: 'Acme Intl.',
        pii: {
          contactName: 'Alice',
        },
        version: 2,
      },
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      '/api/v1/talents/talent-1/customers/companies/company-1/pii-portal-session',
      {},
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      3,
      '/api/v1/talents/talent-1/customers/customer-1/platform-identities',
      { platformCode: 'x', platformUid: 'u-1' },
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      4,
      '/api/v1/talents/talent-1/customers/customer-1/memberships',
      expect.objectContaining({ platformCode: 'youtube' }),
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      5,
      '/api/v1/talents/talent-1/customers/customer-1/external-ids',
      { consumerCode: 'crm', externalId: 'crm-1' },
    );
  });

  it('uses canonical talent-root customer import urls without owner headers or body talentId', async () => {
    const createObjectUrl = vi.fn(() => 'blob:template');
    const revokeObjectUrl = vi.fn();
    const click = vi.fn();
    fetchMock
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['nickname'], { type: 'text/csv' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['row,error'], { type: 'text/csv' }),
      });
    mockGet.mockResolvedValue({ success: true, data: { id: 'job-1' } });
    mockDelete.mockResolvedValue({ success: true });
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

    const file = new File(['nickname\nAqua'], 'customers.csv', { type: 'text/csv' });
    const result = await customerImportApi.uploadIndividual(file, 'talent-1');
    await customerImportApi.downloadIndividualTemplate('talent-1');
    await customerImportApi.downloadErrors('individuals', 'job-1', 'talent-1');
    await customerImportApi.getJob('individuals', 'job-1', 'talent-1');
    await customerImportApi.listJobs('talent-1', { status: 'pending', page: 2, pageSize: 10 });
    await customerImportApi.cancel('individuals', 'job-1', 'talent-1');

    expect(result).toMatchObject({
      success: true,
      data: {
        id: 'job-1',
        status: 'pending',
      },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/api/v1/talents/talent-1/imports/customers/individuals');
    expect(init.headers).toBeUndefined();

    const body = init.body as FormData;
    expect(body.get('talentId')).toBeNull();
    expect(body.get('file')).toBeInstanceOf(File);
    expect(mockBuildApiUrl).toHaveBeenNthCalledWith(
      1,
      '/api/v1/talents/talent-1/imports/customers/individuals',
    );
    expect(mockBuildApiUrl).toHaveBeenNthCalledWith(
      2,
      '/api/v1/talents/talent-1/imports/customers/individuals/template',
    );
    expect(mockBuildApiUrl).toHaveBeenNthCalledWith(
      3,
      '/api/v1/talents/talent-1/imports/customers/individuals/job-1/errors',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/talents/talent-1/imports/customers/individuals/template',
      { credentials: 'include' },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/talents/talent-1/imports/customers/individuals/job-1/errors',
      { credentials: 'include' },
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      1,
      '/api/v1/talents/talent-1/imports/customers/individuals/job-1',
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      2,
      '/api/v1/talents/talent-1/imports/customers',
      { status: 'pending', page: 2, pageSize: 10 },
    );
    expect(mockDelete).toHaveBeenCalledWith(
      '/api/v1/talents/talent-1/imports/customers/individuals/job-1',
    );
    expect(click).toHaveBeenCalledTimes(2);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:template');
  });
});

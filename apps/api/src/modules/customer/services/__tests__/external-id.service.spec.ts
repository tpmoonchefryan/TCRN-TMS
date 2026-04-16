// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomerExternalIdApplicationService } from '../../application/customer-external-id.service';
import { CustomerExternalIdService } from '../external-id.service';

describe('CustomerExternalIdService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Tester',
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest',
    requestId: 'req-1',
  };

  const mockApplicationService = {
    findByCustomer: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    findCustomerByExternalId: vi.fn(),
    existsInProfileStore: vi.fn(),
  } as unknown as CustomerExternalIdApplicationService;

  const service = new CustomerExternalIdService(mockApplicationService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates create to the application service', async () => {
    const dto = { consumerCode: 'CRM', externalId: 'EXT-1' };
    const expected = {
      id: 'ext-1',
      consumer: {
        id: 'consumer-1',
        code: 'CRM',
        name: 'CRM System',
      },
      externalId: 'EXT-1',
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      createdBy: 'user-1',
    };
    vi.mocked(mockApplicationService.create).mockResolvedValue(expected);

    await expect(
      service.create('customer-1', 'talent-1', dto, context),
    ).resolves.toEqual(expected);

    expect(mockApplicationService.create).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      dto,
      context,
    );
  });

  it('delegates delete to the application service', async () => {
    vi.mocked(mockApplicationService.delete).mockResolvedValue(undefined);

    await expect(
      service.delete('customer-1', 'external-id-1', 'talent-1', context),
    ).resolves.toBeUndefined();

    expect(mockApplicationService.delete).toHaveBeenCalledWith(
      'customer-1',
      'external-id-1',
      'talent-1',
      context,
    );
  });

  it('delegates lookup helpers to the application service', async () => {
    vi.mocked(mockApplicationService.findCustomerByExternalId).mockResolvedValue({
      id: 'customer-1',
      nickname: 'Acme',
      profileStoreId: 'store-1',
    });
    vi.mocked(mockApplicationService.existsInProfileStore).mockResolvedValue(true);

    await expect(
      service.findCustomerByExternalId('CRM', 'EXT-1', 'store-1', context),
    ).resolves.toEqual({
      id: 'customer-1',
      nickname: 'Acme',
      profileStoreId: 'store-1',
    });
    await expect(
      service.existsInProfileStore('CRM', 'EXT-1', 'store-1', context),
    ).resolves.toBe(true);
  });
});

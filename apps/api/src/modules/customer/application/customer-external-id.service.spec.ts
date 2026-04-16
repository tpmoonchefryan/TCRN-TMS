// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfileType } from '../dto/customer.dto';
import { CustomerExternalIdRepository } from '../infrastructure/customer-external-id.repository';
import type { CustomerArchiveAccessService } from './customer-archive-access.service';
import { CustomerExternalIdApplicationService } from './customer-external-id.service';

describe('CustomerExternalIdApplicationService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Tester',
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest',
    requestId: 'req-1',
  };

  const mockRepository = {
    findByCustomer: vi.fn(),
    findActiveConsumerByCode: vi.fn(),
    findDuplicateExternalId: vi.fn(),
    create: vi.fn(),
    insertChangeLog: vi.fn(),
    findOwnedExternalId: vi.fn(),
    delete: vi.fn(),
    findCustomerByExternalId: vi.fn(),
    existsInProfileStore: vi.fn(),
  } as unknown as CustomerExternalIdRepository;

  const mockCustomerArchiveAccessService = {
    requireCustomerArchiveAccess: vi.fn(),
  } as unknown as CustomerArchiveAccessService;

  const service = new CustomerExternalIdApplicationService(
    mockCustomerArchiveAccessService,
    mockRepository,
  );

  const customerArchiveAccessRecord = {
    id: 'customer-1',
    profileType: ProfileType.COMPANY,
    profileStoreId: 'store-1',
    nickname: 'Acme',
    version: 1,
    isActive: true,
    primaryLanguage: 'en',
    statusId: null,
    tags: [],
    notes: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NotFoundException when findByCustomer cannot resolve customer access', async () => {
    vi.mocked(
      mockCustomerArchiveAccessService.requireCustomerArchiveAccess,
    ).mockRejectedValue(new NotFoundException());

    await expect(
      service.findByCustomer('customer-1', 'talent-1', context),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps external-id records on the read path', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findByCustomer).mockResolvedValue([
      {
        id: 'external-id-1',
        consumerId: 'consumer-1',
        consumerCode: 'CRM',
        consumerName: 'CRM System',
        externalId: 'EXT-1',
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        createdBy: 'user-1',
      },
    ]);

    await expect(
      service.findByCustomer('customer-1', 'talent-1', context),
    ).resolves.toEqual([
      {
        id: 'external-id-1',
        consumer: {
          id: 'consumer-1',
          code: 'CRM',
          name: 'CRM System',
        },
        externalId: 'EXT-1',
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        createdBy: 'user-1',
      },
    ]);
  });

  it('throws NotFoundException with RES_NOT_FOUND when create cannot resolve the consumer', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findActiveConsumerByCode).mockResolvedValue(null);

    await expect(
      service.create(
        'customer-1',
        'talent-1',
        { consumerCode: 'CRM', externalId: 'EXT-1' },
        context,
      ),
    ).rejects.toMatchObject({
      response: {
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Consumer not found',
      },
    });
  });

  it('throws ConflictException with legacy duplicate semantics when create sees an existing external id', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findActiveConsumerByCode).mockResolvedValue({
      id: 'consumer-1',
      code: 'CRM',
      nameEn: 'CRM System',
    });
    vi.mocked(mockRepository.findDuplicateExternalId).mockResolvedValue({
      id: 'external-id-1',
    });

    await expect(
      service.create(
        'customer-1',
        'talent-1',
        { consumerCode: 'CRM', externalId: 'EXT-1' },
        context,
      ),
    ).rejects.toMatchObject({
      response: {
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: "External ID 'EXT-1' already exists for consumer 'CRM'",
      },
    });
  });

  it('creates the external id and writes the raw change-log payload', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findActiveConsumerByCode).mockResolvedValue({
      id: 'consumer-1',
      code: 'CRM',
      nameEn: 'CRM System',
    });
    vi.mocked(mockRepository.findDuplicateExternalId).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockResolvedValue({
      id: 'external-id-1',
      externalId: 'EXT-1',
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });
    vi.mocked(mockRepository.insertChangeLog).mockResolvedValue(1 as never);

    await expect(
      service.create(
        'customer-1',
        'talent-1',
        { consumerCode: 'CRM', externalId: 'EXT-1' },
        context,
      ),
    ).resolves.toEqual({
      id: 'external-id-1',
      consumer: {
        id: 'consumer-1',
        code: 'CRM',
        name: 'CRM System',
      },
      externalId: 'EXT-1',
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      createdBy: 'user-1',
    });

    expect(mockRepository.create).toHaveBeenCalledWith('tenant_test', {
      customerId: 'customer-1',
      profileStoreId: 'store-1',
      consumerId: 'consumer-1',
      externalId: 'EXT-1',
      userId: 'user-1',
    });
    expect(mockRepository.insertChangeLog).toHaveBeenCalledWith('tenant_test', {
      action: 'create',
      objectId: 'external-id-1',
      objectName: 'CRM:EXT-1',
      diff: JSON.stringify({
        new: {
          consumerCode: 'CRM',
          externalId: 'EXT-1',
        },
      }),
      userId: 'user-1',
      ipAddress: '127.0.0.1',
    });
  });

  it('throws NotFoundException when delete cannot resolve the owned external id', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findOwnedExternalId).mockResolvedValue(null);

    await expect(
      service.delete('customer-1', 'external-id-1', 'talent-1', context),
    ).rejects.toThrow(NotFoundException);
  });

  it('deletes the external id and records the delete change-log payload', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findOwnedExternalId).mockResolvedValue({
      id: 'external-id-1',
      externalId: 'EXT-1',
      consumerCode: 'CRM',
    });
    vi.mocked(mockRepository.delete).mockResolvedValue(1 as never);
    vi.mocked(mockRepository.insertChangeLog).mockResolvedValue(1 as never);

    await expect(
      service.delete('customer-1', 'external-id-1', 'talent-1', context),
    ).resolves.toBeUndefined();

    expect(mockRepository.delete).toHaveBeenCalledWith('tenant_test', 'external-id-1');
    expect(mockRepository.insertChangeLog).toHaveBeenCalledWith('tenant_test', {
      action: 'delete',
      objectId: 'external-id-1',
      objectName: 'CRM:EXT-1',
      diff: JSON.stringify({
        old: {
          consumerCode: 'CRM',
          externalId: 'EXT-1',
        },
      }),
      userId: 'user-1',
      ipAddress: '127.0.0.1',
    });
  });

  it('passes lookup helpers through to the repository', async () => {
    vi.mocked(mockRepository.findCustomerByExternalId).mockResolvedValue({
      id: 'customer-1',
      nickname: 'Acme',
      profileStoreId: 'store-1',
    });
    vi.mocked(mockRepository.existsInProfileStore).mockResolvedValue(true);

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

    expect(mockRepository.findCustomerByExternalId).toHaveBeenCalledWith(
      'tenant_test',
      'CRM',
      'EXT-1',
      'store-1',
    );
    expect(mockRepository.existsInProfileStore).toHaveBeenCalledWith(
      'tenant_test',
      'CRM',
      'EXT-1',
      'store-1',
    );
  });
});

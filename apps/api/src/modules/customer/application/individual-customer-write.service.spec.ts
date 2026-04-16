// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, ConflictException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../../database';
import type { ChangeLogService, TechEventLogService } from '../../log';
import { ProfileType } from '../dto/customer.dto';
import { IndividualCustomerPiiRepository } from '../infrastructure/individual-customer-pii.repository';
import { IndividualCustomerWriteRepository } from '../infrastructure/individual-customer-write.repository';
import type { CustomerArchiveAccessService } from './customer-archive-access.service';
import { CustomerPiiPlatformApplicationService } from './customer-pii-platform.service';
import { IndividualCustomerWriteApplicationService } from './individual-customer-write.service';

describe('IndividualCustomerWriteApplicationService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Tester',
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest',
    requestId: 'req-1',
  };

  const prismaClient = {
    name: 'root-prisma',
  };
  const transactionClient = {
    name: 'tx-prisma',
  };

  const mockWriteRepository = {
    withTransaction: vi.fn(),
    findActiveStatusId: vi.fn(),
    findActiveConsumer: vi.fn(),
    createCustomerProfile: vi.fn(),
    insertExternalId: vi.fn(),
    updateCustomerProfile: vi.fn(),
    insertAccessLog: vi.fn(),
  } as unknown as IndividualCustomerWriteRepository;

  const mockPiiRepository = {} as unknown as IndividualCustomerPiiRepository;

  const mockDatabaseService = {
    getPrisma: vi.fn(),
  } as unknown as DatabaseService;

  const mockChangeLogService = {
    create: vi.fn(),
  } as unknown as ChangeLogService;

  const mockTechEventLogService = {
    piiAccess: vi.fn(),
    warn: vi.fn(),
  } as unknown as TechEventLogService;

  const mockCustomerArchiveAccessService = {
    requireTalentArchiveTarget: vi.fn(),
    requireCustomerArchiveAccess: vi.fn(),
  } as unknown as CustomerArchiveAccessService;

  const mockCustomerPiiPlatformApplicationService = {
    assertPlatformEnabled: vi.fn(),
    upsertCustomerPii: vi.fn(),
  } as unknown as CustomerPiiPlatformApplicationService;

  const service = new IndividualCustomerWriteApplicationService(
    mockWriteRepository,
    mockPiiRepository,
    mockDatabaseService,
    mockChangeLogService,
    mockTechEventLogService,
    mockCustomerArchiveAccessService,
    mockCustomerPiiPlatformApplicationService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockDatabaseService.getPrisma).mockReturnValue(prismaClient as never);
    vi.mocked(mockWriteRepository.withTransaction).mockImplementation(
      async (operation) => operation(transactionClient as never),
    );
  });

  it('fails closed when pii is submitted without an active pii platform adapter', async () => {
    vi.mocked(
      mockCustomerPiiPlatformApplicationService.assertPlatformEnabled,
    ).mockRejectedValue(
      new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'TCRN PII Platform is not enabled for this talent',
      }),
    );

    await expect(
      service.create(
        'talent-1',
        {
          nickname: 'Test User',
          pii: {
            givenName: 'John',
            familyName: 'Doe',
          },
        },
        context,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockWriteRepository.createCustomerProfile).not.toHaveBeenCalled();
    expect(
      mockCustomerPiiPlatformApplicationService.upsertCustomerPii,
    ).not.toHaveBeenCalled();
  });

  it('creates a customer record and synchronizes pii to the external platform', async () => {
    const createdAt = new Date('2026-04-14T00:00:00.000Z');
    vi.mocked(
      mockCustomerPiiPlatformApplicationService.assertPlatformEnabled,
    ).mockResolvedValue(undefined as never);
    vi.mocked(
      mockCustomerArchiveAccessService.requireTalentArchiveTarget,
    ).mockResolvedValue({
      talentId: 'talent-1',
      profileStoreId: 'store-1',
    });
    vi.mocked(mockWriteRepository.createCustomerProfile).mockResolvedValue({
      id: 'customer-1',
      nickname: 'Test User',
      createdAt,
    });
    vi.mocked(mockChangeLogService.create).mockResolvedValue(undefined as never);
    vi.mocked(mockWriteRepository.insertAccessLog).mockResolvedValue(1 as never);
    vi.mocked(
      mockCustomerPiiPlatformApplicationService.upsertCustomerPii,
    ).mockResolvedValue({
      customerId: 'customer-1',
      syncedAt: '2026-04-14T00:00:01.000Z',
    } as never);
    vi.mocked(mockTechEventLogService.piiAccess).mockResolvedValue(undefined as never);

    await expect(
      service.create(
        'talent-1',
        {
          nickname: 'Test User',
          pii: {
            givenName: 'John',
            familyName: 'Doe',
          },
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'customer-1',
      profileType: 'individual',
      nickname: 'Test User',
      createdAt,
    });

    expect(mockWriteRepository.createCustomerProfile).toHaveBeenCalledWith(
      transactionClient,
      'tenant_test',
      expect.objectContaining({
        talentId: 'talent-1',
        profileStoreId: 'store-1',
        nickname: 'Test User',
      }),
    );
    expect(
      mockCustomerPiiPlatformApplicationService.upsertCustomerPii,
    ).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      'individual',
      {
        givenName: 'John',
        familyName: 'Doe',
      },
      context,
    );
  });

  it('logs a warning and rethrows when pii synchronization fails after customer creation', async () => {
    const platformFailure = new Error('pii platform unavailable');
    vi.mocked(
      mockCustomerPiiPlatformApplicationService.assertPlatformEnabled,
    ).mockResolvedValue(undefined as never);
    vi.mocked(
      mockCustomerArchiveAccessService.requireTalentArchiveTarget,
    ).mockResolvedValue({
      talentId: 'talent-1',
      profileStoreId: 'store-1',
    });
    vi.mocked(mockWriteRepository.createCustomerProfile).mockResolvedValue({
      id: 'customer-1',
      nickname: 'Test User',
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });
    vi.mocked(mockChangeLogService.create).mockResolvedValue(undefined as never);
    vi.mocked(mockWriteRepository.insertAccessLog).mockResolvedValue(1 as never);
    vi.mocked(
      mockCustomerPiiPlatformApplicationService.upsertCustomerPii,
    ).mockRejectedValue(platformFailure);
    vi.mocked(mockTechEventLogService.warn).mockResolvedValue(undefined as never);

    await expect(
      service.create(
        'talent-1',
        {
          nickname: 'Test User',
          pii: {
            givenName: 'John',
          },
        },
        context,
      ),
    ).rejects.toThrow('pii platform unavailable');

    expect(mockTechEventLogService.warn).toHaveBeenCalledWith(
      'PII_PLATFORM_SYNC_FAILED',
      'Failed to synchronize customer PII to TCRN PII Platform after customer creation',
      expect.objectContaining({
        talentId: 'talent-1',
        profileStoreId: 'store-1',
        operatorId: 'user-1',
      }),
      context,
    );
  });

  it('rejects updates when the optimistic version is stale', async () => {
    vi.mocked(
      mockCustomerArchiveAccessService.requireCustomerArchiveAccess,
    ).mockResolvedValue({
      id: 'customer-1',
      profileType: ProfileType.INDIVIDUAL,
      profileStoreId: 'store-1',
      version: 2,
      isActive: true,
      nickname: 'Test User',
      primaryLanguage: 'ja',
      statusId: null,
      tags: ['vip'],
      notes: 'legacy',
    });

    await expect(
      service.update(
        'customer-1',
        'talent-1',
        {
          version: 1,
          nickname: 'Updated Name',
        },
        context,
      ),
    ).rejects.toThrow(ConflictException);

    expect(mockWriteRepository.updateCustomerProfile).not.toHaveBeenCalled();
  });

  it('updates non-pii customer fields and records change plus access logs', async () => {
    const updatedAt = new Date('2026-04-14T00:05:00.000Z');
    vi.mocked(
      mockCustomerArchiveAccessService.requireCustomerArchiveAccess,
    ).mockResolvedValue({
      id: 'customer-1',
      profileType: ProfileType.INDIVIDUAL,
      profileStoreId: 'store-1',
      version: 1,
      isActive: true,
      nickname: 'Test User',
      primaryLanguage: 'ja',
      statusId: 'status-old',
      tags: ['vip'],
      notes: 'legacy',
    });
    vi.mocked(mockWriteRepository.findActiveStatusId).mockResolvedValue('status-new');
    vi.mocked(mockWriteRepository.updateCustomerProfile).mockResolvedValue({
      id: 'customer-1',
      nickname: 'Updated Name',
      version: 2,
      updatedAt,
    });
    vi.mocked(mockChangeLogService.create).mockResolvedValue(undefined as never);
    vi.mocked(mockWriteRepository.insertAccessLog).mockResolvedValue(1 as never);

    await expect(
      service.update(
        'customer-1',
        'talent-1',
        {
          version: 1,
          nickname: 'Updated Name',
          statusCode: 'active',
          tags: ['vip', 'premium'],
          notes: 'updated',
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'customer-1',
      nickname: 'Updated Name',
      version: 2,
      updatedAt,
    });

    expect(mockWriteRepository.updateCustomerProfile).toHaveBeenCalledWith(
      transactionClient,
      'tenant_test',
      {
        customerId: 'customer-1',
        talentId: 'talent-1',
        userId: 'user-1',
        update: {
          nickname: 'Updated Name',
          statusId: 'status-new',
          tags: ['vip', 'premium'],
          notes: 'updated',
        },
      },
    );
    expect(mockWriteRepository.insertAccessLog).toHaveBeenCalledWith(
      transactionClient,
      'tenant_test',
      expect.objectContaining({
        customerId: 'customer-1',
        profileStoreId: 'store-1',
        action: 'update',
      }),
    );
  });
});

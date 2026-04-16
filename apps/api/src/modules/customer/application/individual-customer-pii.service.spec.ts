// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../../database';
import type { TechEventLogService } from '../../log';
import { CustomerAction, ProfileType } from '../dto/customer.dto';
import { IndividualCustomerPiiRepository } from '../infrastructure/individual-customer-pii.repository';
import type { CustomerArchiveAccessService } from './customer-archive-access.service';
import { CustomerPiiPlatformApplicationService } from './customer-pii-platform.service';
import { IndividualCustomerPiiApplicationService } from './individual-customer-pii.service';

describe('IndividualCustomerPiiApplicationService', () => {
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

  const mockRepository = {
    insertAccessLog: vi.fn(),
    insertPiiUpdateAccessLog: vi.fn(),
    incrementCustomerVersion: vi.fn(),
    withTransaction: vi.fn(),
  } as unknown as IndividualCustomerPiiRepository;

  const mockDatabaseService = {
    getPrisma: vi.fn(),
  } as unknown as DatabaseService;

  const mockTechEventLogService = {
    piiAccess: vi.fn(),
  } as unknown as TechEventLogService;

  const mockCustomerArchiveAccessService = {
    requireCustomerArchiveAccess: vi.fn(),
  } as unknown as CustomerArchiveAccessService;

  const mockCustomerPiiPlatformApplicationService = {
    createPortalSession: vi.fn(),
    upsertCustomerPii: vi.fn(),
  } as unknown as CustomerPiiPlatformApplicationService;

  const service = new IndividualCustomerPiiApplicationService(
    mockRepository,
    mockDatabaseService,
    mockTechEventLogService,
    mockCustomerArchiveAccessService,
    mockCustomerPiiPlatformApplicationService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockDatabaseService.getPrisma).mockReturnValue(prismaClient as never);
    vi.mocked(mockRepository.withTransaction).mockImplementation(
      async (operation) => operation(transactionClient as never),
    );
  });

  it('creates a portal session and records pii access audit logs', async () => {
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
      statusId: null,
      tags: [],
      notes: null,
    });
    vi.mocked(
      mockCustomerPiiPlatformApplicationService.createPortalSession,
    ).mockResolvedValue({
      redirectUrl: 'https://pii-platform.example.com/portal/sessions/session-1',
      expiresAt: '2026-04-14T08:05:00.000Z',
    } as never);
    vi.mocked(mockRepository.insertAccessLog).mockResolvedValue(1 as never);
    vi.mocked(mockTechEventLogService.piiAccess).mockResolvedValue(undefined as never);

    await expect(
      service.createPortalSession('customer-1', 'talent-1', context),
    ).resolves.toEqual({
      redirectUrl: 'https://pii-platform.example.com/portal/sessions/session-1',
      expiresAt: '2026-04-14T08:05:00.000Z',
    });

    expect(
      mockCustomerPiiPlatformApplicationService.createPortalSession,
    ).toHaveBeenCalledWith('customer-1', 'talent-1', 'individual', context);
    expect(mockRepository.insertAccessLog).toHaveBeenCalledWith(
      prismaClient,
      'tenant_test',
      expect.objectContaining({
        customerId: 'customer-1',
        profileStoreId: 'store-1',
        talentId: 'talent-1',
        action: CustomerAction.PII_VIEW,
      }),
    );
  });

  it('fails closed when the customer does not belong to the requested talent scope', async () => {
    vi.mocked(
      mockCustomerArchiveAccessService.requireCustomerArchiveAccess,
    ).mockRejectedValue(new NotFoundException());

    await expect(
      service.createPortalSession('customer-1', 'talent-1', context),
    ).rejects.toThrow(NotFoundException);

    expect(
      mockCustomerPiiPlatformApplicationService.createPortalSession,
    ).not.toHaveBeenCalled();
    expect(mockRepository.insertAccessLog).not.toHaveBeenCalled();
  });

  it('rejects pii updates when the customer version is stale', async () => {
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
      tags: [],
      notes: null,
    });

    await expect(
      service.updatePii(
        'customer-1',
        'talent-1',
        {
          version: 1,
          pii: {
            givenName: 'Jane',
          },
        },
        context,
      ),
    ).rejects.toThrow(ConflictException);

    expect(
      mockCustomerPiiPlatformApplicationService.upsertCustomerPii,
    ).not.toHaveBeenCalled();
  });

  it('synchronizes pii to the external platform and records audit logs', async () => {
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
      statusId: null,
      tags: [],
      notes: null,
    });
    vi.mocked(
      mockCustomerPiiPlatformApplicationService.upsertCustomerPii,
    ).mockResolvedValue({
      customerId: 'customer-1',
      syncedAt: '2026-04-14T08:00:00.000Z',
    } as never);
    vi.mocked(mockTechEventLogService.piiAccess).mockResolvedValue(undefined as never);
    vi.mocked(mockRepository.insertPiiUpdateAccessLog).mockResolvedValue(1 as never);
    vi.mocked(mockRepository.incrementCustomerVersion).mockResolvedValue(1 as never);

    await expect(
      service.updatePii(
        'customer-1',
        'talent-1',
        {
          version: 1,
          pii: {
            givenName: 'Jane',
            familyName: 'Doe',
            phoneNumbers: [
              {
                typeCode: 'mobile',
                number: '+81-90-1234-5678',
                isPrimary: true,
              },
            ],
          },
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'customer-1',
      message: 'PII data synchronized to TCRN PII Platform',
    });

    expect(
      mockCustomerPiiPlatformApplicationService.upsertCustomerPii,
    ).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      'individual',
      {
        givenName: 'Jane',
        familyName: 'Doe',
        phoneNumbers: [
          {
            typeCode: 'mobile',
            number: '+81-90-1234-5678',
            isPrimary: true,
          },
        ],
      },
      context,
    );
    expect(mockRepository.insertPiiUpdateAccessLog).toHaveBeenCalledWith(
      transactionClient,
      'tenant_test',
      expect.objectContaining({
        customerId: 'customer-1',
        profileStoreId: 'store-1',
        talentId: 'talent-1',
        action: CustomerAction.PII_UPDATE,
      }),
    );
    expect(mockRepository.incrementCustomerVersion).toHaveBeenCalledWith(
      transactionClient,
      'tenant_test',
      {
        customerId: 'customer-1',
        talentId: 'talent-1',
        userId: 'user-1',
      },
    );
  });
});

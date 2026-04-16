// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../../database';
import type { ChangeLogService, TechEventLogService } from '../../log';
import { ProfileType } from '../dto/customer.dto';
import { CompanyCustomerRepository } from '../infrastructure/company-customer.repository';
import { CompanyCustomerApplicationService } from './company-customer.service';
import type { CustomerArchiveAccessService } from './customer-archive-access.service';
import type { CustomerPiiPlatformApplicationService } from './customer-pii-platform.service';

describe('CompanyCustomerApplicationService', () => {
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
    client: 'mock-prisma',
  };

  const mockRepository = {
    withTransaction: vi.fn(),
    findActiveStatusId: vi.fn(),
    findActiveBusinessSegmentId: vi.fn(),
    findActiveConsumer: vi.fn(),
    createCustomerProfile: vi.fn(),
    insertCompanyInfo: vi.fn(),
    insertExternalId: vi.fn(),
    updateCustomerProfile: vi.fn(),
    updateCompanyInfo: vi.fn(),
    insertCompanyInfoForUpdate: vi.fn(),
    insertAccessLog: vi.fn(),
  } as unknown as CompanyCustomerRepository;

  const mockChangeLogService = {
    create: vi.fn(),
    createDirect: vi.fn(),
  } as unknown as ChangeLogService;

  const mockTechEventLogService = {
    piiAccess: vi.fn(),
    warn: vi.fn(),
  } as unknown as TechEventLogService;

  const mockCustomerArchiveAccessService = {
    requireTalentArchiveTarget: vi.fn(),
    requireCustomerArchiveAccess: vi.fn(),
  } as unknown as CustomerArchiveAccessService;

  const mockDatabaseService = {
    getPrisma: vi.fn(),
  } as unknown as DatabaseService;

  const mockCustomerPiiPlatformApplicationService = {
    assertPlatformEnabled: vi.fn(),
    upsertCustomerPii: vi.fn(),
    createPortalSession: vi.fn(),
  } as unknown as CustomerPiiPlatformApplicationService;

  const service = new CompanyCustomerApplicationService(
    mockRepository,
    mockChangeLogService,
    mockDatabaseService,
    mockTechEventLogService,
    mockCustomerArchiveAccessService,
    mockCustomerPiiPlatformApplicationService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockDatabaseService.getPrisma).mockReturnValue(prismaClient as never);
    vi.mocked(mockRepository.withTransaction).mockImplementation(async (operation) =>
      operation(prismaClient as never));
  });

  it('fails closed when create resolves a talent without a profile store', async () => {
    vi.mocked(
      mockCustomerArchiveAccessService.requireTalentArchiveTarget,
    ).mockRejectedValue(new BadRequestException());

    await expect(
      service.create(
        'talent-1',
        {
          nickname: 'Acme',
          companyLegalName: 'Acme Corporation',
        },
        context,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a company customer, externalizes company contact pii, and writes an optional external id', async () => {
    vi.mocked(
      mockCustomerArchiveAccessService.requireTalentArchiveTarget,
    ).mockResolvedValue({
      talentId: 'talent-1',
      profileStoreId: 'store-1',
    });
    vi.mocked(mockRepository.findActiveStatusId).mockResolvedValue('status-1');
    vi.mocked(mockRepository.findActiveBusinessSegmentId).mockResolvedValue('segment-1');
    vi.mocked(mockRepository.createCustomerProfile).mockResolvedValue({
      id: 'customer-1',
      nickname: 'Acme',
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });
    vi.mocked(mockRepository.insertCompanyInfo).mockResolvedValue(1 as never);
    vi.mocked(mockRepository.findActiveConsumer).mockResolvedValue({ id: 'consumer-1' });
    vi.mocked(mockRepository.insertExternalId).mockResolvedValue(1 as never);
    vi.mocked(mockChangeLogService.create).mockResolvedValue(undefined as never);
    vi.mocked(mockRepository.insertAccessLog).mockResolvedValue(1 as never);
    vi.mocked(mockCustomerPiiPlatformApplicationService.assertPlatformEnabled).mockResolvedValue(undefined as never);
    vi.mocked(mockCustomerPiiPlatformApplicationService.upsertCustomerPii).mockResolvedValue({
      customerId: 'customer-1',
      syncedAt: '2026-04-14T00:00:01.000Z',
    } as never);
    vi.mocked(mockTechEventLogService.piiAccess).mockResolvedValue(undefined as never);

    await expect(
      service.create(
        'talent-1',
        {
          nickname: 'Acme',
          companyLegalName: 'Acme Corporation',
          statusCode: 'active',
          businessSegmentCode: 'ENT',
          externalId: 'CRM-001',
          consumerCode: 'CRM',
          website: 'https://acme.example.com',
          pii: {
            contactName: 'Alice',
            contactPhone: '+1-555-0100',
            contactEmail: 'alice@acme.example.com',
            contactDepartment: 'Partnerships',
          },
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'customer-1',
      profileType: 'company',
      nickname: 'Acme',
      company: {
        companyLegalName: 'Acme Corporation',
        companyShortName: undefined,
      },
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });

    expect(mockRepository.insertCompanyInfo).toHaveBeenCalledWith(
      prismaClient,
      'tenant_test',
      expect.objectContaining({
        customerId: 'customer-1',
        companyLegalName: 'Acme Corporation',
        businessSegmentId: 'segment-1',
        website: 'https://acme.example.com',
      }),
    );
    expect(mockCustomerPiiPlatformApplicationService.upsertCustomerPii).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      'company',
      {
        contactName: 'Alice',
        contactPhone: '+1-555-0100',
        contactEmail: 'alice@acme.example.com',
        contactDepartment: 'Partnerships',
      },
      context,
    );
    expect(mockRepository.insertExternalId).toHaveBeenCalledWith(
      prismaClient,
      'tenant_test',
      {
        customerId: 'customer-1',
        profileStoreId: 'store-1',
        consumerId: 'consumer-1',
        externalId: 'CRM-001',
        userId: 'user-1',
      },
    );
  });

  it('throws ConflictException when update sees a version mismatch', async () => {
    vi.mocked(
      mockCustomerArchiveAccessService.requireCustomerArchiveAccess,
    ).mockResolvedValue({
      id: 'customer-1',
      profileType: ProfileType.COMPANY,
      profileStoreId: 'store-1',
      nickname: 'Acme',
      version: 2,
      isActive: true,
      primaryLanguage: 'en',
      statusId: null,
      tags: [],
      notes: null,
    });

    await expect(
      service.update(
        'customer-1',
        'talent-1',
        {
          version: 1,
          pii: {
            contactName: 'Alice',
          },
        },
        context,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('updates company pii externally without mutating stored company contact fields', async () => {
    vi.mocked(
      mockCustomerArchiveAccessService.requireCustomerArchiveAccess,
    ).mockResolvedValue({
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
    });
    vi.mocked(mockRepository.updateCustomerProfile).mockResolvedValue({
      id: 'customer-1',
      nickname: 'Acme',
      version: 2,
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
    });
    vi.mocked(mockChangeLogService.createDirect).mockResolvedValue(undefined as never);
    vi.mocked(mockRepository.insertAccessLog).mockResolvedValue(1 as never);
    vi.mocked(mockCustomerPiiPlatformApplicationService.assertPlatformEnabled).mockResolvedValue(undefined as never);
    vi.mocked(mockCustomerPiiPlatformApplicationService.upsertCustomerPii).mockResolvedValue({
      customerId: 'customer-1',
      syncedAt: '2026-04-14T00:05:05.000Z',
    } as never);
    vi.mocked(mockTechEventLogService.piiAccess).mockResolvedValue(undefined as never);

    await expect(
      service.update(
        'customer-1',
        'talent-1',
        {
          version: 1,
          pii: {
            contactName: 'Alice',
            contactPhone: '+1-555-0100',
            contactEmail: 'alice@acme.example.com',
            contactDepartment: 'Partnerships',
          },
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'customer-1',
      nickname: 'Acme',
      version: 2,
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
    });

    expect(mockRepository.updateCompanyInfo).not.toHaveBeenCalled();
    expect(mockRepository.insertCompanyInfoForUpdate).not.toHaveBeenCalled();
    expect(mockCustomerPiiPlatformApplicationService.upsertCustomerPii).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      'company',
      {
        contactName: 'Alice',
        contactPhone: '+1-555-0100',
        contactEmail: 'alice@acme.example.com',
        contactDepartment: 'Partnerships',
      },
      context,
    );
    expect(mockChangeLogService.createDirect).toHaveBeenCalledTimes(1);
  });

  it('creates a company pii portal session through the external platform', async () => {
    vi.mocked(
      mockCustomerArchiveAccessService.requireCustomerArchiveAccess,
    ).mockResolvedValue({
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
    });
    vi.mocked(mockCustomerPiiPlatformApplicationService.createPortalSession).mockResolvedValue({
      redirectUrl: 'https://pii.example.com/session/company-1',
      expiresAt: '2026-04-15T08:05:00.000Z',
    } as never);
    vi.mocked(mockTechEventLogService.piiAccess).mockResolvedValue(undefined as never);
    vi.mocked(mockRepository.insertAccessLog).mockResolvedValue(1 as never);

    await expect(
      service.createPiiPortalSession('customer-1', 'talent-1', context),
    ).resolves.toEqual({
      redirectUrl: 'https://pii.example.com/session/company-1',
      expiresAt: '2026-04-15T08:05:00.000Z',
    });

    expect(mockCustomerPiiPlatformApplicationService.createPortalSession).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      'company',
      context,
    );
  });
});

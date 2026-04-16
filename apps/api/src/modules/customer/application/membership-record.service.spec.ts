// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../../database';
import { ProfileType } from '../dto/customer.dto';
import { MembershipRecordRepository } from '../infrastructure/membership-record.repository';
import type { CustomerArchiveAccessService } from './customer-archive-access.service';
import { MembershipRecordApplicationService } from './membership-record.service';

describe('MembershipRecordApplicationService', () => {
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
    countByCustomer: vi.fn(),
    countActiveByCustomer: vi.fn(),
    countExpiredByCustomer: vi.fn(),
    findActivePlatformByCode: vi.fn(),
    findActiveMembershipLevelByCode: vi.fn(),
    create: vi.fn(),
    insertChangeLog: vi.fn(),
    findOwnedRecord: vi.fn(),
    update: vi.fn(),
    findHighestActiveSummary: vi.fn(),
    countTotalByCustomer: vi.fn(),
  } as unknown as MembershipRecordRepository;

  const mockDatabaseService = {
    buildPagination: vi.fn(),
    calculatePaginationMeta: vi.fn(),
  } as unknown as DatabaseService;

  const mockCustomerArchiveAccessService = {
    requireCustomerArchiveAccess: vi.fn(),
  } as unknown as CustomerArchiveAccessService;

  const service = new MembershipRecordApplicationService(
    mockRepository,
    mockDatabaseService,
    mockCustomerArchiveAccessService,
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
    vi.mocked(mockDatabaseService.buildPagination).mockReturnValue({
      skip: 0,
      take: 20,
    } as never);
    vi.mocked(mockDatabaseService.calculatePaginationMeta).mockReturnValue({
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    } as never);
  });

  it('throws NotFoundException when the customer access check fails on the read path', async () => {
    vi.mocked(
      mockCustomerArchiveAccessService.requireCustomerArchiveAccess,
    ).mockRejectedValue(new NotFoundException());

    await expect(
      service.findByCustomer('customer-1', 'talent-1', {}, context),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns mapped membership rows with pagination and summary metadata', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findByCustomer).mockResolvedValue([
      {
        id: 'membership-1',
        platformCode: 'YOUTUBE',
        platformName: 'YouTube',
        classCode: 'STANDARD',
        className: 'Standard',
        typeCode: 'FANCLUB',
        typeName: 'Fan Club',
        levelCode: 'GOLD',
        levelName: 'Gold',
        levelRank: 3,
        levelColor: '#ffcc00',
        levelBadgeUrl: null,
        validFrom: new Date('2026-04-14T00:00:00.000Z'),
        validTo: null,
        autoRenew: false,
        isExpired: false,
        note: null,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
      },
    ]);
    vi.mocked(mockRepository.countByCustomer).mockResolvedValue(1);
    vi.mocked(mockRepository.countActiveByCustomer).mockResolvedValue(1);
    vi.mocked(mockRepository.countExpiredByCustomer).mockResolvedValue(0);

    await expect(
      service.findByCustomer('customer-1', 'talent-1', {}, context),
    ).resolves.toEqual({
      items: [
        {
          id: 'membership-1',
          platform: {
            code: 'YOUTUBE',
            name: 'YouTube',
          },
          membershipClass: {
            code: 'STANDARD',
            name: 'Standard',
          },
          membershipType: {
            code: 'FANCLUB',
            name: 'Fan Club',
          },
          membershipLevel: {
            code: 'GOLD',
            name: 'Gold',
            rank: 3,
            color: '#ffcc00',
            badgeUrl: null,
          },
          validFrom: new Date('2026-04-14T00:00:00.000Z'),
          validTo: null,
          autoRenew: false,
          isExpired: null,
          note: null,
          createdAt: new Date('2026-04-14T00:00:00.000Z'),
        },
      ],
      meta: {
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        },
        summary: {
          activeCount: 1,
          expiredCount: 0,
          totalCount: 1,
        },
      },
    });
  });

  it('throws NotFoundException when create cannot resolve the platform', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findActivePlatformByCode).mockResolvedValue(null);

    await expect(
      service.create(
        'customer-1',
        'talent-1',
        {
          platformCode: 'INVALID',
          membershipLevelCode: 'GOLD',
          validFrom: '2026-04-14T00:00:00.000Z',
        },
        context,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when create cannot resolve the membership level', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findActivePlatformByCode).mockResolvedValue({
      id: 'platform-1',
      code: 'YOUTUBE',
      displayName: 'YouTube',
    });
    vi.mocked(mockRepository.findActiveMembershipLevelByCode).mockResolvedValue(null);

    await expect(
      service.create(
        'customer-1',
        'talent-1',
        {
          platformCode: 'YOUTUBE',
          membershipLevelCode: 'INVALID',
          validFrom: '2026-04-14T00:00:00.000Z',
        },
        context,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates a membership record and writes the raw change-log payload', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findActivePlatformByCode).mockResolvedValue({
      id: 'platform-1',
      code: 'YOUTUBE',
      displayName: 'YouTube',
    });
    vi.mocked(mockRepository.findActiveMembershipLevelByCode).mockResolvedValue({
      id: 'level-1',
      code: 'GOLD',
      nameEn: 'Gold',
      membershipTypeId: 'type-1',
      membershipClassId: 'class-1',
    });
    vi.mocked(mockRepository.create).mockResolvedValue({
      id: 'membership-1',
      validFrom: new Date('2026-04-14T00:00:00.000Z'),
      validTo: null,
      autoRenew: false,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });
    vi.mocked(mockRepository.insertChangeLog).mockResolvedValue(1 as never);

    await expect(
      service.create(
        'customer-1',
        'talent-1',
        {
          platformCode: 'YOUTUBE',
          membershipLevelCode: 'GOLD',
          validFrom: '2026-04-14T00:00:00.000Z',
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'membership-1',
      platform: {
        code: 'YOUTUBE',
        name: 'YouTube',
      },
      membershipLevel: {
        code: 'GOLD',
        name: 'Gold',
      },
      validFrom: new Date('2026-04-14T00:00:00.000Z'),
      validTo: null,
      autoRenew: false,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });

    expect(mockRepository.insertChangeLog).toHaveBeenCalledWith('tenant_test', {
      action: 'create',
      objectId: 'membership-1',
      objectName: 'YOUTUBE:GOLD',
      diff: JSON.stringify({
        new: {
          platformCode: 'YOUTUBE',
          membershipLevelCode: 'GOLD',
          validFrom: '2026-04-14T00:00:00.000Z',
          validTo: undefined,
        },
      }),
      userId: 'user-1',
      ipAddress: '127.0.0.1',
    });
  });

  it('throws NotFoundException when update cannot resolve the record', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findOwnedRecord).mockResolvedValue(null);

    await expect(
      service.update(
        'customer-1',
        'record-1',
        'talent-1',
        {
          autoRenew: true,
        },
        context,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates the membership record and writes the raw change-log payload', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findOwnedRecord).mockResolvedValue({
      id: 'record-1',
      validTo: null,
      autoRenew: false,
      note: null,
      platformCode: 'YOUTUBE',
      levelCode: 'GOLD',
    });
    vi.mocked(mockRepository.update).mockResolvedValue({
      id: 'record-1',
      validTo: null,
      autoRenew: true,
      note: 'VIP',
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
    });
    vi.mocked(mockRepository.insertChangeLog).mockResolvedValue(1 as never);

    await expect(
      service.update(
        'customer-1',
        'record-1',
        'talent-1',
        {
          autoRenew: true,
          note: 'VIP',
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'record-1',
      validTo: null,
      autoRenew: true,
      note: 'VIP',
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
    });

    expect(mockRepository.insertChangeLog).toHaveBeenCalledWith('tenant_test', {
      action: 'update',
      objectId: 'record-1',
      objectName: 'YOUTUBE:GOLD',
      diff: JSON.stringify({
        old: {
          validTo: null,
          autoRenew: false,
          note: null,
        },
        new: {
          validTo: null,
          autoRenew: true,
          note: 'VIP',
        },
      }),
      userId: 'user-1',
      ipAddress: '127.0.0.1',
    });
  });

  it('returns null summary when the customer has no active membership', async () => {
    vi.mocked(mockRepository.findHighestActiveSummary).mockResolvedValue(null);
    vi.mocked(mockRepository.countActiveByCustomer).mockResolvedValue(0);
    vi.mocked(mockRepository.countTotalByCustomer).mockResolvedValue(0);

    await expect(
      service.getSummary('customer-1', context),
    ).resolves.toBeNull();
  });
});

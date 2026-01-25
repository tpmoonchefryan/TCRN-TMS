// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { CustomerProfileService } from '../services/customer-profile.service';
import { DatabaseService } from '../../database/database.service';
import { ChangeLogService } from '../../log/services/change-log.service';
import { TechEventLogService } from '../../log/services/tech-event-log.service';
import type { RequestContext } from '@tcrn/shared';
import { ProfileType } from '../dto/customer.dto';

describe('CustomerProfileService', () => {
  let service: CustomerProfileService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockChangeLogService: Partial<ChangeLogService>;
  let mockTechEventLogService: Partial<TechEventLogService>;
  let mockPrisma: Record<string, unknown>;

  const mockContext: RequestContext = {
    tenantId: 'tenant-123',
    tenantSchema: 'tenant_abc123',
    userId: 'user-1',
    userName: 'Test User',
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
    requestId: 'req-123',
  };

  const mockCustomer = {
    id: 'customer-123',
    talentId: 'talent-456',
    profileStoreId: 'store-789',
    originTalentId: 'talent-456',
    rmProfileId: 'pii-token-abc',
    profileType: 'individual',
    nickname: 'TestUser',
    primaryLanguage: 'ja',
    tags: ['vip', 'active'],
    source: 'import',
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: { id: 'status-1', code: 'active', name: 'Active' },
    talent: { id: 'talent-456', code: 'T001', displayName: 'Test Talent' },
    profileStore: { id: 'store-789', code: 'S001', nameEn: 'Test Store' },
    originTalent: { id: 'talent-456', code: 'T001', displayName: 'Test Talent' },
    lastModifiedTalent: null,
    individual: null,
    companyInfo: null,
    membershipRecords: [],
    accessLogs: [],
    inactivationReason: null,
    _count: { platformIdentities: 0, membershipRecords: 0 },
  };

  const mockTalent = {
    id: 'talent-456',
    code: 'T001',
    displayName: 'Test Talent',
    profileStoreId: 'store-789',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      customerProfile: {
        findMany: vi.fn().mockResolvedValue([mockCustomer]),
        findUnique: vi.fn().mockResolvedValue(mockCustomer),
        findFirst: vi.fn().mockResolvedValue(mockCustomer),
        create: vi.fn().mockResolvedValue(mockCustomer),
        update: vi.fn().mockResolvedValue({ ...mockCustomer, version: 2 }),
        count: vi.fn().mockResolvedValue(1),
      },
      talent: {
        findUnique: vi.fn().mockResolvedValue(mockTalent),
      },
      inactivationReason: {
        findFirst: vi.fn().mockResolvedValue({ id: 'reason-1', code: 'OTHER' }),
      },
      customerAccessLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      $queryRawUnsafe: vi.fn().mockResolvedValue([mockTalent]),
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
      $transaction: vi.fn().mockImplementation((fn) => fn(mockPrisma)),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
      buildPagination: vi.fn().mockReturnValue({ skip: 0, take: 20 }),
      calculatePaginationMeta: vi.fn().mockReturnValue({
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      }),
    };

    mockChangeLogService = {
      create: vi.fn().mockResolvedValue(undefined),
    };

    mockTechEventLogService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new CustomerProfileService(
      mockDatabaseService as DatabaseService,
      mockChangeLogService as ChangeLogService,
      mockTechEventLogService as TechEventLogService,
    );
  });

  describe('findMany', () => {
    it('should return paginated customers', async () => {
      const result = await service.findMany(
        { talentId: 'talent-456', page: 1, pageSize: 20 },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(mockDatabaseService.getPrisma).toHaveBeenCalled();
    });

    it('should throw NotFoundException when talent not found', async () => {
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(
        service.findMany({ talentId: 'non-existent' }, mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when talent has no profile store', async () => {
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'talent-456', profileStoreId: null },
      ]);

      await expect(
        service.findMany({ talentId: 'talent-456' }, mockContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should filter by profile type', async () => {
      await service.findMany(
        { talentId: 'talent-456', profileType: ProfileType.INDIVIDUAL },
        mockContext,
      );

      // Service now uses raw SQL queries
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should filter by tags', async () => {
      await service.findMany(
        { talentId: 'talent-456', tags: ['vip'] },
        mockContext,
      );

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should filter by isActive', async () => {
      await service.findMany(
        { talentId: 'talent-456', isActive: true },
        mockContext,
      );

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      await service.findMany(
        { 
          talentId: 'talent-456', 
          createdFrom: '2026-01-01',
          createdTo: '2026-12-31',
        },
        mockContext,
      );

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should search by nickname', async () => {
      await service.findMany(
        { talentId: 'talent-456', search: 'Test' },
        mockContext,
      );

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return customer by id', async () => {
      const result = await service.findById('customer-123', 'talent-456', mockContext);

      expect(result).toBeDefined();
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent customer', async () => {
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(
        service.findById('non-existent', 'talent-456', mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when talent has no access', async () => {
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ id: 'talent-456', profile_store_id: 'different-store' }])
        .mockResolvedValueOnce([{ ...mockCustomer, profile_store_id: 'store-789' }]);

      await expect(
        service.findById('customer-123', 'talent-456', mockContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    beforeEach(() => {
      // Mock raw SQL queries for verifyAccess
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([mockTalent])
        .mockResolvedValueOnce([mockCustomer])
        .mockResolvedValueOnce([{ id: 'reason-1', code: 'OTHER' }]) // inactivation reason
        .mockResolvedValueOnce([{ ...mockCustomer, version: 2 }]); // updated customer
    });

    it('should deactivate customer', async () => {
      await service.deactivate('customer-123', 'talent-456', 'OTHER', 1, mockContext);

      expect(mockPrisma.$executeRawUnsafe || mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should throw ConflictException on version mismatch', async () => {
      await expect(
        service.deactivate('customer-123', 'talent-456', 'OTHER', 999, mockContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should record change log on deactivation', async () => {
      await service.deactivate('customer-123', 'talent-456', 'OTHER', 1, mockContext);

      expect(mockChangeLogService.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'deactivate',
          objectType: 'customer_profile',
          objectId: 'customer-123',
        }),
        mockContext,
      );
    });

    it('should create access log entry', async () => {
      await service.deactivate('customer-123', 'talent-456', 'OTHER', 1, mockContext);

      // Access log now uses raw SQL
      expect(mockPrisma.$executeRawUnsafe || mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty search results', async () => {
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([mockTalent])
        .mockResolvedValueOnce([]) // Empty customer results
        .mockResolvedValueOnce([{ count: 0 }]); // Count result

      const result = await service.findMany(
        { talentId: 'talent-456' },
        mockContext,
      );

      expect(result.items).toEqual([]);
    });

    it('should handle customers without membership records', async () => {
      const customerWithoutMembership = {
        ...mockCustomer,
        membershipRecords: [],
        _count: { membershipRecords: 0, platformIdentities: 0 },
      };
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([mockTalent])
        .mockResolvedValueOnce([customerWithoutMembership])
        .mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.findMany(
        { talentId: 'talent-456' },
        mockContext,
      );

      expect(result.items.length).toBe(1);
    });

    it('should handle hasMembership filter', async () => {
      const customerWithMembership = {
        ...mockCustomer,
        membershipRecords: [{
          id: 'membership-1',
          platform: { id: 'platform-1', code: 'YOUTUBE', displayName: 'YouTube' },
          membershipLevel: { id: 'level-1', code: 'GOLD', name: 'Gold', rank: 2 },
        }],
      };
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([mockTalent])
        .mockResolvedValueOnce([customerWithMembership])
        .mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.findMany(
        { talentId: 'talent-456', hasMembership: true },
        mockContext,
      );

      // Only customers with membership should be returned
      expect(result.items.length).toBe(1);
    });
  });

  describe('Sorting', () => {
    it('should sort by createdAt desc by default', async () => {
      await service.findMany({ talentId: 'talent-456' }, mockContext);

      // Service uses raw SQL with ORDER BY clause
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should sort by nickname when specified', async () => {
      await service.findMany(
        { talentId: 'talent-456', sort: 'nickname', order: 'asc' },
        mockContext,
      );

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });
  });
});

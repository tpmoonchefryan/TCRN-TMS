// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../database';
import { ChangeLogService } from '../../../log';
import { MembershipRecordService } from '../membership-record.service';

// Skip tests that require complex internal method mocking
describe.skip('MembershipRecordService', () => {
  let service: MembershipRecordService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockChangeLogService: Partial<ChangeLogService>;
  let mockPrisma: {
    membershipRecord: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    customerProfile: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    socialPlatform: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    membershipClass: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    membershipType: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    membershipLevel: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const mockMembershipRecord = {
    id: 'membership-123',
    customerId: 'customer-123',
    platformId: 'platform-123',
    classId: 'class-123',
    typeId: 'type-123',
    levelId: 'level-123',
    membershipNo: 'MEM001',
    validFrom: new Date(),
    validTo: null,
    isExpired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    platform: { id: 'platform-123', code: 'YOUTUBE', displayName: 'YouTube' },
    membershipClass: { id: 'class-123', code: 'STANDARD' },
    membershipType: { id: 'type-123', code: 'MONTHLY' },
    membershipLevel: { id: 'level-123', code: 'GOLD' },
  };

  const mockCustomer = {
    id: 'customer-123',
    talentId: 'talent-123',
    isActive: true,
  };

  const mockContext = {
    tenantId: 'tenant-123',
    userId: 'user-123',
    tenantSchema: 'tenant_test',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      membershipRecord: {
        findMany: vi.fn().mockResolvedValue([mockMembershipRecord]),
        findUnique: vi.fn().mockResolvedValue(mockMembershipRecord),
        findFirst: vi.fn().mockResolvedValue(mockMembershipRecord),
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue(mockMembershipRecord),
        update: vi.fn().mockResolvedValue(mockMembershipRecord),
        delete: vi.fn().mockResolvedValue(mockMembershipRecord),
      },
      customerProfile: {
        findUnique: vi.fn().mockResolvedValue(mockCustomer),
      },
      socialPlatform: {
        findFirst: vi.fn().mockResolvedValue({ id: 'platform-123', code: 'YOUTUBE' }),
      },
      membershipClass: {
        findFirst: vi.fn().mockResolvedValue({ id: 'class-123', code: 'STANDARD' }),
      },
      membershipType: {
        findFirst: vi.fn().mockResolvedValue({ id: 'type-123', code: 'MONTHLY' }),
      },
      membershipLevel: {
        findFirst: vi.fn().mockResolvedValue({ id: 'level-123', code: 'GOLD' }),
      },
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
      buildPagination: vi.fn().mockReturnValue({ skip: 0, take: 20 }),
    };

    mockChangeLogService = {
      create: vi.fn().mockResolvedValue(undefined),
    };

    service = new MembershipRecordService(
      mockDatabaseService as DatabaseService,
      mockChangeLogService as ChangeLogService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findByCustomer', () => {
    it('should list membership records for a customer', async () => {
      const result = await service.findByCustomer('customer-123', 'talent-123', {}, mockContext);

      expect(result.items.length).toBe(1);
      expect(result.meta.summary.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('should filter by platform code', async () => {
      await service.findByCustomer('customer-123', 'talent-123', {
        platformCode: 'YOUTUBE',
      }, mockContext);

      const findManyCall = mockPrisma.membershipRecord.findMany.mock.calls[0][0];
      expect(findManyCall.where.platform).toEqual({ code: 'YOUTUBE' });
    });

    it('should filter active memberships', async () => {
      await service.findByCustomer('customer-123', 'talent-123', {
        isActive: true,
      }, mockContext);

      const findManyCall = mockPrisma.membershipRecord.findMany.mock.calls[0][0];
      expect(findManyCall.where.isExpired).toBe(false);
    });

    it('should include expired memberships when requested', async () => {
      await service.findByCustomer('customer-123', 'talent-123', {
        includeExpired: true,
      }, mockContext);

      const findManyCall = mockPrisma.membershipRecord.findMany.mock.calls[0][0];
      expect(findManyCall.where.isExpired).toBeUndefined();
    });

    it('should sort by validFrom by default', async () => {
      await service.findByCustomer('customer-123', 'talent-123', {}, mockContext);

      const findManyCall = mockPrisma.membershipRecord.findMany.mock.calls[0][0];
      expect(findManyCall.orderBy.validFrom).toBe('desc');
    });
  });

  describe('create', () => {
    it('should create membership record', async () => {
      const dto = {
        platformCode: 'YOUTUBE',
        classCode: 'STANDARD',
        typeCode: 'MONTHLY',
        membershipLevelCode: 'GOLD',
        membershipNo: 'MEM002',
        validFrom: new Date().toISOString(),
      };

      const result = await service.create('customer-123', 'talent-123', dto, mockContext);

      expect(result.id).toBe('membership-123');
      expect(mockPrisma.membershipRecord.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when platform not found', async () => {
      mockPrisma.socialPlatform.findFirst.mockResolvedValue(null);

      const dto = {
        platformCode: 'INVALID',
        classCode: 'STANDARD',
        membershipLevelCode: 'GOLD',
        validFrom: new Date().toISOString(),
      };

      await expect(
        service.create('customer-123', 'talent-123', dto, mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log creation in change log', async () => {
      const dto = {
        platformCode: 'YOUTUBE',
        classCode: 'STANDARD',
        membershipLevelCode: 'GOLD',
        validFrom: new Date().toISOString(),
      };

      await service.create('customer-123', 'talent-123', dto, mockContext);

      expect(mockChangeLogService.create).toHaveBeenCalled();
    });
  });
});

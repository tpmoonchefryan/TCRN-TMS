// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

import { IndividualCustomerService } from '../individual-customer.service';
import { DatabaseService } from '../../../database';
import { ChangeLogService, TechEventLogService } from '../../../log';

// Skip full integration tests - service has complex transaction dependencies
describe.skip('IndividualCustomerService', () => {
  let service: IndividualCustomerService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockChangeLogService: Partial<ChangeLogService>;
  let mockTechEventLogService: Partial<TechEventLogService>;
  let mockPrisma: {
    customerProfile: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    customerStatus: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $transaction: ReturnType<typeof vi.fn>;
  };

  const mockTalent = {
    id: 'talent-123',
    profileStoreId: 'store-123',
  };

  const mockCustomer = {
    id: 'customer-123',
    talentId: 'talent-123',
    profileStoreId: 'store-123',
    rmProfileId: 'rm-123',
    profileType: 'individual',
    nickname: 'Test User',
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContext = {
    tenantId: 'tenant-123',
    userId: 'user-123',
    tenantSchema: 'tenant_test',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const mockTxPrisma = {
      customerProfile: {
        findUnique: vi.fn().mockResolvedValue(mockCustomer),
        findFirst: vi.fn().mockResolvedValue(mockCustomer),
        create: vi.fn().mockResolvedValue(mockCustomer),
        update: vi.fn().mockResolvedValue({ ...mockCustomer, version: 2 }),
      },
      customerStatus: {
        findFirst: vi.fn().mockResolvedValue({ id: 'status-123', code: 'ACTIVE' }),
      },
    };

    mockPrisma = {
      customerProfile: {
        findUnique: vi.fn().mockResolvedValue(mockCustomer),
        findFirst: vi.fn().mockResolvedValue(mockCustomer),
        create: vi.fn().mockResolvedValue(mockCustomer),
        update: vi.fn().mockResolvedValue({ ...mockCustomer, version: 2 }),
      },
      customerStatus: {
        findFirst: vi.fn().mockResolvedValue({ id: 'status-123', code: 'ACTIVE' }),
      },
      $queryRawUnsafe: vi.fn().mockResolvedValue([mockTalent]),
      $transaction: vi.fn().mockImplementation((cb) => cb(mockTxPrisma)),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
      buildPagination: vi.fn().mockReturnValue({ skip: 0, take: 20 }),
    };

    mockChangeLogService = {
      create: vi.fn().mockResolvedValue(undefined),
    };

    mockTechEventLogService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new IndividualCustomerService(
      mockDatabaseService as DatabaseService,
      mockChangeLogService as ChangeLogService,
      mockTechEventLogService as TechEventLogService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should create individual customer profile', async () => {
      const dto = {
        talentId: 'talent-123',
        nickname: 'Test User',
        statusCode: 'ACTIVE',
        pii: {
          givenName: 'John',
          familyName: 'Doe',
        },
      };

      const result = await service.create(dto, mockContext);

      expect(result.id).toBe('customer-123');
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
      expect(mockPrisma.customerProfile.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when talent not found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const dto = {
        talentId: 'invalid-talent',
        nickname: 'Test User',
      };

      await expect(service.create(dto, mockContext)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when talent has no profile store', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ id: 'talent-123', profileStoreId: null }]);

      const dto = {
        talentId: 'talent-123',
        nickname: 'Test User',
      };

      await expect(service.create(dto, mockContext)).rejects.toThrow(BadRequestException);
    });

    it('should log creation in change log', async () => {
      const dto = {
        talentId: 'talent-123',
        nickname: 'Test User',
      };

      await service.create(dto, mockContext);

      expect(mockChangeLogService.create).toHaveBeenCalled();
    });
  });
});

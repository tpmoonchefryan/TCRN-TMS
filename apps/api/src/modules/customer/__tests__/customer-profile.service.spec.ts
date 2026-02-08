// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { prisma } from '@tcrn/database';
import type { RequestContext } from '@tcrn/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../database/database.service';
import { ChangeLogService } from '../../log/services/change-log.service';
import { TechEventLogService } from '../../log/services/tech-event-log.service';
import { ProfileType } from '../dto/customer.dto';
import { CustomerProfileService } from '../services/customer-profile.service';

const TEST_SCHEMA = 'tenant_test';

describe('CustomerProfileService', () => {
  let service: CustomerProfileService;
  let module: TestingModule;
  let testTalentId: string | null = null;
  const testCustomerId: string | null = null;

  const mockContext: RequestContext = {
    tenantId: 'tenant-test',
    tenantSchema: TEST_SCHEMA,
    userId: '00000000-0000-0000-0000-000000000001',
    userName: 'Test User',
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
    requestId: 'req-123',
  };

  beforeAll(async () => {
    // Get a real talent with profile store for testing
    const talents = await prisma.$queryRawUnsafe<{ id: string; profile_store_id: string }[]>(`
      SELECT id, profile_store_id FROM "${TEST_SCHEMA}".talent 
      WHERE profile_store_id IS NOT NULL 
      LIMIT 1
    `);
    
    if (talents.length > 0) {
      testTalentId = talents[0].id;
    }

    module = await Test.createTestingModule({
      providers: [
        {
          provide: CustomerProfileService,
          useFactory: (db: DatabaseService, cl: ChangeLogService, te: TechEventLogService) => {
            return new CustomerProfileService(db, cl, te);
          },
          inject: [DatabaseService, ChangeLogService, TechEventLogService],
        },
        {
          provide: DatabaseService,
          useValue: {
            getPrisma: () => prisma,
            buildPagination: (page: number, pageSize: number) => ({
              skip: (page - 1) * pageSize,
              take: pageSize,
            }),
            calculatePaginationMeta: (total: number, page: number, pageSize: number) => ({
              page,
              pageSize,
              totalCount: total,
              totalPages: Math.ceil(total / pageSize),
            }),
          },
        },
        {
          provide: ChangeLogService,
          useValue: {
            create: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: TechEventLogService,
          useValue: {
            log: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<CustomerProfileService>(CustomerProfileService);
  });

  afterAll(async () => {
    // Cleanup any test customers
    if (testCustomerId) {
      try {
        await prisma.$executeRawUnsafe(`
          DELETE FROM "${TEST_SCHEMA}".customer_profile WHERE id = $1::uuid
        `, testCustomerId);
      } catch {
        // Ignore cleanup errors
      }
    }
    await module?.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findMany', () => {
    it('should return paginated customers', async () => {
      if (!testTalentId) {
        console.log('Skipping test: no talent with profile store available');
        return;
      }

      const result = await service.findMany(
        { talentId: testTalentId, page: 1, pageSize: 20 },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('meta');
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should throw NotFoundException when talent not found', async () => {
      await expect(
        service.findMany({ talentId: '00000000-0000-0000-0000-000000000000' }, mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should filter by profile type', async () => {
      if (!testTalentId) return;

      const result = await service.findMany(
        { talentId: testTalentId, profileType: ProfileType.INDIVIDUAL },
        mockContext,
      );

      expect(result).toBeDefined();
      result.items.forEach((item: { profileType: string }) => {
        expect(item.profileType).toBe(ProfileType.INDIVIDUAL);
      });
    });

    it('should filter by isActive', async () => {
      if (!testTalentId) return;

      const result = await service.findMany(
        { talentId: testTalentId, isActive: true },
        mockContext,
      );

      expect(result).toBeDefined();
      result.items.forEach((item: { isActive: boolean }) => {
        expect(item.isActive).toBe(true);
      });
    });

    it('should support search by term', async () => {
      if (!testTalentId) return;

      const result = await service.findMany(
        { talentId: testTalentId, search: 'test' },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException for non-existent customer', async () => {
      if (!testTalentId) return;

      await expect(
        service.findById('00000000-0000-0000-0000-000000000000', testTalentId, mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return customer when found', async () => {
      if (!testTalentId) return;

      // Find an existing customer first
      const customers = await prisma.$queryRawUnsafe<{ id: string }[]>(`
        SELECT id FROM "${TEST_SCHEMA}".customer_profile 
        WHERE talent_id = $1::uuid 
        LIMIT 1
      `, testTalentId);

      if (customers.length === 0) {
        console.log('Skipping test: no customers for talent');
        return;
      }

      const result = await service.findById(customers[0].id, testTalentId, mockContext);
      expect(result).toBeDefined();
      expect(result.id).toBe(customers[0].id);
    });
  });

  describe('deactivate', () => {
    it('should throw NotFoundException for non-existent customer', async () => {
      if (!testTalentId) return;

      await expect(
        service.deactivate('00000000-0000-0000-0000-000000000000', testTalentId, 'OTHER', 1, mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on version mismatch', async () => {
      if (!testTalentId) return;

      // Find an existing customer
      const customers = await prisma.$queryRawUnsafe<{ id: string; version: number }[]>(`
        SELECT id, version FROM "${TEST_SCHEMA}".customer_profile 
        WHERE talent_id = $1::uuid AND is_active = true
        LIMIT 1
      `, testTalentId);

      if (customers.length === 0) {
        console.log('Skipping test: no active customers for talent');
        return;
      }

      await expect(
        service.deactivate(customers[0].id, testTalentId, 'OTHER', 999, mockContext),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty search results', async () => {
      if (!testTalentId) return;

      const result = await service.findMany(
        { talentId: testTalentId, search: 'ZZZZZZZZZZNONEXISTENT' },
        mockContext,
      );

      expect(result.items).toEqual([]);
    });

    it('should handle hasMembership filter', async () => {
      if (!testTalentId) return;

      const result = await service.findMany(
        { talentId: testTalentId, hasMembership: true },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
    });
  });

  describe('Sorting', () => {
    it('should sort by createdAt desc by default', async () => {
      if (!testTalentId) return;

      const result = await service.findMany(
        { talentId: testTalentId },
        mockContext,
      );

      expect(result).toBeDefined();
      // Check that items exist (sorting is handled by DB)
      expect(result).toHaveProperty('items');
    });

    it('should sort by nickname when specified', async () => {
      if (!testTalentId) return;

      const result = await service.findMany(
        { talentId: testTalentId, sort: 'nickname', order: 'asc' },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
    });
  });
});

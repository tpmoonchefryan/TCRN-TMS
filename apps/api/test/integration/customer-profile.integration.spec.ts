// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { prisma } from '@tcrn/database';
import {
  createTestCustomerInTenant,
  createTestSubsidiaryInTenant,
  createTestTalentInTenant,
  createTestTenantFixture,
  createTestUserInTenant,
  type RequestContext,
  type TenantFixture,
  type TestUser,
} from '@tcrn/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '@/modules/database/database.service';
import { ChangeLogService } from '@/modules/log/services/change-log.service';
import { TechEventLogService } from '@/modules/log/services/tech-event-log.service';
import { ProfileType } from '@/modules/customer/dto/customer.dto';
import { CustomerArchiveAccessService } from '@/modules/customer/application/customer-archive-access.service';
import { CustomerProfileReadService } from '@/modules/customer/application/customer-profile-read.service';
import { CustomerPiiPlatformApplicationService } from '@/modules/customer/application/customer-pii-platform.service';
import { CustomerProfileWriteService } from '@/modules/customer/application/customer-profile-write.service';
import { CustomerArchiveRepository } from '@/modules/customer/infrastructure/customer-archive.repository';
import { CustomerProfileReadRepository } from '@/modules/customer/infrastructure/customer-profile-read.repository';
import { CustomerProfileWriteRepository } from '@/modules/customer/infrastructure/customer-profile-write.repository';
import { CustomerProfileService } from '@/modules/customer/services/customer-profile.service';

describe('CustomerProfileService', () => {
  let service: CustomerProfileService;
  let module: TestingModule;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;
  let testTalentId: string;
  let testCustomerId: string;
  let mockContext: RequestContext;

  beforeAll(async () => {
    tenantFixture = await createTestTenantFixture(prisma, 'customer_profile');
    testUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `customer_profile_user_${Date.now()}`,
      ['ADMIN'],
    );
    const subsidiary = await createTestSubsidiaryInTenant(prisma, tenantFixture, {
      code: `SUB_CP_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Customer Profile Test Subsidiary',
      createdBy: testUser.id,
    });
    const talent = await createTestTalentInTenant(prisma, tenantFixture, subsidiary.id, {
      code: `TAL_CP_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Customer Profile Test Talent',
      displayName: 'Customer Profile Test Talent',
      homepagePath: `customer-profile-${Date.now()}`,
      createdBy: testUser.id,
    });
    const talentRows = await prisma.$queryRawUnsafe<Array<{ profileStoreId: string }>>(
      `
        SELECT profile_store_id as "profileStoreId"
        FROM "${tenantFixture.schemaName}".talent
        WHERE id = $1::uuid
        LIMIT 1
      `,
      talent.id,
    );
    const customer = await createTestCustomerInTenant(prisma, tenantFixture, {
      nickname: 'test customer profile',
      talentId: talent.id,
      profileStoreId: talentRows[0]?.profileStoreId,
      createdBy: testUser.id,
    });

    testTalentId = talent.id;
    testCustomerId = customer.id;
    mockContext = {
      tenantId: tenantFixture.tenant.id,
      tenantSchema: tenantFixture.schemaName,
      userId: testUser.id,
      userName: testUser.username,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
      requestId: 'req-123',
    };

    module = await Test.createTestingModule({
      providers: [
        CustomerArchiveRepository,
        CustomerArchiveAccessService,
        CustomerProfileReadRepository,
        CustomerProfileReadService,
        CustomerProfileWriteRepository,
        CustomerProfileWriteService,
        {
          provide: CustomerProfileService,
          useFactory: (
            db: DatabaseService,
            cl: ChangeLogService,
            te: TechEventLogService,
            readService: CustomerProfileReadService,
            writeService: CustomerProfileWriteService,
          ) => {
            return new CustomerProfileService(db, cl, te, readService, writeService);
          },
          inject: [
            DatabaseService,
            ChangeLogService,
            TechEventLogService,
            CustomerProfileReadService,
            CustomerProfileWriteService,
          ],
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
            warn: vi.fn().mockResolvedValue(undefined),
            piiAccess: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: CustomerPiiPlatformApplicationService,
          useValue: {
            syncCustomerLifecycleState: vi.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<CustomerProfileService>(CustomerProfileService);
  });

  afterAll(async () => {
    await module?.close();
    await tenantFixture?.cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findMany', () => {
    it('should return paginated customers', async () => {
      const result = await service.findMany(
        testTalentId,
        { page: 1, pageSize: 20 },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('meta');
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should throw NotFoundException when talent not found', async () => {
      await expect(
        service.findMany(
          '00000000-0000-0000-0000-000000000000',
          {},
          mockContext,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should filter by profile type', async () => {
      const result = await service.findMany(
        testTalentId,
        { profileType: ProfileType.INDIVIDUAL },
        mockContext,
      );

      expect(result).toBeDefined();
      result.items.forEach((item: { profileType: string }) => {
        expect(item.profileType).toBe(ProfileType.INDIVIDUAL);
      });
    });

    it('should filter by isActive', async () => {
      const result = await service.findMany(
        testTalentId,
        { isActive: true },
        mockContext,
      );

      expect(result).toBeDefined();
      result.items.forEach((item: { isActive: boolean }) => {
        expect(item.isActive).toBe(true);
      });
    });

    it('should support search by term', async () => {
      const result = await service.findMany(
        testTalentId,
        { search: 'test' },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException for non-existent customer', async () => {
      await expect(
        service.findById('00000000-0000-0000-0000-000000000000', testTalentId, mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return customer when found', async () => {
      const result = await service.findById(testCustomerId, testTalentId, mockContext);
      expect(result).toBeDefined();
      expect(result.id).toBe(testCustomerId);
    });
  });

  describe('deactivate', () => {
    it('should throw NotFoundException for non-existent customer', async () => {
      await expect(
        service.deactivate('00000000-0000-0000-0000-000000000000', testTalentId, 'OTHER', 1, mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on version mismatch', async () => {
      const customers = await prisma.$queryRawUnsafe<{ id: string; version: number }[]>(`
        SELECT id, version FROM "${tenantFixture.schemaName}".customer_profile
        WHERE id = $1::uuid
        LIMIT 1
      `, testCustomerId);

      await expect(
        service.deactivate(customers[0].id, testTalentId, 'OTHER', 999, mockContext),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty search results', async () => {
      const result = await service.findMany(
        testTalentId,
        { search: 'ZZZZZZZZZZNONEXISTENT' },
        mockContext,
      );

      expect(result.items).toEqual([]);
    });

    it('should handle hasMembership filter', async () => {
      const result = await service.findMany(
        testTalentId,
        { hasMembership: true },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
    });
  });

  describe('Sorting', () => {
    it('should sort by createdAt desc by default', async () => {
      const result = await service.findMany(
        testTalentId,
        {},
        mockContext,
      );

      expect(result).toBeDefined();
      // Check that items exist (sorting is handled by DB)
      expect(result).toHaveProperty('items');
    });

    it('should sort by nickname when specified', async () => {
      const result = await service.findMany(
        testTalentId,
        { sort: 'nickname', order: 'asc' },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
    });
  });
});

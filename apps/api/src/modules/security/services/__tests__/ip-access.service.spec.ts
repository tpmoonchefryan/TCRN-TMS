// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { prisma } from '@tcrn/database';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../database';
import { ChangeLogService } from '../../../log';
import { RedisService } from '../../../redis';
import { IpRuleScope, IpRuleType } from '../../dto/security.dto';
import { IpAccessService } from '../ip-access.service';

describe('IpAccessService', () => {
  let service: IpAccessService;
  let module: TestingModule;
  let createdRuleId: string | null = null;

  const mockContext = {
    tenantId: 'tenant-test',
    userId: '00000000-0000-0000-0000-000000000001',
    tenantSchema: 'tenant_test',
  };

  // Mock Redis service since we don't want real Redis in unit tests
  const mockRedisService = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        {
          provide: IpAccessService,
          useFactory: (db: DatabaseService, redis: RedisService, cl: ChangeLogService) => {
            const svc = new IpAccessService(db, redis, cl);
            // Skip onModuleInit to avoid loading rules from DB
            vi.spyOn(svc, 'onModuleInit').mockResolvedValue(undefined);
            return svc;
          },
          inject: [DatabaseService, RedisService, ChangeLogService],
        },
        {
          provide: DatabaseService,
          useValue: {
            getPrisma: () => prisma,
            buildPagination: (page: number, pageSize: number) => ({
              skip: (page - 1) * pageSize,
              take: pageSize,
            }),
          },
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ChangeLogService,
          useValue: {
            create: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<IpAccessService>(IpAccessService);
  });

  afterAll(async () => {
    // Cleanup any created rules
    if (createdRuleId) {
      try {
        await prisma.ipAccessRule.delete({ where: { id: createdRuleId } });
      } catch {
        // Ignore cleanup errors
      }
    }
    await module?.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAccess', () => {
    it('should return cached result if available', async () => {
      const cachedResult = { allowed: false, reason: 'Cached block' };
      mockRedisService.get.mockResolvedValueOnce(JSON.stringify(cachedResult));

      const result = await service.checkAccess('192.168.1.1', 'global');

      expect(result).toEqual(cachedResult);
    });

    it('should allow IP by default when no rules match', async () => {
      mockRedisService.get.mockResolvedValueOnce(null);
      
      const result = await service.checkAccess('10.0.0.1', 'global');

      expect(result.allowed).toBe(true);
    });
  });

  describe('findMany', () => {
    it('should list IP rules with pagination', async () => {
      const result = await service.findMany({ page: 1, pageSize: 20 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should filter by ruleType', async () => {
      const result = await service.findMany({ ruleType: IpRuleType.BLACKLIST });

      expect(result).toHaveProperty('items');
      result.items.forEach((item: { ruleType: string }) => {
        expect(item.ruleType).toBe(IpRuleType.BLACKLIST);
      });
    });

    it('should filter by scope', async () => {
      const result = await service.findMany({ scope: IpRuleScope.ADMIN });

      expect(result).toHaveProperty('items');
      result.items.forEach((item: { scope: string }) => {
        expect(item.scope).toBe(IpRuleScope.ADMIN);
      });
    });

    it('should filter by isActive', async () => {
      const result = await service.findMany({ isActive: true });

      expect(result).toHaveProperty('items');
      result.items.forEach((item: { isActive: boolean }) => {
        expect(item.isActive).toBe(true);
      });
    });
  });

  describe('addRule', () => {
    it('should create new IP rule', async () => {
      const dto = {
        ruleType: IpRuleType.BLACKLIST,
        ipPattern: '192.168.100.1',
        scope: IpRuleScope.GLOBAL,
        reason: 'Integration test block',
      };

      const result = await service.addRule(dto, mockContext);
      createdRuleId = result.id; // Save for cleanup

      expect(result).toHaveProperty('id');
      expect(result.ipPattern).toBe('192.168.100.1');
      expect(result.ruleType).toBe(IpRuleType.BLACKLIST);
    });

    it('should reject invalid IP pattern', async () => {
      const dto = {
        ruleType: IpRuleType.BLACKLIST,
        ipPattern: 'invalid-ip',
        scope: IpRuleScope.GLOBAL,
      };

      await expect(service.addRule(dto, mockContext)).rejects.toThrow(BadRequestException);
    });

    it('should accept valid CIDR notation', async () => {
      const dto = {
        ruleType: IpRuleType.BLACKLIST,
        ipPattern: '192.168.200.0/24',
        scope: IpRuleScope.GLOBAL,
      };

      const result = await service.addRule(dto, mockContext);

      // Cleanup immediately
      if (result.id) {
        await prisma.ipAccessRule.delete({ where: { id: result.id } });
      }

      expect(result).toHaveProperty('id');
      expect(result.ipPattern).toBe('192.168.200.0/24');
    });

    it('should reject invalid CIDR prefix', async () => {
      const dto = {
        ruleType: IpRuleType.BLACKLIST,
        ipPattern: '192.168.0.0/33',
        scope: IpRuleScope.GLOBAL,
      };

      await expect(service.addRule(dto, mockContext)).rejects.toThrow(BadRequestException);
    });

    it('should reject IP octets > 255', async () => {
      const dto = {
        ruleType: IpRuleType.BLACKLIST,
        ipPattern: '256.0.0.1',
        scope: IpRuleScope.GLOBAL,
      };

      await expect(service.addRule(dto, mockContext)).rejects.toThrow(BadRequestException);
    });

    it('should clear access cache after adding rule', async () => {
      const dto = {
        ruleType: IpRuleType.BLACKLIST,
        ipPattern: '10.0.100.1',
        scope: IpRuleScope.GLOBAL,
      };

      mockRedisService.keys.mockResolvedValueOnce(['ip_access:global:10.0.100.1']);

      const result = await service.addRule(dto, mockContext);

      // Cleanup
      if (result.id) {
        await prisma.ipAccessRule.delete({ where: { id: result.id } });
      }

      expect(mockRedisService.del).toHaveBeenCalled();
    });
  });

  describe('removeRule', () => {
    it('should deactivate existing rule', async () => {
      // First create a rule
      const createDto = {
        ruleType: IpRuleType.BLACKLIST,
        ipPattern: '192.168.50.1',
        scope: IpRuleScope.GLOBAL,
        reason: 'Test for removal',
      };
      const created = await service.addRule(createDto, mockContext);

      try {
        const result = await service.removeRule(created.id, mockContext);

        expect(result.id).toBe(created.id);
        expect(result.deleted).toBe(true);
      } finally {
        // Hard delete for cleanup
        await prisma.ipAccessRule.delete({ where: { id: created.id } });
      }
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      await expect(
        service.removeRule('00000000-0000-0000-0000-000000000000', mockContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cleanupExpiredRules', () => {
    it('should deactivate expired rules', async () => {
      // Create an expired rule
      const expiredRule = await prisma.ipAccessRule.create({
        data: {
          ruleType: IpRuleType.BLACKLIST,
          ipPattern: '192.168.99.1',
          scope: IpRuleScope.GLOBAL,
          expiresAt: new Date(Date.now() - 86400000), // 1 day ago
          isActive: true,
          hitCount: 0,
          source: 'test',
          createdBy: mockContext.userId,
        },
      });

      try {
        await service.cleanupExpiredRules();

        // Verify it was deactivated
        const updated = await prisma.ipAccessRule.findUnique({
          where: { id: expiredRule.id },
        });

        expect(updated?.isActive).toBe(false);
      } finally {
        // Cleanup
        await prisma.ipAccessRule.delete({ where: { id: expiredRule.id } });
      }
    });
  });
});

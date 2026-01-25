// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { IpAccessService } from '../ip-access.service';
import { DatabaseService } from '../../../database';
import { RedisService } from '../../../redis';
import { ChangeLogService } from '../../../log';
import { IpRuleType, IpRuleScope } from '../../dto/security.dto';

describe('IpAccessService', () => {
  let service: IpAccessService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockRedisService: Partial<RedisService>;
  let mockChangeLogService: Partial<ChangeLogService>;
  let mockPrisma: {
    ipAccessRule: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const mockRule = {
    id: 'rule-123',
    ruleType: IpRuleType.BLACKLIST,
    ipPattern: '192.168.1.100',
    scope: IpRuleScope.GLOBAL,
    reason: 'Test block',
    source: 'manual',
    expiresAt: null,
    hitCount: 0,
    lastHitAt: null,
    isActive: true,
    createdAt: new Date(),
    createdBy: 'user-123',
  };

  const mockContext = {
    tenantId: 'tenant-123',
    userId: 'user-123',
    tenantSchema: 'tenant_test',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      ipAccessRule: {
        findMany: vi.fn().mockResolvedValue([mockRule]),
        findUnique: vi.fn().mockResolvedValue(mockRule),
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue(mockRule),
        update: vi.fn().mockResolvedValue(mockRule),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
      buildPagination: vi.fn().mockReturnValue({ skip: 0, take: 20 }),
    };

    mockRedisService = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockResolvedValue([]),
    };

    mockChangeLogService = {
      create: vi.fn().mockResolvedValue(undefined),
    };

    service = new IpAccessService(
      mockDatabaseService as DatabaseService,
      mockRedisService as RedisService,
      mockChangeLogService as ChangeLogService,
    );

    // Skip onModuleInit to avoid loading rules
    vi.spyOn(service, 'onModuleInit').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkAccess', () => {
    it('should return cached result if available', async () => {
      const cachedResult = { allowed: false, reason: 'Cached block' };
      (mockRedisService.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify(cachedResult),
      );

      const result = await service.checkAccess('192.168.1.1', 'global');

      expect(result).toEqual(cachedResult);
    });

    it('should allow IP by default when no rules match', async () => {
      const result = await service.checkAccess('10.0.0.1', 'global');

      expect(result.allowed).toBe(true);
    });
  });

  describe('findMany', () => {
    it('should list IP rules with pagination', async () => {
      const result = await service.findMany({ page: 1, pageSize: 20 });

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.ipAccessRule.findMany).toHaveBeenCalled();
    });

    it('should filter by ruleType', async () => {
      await service.findMany({ ruleType: IpRuleType.BLACKLIST });

      const findManyCall = mockPrisma.ipAccessRule.findMany.mock.calls[0][0];
      expect(findManyCall.where.ruleType).toBe(IpRuleType.BLACKLIST);
    });

    it('should filter by scope', async () => {
      await service.findMany({ scope: IpRuleScope.ADMIN });

      const findManyCall = mockPrisma.ipAccessRule.findMany.mock.calls[0][0];
      expect(findManyCall.where.scope).toBe(IpRuleScope.ADMIN);
    });

    it('should filter by isActive', async () => {
      await service.findMany({ isActive: true });

      const findManyCall = mockPrisma.ipAccessRule.findMany.mock.calls[0][0];
      expect(findManyCall.where.isActive).toBe(true);
    });
  });

  describe('addRule', () => {
    it('should create new IP rule', async () => {
      const dto = {
        ruleType: IpRuleType.BLACKLIST,
        ipPattern: '10.0.0.1',
        scope: IpRuleScope.GLOBAL,
        reason: 'Test block',
      };

      const result = await service.addRule(dto, mockContext);

      expect(result.ipPattern).toBe('192.168.1.100'); // Mock returns mockRule
      expect(mockPrisma.ipAccessRule.create).toHaveBeenCalled();
      expect(mockChangeLogService.create).toHaveBeenCalled();
    });

    it('should reject invalid IP pattern', async () => {
      const dto = {
        ruleType: IpRuleType.BLACKLIST,
        ipPattern: 'invalid-ip',
        scope: IpRuleScope.GLOBAL,
      };

      await expect(service.addRule(dto, mockContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept valid CIDR notation', async () => {
      const dto = {
        ruleType: IpRuleType.BLACKLIST,
        ipPattern: '192.168.0.0/24',
        scope: IpRuleScope.GLOBAL,
      };

      await expect(service.addRule(dto, mockContext)).resolves.toBeDefined();
    });

    it('should reject invalid CIDR prefix', async () => {
      const dto = {
        ruleType: IpRuleType.BLACKLIST,
        ipPattern: '192.168.0.0/33',
        scope: IpRuleScope.GLOBAL,
      };

      await expect(service.addRule(dto, mockContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject IP octets > 255', async () => {
      const dto = {
        ruleType: IpRuleType.BLACKLIST,
        ipPattern: '256.0.0.1',
        scope: IpRuleScope.GLOBAL,
      };

      await expect(service.addRule(dto, mockContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should clear access cache after adding rule', async () => {
      const dto = {
        ruleType: IpRuleType.BLACKLIST,
        ipPattern: '10.0.0.1',
        scope: IpRuleScope.GLOBAL,
      };

      (mockRedisService.keys as ReturnType<typeof vi.fn>).mockResolvedValue([
        'ip_access:global:10.0.0.1',
      ]);

      await service.addRule(dto, mockContext);

      expect(mockRedisService.del).toHaveBeenCalled();
    });
  });

  describe('removeRule', () => {
    it('should deactivate existing rule', async () => {
      const result = await service.removeRule('rule-123', mockContext);

      expect(result.id).toBe('rule-123');
      expect(result.deleted).toBe(true);
      expect(mockPrisma.ipAccessRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      mockPrisma.ipAccessRule.findUnique.mockResolvedValue(null);

      await expect(service.removeRule('invalid-id', mockContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should log change when removing rule', async () => {
      await service.removeRule('rule-123', mockContext);

      expect(mockChangeLogService.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'delete',
          objectType: 'ip_access_rule',
          objectId: 'rule-123',
        }),
        mockContext,
      );
    });
  });

  describe('cleanupExpiredRules', () => {
    it('should deactivate expired rules', async () => {
      await service.cleanupExpiredRules();

      expect(mockPrisma.ipAccessRule.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true,
          expiresAt: expect.any(Object),
        }),
        data: { isActive: false },
      });
    });
  });
});

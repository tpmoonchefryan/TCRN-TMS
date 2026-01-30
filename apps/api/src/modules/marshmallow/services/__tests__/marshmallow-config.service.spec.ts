// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../database';
import { ChangeLogService } from '../../../log';
import { MarshmallowConfigService } from '../marshmallow-config.service';

describe('MarshmallowConfigService', () => {
  let service: MarshmallowConfigService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockChangeLogService: Partial<ChangeLogService>;
  let mockConfigService: Partial<ConfigService>;
  let mockPrisma: {
    marshmallowConfig: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
  };

  const mockConfig = {
    id: 'config-123',
    talentId: 'talent-123',
    isEnabled: true,
    captchaMode: 'auto',
    hourlyLimit: 10,
    dailyLimit: 100,
    profanityFilterEnabled: true,
    externalBlocklistEnabled: true,
    autoReplyEnabled: false,
    welcomeMessage: 'Welcome!',
    thankYouMessage: 'Thank you!',
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

    mockPrisma = {
      marshmallowConfig: {
        findUnique: vi.fn().mockResolvedValue(mockConfig),
        upsert: vi.fn().mockResolvedValue(mockConfig),
      },
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
      $queryRawUnsafe: vi.fn(),
      $executeRawUnsafe: vi.fn(),
    };
    
    // Default behavior for queryRawUnsafe: return mockConfig (as an array)
    // This covers the "get config" case which is usually the first call
    // However, since it is called multiple times with different schemas, we might need to be smarter.
    // For now, let's make it return [mockConfig] by default for simple tests.
    mockPrisma.$queryRawUnsafe.mockResolvedValue([mockConfig]);

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    mockChangeLogService = {
      create: vi.fn().mockResolvedValue(undefined),
      createDirect: vi.fn().mockResolvedValue(undefined),
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue('http://localhost:3000'),
    };

    service = new MarshmallowConfigService(
      mockDatabaseService as DatabaseService,
      mockChangeLogService as ChangeLogService,
      mockConfigService as ConfigService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getOrCreate', () => {
    it('should return config for a talent', async () => {
      const result = await service.getOrCreate('talent-123', 'tenant_test');

      expect(result.isEnabled).toBe(true);
      expect(result.captchaMode).toBe('auto');
    });

    it('should return default config when none exists', async () => {
      // 1. Get config -> empty
      // 2. Get talent -> found
      // 3. Insert -> returns created config
      // 4. Get stats -> returns stats
      // 5. Get talent (url) -> returns talent path
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([]) // Config not found
        .mockResolvedValueOnce([{ id: 'talent-123', settings: {} }]) // Talent found
        .mockResolvedValueOnce([mockConfig]) // Insert return
        .mockResolvedValueOnce([{ total: 0n, pending: 0n, approved: 0n, rejected: 0n, unread: 0n }]) // Stats
        .mockResolvedValueOnce([{ homepagePath: 'test' }]); // Talent URL

      const result = await service.getOrCreate('talent-123', 'tenant_test');

      expect(result).toHaveProperty('isEnabled');
      expect(result).toHaveProperty('captchaMode');
    });
  });

  describe('update', () => {
    it('should update config settings', async () => {
      const dto = {
        version: 1,
        isEnabled: false,
      };

      // Mock sequence for update:
      // 1. Get config -> found
      // 2. Update config -> result (void/count) or ignored
      // 3. Log change -> result
      // 4. getOrCreate -> calls...
      //    4.1 Get config -> found (updated)
      //    4.2 Get stats
      //    4.3 Get talent URL
      
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockConfig]) // Get current
        .mockResolvedValueOnce([mockConfig]) // getOrCreate: Get config
        .mockResolvedValueOnce([{ total: 0n }]) // getOrCreate: Stats
        .mockResolvedValueOnce([{ homepagePath: 'test' }]); // getOrCreate: Talent URL

      const _result = await service.update('talent-123', 'tenant_test', dto, mockContext);

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('should log config changes', async () => {
      const dto = {
        version: 1,
        isEnabled: false,
      };

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockConfig]) // Get current
        .mockResolvedValueOnce([mockConfig]) // getOrCreate: Get config
        .mockResolvedValueOnce([{ total: 0n }]) // getOrCreate: Stats
        .mockResolvedValueOnce([{ homepagePath: 'test' }]); // getOrCreate: Talent URL

      await service.update('talent-123', 'tenant_test', dto, mockContext);

      expect(mockChangeLogService.createDirect).toHaveBeenCalled();
    });
  });

  describe('validateTalentAccess', () => {
    it('should pass for valid talent', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ id: 'talent-123' }]);

      // This is tested implicitly through getOrCreate
      const result = await service.getOrCreate('talent-123', 'tenant_test');

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException for invalid talent', async () => {
      // 1. Get config -> empty
      // 2. Get talent -> empty (not found)
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await expect(service.getOrCreate('invalid-talent', 'tenant_test'))
        .rejects.toThrow(NotFoundException);
    });
  });
});

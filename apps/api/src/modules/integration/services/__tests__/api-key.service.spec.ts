// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { ApiKeyService } from '../api-key.service';
import { DatabaseService } from '../../../database';
import { ChangeLogService, TechEventLogService } from '../../../log';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockChangeLogService: Partial<ChangeLogService>;
  let mockTechEventLogService: Partial<TechEventLogService>;
  let mockPrisma: {
    consumer: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const mockConsumer = {
    id: 'consumer-123',
    code: 'TEST_CONSUMER',
    nameEn: 'Test Consumer',
    apiKeyHash: 'hashed_key',
    apiKeyPrefix: 'tcrn_xxxx',
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
      consumer: {
        findFirst: vi.fn().mockResolvedValue(mockConsumer),
        findUnique: vi.fn().mockResolvedValue(mockConsumer),
        update: vi.fn().mockResolvedValue(mockConsumer),
      },
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    mockChangeLogService = {
      create: vi.fn().mockResolvedValue(undefined),
    };

    mockTechEventLogService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new ApiKeyService(
      mockDatabaseService as DatabaseService,
      mockChangeLogService as ChangeLogService,
      mockTechEventLogService as TechEventLogService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateApiKey', () => {
    it('should generate API key with correct format', () => {
      const result = service.generateApiKey();

      expect(result.key).toMatch(/^tcrn_[a-f0-9]+$/);
      expect(result.prefix).toMatch(/^tcrn_/);
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique keys', () => {
      const key1 = service.generateApiKey();
      const key2 = service.generateApiKey();

      expect(key1.key).not.toBe(key2.key);
      expect(key1.hash).not.toBe(key2.hash);
    });
  });

  describe('hashApiKey', () => {
    it('should hash API key consistently', () => {
      const key = 'tcrn_test123456789';

      const hash1 = service.hashApiKey(key);
      const hash2 = service.hashApiKey(key);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different keys', () => {
      const hash1 = service.hashApiKey('tcrn_key1');
      const hash2 = service.hashApiKey('tcrn_key2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validateApiKey', () => {
    it('should return null for invalid prefix', async () => {
      const result = await service.validateApiKey('invalid_key');

      expect(result).toBeNull();
    });

    it('should return consumer for valid key', async () => {
      const result = await service.validateApiKey('tcrn_validkey123');

      expect(result?.id).toBe('consumer-123');
    });

    it('should return null when consumer not found', async () => {
      mockPrisma.consumer.findFirst.mockResolvedValue(null);

      const result = await service.validateApiKey('tcrn_unknownkey');

      expect(result).toBeNull();
    });
  });

  describe('regenerateKey', () => {
    it('should regenerate API key for existing consumer', async () => {
      const result = await service.regenerateKey('consumer-123', mockContext);

      expect(result).toBeDefined();
      expect(mockPrisma.consumer.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent consumer', async () => {
      mockPrisma.consumer.findUnique.mockResolvedValue(null);

      await expect(
        service.regenerateKey('invalid-consumer', mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log key regeneration', async () => {
      await service.regenerateKey('consumer-123', mockContext);

      expect(mockTechEventLogService.log).toHaveBeenCalled();
      expect(mockChangeLogService.create).toHaveBeenCalled();
    });
  });
});

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../database';
import { ChangeLogService, TechEventLogService } from '../../../log';
import { ApiKeyService } from '../api-key.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockChangeLogService: Partial<ChangeLogService>;
  let mockTechEventLogService: Partial<TechEventLogService>;
  let mockPrisma: {
    consumer: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $transaction: ReturnType<typeof vi.fn>;
  };

  const mockValidatedConsumer = {
    id: 'consumer-123',
    code: 'TEST_CONSUMER',
    allowedIps: ['10.0.0.1'],
    tenantId: 'tenant-123',
    tenantSchema: 'tenant_test',
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
        findUnique: vi.fn().mockResolvedValue({
          id: 'consumer-123',
          code: 'TEST_CONSUMER',
        }),
        update: vi.fn().mockResolvedValue(undefined),
      },
      $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
      $queryRawUnsafe: vi.fn(),
      $transaction: vi.fn().mockImplementation((callback) => callback(mockPrisma)),
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

    it('should return consumer for valid key with explicit tenant schema', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockValidatedConsumer]);

      const result = await service.validateApiKey('tcrn_validkey123', 'tenant_test');

      expect(result).toEqual(mockValidatedConsumer);
    });

    it('should return null when consumer is not found across active tenants', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ schemaName: 'tenant_test' }])
        .mockResolvedValueOnce([]);

      const result = await service.validateApiKey('tcrn_unknownkey');

      expect(result).toBeNull();
    });
  });

  describe('regenerateKey', () => {
    it('should regenerate API key for existing consumer in tenant schema', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { id: 'consumer-123', code: 'TEST_CONSUMER' },
      ]);

      const result = await service.regenerateKey('consumer-123', mockContext);

      expect(result).toBeDefined();
      expect(result.apiKey.startsWith('tcrn_')).toBe(true);
      expect(result.apiKeyPrefix).toHaveLength(8);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('should fall back to prisma consumer mutation without tenant schema', async () => {
      const result = await service.regenerateKey('consumer-123', {
        userId: 'user-123',
      });

      expect(result.apiKey.startsWith('tcrn_')).toBe(true);
      expect(mockPrisma.consumer.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent tenant consumer', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.regenerateKey('invalid-consumer', mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log key regeneration', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { id: 'consumer-123', code: 'TEST_CONSUMER' },
      ]);

      await service.regenerateKey('consumer-123', mockContext);

      expect(mockTechEventLogService.log).toHaveBeenCalled();
      expect(mockChangeLogService.create).toHaveBeenCalled();
    });
  });
});

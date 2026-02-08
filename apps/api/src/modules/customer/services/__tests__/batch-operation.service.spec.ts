// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException } from '@nestjs/common';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../database';
import { BatchAction } from '../../dto/customer.dto';
import { BatchOperationService } from '../batch-operation.service';

describe('BatchOperationService', () => {
  let service: BatchOperationService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockBatchQueue: { add: ReturnType<typeof vi.fn> };
  let mockPrisma: {
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
  };

  const mockContext = {
    tenantId: 'tenant-123',
    userId: 'user-123',
    tenantSchema: 'tenant_test',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([{ id: 'customer-123' }]),
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    mockBatchQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    };

    service = new BatchOperationService(
      mockDatabaseService as DatabaseService,
      mockBatchQueue as any,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeBatch', () => {
    it('should throw BadRequestException for empty customerIds', async () => {
      const dto = {
        customerIds: [],
        action: BatchAction.DEACTIVATE,
      };

      await expect(service.executeBatch('talent-123', dto, mockContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when batch exceeds max size', async () => {
      const dto = {
        customerIds: Array(5001).fill('customer-id'),
        action: BatchAction.DEACTIVATE,
      };

      await expect(service.executeBatch('talent-123', dto, mockContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should execute synchronously for small batches (<=50)', async () => {
      const dto = {
        customerIds: ['customer-1', 'customer-2'],
        action: BatchAction.DEACTIVATE,
        reason: 'Test deactivation',
      };

      const result = await service.executeBatch('talent-123', dto, mockContext);

      expect(result).toHaveProperty('total', 2);
      expect(result).toHaveProperty('success');
      expect(mockBatchQueue.add).not.toHaveBeenCalled();
    });

    it('should queue async for large batches (>50)', async () => {
      const dto = {
        customerIds: Array(51).fill('customer-id'),
        action: BatchAction.DEACTIVATE,
      };

      const result = await service.executeBatch('talent-123', dto, mockContext);

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('message');
      expect(mockBatchQueue.add).toHaveBeenCalled();
    });

    it('should handle DEACTIVATE action', async () => {
      const dto = {
        customerIds: ['customer-1'],
        action: BatchAction.DEACTIVATE,
        reason: 'Test',
      };

      const result = await service.executeBatch('talent-123', dto, mockContext);

      expect(result).toHaveProperty('success');
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('should handle REACTIVATE action', async () => {
      const dto = {
        customerIds: ['customer-1'],
        action: BatchAction.REACTIVATE,
      };

      const result = await service.executeBatch('talent-123', dto, mockContext);

      expect(result).toHaveProperty('success');
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('should throw BadRequestException for ADD_TAGS without tags', async () => {
      const dto = {
        customerIds: ['customer-1'],
        action: BatchAction.ADD_TAGS,
      };

      // The operation will be attempted and fail for each customer
      const result = await service.executeBatch('talent-123', dto, mockContext);
      
      expect(result).toHaveProperty('failed');
    });

    it('should handle ADD_TAGS action with tags', async () => {
      const dto = {
        customerIds: ['customer-1'],
        action: BatchAction.ADD_TAGS,
        tags: ['tag1', 'tag2'],
      };

      const result = await service.executeBatch('talent-123', dto, mockContext);

      expect(result).toHaveProperty('success');
    });

    it('should handle REMOVE_TAGS action', async () => {
      const dto = {
        customerIds: ['customer-1'],
        action: BatchAction.REMOVE_TAGS,
        tags: ['tag1'],
      };

      const result = await service.executeBatch('talent-123', dto, mockContext);

      expect(result).toHaveProperty('success');
    });

    it('should collect errors for failed operations', async () => {
      mockPrisma.$executeRawUnsafe.mockRejectedValue(new Error('DB Error'));

      const dto = {
        customerIds: ['customer-1', 'customer-2'],
        action: BatchAction.DEACTIVATE,
      };

      const result = await service.executeBatch('talent-123', dto, mockContext);

      expect(result).toHaveProperty('failed', 2);
      expect(result).toHaveProperty('errors');
    });
  });
});

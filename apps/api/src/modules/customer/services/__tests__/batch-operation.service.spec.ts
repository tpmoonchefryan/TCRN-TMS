// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BatchOperationApplicationService } from '../../application/batch-operation.service';
import { BatchAction } from '../../dto/customer.dto';
import { BatchOperationService } from '../batch-operation.service';

describe('BatchOperationService', () => {
  let service: BatchOperationService;

  const mockApplicationService = {
    executeBatch: vi.fn(),
  };

  const mockContext = {
    tenantId: 'tenant-123',
    userId: 'user-123',
    tenantSchema: 'tenant_test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BatchOperationService(
      mockApplicationService as unknown as BatchOperationApplicationService,
    );
  });

  it('delegates synchronous batch execution to the layered application service', async () => {
    mockApplicationService.executeBatch.mockResolvedValue({
      total: 2,
      success: 2,
      failed: 0,
      errors: [],
    });

    await expect(
      service.executeBatch(
        'talent-123',
        {
          customerIds: ['customer-1', 'customer-2'],
          action: BatchAction.DEACTIVATE,
        },
        mockContext,
      ),
    ).resolves.toEqual({
      total: 2,
      success: 2,
      failed: 0,
      errors: [],
    });
  });

  it('keeps queued async responses available through the compatibility facade', async () => {
    mockApplicationService.executeBatch.mockResolvedValue({
      jobId: 'job-123',
      message: 'Batch operation queued for 51 customers. Check job status for progress.',
    });

    await expect(
      service.executeBatch(
        'talent-123',
        {
          customerIds: Array(51).fill('customer-id'),
          action: BatchAction.DEACTIVATE,
        },
        mockContext,
      ),
    ).resolves.toEqual({
      jobId: 'job-123',
      message: 'Batch operation queued for 51 customers. Check job status for progress.',
    });
  });
});

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BatchAction } from '../dto/customer.dto';
import { BatchOperationQueueGateway } from '../infrastructure/batch-operation.queue';
import { BatchOperationRepository } from '../infrastructure/batch-operation.repository';
import { BatchOperationApplicationService } from './batch-operation.service';

describe('BatchOperationApplicationService', () => {
  let service: BatchOperationApplicationService;

  const mockRepository = {
    deactivateCustomer: vi.fn(),
    reactivateCustomer: vi.fn(),
    getCustomerTags: vi.fn(),
    updateCustomerTags: vi.fn(),
    findActiveMembershipId: vi.fn(),
    findMembershipClassIdByCode: vi.fn(),
    createMembershipRecord: vi.fn(),
    updateMembershipRecordValidity: vi.fn(),
  };

  const mockQueueGateway = {
    enqueue: vi.fn(),
  };

  const mockContext = {
    tenantId: 'tenant-123',
    userId: 'user-123',
    tenantSchema: 'tenant_test',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new BatchOperationApplicationService(
      mockRepository as unknown as BatchOperationRepository,
      mockQueueGateway as unknown as BatchOperationQueueGateway,
    );
  });

  it('throws for an empty customer list', async () => {
    await expect(
      service.executeBatch(
        'talent-123',
        {
          customerIds: [],
          action: BatchAction.DEACTIVATE,
        },
        mockContext,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('queues async execution when the batch exceeds the sync threshold', async () => {
    mockQueueGateway.enqueue.mockResolvedValue('job-123');

    const result = await service.executeBatch(
      'talent-123',
      {
        customerIds: Array(51).fill('customer-id'),
        action: BatchAction.DEACTIVATE,
      },
      mockContext,
    );

    expect(result).toEqual({
      jobId: 'job-123',
      message: 'Batch operation queued for 51 customers. Check job status for progress.',
    });
    expect(mockQueueGateway.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        talentId: 'talent-123',
        action: BatchAction.DEACTIVATE,
        customerIds: Array(51).fill('customer-id'),
      }),
    );
  });

  it('executes synchronous deactivate operations through the repository', async () => {
    const result = await service.executeBatch(
      'talent-123',
      {
        customerIds: ['customer-1', 'customer-2'],
        action: BatchAction.DEACTIVATE,
      },
      mockContext,
    );

    expect(result).toMatchObject({
      total: 2,
      success: 2,
      failed: 0,
    });
    expect(mockRepository.deactivateCustomer).toHaveBeenCalledTimes(2);
    expect(mockQueueGateway.enqueue).not.toHaveBeenCalled();
  });

  it('merges customer tags for add-tags operations', async () => {
    mockRepository.getCustomerTags.mockResolvedValue(['vip']);

    const result = await service.executeBatch(
      'talent-123',
      {
        customerIds: ['customer-1'],
        action: BatchAction.ADD_TAGS,
        tags: ['new', 'vip'],
      },
      mockContext,
    );

    expect(result).toMatchObject({ success: 1, failed: 0 });
    expect(mockRepository.updateCustomerTags).toHaveBeenCalledWith(
      'tenant_test',
      'customer-1',
      ['vip', 'new'],
      'user-123',
    );
  });

  it('creates a membership record when none exists yet', async () => {
    mockRepository.findActiveMembershipId.mockResolvedValue(null);
    mockRepository.findMembershipClassIdByCode.mockResolvedValue('membership-class-1');

    const result = await service.executeBatch(
      'talent-123',
      {
        customerIds: ['customer-1'],
        action: BatchAction.UPDATE_MEMBERSHIP,
        membershipClassCode: 'VIP',
        validFrom: '2026-04-14T00:00:00.000Z',
      },
      mockContext,
    );

    expect(result).toMatchObject({ success: 1, failed: 0 });
    expect(mockRepository.createMembershipRecord).toHaveBeenCalledWith(
      'tenant_test',
      'customer-1',
      'membership-class-1',
      '2026-04-14T00:00:00.000Z',
      undefined,
    );
  });

  it('records per-customer failures without aborting the batch', async () => {
    mockRepository.deactivateCustomer
      .mockRejectedValueOnce(new Error('DB Error'))
      .mockResolvedValueOnce(undefined);

    const result = await service.executeBatch(
      'talent-123',
      {
        customerIds: ['customer-1', 'customer-2'],
        action: BatchAction.DEACTIVATE,
      },
      mockContext,
    );

    expect(result).toMatchObject({
      total: 2,
      success: 1,
      failed: 1,
    });
    expect('jobId' in result).toBe(false);
    if ('jobId' in result) {
      throw new Error('Expected synchronous batch result');
    }
    expect(result.errors).toEqual([
      {
        customerId: 'customer-1',
        error: 'DB Error',
      },
    ]);
  });
});

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChangeLogService, TechEventLogService } from '../../log';
import { ProfileType } from '../dto/customer.dto';
import { CustomerProfileWriteRepository } from '../infrastructure/customer-profile-write.repository';
import type { CustomerArchiveAccessService } from './customer-archive-access.service';
import { CustomerPiiPlatformApplicationService } from './customer-pii-platform.service';
import { CustomerProfileWriteService } from './customer-profile-write.service';

describe('CustomerProfileWriteService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Tester',
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest',
    requestId: 'req-1',
  };

  const mockRepository = {
    findActiveInactivationReasonId: vi.fn(),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
    createAccessLog: vi.fn(),
  } as unknown as CustomerProfileWriteRepository;

  const mockChangeLogService = {
    create: vi.fn(),
  } as unknown as ChangeLogService;

  const mockTechEventLogService = {
    warn: vi.fn(),
  } as unknown as TechEventLogService;

  const mockCustomerPiiPlatformApplicationService = {
    syncCustomerLifecycleState: vi.fn(),
  } as unknown as CustomerPiiPlatformApplicationService;

  const mockCustomerArchiveAccessService = {
    requireCustomerArchiveAccess: vi.fn(),
  } as unknown as CustomerArchiveAccessService;

  const service = new CustomerProfileWriteService(
    mockRepository,
    mockChangeLogService,
    mockTechEventLogService,
    mockCustomerArchiveAccessService,
    mockCustomerPiiPlatformApplicationService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NotFoundException when deactivate cannot resolve customer access', async () => {
    vi.mocked(
      mockCustomerArchiveAccessService.requireCustomerArchiveAccess,
    ).mockRejectedValue(new NotFoundException());

    await expect(
      service.deactivate('customer-1', 'talent-1', 'OTHER', 1, context),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when deactivate version mismatches', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue({
      id: 'customer-1',
      profileStoreId: 'store-1',
      nickname: 'Acme',
      profileType: ProfileType.COMPANY,
      isActive: true,
      version: 3,
      primaryLanguage: 'en',
      statusId: null,
      tags: [],
      notes: null,
    });

    await expect(
      service.deactivate('customer-1', 'talent-1', 'OTHER', 2, context),
    ).rejects.toThrow(ConflictException);
  });

  it('reactivates the customer and records audit side effects', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue({
      id: 'customer-1',
      profileStoreId: 'store-1',
      nickname: 'Acme',
      profileType: ProfileType.COMPANY,
      isActive: false,
      version: 3,
      primaryLanguage: 'en',
      statusId: null,
      tags: [],
      notes: null,
    });
    vi.mocked(mockRepository.reactivate).mockResolvedValue(1 as never);
    vi.mocked(mockRepository.createAccessLog).mockResolvedValue(1 as never);
    vi.mocked(mockChangeLogService.create).mockResolvedValue(undefined as never);
    vi.mocked(
      mockCustomerPiiPlatformApplicationService.syncCustomerLifecycleState,
    ).mockResolvedValue({
      customerId: 'customer-1',
      lifecycleStatus: 'active',
      syncedAt: '2026-04-15T02:00:00.000Z',
    } as never);

    await expect(
      service.reactivate('customer-1', 'talent-1', context),
    ).resolves.toEqual({ id: 'customer-1', isActive: true });

    expect(mockRepository.reactivate).toHaveBeenCalledTimes(1);
    expect(mockChangeLogService.create).toHaveBeenCalledTimes(1);
    expect(mockRepository.createAccessLog).toHaveBeenCalledTimes(1);
    expect(
      mockCustomerPiiPlatformApplicationService.syncCustomerLifecycleState,
    ).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      ProfileType.COMPANY,
      expect.objectContaining({
        action: 'reactivate',
        isActive: true,
      }),
      context,
    );
  });

  it('logs and rethrows when external lifecycle sync fails after deactivate', async () => {
    const platformFailure = new Error('platform unavailable');

    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue({
      id: 'customer-1',
      profileStoreId: 'store-1',
      nickname: 'Acme',
      profileType: ProfileType.INDIVIDUAL,
      isActive: true,
      version: 3,
      primaryLanguage: 'ja',
      statusId: null,
      tags: [],
      notes: null,
    });
    vi.mocked(mockRepository.findActiveInactivationReasonId).mockResolvedValue('reason-1');
    vi.mocked(mockRepository.deactivate).mockResolvedValue(1 as never);
    vi.mocked(mockRepository.createAccessLog).mockResolvedValue(1 as never);
    vi.mocked(mockChangeLogService.create).mockResolvedValue(undefined as never);
    vi.mocked(
      mockCustomerPiiPlatformApplicationService.syncCustomerLifecycleState,
    ).mockRejectedValue(platformFailure);
    vi.mocked(mockTechEventLogService.warn).mockResolvedValue(undefined as never);

    await expect(
      service.deactivate('customer-1', 'talent-1', 'OTHER', 3, context),
    ).rejects.toThrow('platform unavailable');

    expect(
      mockCustomerPiiPlatformApplicationService.syncCustomerLifecycleState,
    ).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      ProfileType.INDIVIDUAL,
      expect.objectContaining({
        action: 'deactivate',
        isActive: false,
        reasonCode: 'OTHER',
      }),
      context,
    );
    expect(mockTechEventLogService.warn).toHaveBeenCalledWith(
      'PII_PLATFORM_LIFECYCLE_SYNC_FAILED',
      'Failed to synchronize customer deactivation to TCRN PII Platform',
      expect.objectContaining({
        customerId: 'customer-1',
        profileType: ProfileType.INDIVIDUAL,
        originalError: 'platform unavailable',
      }),
      context,
    );
  });
});

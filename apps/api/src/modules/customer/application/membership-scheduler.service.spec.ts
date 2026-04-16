// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { LogSeverity, TechEventType } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TechEventLogService } from '../../log';
import { MembershipSchedulerRepository } from '../infrastructure/membership-scheduler.repository';
import { MembershipSchedulerApplicationService } from './membership-scheduler.service';

describe('MembershipSchedulerApplicationService', () => {
  let service: MembershipSchedulerApplicationService;

  const mockRepository = {
    getActiveTenantSchemas: vi.fn(),
    findMembershipsToAutoRenew: vi.fn(),
    renewMembershipValidity: vi.fn(),
    insertAutoRenewChangeLog: vi.fn(),
    expireMemberships: vi.fn(),
    findExpiredMembershipIds: vi.fn(),
    insertExpirationChangeLog: vi.fn(),
    getUpcomingExpirations: vi.fn(),
  };

  const mockTechEventLogService = {
    log: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new MembershipSchedulerApplicationService(
      mockRepository as unknown as MembershipSchedulerRepository,
      mockTechEventLogService as unknown as TechEventLogService,
    );
  });

  it('logs completion after processing active tenant schemas', async () => {
    mockRepository.getActiveTenantSchemas.mockResolvedValue(['tenant_a', 'tenant_b']);
    mockRepository.findMembershipsToAutoRenew.mockResolvedValue([]);
    mockRepository.expireMemberships.mockResolvedValue(0);

    await service.processMembershipBatch();

    expect(mockTechEventLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: TechEventType.SCHEDULED_TASK_COMPLETED,
        scope: 'scheduled',
        severity: LogSeverity.INFO,
      }),
    );
  });

  it('continues counting renew failures when individual renewals fail', async () => {
    mockRepository.getActiveTenantSchemas.mockResolvedValue(['tenant_a']);
    mockRepository.findMembershipsToAutoRenew.mockResolvedValue([
      {
        id: 'membership-1',
        validTo: new Date('2026-04-01T00:00:00.000Z'),
        defaultRenewalDays: 30,
      },
    ]);
    mockRepository.renewMembershipValidity.mockRejectedValue(new Error('update failed'));
    mockRepository.expireMemberships.mockResolvedValue(0);

    await service.processMembershipBatch();

    expect(mockTechEventLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          auto_renew_failed_count: 1,
        }),
      }),
    );
  });

  it('logs a system error event when tenant discovery fails', async () => {
    mockRepository.getActiveTenantSchemas.mockRejectedValue(new Error('db offline'));

    await service.processMembershipBatch();

    expect(mockTechEventLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: TechEventType.SYSTEM_ERROR,
        scope: 'scheduled',
        severity: LogSeverity.ERROR,
        payload: expect.objectContaining({
          task: 'membership_batch',
          error: 'db offline',
        }),
      }),
    );
  });

  it('maps upcoming expirations through the repository boundary', async () => {
    const expiresAt = new Date('2026-04-21T00:00:00.000Z');
    mockRepository.getUpcomingExpirations.mockResolvedValue([
      {
        customerId: 'customer-1',
        membershipLevelName: 'Gold',
        expiresAt,
      },
    ]);

    await expect(
      service.getUpcomingExpirations(7, 'tenant_test'),
    ).resolves.toEqual([
      {
        customerId: 'customer-1',
        membershipLevelName: 'Gold',
        expiresAt,
      },
    ]);
  });
});

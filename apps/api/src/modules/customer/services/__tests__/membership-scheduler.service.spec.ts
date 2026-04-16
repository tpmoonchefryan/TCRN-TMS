// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MembershipSchedulerApplicationService } from '../../application/membership-scheduler.service';
import { MembershipSchedulerService } from '../membership-scheduler.service';

describe('MembershipSchedulerService', () => {
  let service: MembershipSchedulerService;

  const mockApplicationService = {
    processMembershipBatch: vi.fn(),
    getUpcomingExpirations: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MembershipSchedulerService(
      mockApplicationService as unknown as MembershipSchedulerApplicationService,
    );
  });

  it('delegates scheduled batch processing to the layered application service', async () => {
    await service.processMembershipBatch();

    expect(mockApplicationService.processMembershipBatch).toHaveBeenCalledTimes(1);
  });

  it('delegates upcoming-expiration reads to the layered application service', async () => {
    const expiresAt = new Date('2026-04-21T00:00:00.000Z');
    mockApplicationService.getUpcomingExpirations.mockResolvedValue([
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

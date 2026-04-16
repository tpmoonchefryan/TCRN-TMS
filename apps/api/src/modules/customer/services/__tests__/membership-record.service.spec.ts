// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MembershipRecordApplicationService } from '../../application/membership-record.service';
import { MembershipRecordService } from '../membership-record.service';

describe('MembershipRecordService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Tester',
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest',
    requestId: 'req-1',
  };

  const mockApplicationService = {
    findByCustomer: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getSummary: vi.fn(),
  } as unknown as MembershipRecordApplicationService;

  const service = new MembershipRecordService(mockApplicationService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates list and create calls to the application service', async () => {
    vi.mocked(mockApplicationService.findByCustomer).mockResolvedValue({
      items: [],
      meta: {
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        },
        summary: {
          activeCount: 0,
          expiredCount: 0,
          totalCount: 0,
        },
      },
    });
    vi.mocked(mockApplicationService.create).mockResolvedValue({
      id: 'membership-1',
      platform: {
        code: 'YOUTUBE',
        name: 'YouTube',
      },
      membershipLevel: {
        code: 'GOLD',
        name: 'Gold',
      },
      validFrom: new Date('2026-04-14T00:00:00.000Z'),
      validTo: null,
      autoRenew: false,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });

    await expect(
      service.findByCustomer('customer-1', 'talent-1', {}, context),
    ).resolves.toMatchObject({ items: [] });
    await expect(
      service.create(
        'customer-1',
        'talent-1',
        {
          platformCode: 'YOUTUBE',
          membershipLevelCode: 'GOLD',
          validFrom: '2026-04-14T00:00:00.000Z',
        },
        context,
      ),
    ).resolves.toMatchObject({ id: 'membership-1' });
  });

  it('delegates update and summary calls to the application service', async () => {
    vi.mocked(mockApplicationService.update).mockResolvedValue({
      id: 'membership-1',
      validTo: null,
      autoRenew: true,
      note: 'VIP',
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
    });
    vi.mocked(mockApplicationService.getSummary).mockResolvedValue({
      highestLevel: {
        platformCode: 'YOUTUBE',
        platformName: 'YouTube',
        levelCode: 'GOLD',
        levelName: 'Gold',
        color: '#ffcc00',
      },
      activeCount: 1,
      totalCount: 2,
    });

    await expect(
      service.update(
        'customer-1',
        'record-1',
        'talent-1',
        {
          autoRenew: true,
          note: 'VIP',
        },
        context,
      ),
    ).resolves.toMatchObject({ id: 'membership-1' });
    await expect(
      service.getSummary('customer-1', context),
    ).resolves.toMatchObject({
      highestLevel: { levelCode: 'GOLD' },
      activeCount: 1,
      totalCount: 2,
    });
  });
});

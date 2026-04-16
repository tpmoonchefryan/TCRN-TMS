// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlatformIdentityApplicationService } from '../../application/platform-identity.service';
import { PlatformIdentityService } from '../platform-identity.service';

describe('PlatformIdentityService', () => {
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
    getHistory: vi.fn(),
  } as unknown as PlatformIdentityApplicationService;

  const service = new PlatformIdentityService(mockApplicationService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates create to the application service', async () => {
    const dto = {
      platformCode: 'YOUTUBE',
      platformUid: 'UC123',
    };
    const expected = {
      id: 'identity-1',
      platform: {
        id: 'platform-1',
        code: 'YOUTUBE',
        name: 'YouTube',
      },
      platformUid: 'UC123',
      platformNickname: null,
      profileUrl: 'https://youtube.com/@UC123',
      isVerified: false,
      isCurrent: true,
      capturedAt: new Date('2026-04-14T00:00:00.000Z'),
    };
    vi.mocked(mockApplicationService.create).mockResolvedValue(expected);

    await expect(
      service.create('customer-1', 'talent-1', dto, context),
    ).resolves.toEqual(expected);

    expect(mockApplicationService.create).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      dto,
      context,
    );
  });

  it('delegates update and history queries to the application service', async () => {
    vi.mocked(mockApplicationService.update).mockResolvedValue({
      id: 'identity-1',
      platformUid: 'UC456',
      platformNickname: 'Channel',
      profileUrl: 'https://youtube.com/@UC456',
      isVerified: true,
      isCurrent: true,
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
    });
    vi.mocked(mockApplicationService.getHistory).mockResolvedValue({
      items: [],
      meta: {
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        },
      },
    });

    await expect(
      service.update(
        'customer-1',
        'identity-1',
        'talent-1',
        { platformNickname: 'Channel' },
        context,
      ),
    ).resolves.toMatchObject({ id: 'identity-1' });
    await expect(
      service.getHistory('customer-1', 'talent-1', { page: 1 }, context),
    ).resolves.toEqual({
      items: [],
      meta: {
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        },
      },
    });
  });
});

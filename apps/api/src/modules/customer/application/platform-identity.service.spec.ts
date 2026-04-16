// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../../database';
import { ProfileType } from '../dto/customer.dto';
import { PlatformIdentityRepository } from '../infrastructure/platform-identity.repository';
import type { CustomerArchiveAccessService } from './customer-archive-access.service';
import { PlatformIdentityApplicationService } from './platform-identity.service';

describe('PlatformIdentityApplicationService', () => {
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
    findByCustomer: vi.fn(),
    findActivePlatformByCode: vi.fn(),
    findDuplicateIdentity: vi.fn(),
    create: vi.fn(),
    insertHistory: vi.fn(),
    insertChangeLog: vi.fn(),
    findOwnedIdentity: vi.fn(),
    update: vi.fn(),
    findHistory: vi.fn(),
    countHistory: vi.fn(),
  } as unknown as PlatformIdentityRepository;

  const mockDatabaseService = {
    buildPagination: vi.fn(),
    calculatePaginationMeta: vi.fn(),
  } as unknown as DatabaseService;

  const mockCustomerArchiveAccessService = {
    requireCustomerArchiveAccess: vi.fn(),
  } as unknown as CustomerArchiveAccessService;

  const service = new PlatformIdentityApplicationService(
    mockRepository,
    mockDatabaseService,
    mockCustomerArchiveAccessService,
  );

  const customerArchiveAccessRecord = {
    id: 'customer-1',
    profileType: ProfileType.COMPANY,
    profileStoreId: 'store-1',
    nickname: 'Acme',
    version: 1,
    isActive: true,
    primaryLanguage: 'en',
    statusId: null,
    tags: [],
    notes: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockDatabaseService.buildPagination).mockReturnValue({
      skip: 0,
      take: 20,
    } as never);
    vi.mocked(mockDatabaseService.calculatePaginationMeta).mockReturnValue({
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    } as never);
  });

  it('throws NotFoundException when the customer access check fails on the read path', async () => {
    vi.mocked(
      mockCustomerArchiveAccessService.requireCustomerArchiveAccess,
    ).mockRejectedValue(new NotFoundException());

    await expect(
      service.findByCustomer('customer-1', 'talent-1', context),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps platform identity list records on the read path', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findByCustomer).mockResolvedValue([
      {
        id: 'identity-1',
        platformId: 'platform-1',
        platformCode: 'YOUTUBE',
        platformName: 'YouTube',
        platformIconUrl: 'https://example.com/icon.png',
        platformColor: '#ff0000',
        platformUid: 'UC123',
        platformNickname: 'Channel',
        platformAvatarUrl: null,
        profileUrl: 'https://youtube.com/@UC123',
        isVerified: true,
        isCurrent: true,
        capturedAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
      },
    ]);

    await expect(
      service.findByCustomer('customer-1', 'talent-1', context),
    ).resolves.toEqual([
      {
        id: 'identity-1',
        platform: {
          id: 'platform-1',
          code: 'YOUTUBE',
          name: 'YouTube',
          iconUrl: 'https://example.com/icon.png',
          color: '#ff0000',
        },
        platformUid: 'UC123',
        platformNickname: 'Channel',
        platformAvatarUrl: null,
        profileUrl: 'https://youtube.com/@UC123',
        isVerified: true,
        isCurrent: true,
        capturedAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
      },
    ]);
  });

  it('throws NotFoundException when create cannot resolve the platform', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findActivePlatformByCode).mockResolvedValue(null);

    await expect(
      service.create(
        'customer-1',
        'talent-1',
        {
          platformCode: 'INVALID',
          platformUid: 'UC123',
        },
        context,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when create sees a duplicate identity', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findActivePlatformByCode).mockResolvedValue({
      id: 'platform-1',
      code: 'YOUTUBE',
      displayName: 'YouTube',
      profileUrlTemplate: 'https://youtube.com/@{uid}',
    });
    vi.mocked(mockRepository.findDuplicateIdentity).mockResolvedValue({
      id: 'identity-1',
    });

    await expect(
      service.create(
        'customer-1',
        'talent-1',
        {
          platformCode: 'YOUTUBE',
          platformUid: 'UC123',
        },
        context,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('creates a platform identity and records history plus raw change-log payloads', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findActivePlatformByCode).mockResolvedValue({
      id: 'platform-1',
      code: 'YOUTUBE',
      displayName: 'YouTube',
      profileUrlTemplate: 'https://youtube.com/@{uid}',
    });
    vi.mocked(mockRepository.findDuplicateIdentity).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockResolvedValue({
      id: 'identity-1',
      platformUid: 'UC123',
      platformNickname: 'Channel',
      profileUrl: 'https://youtube.com/@UC123',
      isVerified: false,
      isCurrent: true,
      capturedAt: new Date('2026-04-14T00:00:00.000Z'),
    });
    vi.mocked(mockRepository.insertHistory).mockResolvedValue(1 as never);
    vi.mocked(mockRepository.insertChangeLog).mockResolvedValue(1 as never);

    await expect(
      service.create(
        'customer-1',
        'talent-1',
        {
          platformCode: 'YOUTUBE',
          platformUid: 'UC123',
          platformNickname: 'Channel',
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'identity-1',
      platform: {
        id: 'platform-1',
        code: 'YOUTUBE',
        name: 'YouTube',
      },
      platformUid: 'UC123',
      platformNickname: 'Channel',
      profileUrl: 'https://youtube.com/@UC123',
      isVerified: false,
      isCurrent: true,
      capturedAt: new Date('2026-04-14T00:00:00.000Z'),
    });

    expect(mockRepository.insertHistory).toHaveBeenCalledWith('tenant_test', {
      identityId: 'identity-1',
      customerId: 'customer-1',
      changeType: 'created',
      newValue: 'UC123',
      capturedBy: 'user-1',
    });
    expect(mockRepository.insertChangeLog).toHaveBeenCalledWith('tenant_test', {
      action: 'create',
      objectId: 'identity-1',
      objectName: 'YOUTUBE:UC123',
      diff: JSON.stringify({
        new: {
          platformCode: 'YOUTUBE',
          platformUid: 'UC123',
          platformNickname: 'Channel',
        },
      }),
      userId: 'user-1',
      ipAddress: '127.0.0.1',
    });
  });

  it('updates a platform identity and records typed history changes', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findOwnedIdentity).mockResolvedValue({
      id: 'identity-1',
      platformId: 'platform-1',
      platformCode: 'YOUTUBE',
      profileUrlTemplate: 'https://youtube.com/@{uid}',
      platformUid: 'UC123',
      platformNickname: 'OldChannel',
      platformAvatarUrl: null,
      profileUrl: 'https://youtube.com/@UC123',
      isVerified: false,
      isCurrent: true,
    });
    vi.mocked(mockRepository.update).mockResolvedValue({
      id: 'identity-1',
      platformUid: 'UC456',
      platformNickname: 'NewChannel',
      profileUrl: 'https://youtube.com/@UC456',
      isVerified: true,
      isCurrent: false,
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
    });
    vi.mocked(mockRepository.insertHistory).mockResolvedValue(1 as never);
    vi.mocked(mockRepository.insertChangeLog).mockResolvedValue(1 as never);

    await expect(
      service.update(
        'customer-1',
        'identity-1',
        'talent-1',
        {
          platformUid: 'UC456',
          platformNickname: 'NewChannel',
          isVerified: true,
          isCurrent: false,
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'identity-1',
      platformUid: 'UC456',
      platformNickname: 'NewChannel',
      profileUrl: 'https://youtube.com/@UC456',
      isVerified: true,
      isCurrent: false,
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
    });

    expect(mockRepository.insertHistory).toHaveBeenCalledTimes(3);
    expect(mockRepository.insertChangeLog).toHaveBeenCalledWith('tenant_test', {
      action: 'update',
      objectId: 'identity-1',
      objectName: 'YOUTUBE:UC456',
      diff: JSON.stringify({
        old: {
          platformUid: 'UC123',
          platformNickname: 'OldChannel',
          isCurrent: true,
        },
        new: {
          platformUid: 'UC456',
          platformNickname: 'NewChannel',
          isCurrent: false,
        },
      }),
      userId: 'user-1',
      ipAddress: '127.0.0.1',
    });
  });

  it('returns mapped history rows with pagination metadata', async () => {
    vi.mocked(mockCustomerArchiveAccessService.requireCustomerArchiveAccess).mockResolvedValue(
      customerArchiveAccessRecord,
    );
    vi.mocked(mockRepository.findHistory).mockResolvedValue([
      {
        id: 'history-1',
        identityId: 'identity-1',
        platformCode: 'YOUTUBE',
        platformName: 'YouTube',
        changeType: 'created',
        oldValue: null,
        newValue: 'UC123',
        capturedAt: new Date('2026-04-14T00:00:00.000Z'),
        capturedBy: 'user-1',
      },
    ]);
    vi.mocked(mockRepository.countHistory).mockResolvedValue(1);

    await expect(
      service.getHistory(
        'customer-1',
        'talent-1',
        {
          page: 1,
          pageSize: 20,
        },
        context,
      ),
    ).resolves.toEqual({
      items: [
        {
          id: 'history-1',
          identityId: 'identity-1',
          platform: {
            code: 'YOUTUBE',
            name: 'YouTube',
          },
          changeType: 'created',
          oldValue: null,
          newValue: 'UC123',
          capturedAt: new Date('2026-04-14T00:00:00.000Z'),
          capturedBy: 'user-1',
        },
      ],
      meta: {
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        },
      },
    });
  });
});

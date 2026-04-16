// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RequestContext } from '@tcrn/shared';
import { describe, expect, it, vi } from 'vitest';

import { ProfileStoreApplicationService } from '../application/profile-store.service';
import { ProfileStoreService } from './profile-store.service';

describe('ProfileStoreService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Admin',
    ipAddress: '127.0.0.1',
    requestId: 'req-1',
  };

  const mockApplicationService = {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  } as unknown as ProfileStoreApplicationService;

  const service = new ProfileStoreService(mockApplicationService);

  it('delegates all profile-store paths to the layered application service', async () => {
    vi.mocked(mockApplicationService.findMany).mockResolvedValue({
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
    vi.mocked(mockApplicationService.findById).mockResolvedValue({
      id: 'store-1',
      code: 'DEFAULT_STORE',
      name: 'Default Profile Store',
      nameZh: '默认档案库',
      nameJa: 'デフォルトプロフィールストア',
      description: 'Primary customer profile store',
      descriptionZh: '主要客户档案库',
      descriptionJa: '主要な顧客プロフィールストア',
      talentCount: 2,
      customerCount: 10,
      isDefault: true,
      isActive: true,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
      version: 1,
    });
    vi.mocked(mockApplicationService.create).mockResolvedValue({
      id: 'store-1',
      code: 'DEFAULT_STORE',
      name: 'Default Profile Store',
      isDefault: true,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });
    vi.mocked(mockApplicationService.update).mockResolvedValue({
      id: 'store-1',
      code: 'DEFAULT_STORE',
      version: 2,
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
    });

    await expect(service.findMany({}, context)).resolves.toMatchObject({
      items: [],
    });
    await expect(service.findById('store-1', context)).resolves.toMatchObject({
      code: 'DEFAULT_STORE',
    });
    await expect(
      service.create(
        {
          code: 'DEFAULT_STORE',
          nameEn: 'Default Profile Store',
        },
        context,
      ),
    ).resolves.toMatchObject({
      code: 'DEFAULT_STORE',
      isDefault: true,
    });
    await expect(
      service.update(
        'store-1',
        {
          version: 1,
          nameEn: 'Updated Store',
        },
        context,
      ),
    ).resolves.toMatchObject({
      version: 2,
    });
  });
});

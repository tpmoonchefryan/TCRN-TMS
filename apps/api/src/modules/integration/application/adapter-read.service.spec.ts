// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type IntegrationAdapterOwnerScope } from '../domain/adapter-read.policy';
import { OwnerType } from '../dto/integration.dto';
import { AdapterReadRepository } from '../infrastructure/adapter-read.repository';
import { AdapterReadApplicationService } from './adapter-read.service';

describe('AdapterReadApplicationService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Tester',
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest',
    requestId: 'req-1',
  };

  const scope: IntegrationAdapterOwnerScope = {
    ownerType: OwnerType.SUBSIDIARY,
    ownerId: 'subsidiary-1',
  };

  const mockRepository = {
    findMany: vi.fn(),
    findById: vi.fn(),
    findConfigs: vi.fn(),
  } as unknown as AdapterReadRepository;

  const service = new AdapterReadApplicationService(mockRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps adapter list rows and preserves inherited-owner semantics', async () => {
    vi.mocked(mockRepository.findMany).mockResolvedValue([
      {
        id: 'adapter-tenant',
        ownerType: OwnerType.TENANT,
        ownerId: null,
        platformId: 'platform-1',
        platformCode: 'BILIBILI',
        platformDisplayName: 'Bilibili',
        platformIconUrl: 'https://example.com/icon.png',
        code: 'BILI_SYNC',
        nameEn: 'Bili Sync',
        nameZh: '哔哩同步',
        nameJa: null,
        extraData: null,
        adapterType: 'oauth',
        inherit: true,
        isActive: true,
        configCount: 2,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
        version: 3,
      },
    ]);

    await expect(
      service.findMany(scope, { includeInherited: true }, context),
    ).resolves.toEqual([
      {
        id: 'adapter-tenant',
        ownerType: OwnerType.TENANT,
        ownerId: null,
        platformId: 'platform-1',
        platform: {
          code: 'BILIBILI',
          displayName: 'Bilibili',
          iconUrl: 'https://example.com/icon.png',
        },
        code: 'BILI_SYNC',
        nameEn: 'Bili Sync',
        nameZh: '哔哩同步',
        nameJa: null,
        adapterType: 'oauth',
        inherit: true,
        isActive: true,
        isInherited: true,
        configCount: 2,
        createdAt: '2026-04-14T00:00:00.000Z',
        updatedAt: '2026-04-14T00:00:00.000Z',
        version: 3,
      },
    ]);
  });

  it('throws NotFoundException when adapter detail lookup misses', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    await expect(
      service.findById('missing-adapter', context),
    ).rejects.toThrow(NotFoundException);
  });

  it('masks secret configs on adapter detail responses', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'adapter-1',
      ownerType: OwnerType.TENANT,
      ownerId: null,
      platformId: 'platform-1',
      platformRecordId: 'platform-1',
      platformCode: 'BILIBILI',
      platformDisplayName: 'Bilibili',
      code: 'BILI_SYNC',
      nameEn: 'Bili Sync',
      nameZh: null,
      nameJa: null,
      extraData: null,
      adapterType: 'oauth',
      inherit: true,
      isActive: true,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      updatedAt: new Date('2026-04-14T00:00:00.000Z'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
      version: 1,
    });
    vi.mocked(mockRepository.findConfigs).mockResolvedValue([
      {
        id: 'config-secret',
        configKey: 'client_secret',
        configValue: 'encrypted-value',
        isSecret: true,
      },
      {
        id: 'config-plain',
        configKey: 'endpoint',
        configValue: 'https://example.com',
        isSecret: false,
      },
    ]);

    await expect(
      service.findById('adapter-1', context),
    ).resolves.toEqual({
      id: 'adapter-1',
      ownerType: OwnerType.TENANT,
      ownerId: null,
      platform: {
        id: 'platform-1',
        code: 'BILIBILI',
        displayName: 'Bilibili',
      },
      code: 'BILI_SYNC',
      nameEn: 'Bili Sync',
      nameZh: null,
      nameJa: null,
      adapterType: 'oauth',
      inherit: true,
      isActive: true,
      configs: [
        {
          id: 'config-secret',
          configKey: 'client_secret',
          configValue: '******',
          isSecret: true,
        },
        {
          id: 'config-plain',
          configKey: 'endpoint',
          configValue: 'https://example.com',
          isSecret: false,
        },
      ],
      createdAt: '2026-04-14T00:00:00.000Z',
      updatedAt: '2026-04-14T00:00:00.000Z',
      createdBy: 'user-1',
      updatedBy: 'user-1',
      version: 1,
    });
  });
});

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TalentReadRepository } from '../infrastructure/talent-read.repository';
import { TalentReadService } from './talent-read.service';

describe('TalentReadService', () => {
  const mockRepository = {
    findById: vi.fn(),
    findByCode: vi.fn(),
    findByHomepagePath: vi.fn(),
    findByCustomDomain: vi.fn(),
    getProfileStoreById: vi.fn(),
    getTalentStats: vi.fn(),
    getExternalPagesDomainConfig: vi.fn(),
    list: vi.fn(),
  } as unknown as TalentReadRepository;

  const service = new TalentReadService(mockRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates read lookups to the repository layer', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'talent-1',
      code: 'SORA',
    } as never);
    vi.mocked(mockRepository.findByCode).mockResolvedValue({
      id: 'talent-1',
      code: 'SORA',
    } as never);
    vi.mocked(mockRepository.findByHomepagePath).mockResolvedValue({
      id: 'talent-1',
      homepagePath: 'sora',
    } as never);
    vi.mocked(mockRepository.findByCustomDomain).mockResolvedValue({
      id: 'talent-1',
      code: 'SORA',
    } as never);
    vi.mocked(mockRepository.getProfileStoreById).mockResolvedValue({
      id: 'store-1',
      code: 'DEFAULT',
    } as never);
    vi.mocked(mockRepository.getTalentStats).mockResolvedValue({
      customerCount: 3,
      pendingMessagesCount: 1,
    });
    vi.mocked(mockRepository.getExternalPagesDomainConfig).mockResolvedValue({
      homepage: null,
      marshmallow: null,
    });

    await expect(service.findById('talent-1', 'tenant_test')).resolves.toMatchObject({
      id: 'talent-1',
    });
    await expect(service.findByCode('SORA', 'tenant_test')).resolves.toMatchObject({
      code: 'SORA',
    });
    await expect(
      service.findByHomepagePath('sora', 'tenant_test'),
    ).resolves.toMatchObject({
      homepagePath: 'sora',
    });
    await expect(
      service.findByCustomDomain('Talent.Example.com', 'tenant_test'),
    ).resolves.toMatchObject({
      id: 'talent-1',
    });
    await expect(
      service.getProfileStoreById('store-1', 'tenant_test'),
    ).resolves.toMatchObject({
      code: 'DEFAULT',
    });
    await expect(
      service.getTalentStats('talent-1', 'tenant_test'),
    ).resolves.toEqual({
      customerCount: 3,
      pendingMessagesCount: 1,
    });
    await expect(
      service.getExternalPagesDomainConfig('talent-1', 'tenant_test'),
    ).resolves.toEqual({
      homepage: null,
      marshmallow: null,
    });
  });

  it('delegates talent list queries without changing the current contract', async () => {
    vi.mocked(mockRepository.list).mockResolvedValue({
      data: [
        {
          id: 'talent-1',
          code: 'SORA',
        },
      ] as never,
      total: 1,
    });

    await expect(
      service.list('tenant_test', {
        page: 2,
        pageSize: 10,
        search: 'Sora',
        sort: '-createdAt',
      }),
    ).resolves.toEqual({
      data: [
        {
          id: 'talent-1',
          code: 'SORA',
        },
      ],
      total: 1,
    });
  });
});

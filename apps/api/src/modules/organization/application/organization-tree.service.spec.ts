// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationTreeRepository } from '../infrastructure/organization-tree.repository';
import { OrganizationTreeService } from './organization-tree.service';

describe('OrganizationTreeService', () => {
  const mockRepository = {
    findTenant: vi.fn(),
    findAllSubsidiaries: vi.fn(),
    findMatchedSubsidiaryPaths: vi.fn(),
    findMatchedTalentSubsidiaryIds: vi.fn(),
    findSubsidiaryPathsByIds: vi.fn(),
    findSubsidiariesByPaths: vi.fn(),
    findTalentsForTree: vi.fn(),
    findDirectTalents: vi.fn(),
    countTalentsBySubsidiary: vi.fn(),
    findUserScopeAccesses: vi.fn(),
    findDescendantSubsidiaryIds: vi.fn(),
    findTalentIdsInSubsidiarySubtree: vi.fn(),
    findTalentSubsidiaryIds: vi.fn(),
    findAncestorSubsidiaryIds: vi.fn(),
  } as unknown as OrganizationTreeRepository;

  const service = new OrganizationTreeService(mockRepository);

  const tenant = {
    id: 'tenant-1',
    code: 'TENANT',
    schemaName: 'tenant_test',
    name: 'Tenant',
    tier: 'standard',
    isActive: true,
    settings: {},
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
  };
  const treeTenant = {
    id: tenant.id,
    code: tenant.code,
    name: tenant.name,
  };

  const subsidiaries = [
    {
      id: 'sub-1',
      parent_id: null,
      code: 'TOKYO',
      path: '/TOKYO/',
      depth: 1,
      name_en: 'Tokyo',
      name_zh: '东京',
      name_ja: '東京',
      is_active: true,
    },
    {
      id: 'sub-2',
      parent_id: 'sub-1',
      code: 'GAMING',
      path: '/TOKYO/GAMING/',
      depth: 2,
      name_en: 'Gaming',
      name_zh: '游戏',
      name_ja: 'ゲーム',
      is_active: true,
    },
    {
      id: 'sub-3',
      parent_id: null,
      code: 'OSAKA',
      path: '/OSAKA/',
      depth: 1,
      name_en: 'Osaka',
      name_zh: '大阪',
      name_ja: '大阪',
      is_active: true,
    },
  ];

  const talents = [
    {
      id: 'talent-1',
      subsidiary_id: 'sub-2',
      code: 'SORA',
      name_en: 'Sora',
      name_zh: '空',
      name_ja: 'そら',
      display_name: 'Sora',
      avatar_url: 'https://example.com/avatar.png',
      homepage_path: 'sora',
      lifecycle_status: 'published' as const,
      published_at: new Date('2026-04-11T00:00:00.000Z'),
    },
    {
      id: 'talent-2',
      subsidiary_id: null,
      code: 'DIRECT',
      name_en: 'Direct Talent',
      name_zh: '直属艺人',
      name_ja: '直属タレント',
      display_name: 'Direct Talent',
      avatar_url: null,
      homepage_path: null,
      lifecycle_status: 'draft' as const,
      published_at: null,
    },
    {
      id: 'talent-3',
      subsidiary_id: 'sub-3',
      code: 'MIO',
      name_en: 'Mio',
      name_zh: '澪',
      name_ja: 'ミオ',
      display_name: 'Mio',
      avatar_url: null,
      homepage_path: 'mio',
      lifecycle_status: 'published' as const,
      published_at: new Date('2026-04-12T00:00:00.000Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the full organization tree and preserves direct talents', async () => {
    vi.mocked(mockRepository.findTenant).mockResolvedValue(tenant);
    vi.mocked(mockRepository.findAllSubsidiaries).mockResolvedValue(
      subsidiaries.slice(0, 2),
    );
    vi.mocked(mockRepository.countTalentsBySubsidiary).mockResolvedValue([
      { subsidiary_id: 'sub-2', count: BigInt(1) },
    ]);
    vi.mocked(mockRepository.findTalentsForTree).mockResolvedValue(
      talents.slice(0, 2),
    );

    await expect(
      service.getTree(tenant.id, 'tenant_test', { language: 'zh' }),
    ).resolves.toMatchObject({
      tenant: treeTenant,
      tree: [
        {
          id: 'sub-1',
          name: '东京',
          children: [
            {
              id: 'sub-2',
              name: '游戏',
              talentCount: 1,
              talents: [{ id: 'talent-1', displayName: 'Sora' }],
            },
          ],
        },
      ],
      talentsWithoutSubsidiary: [{ id: 'talent-2', displayName: 'Direct Talent' }],
    });
  });

  it('returns an empty tree with direct-talent search results when no subsidiary path matches', async () => {
    vi.mocked(mockRepository.findTenant).mockResolvedValue(tenant);
    vi.mocked(mockRepository.findMatchedSubsidiaryPaths).mockResolvedValue([]);
    vi.mocked(mockRepository.findMatchedTalentSubsidiaryIds).mockResolvedValue([]);
    vi.mocked(mockRepository.findDirectTalents).mockResolvedValue([talents[1]]);

    await expect(
      service.getTree(tenant.id, 'tenant_test', { search: 'Direct' }),
    ).resolves.toEqual({
      tenant: treeTenant,
      tree: [],
      talentsWithoutSubsidiary: [
        expect.objectContaining({
          id: 'talent-2',
          displayName: 'Direct Talent',
        }),
      ],
    });

    expect(mockRepository.findSubsidiariesByPaths).not.toHaveBeenCalled();
  });

  it('filters the tree to the explicit talent scope and its ancestor subsidiaries', async () => {
    vi.mocked(mockRepository.findTenant).mockResolvedValue(tenant);
    vi.mocked(mockRepository.findAllSubsidiaries).mockResolvedValue(subsidiaries);
    vi.mocked(mockRepository.countTalentsBySubsidiary).mockResolvedValue([
      { subsidiary_id: 'sub-2', count: BigInt(1) },
      { subsidiary_id: 'sub-3', count: BigInt(1) },
    ]);
    vi.mocked(mockRepository.findTalentsForTree).mockResolvedValue(talents);
    vi.mocked(mockRepository.findUserScopeAccesses).mockResolvedValue([
      {
        scope_type: 'talent',
        scope_id: 'talent-1',
        include_subunits: false,
      },
    ]);
    vi.mocked(mockRepository.findTalentSubsidiaryIds).mockResolvedValue([
      { id: 'talent-1', subsidiary_id: 'sub-2' },
    ]);
    vi.mocked(mockRepository.findAncestorSubsidiaryIds).mockResolvedValue(
      new Set(['sub-1']),
    );

    await expect(
      service.getTree(tenant.id, 'tenant_test', { userId: 'user-1' }),
    ).resolves.toMatchObject({
      tenant: treeTenant,
      tree: [
        {
          id: 'sub-1',
          children: [
            {
              id: 'sub-2',
              talents: [{ id: 'talent-1' }],
            },
          ],
        },
      ],
      talentsWithoutSubsidiary: [],
    });
  });

  it('returns the unfiltered tree when tenant access includes subunits', async () => {
    vi.mocked(mockRepository.findTenant).mockResolvedValue(tenant);
    vi.mocked(mockRepository.findAllSubsidiaries).mockResolvedValue(
      subsidiaries.slice(0, 2),
    );
    vi.mocked(mockRepository.countTalentsBySubsidiary).mockResolvedValue([
      { subsidiary_id: 'sub-2', count: BigInt(1) },
    ]);
    vi.mocked(mockRepository.findTalentsForTree).mockResolvedValue(
      talents.slice(0, 2),
    );
    vi.mocked(mockRepository.findUserScopeAccesses).mockResolvedValue([
      {
        scope_type: 'tenant',
        scope_id: null,
        include_subunits: true,
      },
    ]);

    await expect(
      service.getTree(tenant.id, 'tenant_test', { userId: 'user-1' }),
    ).resolves.toMatchObject({
      tenant: treeTenant,
      tree: [
        {
          id: 'sub-1',
          children: [{ id: 'sub-2', talents: [{ id: 'talent-1' }] }],
        },
      ],
      talentsWithoutSubsidiary: [{ id: 'talent-2' }],
    });

    expect(mockRepository.findTalentSubsidiaryIds).not.toHaveBeenCalled();
  });

  it('fails closed when the tenant does not exist', async () => {
    vi.mocked(mockRepository.findTenant).mockResolvedValue(null);

    await expect(
      service.getTree('missing-tenant', 'tenant_test'),
    ).rejects.toThrow(NotFoundException);
  });
});

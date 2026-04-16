// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CustomerArchiveAccessService } from '../../customer/application/customer-archive-access.service';
import { TalentLifecycleRepository } from '../infrastructure/talent-lifecycle.repository';
import { TalentLifecycleService } from './talent-lifecycle.service';
import { TalentReadService } from './talent-read.service';

describe('TalentLifecycleService', () => {
  const mockReadService = {
    findById: vi.fn(),
    getExternalPagesDomainConfig: vi.fn(),
  } as unknown as TalentReadService;

  const mockRepository = {
    publish: vi.fn(),
    disable: vi.fn(),
    reEnable: vi.fn(),
  } as unknown as TalentLifecycleRepository;

  const mockCustomerArchiveAccessService = {
    getTalentArchiveReadiness: vi.fn(),
  } as unknown as CustomerArchiveAccessService;

  const service = new TalentLifecycleService(
    mockReadService,
    mockCustomerArchiveAccessService,
    mockRepository,
  );

  const draftTalent = {
    id: 'talent-123',
    code: 'SORA',
    profileStoreId: 'store-123',
    lifecycleStatus: 'draft' as const,
    avatarUrl: 'https://example.com/avatar.png',
    descriptionEn: 'Hello',
    descriptionZh: null,
    descriptionJa: null,
    version: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds publish readiness and blocks when the profile store is inactive', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue(draftTalent as never);
    vi.mocked(mockReadService.getExternalPagesDomainConfig).mockResolvedValue({
      homepage: null,
      marshmallow: null,
    });
    vi.mocked(mockCustomerArchiveAccessService.getTalentArchiveReadiness).mockResolvedValue({
      talentId: 'talent-123',
      hasArchiveTarget: false,
      hasActiveArchiveTarget: false,
    });

    await expect(
      service.getPublishReadiness('talent-123', 'tenant_test'),
    ).resolves.toMatchObject({
      canEnterPublishedState: false,
      blockers: [expect.objectContaining({ code: 'PROFILE_STORE_REQUIRED' })],
      warnings: expect.arrayContaining([
        expect.objectContaining({ code: 'HOMEPAGE_NOT_PUBLISHED' }),
        expect.objectContaining({ code: 'MARSHMALLOW_NOT_ENABLED' }),
      ]),
    });
  });

  it('publishes a draft talent when readiness is clear', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue(draftTalent as never);
    vi.mocked(mockReadService.getExternalPagesDomainConfig).mockResolvedValue({
      homepage: { isPublished: true },
      marshmallow: { isEnabled: true },
    } as never);
    vi.mocked(mockCustomerArchiveAccessService.getTalentArchiveReadiness).mockResolvedValue({
      talentId: 'talent-123',
      hasArchiveTarget: true,
      hasActiveArchiveTarget: true,
    });
    vi.mocked(mockRepository.publish).mockResolvedValue({
      ...draftTalent,
      lifecycleStatus: 'published',
      isActive: true,
      publishedBy: 'user-1',
      version: 2,
    } as never);

    await expect(
      service.publish('talent-123', 'tenant_test', 1, 'user-1'),
    ).resolves.toMatchObject({
      lifecycleStatus: 'published',
      version: 2,
    });
  });

  it('fails closed when publishing a talent outside draft state', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      ...draftTalent,
      lifecycleStatus: 'published',
      isActive: true,
    } as never);

    await expect(
      service.publish('talent-123', 'tenant_test', 1, 'user-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('disables a published talent', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      ...draftTalent,
      lifecycleStatus: 'published',
      isActive: true,
    } as never);
    vi.mocked(mockRepository.disable).mockResolvedValue({
      ...draftTalent,
      lifecycleStatus: 'disabled',
      isActive: false,
      version: 2,
    } as never);

    await expect(
      service.disable('talent-123', 'tenant_test', 1, 'user-1'),
    ).resolves.toMatchObject({
      lifecycleStatus: 'disabled',
      version: 2,
    });
  });

  it('re-enables a disabled talent when readiness is clear', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      ...draftTalent,
      lifecycleStatus: 'disabled',
      isActive: false,
    } as never);
    vi.mocked(mockReadService.getExternalPagesDomainConfig).mockResolvedValue({
      homepage: { isPublished: true },
      marshmallow: { isEnabled: true },
    } as never);
    vi.mocked(mockCustomerArchiveAccessService.getTalentArchiveReadiness).mockResolvedValue({
      talentId: 'talent-123',
      hasArchiveTarget: true,
      hasActiveArchiveTarget: true,
    });
    vi.mocked(mockRepository.reEnable).mockResolvedValue({
      ...draftTalent,
      lifecycleStatus: 'published',
      isActive: true,
      version: 2,
    } as never);

    await expect(
      service.reEnable('talent-123', 'tenant_test', 1, 'user-1'),
    ).resolves.toMatchObject({
      lifecycleStatus: 'published',
      version: 2,
    });
  });

  it('keeps move retired from normal product flow', async () => {
    await expect(
      service.move('talent-123', 'tenant_test', 'sub-2', 1, 'user-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('fails closed when the talent does not exist', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue(null);

    await expect(
      service.getPublishReadiness('missing', 'tenant_test'),
    ).rejects.toThrow(NotFoundException);
  });
});

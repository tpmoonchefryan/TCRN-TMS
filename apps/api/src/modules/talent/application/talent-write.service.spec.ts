// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TalentWriteRepository } from '../infrastructure/talent-write.repository';
import { TalentReadService } from './talent-read.service';
import { TalentWriteService } from './talent-write.service';

describe('TalentWriteService', () => {
  const mockReadService = {
    findById: vi.fn(),
    findByCode: vi.fn(),
    findByHomepagePath: vi.fn(),
  } as unknown as TalentReadService;

  const mockRepository = {
    hasActiveProfileStore: vi.fn(),
    findSubsidiaryPath: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteDraftTalent: vi.fn(),
  } as unknown as TalentWriteRepository;

  const service = new TalentWriteService(mockReadService, mockRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a talent after validating dependencies and uniqueness', async () => {
    vi.mocked(mockRepository.hasActiveProfileStore).mockResolvedValue(true);
    vi.mocked(mockReadService.findByCode).mockResolvedValue(null);
    vi.mocked(mockReadService.findByHomepagePath).mockResolvedValue(null);
    vi.mocked(mockRepository.findSubsidiaryPath).mockResolvedValue('/TOKYO/');
    vi.mocked(mockRepository.create).mockResolvedValue({
      id: 'talent-123',
      code: 'SORA',
      path: '/TOKYO/SORA/',
      settings: {
        homepageEnabled: true,
        marshmallowEnabled: true,
        inheritTimezone: true,
      },
    } as never);

    await expect(
      service.create(
        'tenant_test',
        {
          subsidiaryId: 'sub-1',
          profileStoreId: 'store-1',
          code: 'SORA',
          nameEn: 'Sora',
          displayName: 'Sora',
        },
        'user-1',
      ),
    ).resolves.toMatchObject({
      path: '/TOKYO/SORA/',
    });
  });

  it('fails closed when the profile store is inactive during create', async () => {
    vi.mocked(mockRepository.hasActiveProfileStore).mockResolvedValue(false);

    await expect(
      service.create(
        'tenant_test',
        {
          profileStoreId: 'store-1',
          code: 'SORA',
          nameEn: 'Sora',
          displayName: 'Sora',
        },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('fails closed when create targets a missing subsidiary', async () => {
    vi.mocked(mockRepository.hasActiveProfileStore).mockResolvedValue(true);
    vi.mocked(mockReadService.findByCode).mockResolvedValue(null);
    vi.mocked(mockReadService.findByHomepagePath).mockResolvedValue(null);
    vi.mocked(mockRepository.findSubsidiaryPath).mockResolvedValue(null);

    await expect(
      service.create(
        'tenant_test',
        {
          subsidiaryId: 'sub-1',
          profileStoreId: 'store-1',
          code: 'SORA',
          nameEn: 'Sora',
          displayName: 'Sora',
        },
        'user-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('fails closed on optimistic-lock mismatch during update', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      id: 'talent-123',
      version: 1,
      homepagePath: 'sora',
    } as never);

    await expect(
      service.update(
        'talent-123',
        'tenant_test',
        {
          version: 2,
          displayName: 'Updated',
        },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates a talent after homepage-path uniqueness validation', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      id: 'talent-123',
      version: 1,
      homepagePath: 'sora',
    } as never);
    vi.mocked(mockReadService.findByHomepagePath).mockResolvedValue(null);
    vi.mocked(mockRepository.update).mockResolvedValue({
      id: 'talent-123',
      homepagePath: 'sora-next',
      version: 2,
    } as never);

    await expect(
      service.update(
        'talent-123',
        'tenant_test',
        {
          version: 1,
          homepagePath: 'sora-next',
        },
        'user-1',
      ),
    ).resolves.toMatchObject({
      homepagePath: 'sora-next',
      version: 2,
    });
  });

  it('deletes a draft talent when no protected dependencies exist', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      id: 'talent-123',
      lifecycleStatus: 'draft',
      version: 1,
    } as never);
    vi.mocked(mockRepository.deleteDraftTalent).mockResolvedValue({
      outcome: 'deleted',
      id: 'talent-123',
    } as never);

    await expect(
      service.delete('talent-123', 'tenant_test', { version: 1 }),
    ).resolves.toEqual({
      id: 'talent-123',
      deleted: true,
    });
  });

  it('fails closed when deleting a non-draft talent', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      id: 'talent-123',
      lifecycleStatus: 'published',
      version: 1,
    } as never);

    await expect(
      service.delete('talent-123', 'tenant_test', { version: 1 }),
    ).rejects.toThrow(ConflictException);
  });

  it('fails closed when protected dependencies already exist for draft delete', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      id: 'talent-123',
      lifecycleStatus: 'draft',
      version: 1,
    } as never);
    vi.mocked(mockRepository.deleteDraftTalent).mockResolvedValue({
      outcome: 'protected_dependency',
      dependencies: {
        customerProfiles: 1,
        customerAccessLogs: 0,
        importJobs: 0,
        exportJobs: 0,
        marshmallowExportJobs: 0,
        reportJobs: 0,
        marshmallowMessages: 0,
      },
    } as never);

    await expect(
      service.delete('talent-123', 'tenant_test', { version: 1 }),
    ).rejects.toThrow(ConflictException);
  });
});

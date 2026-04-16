// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SubsidiaryWriteRepository } from '../infrastructure/subsidiary-write.repository';
import { SubsidiaryReadApplicationService } from './subsidiary-read.service';
import { SubsidiaryWriteApplicationService } from './subsidiary-write.service';

describe('SubsidiaryWriteApplicationService', () => {
  let service: SubsidiaryWriteApplicationService;

  const mockSubsidiaryWriteRepository = {
    create: vi.fn(),
    update: vi.fn(),
    deactivateCascade: vi.fn(),
    deactivateSingle: vi.fn(),
    reactivate: vi.fn(),
  };

  const mockSubsidiaryReadApplicationService = {
    findById: vi.fn(),
    findByCode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new SubsidiaryWriteApplicationService(
      mockSubsidiaryWriteRepository as unknown as SubsidiaryWriteRepository,
      mockSubsidiaryReadApplicationService as unknown as SubsidiaryReadApplicationService,
    );
  });

  it('creates a subsidiary with derived path/depth from the parent', async () => {
    mockSubsidiaryReadApplicationService.findByCode.mockResolvedValue(null);
    mockSubsidiaryReadApplicationService.findById.mockResolvedValue({
      id: 'parent-1',
      path: '/HQ/',
      depth: 1,
    });
    mockSubsidiaryWriteRepository.create.mockResolvedValue({
      id: 'subsidiary-1',
      code: 'TOKYO',
    });

    await expect(
      service.create(
        'tenant_test',
        {
          parentId: 'parent-1',
          code: 'TOKYO',
          nameEn: 'Tokyo Branch',
        },
        'user-1',
      ),
    ).resolves.toEqual({
      id: 'subsidiary-1',
      code: 'TOKYO',
    });

    expect(mockSubsidiaryWriteRepository.create).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        parentId: 'parent-1',
        code: 'TOKYO',
        path: '/HQ/TOKYO/',
        depth: 2,
      }),
      'user-1',
    );
  });

  it('keeps optimistic-lock semantics on update', async () => {
    mockSubsidiaryReadApplicationService.findById.mockResolvedValue({
      id: 'subsidiary-1',
      version: 3,
    });

    await expect(
      service.update(
        'subsidiary-1',
        'tenant_test',
        {
          nameEn: 'Tokyo Branch',
          version: 2,
        },
        'user-1',
      ),
    ).rejects.toMatchObject({
      response: {
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      },
    });
  });

  it('preserves the retired move fail-closed contract', async () => {
    await expect(
      service.move('subsidiary-1', 'tenant_test', 'parent-2', 1, 'user-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('delegates cascade deactivate and reactivation through the layered repositories', async () => {
    mockSubsidiaryReadApplicationService.findById
      .mockResolvedValueOnce({
        id: 'subsidiary-1',
        path: '/HQ/TOKYO/',
        version: 5,
      })
      .mockResolvedValueOnce({
        id: 'subsidiary-1',
        version: 6,
      });
    mockSubsidiaryWriteRepository.deactivateCascade.mockResolvedValue({
      subsidiaries: 4,
      talents: 9,
    });

    await expect(
      service.deactivate('subsidiary-1', 'tenant_test', true, 5, 'user-1'),
    ).resolves.toEqual({
      subsidiaries: 4,
      talents: 9,
    });

    mockSubsidiaryReadApplicationService.findById.mockReset();
    mockSubsidiaryReadApplicationService.findById
      .mockResolvedValueOnce({
        id: 'subsidiary-1',
        version: 6,
      })
      .mockResolvedValueOnce({
        id: 'subsidiary-1',
        code: 'TOKYO',
        version: 7,
      });

    await expect(
      service.reactivate('subsidiary-1', 'tenant_test', 6, 'user-1'),
    ).resolves.toEqual({
      id: 'subsidiary-1',
      code: 'TOKYO',
      version: 7,
    });
  });
});

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { BlocklistReadRepository } from '../infrastructure/blocklist-read.repository';
import { BlocklistReadService } from './blocklist-read.service';

describe('BlocklistReadService', () => {
  const mockRepository = {
    getScopeChain: vi.fn(),
    countMany: vi.fn(),
    findMany: vi.fn(),
    getDisabledIds: vi.fn(),
    findById: vi.fn(),
  } as unknown as BlocklistReadRepository;

  const service = new BlocklistReadService(mockRepository);

  it('returns mapped list items with inherited-scope metadata', async () => {
    vi.mocked(mockRepository.getScopeChain).mockResolvedValue([
      { type: 'tenant', id: null },
      { type: 'subsidiary', id: 'sub-1' },
    ]);
    vi.mocked(mockRepository.countMany).mockResolvedValue(2);
    vi.mocked(mockRepository.findMany).mockResolvedValue([
      {
        id: 'entry-1',
        ownerType: 'tenant',
        ownerId: null,
        pattern: 'badword',
        patternType: 'keyword',
        nameEn: 'Profanity Filter',
        nameZh: null,
        nameJa: null,
        description: null,
        category: 'profanity',
        severity: 'medium',
        action: 'reject',
        replacement: '***',
        scope: ['marshmallow'],
        inherit: true,
        sortOrder: 0,
        isActive: true,
        isForceUse: false,
        isSystem: false,
        matchCount: 3,
        lastMatchedAt: new Date('2026-04-14T00:00:00.000Z'),
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        createdBy: 'user-1',
        version: 1,
      },
      {
        id: 'entry-2',
        ownerType: 'subsidiary',
        ownerId: 'sub-1',
        pattern: 'another',
        patternType: 'keyword',
        nameEn: 'Local Filter',
        nameZh: null,
        nameJa: null,
        description: null,
        category: 'profanity',
        severity: 'low',
        action: 'flag',
        replacement: '***',
        scope: ['marshmallow'],
        inherit: true,
        sortOrder: 1,
        isActive: true,
        isForceUse: false,
        isSystem: false,
        matchCount: 0,
        lastMatchedAt: null,
        createdAt: new Date('2026-04-14T00:10:00.000Z'),
        createdBy: 'user-2',
        version: 2,
      },
    ]);
    vi.mocked(mockRepository.getDisabledIds).mockResolvedValue(
      new Set(['entry-1']),
    );

    await expect(
      service.findMany('tenant_test', {
        scopeType: 'subsidiary',
        scopeId: 'sub-1',
      }),
    ).resolves.toEqual({
      items: [
        {
          id: 'entry-2',
          ownerType: 'subsidiary',
          ownerId: 'sub-1',
          pattern: 'another',
          patternType: 'keyword',
          nameEn: 'Local Filter',
          nameZh: null,
          nameJa: null,
          description: null,
          category: 'profanity',
          severity: 'low',
          action: 'flag',
          replacement: '***',
          scope: ['marshmallow'],
          inherit: true,
          sortOrder: 1,
          isActive: true,
          isForceUse: false,
          isSystem: false,
          matchCount: 0,
          lastMatchedAt: null,
          createdAt: '2026-04-14T00:10:00.000Z',
          createdBy: 'user-2',
          version: 2,
          isInherited: false,
          isDisabledHere: false,
          canDisable: false,
        },
      ],
      total: 1,
    });
  });

  it('fails closed when the detail record does not exist', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    await expect(service.findById('tenant_test', 'missing-entry')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns the existing detail response with iso timestamps', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'entry-1',
      ownerType: 'tenant',
      ownerId: null,
      pattern: 'badword',
      patternType: 'keyword',
      nameEn: 'Profanity Filter',
      nameZh: null,
      nameJa: null,
      description: null,
      category: 'profanity',
      severity: 'medium',
      action: 'reject',
      replacement: '***',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 0,
      isActive: true,
      isForceUse: false,
      isSystem: false,
      matchCount: 3,
      lastMatchedAt: new Date('2026-04-14T00:05:00.000Z'),
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      updatedAt: new Date('2026-04-14T00:10:00.000Z'),
      createdBy: 'user-1',
      updatedBy: 'user-2',
      version: 2,
    });

    await expect(service.findById('tenant_test', 'entry-1')).resolves.toEqual({
      id: 'entry-1',
      ownerType: 'tenant',
      ownerId: null,
      pattern: 'badword',
      patternType: 'keyword',
      nameEn: 'Profanity Filter',
      nameZh: null,
      nameJa: null,
      description: null,
      category: 'profanity',
      severity: 'medium',
      action: 'reject',
      replacement: '***',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 0,
      isActive: true,
      isForceUse: false,
      isSystem: false,
      matchCount: 3,
      lastMatchedAt: '2026-04-14T00:05:00.000Z',
      createdAt: '2026-04-14T00:00:00.000Z',
      updatedAt: '2026-04-14T00:10:00.000Z',
      createdBy: 'user-1',
      updatedBy: 'user-2',
      version: 2,
    });
  });
});

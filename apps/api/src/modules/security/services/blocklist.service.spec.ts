// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlocklistReadService } from '../application/blocklist-read.service';
import { BlocklistWriteService } from '../application/blocklist-write.service';
import { BlocklistPatternType } from '../dto/security.dto';
import { BlocklistService } from './blocklist.service';

describe('BlocklistService facade', () => {
  const detailResponse = {
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
  };

  const mockReadService = {
    findMany: vi.fn(),
    findById: vi.fn(),
  } as unknown as BlocklistReadService;

  const mockWriteService = {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    test: vi.fn(),
    disableInScope: vi.fn(),
    enableInScope: vi.fn(),
  } as unknown as BlocklistWriteService;

  const service = new BlocklistService(
    mockReadService,
    mockWriteService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates blocklist read paths to the layered read service', async () => {
    vi.mocked(mockReadService.findMany).mockResolvedValue({
      items: [],
      total: 0,
    });
    vi.mocked(mockReadService.findById).mockResolvedValue({
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

    await expect(
      service.findMany('tenant_test', { scopeType: 'tenant' }),
    ).resolves.toEqual({
      items: [],
      total: 0,
    });
    await expect(service.findById('tenant_test', 'entry-1')).resolves.toMatchObject({
      id: 'entry-1',
      pattern: 'badword',
    });
  });

  it('delegates blocklist mutation paths to the layered write service', async () => {
    vi.mocked(mockWriteService.create).mockResolvedValue(detailResponse);
    vi.mocked(mockWriteService.update).mockResolvedValue(detailResponse);
    vi.mocked(mockWriteService.delete).mockResolvedValue({
      id: 'entry-1',
      deleted: true,
    });
    vi.mocked(mockWriteService.test).mockReturnValue({
      matched: false,
      positions: [],
      highlightedContent: 'hello',
    });
    vi.mocked(mockWriteService.disableInScope).mockResolvedValue({
      id: 'entry-1',
      disabled: true,
    });
    vi.mocked(mockWriteService.enableInScope).mockResolvedValue({
      id: 'entry-1',
      enabled: true,
    });

    await expect(
      service.create(
        {
          ownerType: 'tenant',
          pattern: 'badword',
          patternType: BlocklistPatternType.KEYWORD,
          nameEn: 'Profanity Filter',
        },
        { tenantSchema: 'tenant_test' },
      ),
    ).resolves.toEqual(detailResponse);
    await expect(
      service.update(
        'entry-1',
        { version: 1 },
        { tenantSchema: 'tenant_test' },
      ),
    ).resolves.toEqual(detailResponse);
    await expect(
      service.delete('entry-1', { tenantSchema: 'tenant_test' }),
    ).resolves.toEqual({
      id: 'entry-1',
      deleted: true,
    });
    expect(
      service.test({
        testContent: 'hello',
        pattern: 'badword',
        patternType: BlocklistPatternType.KEYWORD,
      }),
    ).toEqual({
      matched: false,
      positions: [],
      highlightedContent: 'hello',
    });
    await expect(
      service.disableInScope(
        'tenant_test',
        'entry-1',
        { scopeType: 'tenant' },
        'user-1',
      ),
    ).resolves.toEqual({
      id: 'entry-1',
      disabled: true,
    });
    await expect(
      service.enableInScope('tenant_test', 'entry-1', { scopeType: 'tenant' }),
    ).resolves.toEqual({
      id: 'entry-1',
      enabled: true,
    });
  });
});

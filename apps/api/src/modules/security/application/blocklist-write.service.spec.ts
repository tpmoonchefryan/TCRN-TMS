// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import { BlocklistPatternType } from '../dto/security.dto';
import { BlocklistWriteRepository } from '../infrastructure/blocklist-write.repository';
import { BlocklistMatcherService } from '../services/blocklist-matcher.service';
import { BlocklistReadService } from './blocklist-read.service';
import { BlocklistWriteService } from './blocklist-write.service';

describe('BlocklistWriteService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Admin',
    ipAddress: '127.0.0.1',
    requestId: 'req-1',
  };

  const mockRepository = {
    create: vi.fn(),
    findForWrite: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    findScopeEntryById: vi.fn(),
    disableInScope: vi.fn(),
    enableInScope: vi.fn(),
  } as unknown as BlocklistWriteRepository;

  const mockReadService = {
    findById: vi.fn(),
  } as unknown as BlocklistReadService;

  const mockTransactionClient = {
    blocklistEntry: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  };

  const mockPrisma = {
    $transaction: vi.fn(
      async (
        callback: (tx: typeof mockTransactionClient) => Promise<unknown>,
      ) => callback(mockTransactionClient),
    ),
  };

  const mockDatabaseService = {
    getPrisma: vi.fn(() => mockPrisma),
  } as unknown as DatabaseService;

  const mockChangeLogService = {
    create: vi.fn(),
  } as unknown as ChangeLogService;

  const mockMatcherService = {
    rebuildMatcher: vi.fn(),
    testPattern: vi.fn(),
  } as unknown as BlocklistMatcherService;

  const service = new BlocklistWriteService(
    mockRepository,
    mockReadService,
    mockDatabaseService,
    mockChangeLogService,
    mockMatcherService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const detailResponse = {
    id: 'entry-1',
    ownerType: 'tenant',
    ownerId: null,
    pattern: 'badword',
    patternType: 'keyword',
    nameEn: 'Profanity Filter',
    nameZh: null,
    nameJa: null,
    extraData: null,
    translations: {
      en: 'Profanity Filter',
    },
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

  it('creates an entry, writes the change log, rebuilds the matcher, and returns the read-model detail', async () => {
    vi.mocked(mockRepository.create).mockResolvedValue({ id: 'entry-1' });
    vi.mocked(mockReadService.findById).mockResolvedValue(detailResponse);

    await expect(
      service.create(
        {
          ownerType: 'tenant',
          pattern: 'badword',
          patternType: BlocklistPatternType.KEYWORD,
          nameEn: 'Profanity Filter',
        },
        context,
      ),
    ).resolves.toEqual(detailResponse);

    expect(mockChangeLogService.create).toHaveBeenCalled();
    expect(mockMatcherService.rebuildMatcher).toHaveBeenCalled();
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.anything(),
      context.tenantSchema,
      expect.any(Object),
      context.userId,
    );
    expect(mockReadService.findById).toHaveBeenCalledWith(
      context.tenantSchema,
      'entry-1',
    );
  });

  it('fails closed on invalid regex create payloads', async () => {
    await expect(
      service.create(
        {
          ownerType: 'tenant',
          pattern: '[',
          patternType: BlocklistPatternType.REGEX,
          nameEn: 'Regex Filter',
        },
        context,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('fails closed on optimistic-lock mismatch during update', async () => {
    vi.mocked(mockRepository.findForWrite).mockResolvedValue({
      id: 'entry-1',
      extraData: null,
      nameEn: 'Profanity Filter',
      nameJa: null,
      nameZh: null,
      version: 1,
    });

    await expect(
      service.update(
        'entry-1',
        {
          version: 2,
          nameEn: 'Updated Filter',
        },
        context,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('updates an entry, rebuilds the matcher, and returns the read-model detail', async () => {
    vi.mocked(mockRepository.findForWrite).mockResolvedValue({
      id: 'entry-1',
      extraData: null,
      nameEn: 'Profanity Filter',
      nameJa: null,
      nameZh: null,
      version: 1,
    });
    vi.mocked(mockReadService.findById).mockResolvedValue(detailResponse);

    await expect(
      service.update(
        'entry-1',
        {
          version: 1,
          nameEn: 'Updated Filter',
        },
        context,
      ),
    ).resolves.toEqual(detailResponse);

    expect(mockRepository.update).toHaveBeenCalled();
    expect(mockMatcherService.rebuildMatcher).toHaveBeenCalled();
    expect(mockRepository.findForWrite).toHaveBeenCalledWith(
      context.tenantSchema,
      'entry-1',
    );
    expect(mockReadService.findById).toHaveBeenCalledWith(
      context.tenantSchema,
      'entry-1',
    );
  });

  it('fails closed when deleting a missing entry', async () => {
    vi.mocked(mockRepository.findForWrite).mockResolvedValue(null);

    await expect(service.delete('missing-entry', context)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deletes an entry and rebuilds the matcher', async () => {
    vi.mocked(mockRepository.findForWrite).mockResolvedValue({
      id: 'entry-1',
      extraData: null,
      nameEn: 'Profanity Filter',
      nameJa: null,
      nameZh: null,
      version: 1,
    });

    await expect(service.delete('entry-1', context)).resolves.toEqual({
      id: 'entry-1',
      deleted: true,
    });

    expect(mockRepository.deactivate).toHaveBeenCalled();
    expect(mockMatcherService.rebuildMatcher).toHaveBeenCalled();
    expect(mockRepository.findForWrite).toHaveBeenCalledWith(
      context.tenantSchema,
      'entry-1',
    );
  });

  it('delegates pattern testing to the matcher service', () => {
    vi.mocked(mockMatcherService.testPattern).mockReturnValue({
      matched: false,
      positions: [],
      highlightedContent: 'hello',
    } as never);

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
  });

  it('fails closed when disabling a blocklist entry in its own scope', async () => {
    vi.mocked(mockRepository.findScopeEntryById).mockResolvedValue({
      id: 'entry-1',
      ownerType: 'tenant',
      ownerId: null,
      isForceUse: false,
      nameEn: 'Profanity Filter',
    });

    await expect(
      service.disableInScope(
        'tenant_test',
        'entry-1',
        { scopeType: 'tenant' },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('fails closed when disabling a force-use blocklist entry', async () => {
    vi.mocked(mockRepository.findScopeEntryById).mockResolvedValue({
      id: 'entry-1',
      ownerType: 'tenant',
      ownerId: null,
      isForceUse: true,
      nameEn: 'Profanity Filter',
    });

    await expect(
      service.disableInScope(
        'tenant_test',
        'entry-1',
        {
          scopeType: 'subsidiary',
          scopeId: 'sub-1',
        },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('disables and enables inherited entries through the repository path', async () => {
    vi.mocked(mockRepository.findScopeEntryById).mockResolvedValue({
      id: 'entry-1',
      ownerType: 'tenant',
      ownerId: null,
      isForceUse: false,
      nameEn: 'Profanity Filter',
    });

    await expect(
      service.disableInScope(
        'tenant_test',
        'entry-1',
        {
          scopeType: 'subsidiary',
          scopeId: 'sub-1',
        },
        'user-1',
      ),
    ).resolves.toEqual({
      id: 'entry-1',
      disabled: true,
    });
    await expect(
      service.enableInScope('tenant_test', 'entry-1', {
        scopeType: 'subsidiary',
        scopeId: 'sub-1',
      }),
    ).resolves.toEqual({
      id: 'entry-1',
      enabled: true,
    });

    expect(mockRepository.disableInScope).toHaveBeenCalled();
    expect(mockRepository.enableInScope).toHaveBeenCalled();
  });
});

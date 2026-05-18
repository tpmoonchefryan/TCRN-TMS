// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  createLocalizedText,
  type BlocklistScopeSummary,
  type RequestContext,
} from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import {
  BlocklistPatternType,
  BlocklistScopeCategory,
  BlocklistSurfaceScope,
} from '../dto/security.dto';
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

  const defaultScopeSummary: BlocklistScopeSummary = {
    tokens: ['marshmallow'],
    structuredScope: {
      entries: [{ category: 'surface', value: 'marshmallow' }],
    },
    unsupported: [],
  };

  const detailResponse = {
    id: 'entry-1',
    ownerType: 'tenant',
    ownerId: null,
    pattern: 'badword',
    patternType: 'keyword',
    name: createLocalizedText({ en: 'Profanity Filter' }),
    extraData: null,
    description: null,
    category: 'profanity',
    severity: 'medium',
    action: 'reject',
    replacement: '***',
    scope: ['marshmallow'],
    scopeSummary: defaultScopeSummary,
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
          name: createLocalizedText({ en: 'Profanity Filter' }),
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
          name: createLocalizedText({ en: 'Regex Filter' }),
        },
        context,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('fails closed on optimistic-lock mismatch during update', async () => {
    vi.mocked(mockRepository.findForWrite).mockResolvedValue({
      id: 'entry-1',
      extraData: null,
      name: createLocalizedText({ en: 'Profanity Filter' }),
      version: 1,
    });

    await expect(
      service.update(
        'entry-1',
        {
          version: 2,
          name: { en: 'Updated Filter' },
        },
        context,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('updates an entry, rebuilds the matcher, and returns the read-model detail', async () => {
    vi.mocked(mockRepository.findForWrite).mockResolvedValue({
      id: 'entry-1',
      extraData: null,
      name: createLocalizedText({ en: 'Profanity Filter' }),
      version: 1,
    });
    vi.mocked(mockReadService.findById).mockResolvedValue(detailResponse);

    await expect(
      service.update(
        'entry-1',
        {
          version: 1,
          name: { en: 'Updated Filter' },
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

  it('normalizes structured scope payloads before creating an entry', async () => {
    vi.mocked(mockRepository.create).mockResolvedValue({ id: 'entry-1' });
    vi.mocked(mockReadService.findById).mockResolvedValue(detailResponse);

    await service.create(
      {
        ownerType: 'tenant',
        pattern: 'badword',
        patternType: BlocklistPatternType.KEYWORD,
        name: createLocalizedText({ en: 'Structured Rule' }),
        structuredScope: {
          entries: [
            { category: BlocklistScopeCategory.TENANT },
            { category: BlocklistScopeCategory.PROFILE_STORE },
            { category: BlocklistScopeCategory.SURFACE, value: BlocklistSurfaceScope.MARSHMALLOW },
          ],
        },
      },
      context,
    );

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.anything(),
      context.tenantSchema,
      expect.objectContaining({
        scope: ['tenant', 'profile-store', 'marshmallow'],
        structuredScope: undefined,
      }),
      context.userId,
    );
  });

  it('fails closed when structured scope omits a runtime surface on create', async () => {
    await expect(
      service.create(
        {
          ownerType: 'tenant',
          pattern: 'badword',
          patternType: BlocklistPatternType.KEYWORD,
          name: createLocalizedText({ en: 'Structured Rule' }),
          structuredScope: {
            entries: [{ category: BlocklistScopeCategory.PROFILE_STORE }],
          },
        },
        context,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('still applies the legacy marshmallow default when no scope payload is provided', async () => {
    vi.mocked(mockRepository.create).mockResolvedValue({ id: 'entry-1' });
    vi.mocked(mockReadService.findById).mockResolvedValue(detailResponse);

    await service.create(
      {
        ownerType: 'tenant',
        pattern: 'badword',
        patternType: BlocklistPatternType.KEYWORD,
        name: createLocalizedText({ en: 'Default Rule' }),
      },
      context,
    );

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.anything(),
      context.tenantSchema,
      expect.objectContaining({
        scope: ['marshmallow'],
        structuredScope: undefined,
      }),
      context.userId,
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
      name: createLocalizedText({ en: 'Profanity Filter' }),
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
      name: createLocalizedText({ en: 'Profanity Filter' }),
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
      name: createLocalizedText({ en: 'Profanity Filter' }),
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
      name: createLocalizedText({ en: 'Profanity Filter' }),
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

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, ConflictException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type CreateExternalBlocklistDto,
  OwnerType,
  PatternType,
  type UpdateExternalBlocklistDto,
} from '../../dto/external-blocklist.dto';
import { ExternalBlocklistService } from '../external-blocklist.service';

const mockPrisma = {
  $queryRawUnsafe: vi.fn(),
  $executeRawUnsafe: vi.fn(),
};

const mockDatabaseService = {
  getPrisma: vi.fn(() => mockPrisma),
};

const mockRedisService = {
  del: vi.fn(),
  keys: vi.fn(),
};

const mockContext: RequestContext = {
  userId: 'user-123',
  userName: 'operator',
  tenantSchema: 'tenant_test',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
};

const buildRawRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'pattern-1',
  ownerType: OwnerType.TENANT,
  ownerId: null,
  pattern: 'spam.com',
  patternType: PatternType.DOMAIN,
  nameEn: 'Spam Domain',
  nameZh: null,
  nameJa: null,
  extraData: null,
  description: null,
  category: 'spam',
  severity: 'high',
  action: 'reject',
  replacement: '[filtered]',
  inherit: true,
  sortOrder: 0,
  isActive: true,
  isForceUse: false,
  isSystem: false,
  createdAt: new Date('2026-04-14T10:00:00Z'),
  updatedAt: new Date('2026-04-14T10:00:00Z'),
  version: 1,
  ...overrides,
});

describe('ExternalBlocklistService', () => {
  let service: ExternalBlocklistService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRedisService.del.mockResolvedValue(undefined);
    mockRedisService.keys.mockResolvedValue([]);
    mockPrisma.$queryRawUnsafe.mockReset();
    mockPrisma.$executeRawUnsafe.mockReset();

    service = new ExternalBlocklistService(
      mockDatabaseService as never,
      mockRedisService as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps inherited metadata through the layered read path', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ subsidiaryId: null, path: '001' }])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([
        buildRawRecord({
          id: 'tenant-pattern',
          ownerType: OwnerType.TENANT,
          ownerId: null,
          isForceUse: false,
        }),
        buildRawRecord({
          id: 'talent-pattern',
          ownerType: OwnerType.TALENT,
          ownerId: 'talent-123',
          isForceUse: true,
        }),
      ])
      .mockResolvedValueOnce([]);

    const result = await service.findMany('tenant_test', {
      scopeType: OwnerType.TALENT,
      scopeId: 'talent-123',
      includeDisabled: true,
    });

    expect(result.total).toBe(2);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'tenant-pattern',
        isInherited: true,
        isDisabledHere: false,
        canDisable: true,
      }),
      expect.objectContaining({
        id: 'talent-pattern',
        isInherited: false,
        isDisabledHere: false,
        canDisable: false,
      }),
    ]);
  });

  it('rejects invalid regex patterns during create', async () => {
    const dto: CreateExternalBlocklistDto = {
      ownerType: OwnerType.TALENT,
      ownerId: 'talent-123',
      pattern: '[unterminated',
      patternType: PatternType.URL_REGEX,
      nameEn: 'Broken Regex',
    };

    await expect(
      service.create('tenant_test', dto, mockContext),
    ).rejects.toThrow(BadRequestException);

    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(mockRedisService.del).not.toHaveBeenCalled();
  });

  it('returns managed translations when create includes additional locale values', async () => {
    const dto: CreateExternalBlocklistDto = {
      ownerType: OwnerType.TENANT,
      pattern: 'spam.com',
      patternType: PatternType.DOMAIN,
      nameEn: 'Spam Domain',
      translations: {
        zh_HANT: '垃圾網域',
        ko: '스팸 도메인',
      },
    };

    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      buildRawRecord({
        extraData: {
          translations: {
            zh_HANT: '垃圾網域',
            ko: '스팸 도메인',
          },
        },
      }),
    ]);

    const result = await service.create('tenant_test', dto, mockContext);

    expect(result.translations).toEqual({
      en: 'Spam Domain',
      zh_HANT: '垃圾網域',
      ko: '스팸 도메인',
    });
  });

  it('rejects invalid regex updates when an existing url_regex only changes pattern text', async () => {
    const existing = buildRawRecord({
      patternType: PatternType.URL_REGEX,
      pattern: 'discord\\.gg',
      version: 3,
    });
    const dto: UpdateExternalBlocklistDto = {
      version: 3,
      pattern: '[broken',
    };

    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([existing]);

    await expect(
      service.update('tenant_test', existing.id, dto, mockContext),
    ).rejects.toThrow(BadRequestException);

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it('enforces optimistic version conflicts before updating', async () => {
    const existing = buildRawRecord({ version: 2 });
    const dto: UpdateExternalBlocklistDto = {
      version: 1,
      nameEn: 'Updated Name',
    };

    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([existing]);

    await expect(
      service.update('tenant_test', existing.id, dto, mockContext),
    ).rejects.toThrow(ConflictException);

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it('rejects disabling a pattern from the same scope', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
      id: 'pattern-1',
      ownerType: OwnerType.TALENT,
      ownerId: 'talent-123',
      isForceUse: false,
      nameEn: 'Talent Pattern',
    }]);

    await expect(
      service.disableInScope(
        'tenant_test',
        'pattern-1',
        {
          scopeType: OwnerType.TALENT,
          scopeId: 'talent-123',
        },
        'user-123',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('rejects disabling force-use inherited patterns', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
      id: 'pattern-1',
      ownerType: OwnerType.TENANT,
      ownerId: null,
      isForceUse: true,
      nameEn: 'Tenant Pattern',
    }]);

    await expect(
      service.disableInScope(
        'tenant_test',
        'pattern-1',
        {
          scopeType: OwnerType.TALENT,
          scopeId: 'talent-123',
        },
        'user-123',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('clears only the targeted talent cache after talent-scoped create', async () => {
    const dto: CreateExternalBlocklistDto = {
      ownerType: OwnerType.TALENT,
      ownerId: 'talent-123',
      pattern: 'spam.com',
      patternType: PatternType.DOMAIN,
      nameEn: 'Spam Domain',
    };

    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      buildRawRecord({
        ownerType: OwnerType.TALENT,
        ownerId: 'talent-123',
      }),
    ]);

    await service.create('tenant_test', dto, mockContext);

    expect(mockRedisService.del).toHaveBeenCalledWith('external_blocklist:talent-123');
    expect(mockRedisService.keys).not.toHaveBeenCalled();
  });

  it('clears all external blocklist caches after tenant-scoped create', async () => {
    const dto: CreateExternalBlocklistDto = {
      ownerType: OwnerType.TENANT,
      pattern: 'blocked.example',
      patternType: PatternType.DOMAIN,
      nameEn: 'Tenant Blocklist',
    };

    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      buildRawRecord({
        ownerType: OwnerType.TENANT,
        ownerId: null,
      }),
    ]);
    mockRedisService.keys.mockResolvedValueOnce([
      'external_blocklist:talent-1',
      'external_blocklist:talent-2',
    ]);

    await service.create('tenant_test', dto, mockContext);

    expect(mockRedisService.keys).toHaveBeenCalledWith('external_blocklist:*');
    expect(mockRedisService.del).toHaveBeenCalledWith('external_blocklist:talent-1');
    expect(mockRedisService.del).toHaveBeenCalledWith('external_blocklist:talent-2');
  });
});

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

import { BlocklistService } from '../blocklist.service';
import { BlocklistMatcherService } from '../blocklist-matcher.service';
import { DatabaseService } from '../../../database';
import { ChangeLogService } from '../../../log';
import { BlocklistPatternType, BlocklistSeverity, BlocklistAction } from '../../dto/security.dto';

describe('BlocklistService', () => {
  let service: BlocklistService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockChangeLogService: Partial<ChangeLogService>;
  let mockMatcherService: Partial<BlocklistMatcherService>;
  let mockPrisma: {
    blocklistEntry: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const mockEntry = {
    id: 'entry-123',
    ownerType: 'tenant',
    ownerId: 'tenant-123',
    pattern: 'badword',
    patternType: 'exact',
    nameEn: 'Bad Word',
    nameZh: '敏感词',
    nameJa: '禁止語',
    description: 'Test blocklist entry',
    category: 'profanity',
    severity: 'high',
    action: 'block',
    replacement: '***',
    scope: ['message', 'profile'],
    inherit: true,
    isActive: true,
    matchCount: 0,
    lastMatchedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    updatedBy: 'user-123',
    version: 1,
  };

  const mockContext = {
    tenantId: 'tenant-123',
    userId: 'user-123',
    tenantSchema: 'tenant_test',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      blocklistEntry: {
        findMany: vi.fn().mockResolvedValue([mockEntry]),
        findUnique: vi.fn().mockResolvedValue(mockEntry),
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue(mockEntry),
        update: vi.fn().mockResolvedValue({ ...mockEntry, version: 2 }),
      },
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
      buildPagination: vi.fn().mockReturnValue({ skip: 0, take: 20 }),
    };

    mockChangeLogService = {
      create: vi.fn().mockResolvedValue(undefined),
    };

    mockMatcherService = {
      rebuildMatcher: vi.fn().mockResolvedValue(undefined),
      testPattern: vi.fn().mockReturnValue({
        matched: true,
        matches: [{ start: 0, end: 7, text: 'badword' }],
      }),
    };

    service = new BlocklistService(
      mockDatabaseService as DatabaseService,
      mockChangeLogService as ChangeLogService,
      mockMatcherService as BlocklistMatcherService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findMany', () => {
    it('should list blocklist entries with pagination', async () => {
      const result = await service.findMany('tenant_test', { page: 1, pageSize: 20 });

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.items[0].pattern).toBe('badword');
    });

    it('should filter by scopeType', async () => {
      await service.findMany('tenant_test', { scopeType: 'tenant' });

      expect(mockPrisma.blocklistEntry.findMany).toHaveBeenCalled();
    });

    it('should filter by category', async () => {
      await service.findMany('tenant_test', { category: 'profanity' });

      expect(mockPrisma.blocklistEntry.findMany).toHaveBeenCalled();
    });

    it('should filter by patternType', async () => {
      await service.findMany('tenant_test', { patternType: BlocklistPatternType.KEYWORD });

      expect(mockPrisma.blocklistEntry.findMany).toHaveBeenCalled();
    });

    it('should order by severity and createdAt', async () => {
      await service.findMany('tenant_test', {});

      expect(mockPrisma.blocklistEntry.findMany).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return entry by ID', async () => {
      const result = await service.findById('entry-123');

      expect(result.id).toBe('entry-123');
      expect(result.pattern).toBe('badword');
    });

    it('should throw NotFoundException for non-existent entry', async () => {
      mockPrisma.blocklistEntry.findUnique.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create new blocklist entry', async () => {
      const dto = {
        ownerType: 'tenant' as const,
        ownerId: 'tenant-123',
        pattern: 'newbadword',
        patternType: BlocklistPatternType.KEYWORD,
        nameEn: 'New Bad Word',
        nameZh: '新敏感词',
        nameJa: '新禁止語',
        category: 'profanity',
        severity: BlocklistSeverity.MEDIUM,
        action: BlocklistAction.REPLACE,
        replacement: '***',
        scope: ['message'],
      };

      const result = await service.create(dto, mockContext);

      expect(result.id).toBe('entry-123');
      expect(mockPrisma.blocklistEntry.create).toHaveBeenCalled();
      expect(mockChangeLogService.create).toHaveBeenCalled();
      expect(mockMatcherService.rebuildMatcher).toHaveBeenCalled();
    });

    it('should validate regex pattern', async () => {
      const dto = {
        ownerType: 'tenant' as const,
        pattern: '[invalid(regex',
        patternType: BlocklistPatternType.REGEX,
        nameEn: 'Invalid Regex',
        category: 'profanity',
        severity: BlocklistSeverity.LOW,
        action: BlocklistAction.REJECT,
        scope: ['message'],
      };

      await expect(service.create(dto, mockContext)).rejects.toThrow(BadRequestException);
    });

    it('should accept valid regex pattern', async () => {
      const dto = {
        ownerType: 'tenant' as const,
        pattern: '\\b(bad|word)\\b',
        patternType: BlocklistPatternType.REGEX,
        nameEn: 'Valid Regex',
        category: 'profanity',
        severity: BlocklistSeverity.LOW,
        action: BlocklistAction.REJECT,
        scope: ['message'],
      };

      await expect(service.create(dto, mockContext)).resolves.toBeDefined();
    });
  });

  describe('update', () => {
    it('should update existing entry', async () => {
      const dto = {
        version: 1,
        nameEn: 'Updated Name',
      };

      const result = await service.update('entry-123', dto, mockContext);

      expect(mockPrisma.blocklistEntry.update).toHaveBeenCalled();
      expect(mockMatcherService.rebuildMatcher).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent entry', async () => {
      mockPrisma.blocklistEntry.findUnique.mockResolvedValue(null);

      await expect(
        service.update('invalid-id', { version: 1 }, mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for version mismatch', async () => {
      const dto = {
        version: 0, // Wrong version
        nameEn: 'Updated Name',
      };

      await expect(service.update('entry-123', dto, mockContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should validate regex when pattern type changed to regex', async () => {
      const dto = {
        version: 1,
        pattern: '[invalid(',
        patternType: BlocklistPatternType.REGEX,
      };

      await expect(service.update('entry-123', dto, mockContext)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete entry', async () => {
      const result = await service.delete('entry-123', mockContext);

      expect(result.id).toBe('entry-123');
      expect(result.deleted).toBe(true);
      expect(mockPrisma.blocklistEntry.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent entry', async () => {
      mockPrisma.blocklistEntry.findUnique.mockResolvedValue(null);

      await expect(service.delete('invalid-id', mockContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should rebuild matcher after deletion', async () => {
      await service.delete('entry-123', mockContext);

      expect(mockMatcherService.rebuildMatcher).toHaveBeenCalled();
    });

    it('should log deletion', async () => {
      await service.delete('entry-123', mockContext);

      expect(mockChangeLogService.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'delete',
          objectType: 'blocklist_entry',
          objectId: 'entry-123',
        }),
        mockContext,
      );
    });
  });

  describe('test', () => {
    it('should test pattern against content', () => {
      const dto = {
        testContent: 'This contains badword here',
        pattern: 'badword',
        patternType: BlocklistPatternType.KEYWORD,
      };

      const result = service.test(dto);

      expect(result.matched).toBe(true);
      expect(mockMatcherService.testPattern).toHaveBeenCalledWith(
        'This contains badword here',
        'badword',
        BlocklistPatternType.KEYWORD,
      );
    });
  });
});

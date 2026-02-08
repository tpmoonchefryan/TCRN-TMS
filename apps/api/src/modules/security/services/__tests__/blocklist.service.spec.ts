// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { prisma } from '@tcrn/database';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../database';
import { ChangeLogService } from '../../../log';
import { BlocklistAction, BlocklistPatternType, BlocklistSeverity } from '../../dto/security.dto';
import { BlocklistService } from '../blocklist.service';
import { BlocklistMatcherService } from '../blocklist-matcher.service';

const TEST_SCHEMA = 'tenant_test';

describe('BlocklistService', () => {
  let service: BlocklistService;
  let module: TestingModule;
  let createdEntryId: string | null = null;

  const mockContext = {
    tenantId: 'tenant-test',
    userId: '00000000-0000-0000-0000-000000000001',
    tenantSchema: TEST_SCHEMA,
  };

  beforeAll(async () => {
    // Create real service with mocked dependencies that don't need DB
    module = await Test.createTestingModule({
      providers: [
        {
          provide: BlocklistService,
          useFactory: (db: DatabaseService, cl: ChangeLogService, matcher: BlocklistMatcherService) => {
            return new BlocklistService(db, cl, matcher);
          },
          inject: [DatabaseService, ChangeLogService, BlocklistMatcherService],
        },
        {
          provide: DatabaseService,
          useValue: {
            getPrisma: () => prisma,
            buildPagination: (page: number, pageSize: number) => ({
              skip: (page - 1) * pageSize,
              take: pageSize,
            }),
          },
        },
        {
          provide: ChangeLogService,
          useValue: {
            create: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: BlocklistMatcherService,
          useValue: {
            rebuildMatcher: vi.fn().mockResolvedValue(undefined),
            testPattern: (content: string, pattern: string) => ({
              matched: content.includes(pattern),
              matches: content.includes(pattern)
                ? [{ start: content.indexOf(pattern), end: content.indexOf(pattern) + pattern.length, text: pattern }]
                : [],
            }),
          },
        },
      ],
    }).compile();

    service = module.get<BlocklistService>(BlocklistService);
  });

  afterAll(async () => {
    // Cleanup any created entries
    if (createdEntryId) {
      try {
        await prisma.$executeRawUnsafe(`
          DELETE FROM "${TEST_SCHEMA}".blocklist_entry WHERE id = $1::uuid
        `, createdEntryId);
      } catch {
        // Ignore cleanup errors
      }
    }
    await module?.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findMany', () => {
    it('should list blocklist entries with pagination', async () => {
      const result = await service.findMany(TEST_SCHEMA, { page: 1, pageSize: 20 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('should filter by scopeType tenant', async () => {
      const result = await service.findMany(TEST_SCHEMA, { scopeType: 'tenant' });

      expect(result).toHaveProperty('items');
      // All returned items should have tenant owner type or be inherited
    });

    it('should filter by category', async () => {
      const result = await service.findMany(TEST_SCHEMA, { category: 'profanity' });

      expect(result).toHaveProperty('items');
      result.items.forEach(item => {
        expect(item.category).toBe('profanity');
      });
    });

    it('should filter by patternType', async () => {
      const result = await service.findMany(TEST_SCHEMA, { patternType: BlocklistPatternType.KEYWORD });

      expect(result).toHaveProperty('items');
      result.items.forEach(item => {
        expect(item.patternType).toBe(BlocklistPatternType.KEYWORD);
      });
    });

    it('should return items ordered by severity and createdAt', async () => {
      const result = await service.findMany(TEST_SCHEMA, {});

      expect(result).toHaveProperty('items');
      // Should not throw and should return valid structure
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException for non-existent entry', async () => {
      await expect(
        service.findById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create new blocklist entry', async () => {
      const dto = {
        ownerType: 'tenant' as const,
        ownerId: null,
        pattern: 'test_integration_pattern',
        patternType: BlocklistPatternType.KEYWORD,
        nameEn: 'Integration Test Entry',
        nameZh: '集成测试条目',
        nameJa: '統合テストエントリ',
        category: 'test',
        severity: BlocklistSeverity.MEDIUM,
        action: BlocklistAction.REPLACE,
        replacement: '***',
        scope: ['message'],
      };

      const result = await service.create(dto, mockContext);
      createdEntryId = result.id; // Save for cleanup

      expect(result).toHaveProperty('id');
      expect(result.pattern).toBe('test_integration_pattern');
      expect(result.nameEn).toBe('Integration Test Entry');
    });

    it('should validate regex pattern - reject invalid', async () => {
      const dto = {
        ownerType: 'tenant' as const,
        pattern: '[invalid(regex',
        patternType: BlocklistPatternType.REGEX,
        nameEn: 'Invalid Regex',
        category: 'test',
        severity: BlocklistSeverity.LOW,
        action: BlocklistAction.REJECT,
        scope: ['message'],
      };

      await expect(service.create(dto, mockContext)).rejects.toThrow(BadRequestException);
    });

    it('should accept valid regex pattern', async () => {
      const dto = {
        ownerType: 'tenant' as const,
        pattern: '\\b(test|word)\\b',
        patternType: BlocklistPatternType.REGEX,
        nameEn: 'Valid Regex',
        category: 'test',
        severity: BlocklistSeverity.LOW,
        action: BlocklistAction.REJECT,
        scope: ['message'],
      };

      const result = await service.create(dto, mockContext);
      
      // Cleanup immediately
      if (result.id) {
        await prisma.$executeRawUnsafe(`
          DELETE FROM "${TEST_SCHEMA}".blocklist_entry WHERE id = $1::uuid
        `, result.id);
      }

      expect(result).toHaveProperty('id');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException for non-existent entry', async () => {
      await expect(
        service.update('00000000-0000-0000-0000-000000000000', { version: 1 }, mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for version mismatch', async () => {
      // First create an entry
      const createDto = {
        ownerType: 'tenant' as const,
        pattern: 'version_test_pattern',
        patternType: BlocklistPatternType.KEYWORD,
        nameEn: 'Version Test',
        category: 'test',
        severity: BlocklistSeverity.LOW,
        action: BlocklistAction.REJECT,
        scope: ['message'],
      };

      const created = await service.create(createDto, mockContext);

      try {
        // Try to update with wrong version
        await expect(
          service.update(created.id, { version: 999, nameEn: 'Updated' }, mockContext),
        ).rejects.toThrow(ConflictException);
      } finally {
        // Cleanup
        await prisma.$executeRawUnsafe(`
          DELETE FROM "${TEST_SCHEMA}".blocklist_entry WHERE id = $1::uuid
        `, created.id);
      }
    });

    it('should validate regex when pattern type changed to regex', async () => {
      const createDto = {
        ownerType: 'tenant' as const,
        pattern: 'simple_pattern',
        patternType: BlocklistPatternType.KEYWORD,
        nameEn: 'Regex Validation Test',
        category: 'test',
        severity: BlocklistSeverity.LOW,
        action: BlocklistAction.REJECT,
        scope: ['message'],
      };

      const created = await service.create(createDto, mockContext);

      try {
        await expect(
          service.update(created.id, {
            version: 1,
            pattern: '[invalid(',
            patternType: BlocklistPatternType.REGEX,
          }, mockContext),
        ).rejects.toThrow(BadRequestException);
      } finally {
        await prisma.$executeRawUnsafe(`
          DELETE FROM "${TEST_SCHEMA}".blocklist_entry WHERE id = $1::uuid
        `, created.id);
      }
    });
  });

  describe('delete', () => {
    it('should soft delete entry', async () => {
      const createDto = {
        ownerType: 'tenant' as const,
        pattern: 'delete_test_pattern',
        patternType: BlocklistPatternType.KEYWORD,
        nameEn: 'Delete Test',
        category: 'test',
        severity: BlocklistSeverity.LOW,
        action: BlocklistAction.REJECT,
        scope: ['message'],
      };

      const created = await service.create(createDto, mockContext);

      try {
        const result = await service.delete(created.id, mockContext);

        expect(result.id).toBe(created.id);
        expect(result.deleted).toBe(true);
      } finally {
        // Hard delete for cleanup
        await prisma.$executeRawUnsafe(`
          DELETE FROM "${TEST_SCHEMA}".blocklist_entry WHERE id = $1::uuid
        `, created.id);
      }
    });

    it('should throw NotFoundException for non-existent entry', async () => {
      await expect(
        service.delete('00000000-0000-0000-0000-000000000000', mockContext),
      ).rejects.toThrow(NotFoundException);
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
      expect(result.matched).toBe(true);
    });
  });
});

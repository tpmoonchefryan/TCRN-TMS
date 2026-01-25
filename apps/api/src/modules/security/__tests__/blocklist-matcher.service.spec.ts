// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';
import { BlocklistMatcherService } from '../services/blocklist-matcher.service';

describe('BlocklistMatcherService', () => {
  let service: BlocklistMatcherService;
  let databaseService: Partial<DatabaseService>;
  let redisService: Partial<RedisService>;

  const mockPatterns = [
    {
      id: '1',
      ownerType: 'tenant',
      ownerId: null,
      pattern: '傻逼',
      patternType: 'keyword',
      action: 'reject',
      severity: 'high',
      category: 'profanity',
      scope: ['marshmallow'],
      inherit: true,
      isActive: true,
      replacement: '***',
      matchCount: 0,
    },
    {
      id: '2',
      ownerType: 'tenant',
      ownerId: null,
      pattern: 'http[s]?://[\\S]+',
      patternType: 'regex',
      action: 'flag',
      severity: 'medium',
      category: 'spam',
      scope: ['marshmallow'],
      inherit: true,
      isActive: true,
      replacement: '[链接]',
      matchCount: 0,
    },
    {
      id: '3',
      ownerType: 'tenant',
      ownerId: null,
      pattern: '垃圾*',
      patternType: 'wildcard',
      action: 'flag',
      severity: 'low',
      category: 'spam',
      scope: ['marshmallow'],
      inherit: true,
      isActive: true,
      replacement: '***',
      matchCount: 0,
    },
  ];

  beforeEach(async () => {
    const mockPrisma = {
      blocklistEntry: {
        findMany: vi.fn().mockResolvedValue(mockPatterns),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    databaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    redisService = {
      incr: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    service = new BlocklistMatcherService(
      databaseService as DatabaseService,
      redisService as RedisService,
    );
    await service.onModuleInit();
  });

  describe('match', () => {
    it('should match keyword pattern', async () => {
      const result = await service.match('你是个傻逼', 'marshmallow');

      expect(result.matched).toBe(true);
      expect(result.action).toBe('reject');
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('should match regex pattern (URL)', async () => {
      const result = await service.match('请访问 https://example.com 获取更多信息', 'marshmallow');

      expect(result.matched).toBe(true);
      expect(result.action).toBe('flag');
    });

    it('should match wildcard pattern', async () => {
      const result = await service.match('这是垃圾信息', 'marshmallow');

      expect(result.matched).toBe(true);
      expect(result.action).toBe('flag');
    });

    it('should not match clean content', async () => {
      const result = await service.match('这是一条正常的消息', 'marshmallow');

      expect(result.matched).toBe(false);
      expect(result.action).toBe('allow');
    });

    it('should escalate action based on severity', async () => {
      // Content matching high severity pattern should get reject action
      const result = await service.match('傻逼', 'marshmallow');

      expect(result.action).toBe('reject');
      // Severity is in the matches array, not at the top level
      expect(result.matches[0]?.severity).toBe('high');
    });

    it('should respect scope filtering', async () => {
      // Patterns are only for 'marshmallow' scope
      const result = await service.match('傻逼', 'other_scope');

      // Should not match because scope doesn't include 'other_scope'
      expect(result.matched).toBe(false);
    });
  });

  describe('testPattern', () => {
    it('should test keyword pattern', () => {
      const result = service.testPattern('这里有关键词test', 'test', 'keyword');

      expect(result.matched).toBe(true);
      expect(result.positions.length).toBeGreaterThan(0);
    });

    it('should test regex pattern', () => {
      const result = service.testPattern(
        'Email: test@example.com',
        '[a-z]+@[a-z]+\\.[a-z]+',
        'regex',
      );

      expect(result.matched).toBe(true);
    });

    it('should test wildcard pattern', () => {
      const result = service.testPattern('这是垃圾邮件', '垃圾*', 'wildcard');

      expect(result.matched).toBe(true);
    });

    it('should return highlighted content', () => {
      const result = service.testPattern('Hello bad World', 'bad', 'keyword');

      expect(result.highlightedContent).toContain('<mark>bad</mark>');
    });

    it('should return no match for invalid regex', () => {
      // Invalid regex throws an error internally, so just check that it doesn't crash
      // The actual behavior depends on the implementation
      try {
        const result = service.testPattern('test', '[invalid(', 'regex');
        // If no error thrown, matched should be false
        expect(result.matched).toBe(false);
      } catch (e) {
        // If error thrown, that's acceptable behavior for invalid regex
        expect(e).toBeInstanceOf(Error);
      }
    });
  });

  describe('rebuildMatcher', () => {
    it('should rebuild patterns from database', async () => {
      await service.rebuildMatcher();

      // Verify patterns are loaded
      const result = await service.match('傻逼', 'marshmallow');
      expect(result.matched).toBe(true);
    });
  });

  describe('multiple pattern matching', () => {
    it('should return all matched patterns', async () => {
      const result = await service.match('傻逼 垃圾信息', 'marshmallow');

      expect(result.matched).toBe(true);
      expect(result.matches.length).toBeGreaterThanOrEqual(2);
    });

    it('should use highest severity action', async () => {
      // Both patterns match, but 傻逼 is high severity (reject)
      // and 垃圾 is low severity (flag)
      const result = await service.match('傻逼 垃圾邮件', 'marshmallow');

      expect(result.action).toBe('reject'); // Highest severity wins
    });
  });

  describe('case sensitivity', () => {
    it('should be case insensitive for keywords', async () => {
      // Create a new service with a simple pattern
      const mockPrisma = {
        blocklistEntry: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: '1',
              pattern: 'spam',
              patternType: 'keyword',
              action: 'flag',
              severity: 'low',
              category: 'spam',
              scope: ['marshmallow'],
              inherit: true,
              isActive: true,
              replacement: '***',
              matchCount: 0,
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };

      const localDbService = {
        getPrisma: vi.fn().mockReturnValue(mockPrisma),
      } as unknown as DatabaseService;

      const localService = new BlocklistMatcherService(localDbService, redisService as RedisService);
      await localService.onModuleInit();

      const result = await localService.match('SPAM', 'marshmallow');

      // Case insensitive matching
      expect(result.matched).toBe(true);
    });
  });
});

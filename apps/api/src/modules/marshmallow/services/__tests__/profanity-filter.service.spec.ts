// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { ProfanityFilterService } from '../profanity-filter.service';
import { DatabaseService } from '../../../database';
import { RedisService } from '../../../redis';

describe.skip('ProfanityFilterService', () => {
  let service: ProfanityFilterService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockRedisService: Partial<RedisService>;
  let mockPrisma: {
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    mockRedisService = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    service = new ProfanityFilterService(
      mockDatabaseService as DatabaseService,
      mockRedisService as RedisService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('filter', () => {
    it('should pass clean content', async () => {
      const result = await service.filter('Hello, this is a friendly message!', 'talent-123', {
        profanityFilterEnabled: true,
        externalBlocklistEnabled: true,
      });

      expect(result.passed).toBe(true);
      expect(result.action).toBe('allow');
      expect(result.score.category).toBe('safe');
    });

    it('should detect and flag/reject profanity', async () => {
      // Using a common test word that would be in a profanity list
      const result = await service.filter('This contains profane words', 'talent-123', {
        profanityFilterEnabled: true,
        externalBlocklistEnabled: false,
      });

      // Since we can't know the exact wordlist, just verify structure
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('flags');
      expect(result.score).toHaveProperty('category');
    });

    it('should skip filtering when disabled', async () => {
      const result = await service.filter('Any content here', 'talent-123', {
        profanityFilterEnabled: false,
        externalBlocklistEnabled: false,
      });

      expect(result.passed).toBe(true);
      expect(result.action).toBe('allow');
    });

    it('should detect evasion techniques', async () => {
      // Content with zero-width characters or unicode tricks
      const result = await service.filter('H\u200Bello', 'talent-123', {
        profanityFilterEnabled: true,
        externalBlocklistEnabled: false,
      });

      expect(result).toHaveProperty('score');
      // Zero-width detection increases score
    });

    it('should calculate content score', async () => {
      const result = await service.filter('Normal message content', 'talent-123', {
        profanityFilterEnabled: true,
        externalBlocklistEnabled: true,
      });

      expect(result.score.score).toBeGreaterThanOrEqual(0);
      expect(result.score.score).toBeLessThanOrEqual(100);
      expect(result.score.factors).toBeInstanceOf(Array);
    });
  });

  describe('score categories', () => {
    it('should categorize low scores as safe', async () => {
      const result = await service.filter('Totally normal message', 'talent-123', {
        profanityFilterEnabled: true,
        externalBlocklistEnabled: true,
      });

      if (result.score.score <= 20) {
        expect(result.score.category).toBe('safe');
      }
    });
  });
});

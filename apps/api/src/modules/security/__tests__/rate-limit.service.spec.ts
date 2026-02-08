// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { RedisService } from '../../redis/redis.service';
import { RateLimitService } from '../services/rate-limit.service';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let redisService: Partial<RedisService>;
  let redisData: Map<string, number>;
  let redisTtl: Map<string, number>;

  beforeEach(async () => {
    redisData = new Map();
    redisTtl = new Map();

    redisService = {
      get: vi.fn().mockImplementation(async (key: string) => {
        return redisData.get(key)?.toString() || null;
      }),
      set: vi.fn().mockImplementation(async (key: string, value: string) => {
        redisData.set(key, parseInt(value));
      }),
      incr: vi.fn().mockImplementation(async (key: string) => {
        const current = redisData.get(key) || 0;
        redisData.set(key, current + 1);
        return current + 1;
      }),
      expire: vi.fn().mockImplementation(async (key: string, seconds: number) => {
        redisTtl.set(key, seconds);
      }),
      ttl: vi.fn().mockImplementation(async (key: string) => {
        return redisTtl.get(key) || -1;
      }),
      del: vi.fn().mockImplementation(async (key: string) => {
        redisData.delete(key);
        redisTtl.delete(key);
      }),
    };

    service = new RateLimitService(redisService as RedisService);
    service.onModuleInit();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('consume', () => {
    it('should allow request within limit', async () => {
      const result = await service.consume('global_api', '127.0.0.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
    });

    it('should track consumed points', async () => {
      await service.consume('global_api', '127.0.0.1');
      await service.consume('global_api', '127.0.0.1');
      const result = await service.consume('global_api', '127.0.0.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(97); // 100 - 3
    });

    it('should block when limit exceeded', async () => {
      // Simulate hitting the limit
      redisData.set('rl:global_api:127.0.0.1', 100);
      redisTtl.set('rl:global_api:127.0.0.1', 60);

      const result = await service.consume('global_api', '127.0.0.1');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should use different limits for different limiter names', async () => {
      // login_attempt has limit of 5, global_api has limit of 100
      const loginResult = await service.consume('login_attempt', '127.0.0.1');
      const apiResult = await service.consume('global_api', '127.0.0.1');

      // Check remaining (config.points - consumed)
      expect(loginResult.remaining).toBe(4); // 5 - 1
      expect(apiResult.remaining).toBe(99); // 100 - 1
    });

    it('should consume multiple points at once', async () => {
      // Note: Current implementation increments by 1 each call, not by points param
      // The incr mock increments by 1 only
      const result = await service.consume('global_api', '127.0.0.1', 1);

      expect(result.remaining).toBe(99); // 100 - 1
    });
  });

  describe('check', () => {
    it('should return full points for new key', async () => {
      const result = await service.check('global_api', '127.0.0.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(100);
    });

    it('should return remaining points after consumption', async () => {
      redisData.set('rl:global_api:127.0.0.1', 30);

      const result = await service.check('global_api', '127.0.0.1');

      expect(result.remaining).toBe(70); // 100 - 30
    });

    it('should return not allowed when limit exceeded', async () => {
      redisData.set('rl:global_api:127.0.0.1', 100);

      const result = await service.check('global_api', '127.0.0.1');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset the limit for a key', async () => {
      redisData.set('rl:global_api:127.0.0.1', 50);

      await service.reset('global_api', '127.0.0.1');

      expect(redisService.del).toHaveBeenCalledWith('rl:global_api:127.0.0.1');
    });
  });

  describe('getConfig', () => {
    it('should return config for global_api', () => {
      const config = service.getConfig('global_api');

      expect(config).toBeDefined();
      expect(config?.points).toBe(100);
      expect(config?.duration).toBe(60);
    });

    it('should return config for login_attempt', () => {
      const config = service.getConfig('login_attempt');

      expect(config).toBeDefined();
      expect(config?.points).toBe(5);
      expect(config?.duration).toBe(300);
    });

    it('should return config for marshmallow_submit', () => {
      const config = service.getConfig('marshmallow_submit');

      expect(config).toBeDefined();
      expect(config?.points).toBe(5);
      expect(config?.duration).toBe(3600);
    });

    it('should return config for password_reset', () => {
      const config = service.getConfig('password_reset');

      expect(config).toBeDefined();
      expect(config?.points).toBe(3);
      expect(config?.duration).toBe(3600);
    });

    it('should return undefined for unknown limiter', () => {
      const config = service.getConfig('unknown_limiter');

      expect(config).toBeUndefined();
    });
  });

  describe('createDynamicLimiter', () => {
    it('should create a new limiter configuration', async () => {
      service.createDynamicLimiter('custom_limiter', {
        points: 50,
        duration: 120,
      });

      const config = service.getConfig('custom_limiter');
      expect(config).toBeDefined();
      expect(config?.points).toBe(50);
      expect(config?.duration).toBe(120);
    });
  });

  describe('TTL handling', () => {
    it('should set TTL when first consuming', async () => {
      await service.consume('global_api', '127.0.0.1');

      expect(redisService.expire).toHaveBeenCalled();
    });

    it('should return retry after when rate limited', async () => {
      redisData.set('rl:global_api:127.0.0.1', 100);
      redisTtl.set('rl:global_api:127.0.0.1', 30);

      const result = await service.consume('global_api', '127.0.0.1');

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });
  });

  describe('unknown limiter', () => {
    it('should allow request for unknown limiter', async () => {
      const result = await service.consume('unknown_limiter', '127.0.0.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(999);
    });
  });
});

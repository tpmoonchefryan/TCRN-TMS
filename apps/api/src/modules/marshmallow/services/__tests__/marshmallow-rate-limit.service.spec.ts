// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { RedisService } from '../../../redis';
import { MarshmallowRateLimitService, RateLimitConfig } from '../marshmallow-rate-limit.service';

describe.skip('MarshmallowRateLimitService', () => {
  let service: MarshmallowRateLimitService;
  let mockRedisService: Partial<RedisService>;

  const mockConfig: RateLimitConfig = {
    rateLimitPerIp: 10,
    rateLimitWindowHours: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRedisService = {
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      ttl: vi.fn().mockResolvedValue(3600),
      del: vi.fn().mockResolvedValue(1),
    };

    service = new MarshmallowRateLimitService(mockRedisService as RedisService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow first request', async () => {
      const result = await service.checkRateLimit(
        'config-123',
        '192.168.1.1',
        'fingerprint-abc',
        mockConfig,
      );

      expect(result.allowed).toBe(true);
    });

    it('should track request count', async () => {
      await service.checkRateLimit(
        'config-123',
        '192.168.1.1',
        'fingerprint-abc',
        mockConfig,
      );

      expect(mockRedisService.incr).toHaveBeenCalled();
    });

    it('should reject when IP limit exceeded', async () => {
      (mockRedisService.incr as ReturnType<typeof vi.fn>).mockResolvedValue(11);

      const result = await service.checkRateLimit(
        'config-123',
        '192.168.1.1',
        'fingerprint-abc',
        mockConfig,
      );

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reject when fingerprint limit exceeded', async () => {
      // First call returns IP count (ok)
      // Second call returns fingerprint count (exceeded)
      (mockRedisService.incr as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(5)   // IP
        .mockResolvedValueOnce(21); // fingerprint (limit is 2x IP limit = 20)

      const result = await service.checkRateLimit(
        'config-123',
        '192.168.1.1',
        'fingerprint-abc',
        mockConfig,
      );

      expect(result.allowed).toBe(false);
    });

    it('should set correct TTL for counters', async () => {
      await service.checkRateLimit(
        'config-123',
        '192.168.1.1',
        'fingerprint-abc',
        mockConfig,
      );

      expect(mockRedisService.expire).toHaveBeenCalled();
    });

    it('should track by both IP and fingerprint', async () => {
      await service.checkRateLimit(
        'config-123',
        '192.168.1.1',
        'fingerprint-abc',
        mockConfig,
      );

      // Should have made calls for IP-based and fingerprint-based counters
      expect(mockRedisService.incr).toHaveBeenCalledTimes(3); // IP + fingerprint + global
    });
  });

  describe('getStatus', () => {
    it('should return current rate limit counts', async () => {
      (mockRedisService.get as ReturnType<typeof vi.fn>).mockResolvedValue('5');

      const result = await service.getStatus(
        'config-123',
        '192.168.1.1',
        'fingerprint-abc',
      );

      expect(result).toHaveProperty('ipCount');
      expect(result).toHaveProperty('fpCount');
      expect(result).toHaveProperty('globalCount');
    });
  });
});

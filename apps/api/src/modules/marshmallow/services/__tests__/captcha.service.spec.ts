// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';

import { CaptchaService } from '../captcha.service';
import { RedisService } from '../../../redis';
import { TrustScoreService } from '../trust-score.service';
import { CaptchaMode } from '../../dto/marshmallow.dto';

describe('CaptchaService', () => {
  let service: CaptchaService;
  let mockRedisService: Partial<RedisService>;
  let mockConfigService: Partial<ConfigService>;
  let mockTrustScoreService: Partial<TrustScoreService>;

  const mockContext = {
    ip: '192.168.1.100',
    fingerprint: 'test-fingerprint',
    userAgent: 'Mozilla/5.0 Chrome/120.0',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRedisService = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(undefined),
      scard: vi.fn().mockResolvedValue(1),
      sadd: vi.fn().mockResolvedValue(1),
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue(null),
    };

    mockTrustScoreService = {
      getTrustScore: vi.fn().mockResolvedValue({
        score: 50,
        level: 'neutral',
        factors: [],
        lastUpdated: Date.now(),
      }),
    };

    service = new CaptchaService(
      mockRedisService as RedisService,
      mockConfigService as ConfigService,
      mockTrustScoreService as TrustScoreService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('shouldRequireCaptcha', () => {
    it('should reject honeypot triggered requests', async () => {
      const result = await service.shouldRequireCaptcha(CaptchaMode.AUTO, {
        ...mockContext,
        honeypotValue: 'bot-filled-this',
      });

      expect(result.required).toBe(true);
      expect(result.forceReject).toBe(true);
      expect(result.reason).toBe('honeypot_triggered');
    });

    it('should always require CAPTCHA in ALWAYS mode', async () => {
      const result = await service.shouldRequireCaptcha(CaptchaMode.ALWAYS, mockContext);

      expect(result.required).toBe(true);
      expect(result.reason).toBe('config_always');
    });

    it('should never require CAPTCHA in NEVER mode', async () => {
      const result = await service.shouldRequireCaptcha(CaptchaMode.NEVER, mockContext);

      expect(result.required).toBe(false);
    });

    it.skip('should not require CAPTCHA for first few requests in AUTO mode', async () => {
      const result = await service.shouldRequireCaptcha(CaptchaMode.AUTO, mockContext);

      expect(result.required).toBe(false);
    });

    it.skip('should require CAPTCHA when IP threshold exceeded in AUTO mode', async () => {
      (mockRedisService.incr as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      const result = await service.shouldRequireCaptcha(CaptchaMode.AUTO, mockContext);

      expect(result.required).toBe(true);
      expect(result.reason).toBe('ip_rate_limit');
    });

    it.skip('should require CAPTCHA for low trust score in AUTO mode', async () => {
      (mockTrustScoreService.getTrustScore as ReturnType<typeof vi.fn>).mockResolvedValue({
        score: 30,
        level: 'suspicious',
        factors: [],
        lastUpdated: Date.now(),
      });

      const result = await service.shouldRequireCaptcha(CaptchaMode.AUTO, mockContext);

      expect(result.required).toBe(true);
      expect(result.reason).toBe('low_trust_score');
    });

    it.skip('should require CAPTCHA when multiple fingerprints from same IP', async () => {
      (mockRedisService.scard as ReturnType<typeof vi.fn>).mockResolvedValue(6);

      const result = await service.shouldRequireCaptcha(CaptchaMode.AUTO, mockContext);

      expect(result.required).toBe(true);
      expect(result.reason).toBe('multiple_fingerprints');
    });
  });
});

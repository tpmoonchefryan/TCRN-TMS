// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { RedisService } from '../../redis';

export interface RateLimitResult {
  allowed: boolean;
  reason?: 'ip_limit' | 'fingerprint_limit' | 'global_limit';
  retryAfter?: number;
}

export interface RateLimitConfig {
  rateLimitPerIp: number;
  rateLimitWindowHours: number;
}

@Injectable()
export class MarshmallowRateLimitService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Check if request is within rate limits
   */
  async checkRateLimit(
    configId: string,
    ip: string,
    fingerprint: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const windowSeconds = config.rateLimitWindowHours * 3600;

    // 1. IP rate limit
    const ipKey = `rl:marshmallow:ip:${configId}:${ip}`;
    const ipCount = await this.redisService.incr(ipKey);
    if (ipCount === 1) {
      await this.redisService.expire(ipKey, windowSeconds);
    }

    if (ipCount > config.rateLimitPerIp) {
      const ttl = await this.redisService.ttl(ipKey);
      return {
        allowed: false,
        reason: 'ip_limit',
        retryAfter: ttl > 0 ? ttl : windowSeconds,
      };
    }

    // 2. Fingerprint rate limit (2x IP limit to avoid NAT issues)
    const fpLimit = config.rateLimitPerIp * 2;
    const fpKey = `rl:marshmallow:fp:${configId}:${fingerprint}`;
    const fpCount = await this.redisService.incr(fpKey);
    if (fpCount === 1) {
      await this.redisService.expire(fpKey, windowSeconds);
    }

    if (fpCount > fpLimit) {
      const ttl = await this.redisService.ttl(fpKey);
      return {
        allowed: false,
        reason: 'fingerprint_limit',
        retryAfter: ttl > 0 ? ttl : windowSeconds,
      };
    }

    // 3. Global rate limit (100 messages per minute per config)
    const globalKey = `rl:marshmallow:global:${configId}`;
    const globalCount = await this.redisService.incr(globalKey);
    if (globalCount === 1) {
      await this.redisService.expire(globalKey, 60);
    }

    if (globalCount > 100) {
      return {
        allowed: false,
        reason: 'global_limit',
        retryAfter: 60,
      };
    }

    return { allowed: true };
  }

  /**
   * Reset rate limit for IP (admin use)
   */
  async resetIpLimit(configId: string, ip: string): Promise<void> {
    const ipKey = `rl:marshmallow:ip:${configId}:${ip}`;
    await this.redisService.del(ipKey);
  }

  /**
   * Get current rate limit status
   */
  async getStatus(configId: string, ip: string, fingerprint: string): Promise<{
    ipCount: number;
    fpCount: number;
    globalCount: number;
  }> {
    const [ipCount, fpCount, globalCount] = await Promise.all([
      this.redisService.get(`rl:marshmallow:ip:${configId}:${ip}`),
      this.redisService.get(`rl:marshmallow:fp:${configId}:${fingerprint}`),
      this.redisService.get(`rl:marshmallow:global:${configId}`),
    ]);

    return {
      ipCount: parseInt(ipCount || '0', 10),
      fpCount: parseInt(fpCount || '0', 10),
      globalCount: parseInt(globalCount || '0', 10),
    };
  }
}

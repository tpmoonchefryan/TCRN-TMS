// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

import { RedisService } from '../../redis';

interface RateLimitConfig {
  points: number;
  duration: number;
  blockDuration?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

const DEFAULT_LIMITERS: Record<string, RateLimitConfig> = {
  global_api: { points: 100, duration: 60, blockDuration: 60 },
  admin_api: { points: 200, duration: 60, blockDuration: 30 },
  public_page: { points: 60, duration: 60, blockDuration: 60 },
  login_attempt: { points: 5, duration: 300, blockDuration: 900 },
  marshmallow_submit: { points: 5, duration: 3600, blockDuration: 3600 },
  password_reset: { points: 3, duration: 3600, blockDuration: 3600 },
};

@Injectable()
export class RateLimitService implements OnModuleInit {
  private readonly logger = new Logger(RateLimitService.name);
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor(private readonly redisService: RedisService) {}

  onModuleInit() {
    for (const [name, config] of Object.entries(DEFAULT_LIMITERS)) {
      this.configs.set(name, config);
    }
  }

  /**
   * Check and consume rate limit quota
   */
  async consume(
    limiterName: string,
    key: string,
    points: number = 1,
  ): Promise<RateLimitResult> {
    const config = this.configs.get(limiterName);
    if (!config) {
      this.logger.warn(`Unknown limiter: ${limiterName}`);
      return { allowed: true, remaining: 999, resetAt: new Date() };
    }

    const redisKey = `rl:${limiterName}:${key}`;

    // Get current count
    const current = await this.redisService.incr(redisKey);

    // Set expiry on first request
    if (current === points) {
      await this.redisService.expire(redisKey, config.duration);
    }

    const ttl = await this.redisService.ttl(redisKey);
    const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : config.duration * 1000));

    if (current > config.points) {
      // Block if exceeded
      if (config.blockDuration && config.blockDuration > config.duration) {
        await this.redisService.expire(redisKey, config.blockDuration);
      }

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: ttl > 0 ? ttl : config.blockDuration || config.duration,
      };
    }

    return {
      allowed: true,
      remaining: config.points - current,
      resetAt,
    };
  }

  /**
   * Check rate limit status without consuming
   */
  async check(limiterName: string, key: string): Promise<RateLimitResult> {
    const config = this.configs.get(limiterName);
    if (!config) {
      return { allowed: true, remaining: 999, resetAt: new Date() };
    }

    const redisKey = `rl:${limiterName}:${key}`;
    const currentStr = await this.redisService.get(redisKey);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    const ttl = await this.redisService.ttl(redisKey);

    return {
      allowed: current < config.points,
      remaining: Math.max(0, config.points - current),
      resetAt: new Date(Date.now() + (ttl > 0 ? ttl * 1000 : config.duration * 1000)),
      retryAfter: current >= config.points ? (ttl > 0 ? ttl : config.duration) : undefined,
    };
  }

  /**
   * Reset rate limit for a key
   */
  async reset(limiterName: string, key: string): Promise<void> {
    const redisKey = `rl:${limiterName}:${key}`;
    await this.redisService.del(redisKey);
  }

  /**
   * Create a dynamic limiter
   */
  createDynamicLimiter(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config);
  }

  /**
   * Get limiter config
   */
  getConfig(limiterName: string): RateLimitConfig | undefined {
    return this.configs.get(limiterName);
  }
}

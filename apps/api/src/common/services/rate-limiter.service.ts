// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';

/**
 * Rate Limiter Service
 * Implements Redis-based rate limiting for public endpoints
 */
@Injectable()
export class RateLimiterService implements OnModuleInit {
  private readonly logger = new Logger(RateLimiterService.name);
  private rateLimiter: RateLimiterRedis | null = null;
  private redisClient: Redis | null = null;

  // Known search engine crawlers (exempted from rate limiting)
  private readonly allowedBots = [
    'Googlebot',
    'Bingbot',
    'Slurp',           // Yahoo
    'DuckDuckBot',
    'Baiduspider',
    'YandexBot',
    'facebookexternalhit',
    'Twitterbot',
    'LinkedInBot',
    'Discordbot',
  ];

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not configured, rate limiting disabled');
      return;
    }

    try {
      this.redisClient = new Redis(redisUrl, {
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      });

      this.redisClient.on('error', (err) => {
        this.logger.error(`Redis connection error: ${err.message}`);
      });

      this.rateLimiter = new RateLimiterRedis({
        storeClient: this.redisClient,
        keyPrefix: 'rl_public',
        points: 60,            // 60 requests
        duration: 60,          // per 60 seconds (1 minute)
        blockDuration: 60,     // Block for 60 seconds if exceeded
      });

      this.logger.log('Rate limiter initialized with Redis');
    } catch (error) {
      this.logger.error(`Failed to initialize rate limiter: ${error}`);
    }
  }

  /**
   * Check if user agent is an allowed bot
   */
  isAllowedBot(userAgent: string | undefined): boolean {
    if (!userAgent) return false;
    return this.allowedBots.some(bot => 
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );
  }

  /**
   * Check if IP is whitelisted
   */
  isWhitelistedIp(ip: string): boolean {
    const whitelist = this.configService.get<string>('RATE_LIMIT_WHITELIST') || '';
    const whitelistedIps = whitelist.split(',').map(s => s.trim()).filter(Boolean);
    return whitelistedIps.includes(ip);
  }

  /**
   * Consume rate limit points
   * @returns null if allowed, RateLimiterRes if blocked
   */
  async consume(key: string): Promise<RateLimiterRes | null> {
    if (!this.rateLimiter) {
      // Rate limiting disabled
      return null;
    }

    try {
      await this.rateLimiter.consume(key);
      return null;
    } catch (rateLimiterRes) {
      if (rateLimiterRes instanceof RateLimiterRes) {
        return rateLimiterRes;
      }
      // Redis error - allow request but log
      this.logger.error(`Rate limiter error: ${rateLimiterRes}`);
      return null;
    }
  }

  /**
   * Get remaining points for a key
   */
  async getRemainingPoints(key: string): Promise<number> {
    if (!this.rateLimiter) {
      return 60;
    }

    try {
      const res = await this.rateLimiter.get(key);
      return res ? res.remainingPoints : 60;
    } catch {
      return 60;
    }
  }

  /**
   * Check rate limit and return result
   */
  async checkRateLimit(
    ip: string,
    userAgent: string | undefined,
  ): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
    // Check whitelist
    if (this.isWhitelistedIp(ip)) {
      return { allowed: true, remaining: 999 };
    }

    // Check allowed bots
    if (this.isAllowedBot(userAgent)) {
      return { allowed: true, remaining: 999 };
    }

    // Check rate limit
    const result = await this.consume(ip);
    
    if (result) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil(result.msBeforeNext / 1000),
      };
    }

    const remaining = await this.getRemainingPoints(ip);
    return { allowed: true, remaining };
  }
}

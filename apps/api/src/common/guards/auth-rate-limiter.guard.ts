// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';

import { TechEventLogService } from '../../modules/log/services/tech-event-log.service';

/**
 * Auth Rate Limiter Guard
 * Specialized rate limiting for authentication endpoints with:
 * - Stricter limits (10 requests per minute for general auth, 5 for login)
 * - Login failure accumulation (5 failures = 15 min lockout)
 */
@Injectable()
export class AuthRateLimiterGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(AuthRateLimiterGuard.name);
  private generalLimiter: RateLimiterRedis | null = null;
  private loginLimiter: RateLimiterRedis | null = null;
  private loginFailureLimiter: RateLimiterRedis | null = null;
  private redisClient: Redis | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly techEventLogService: TechEventLogService,
  ) {}

  async onModuleInit() {
    await this.initializeLimiters();
  }

  private async initializeLimiters() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn('REDIS_URL not configured, auth rate limiting disabled');
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

      // General auth endpoints: 10 requests per minute
      this.generalLimiter = new RateLimiterRedis({
        storeClient: this.redisClient,
        keyPrefix: 'rl_auth_general',
        points: 10,
        duration: 60,
        blockDuration: 60,
      });

      // Login endpoint: 5 attempts per minute
      this.loginLimiter = new RateLimiterRedis({
        storeClient: this.redisClient,
        keyPrefix: 'rl_auth_login',
        points: 5,
        duration: 60,
        blockDuration: 120, // 2 minute block
      });

      // Login failure tracking: 5 failures = 15 minute lockout
      this.loginFailureLimiter = new RateLimiterRedis({
        storeClient: this.redisClient,
        keyPrefix: 'rl_auth_failure',
        points: 5,
        duration: 900, // 15 minutes window
        blockDuration: 900, // 15 minute lockout
      });

      this.logger.log('Auth rate limiters initialized with Redis');
    } catch (error) {
      this.logger.error(`Failed to initialize auth rate limiters: ${error}`);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    const ip = this.getClientIp(request);
    const path = request.path;
    const isLoginEndpoint = path.includes('/auth/login');

    // Check login failure lockout first
    if (isLoginEndpoint && this.loginFailureLimiter) {
      try {
        const failureRes = await this.loginFailureLimiter.get(ip);
        if (failureRes && failureRes.remainingPoints <= 0) {
          await this.logBlockedRequest(ip, path, 'login_failure_lockout');
          const retryAfter = Math.ceil(failureRes.msBeforeNext / 1000);
          response.setHeader('Retry-After', retryAfter.toString());
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'Too many failed login attempts. Please try again later.',
              code: 'AUTH_RATE_LIMIT_EXCEEDED',
              retryAfter,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      } catch (error) {
        if (error instanceof HttpException) throw error;
        this.logger.error(`Login failure check error: ${error}`);
      }
    }

    // Apply rate limit based on endpoint type
    const limiter = isLoginEndpoint ? this.loginLimiter : this.generalLimiter;
    const limit = isLoginEndpoint ? 5 : 10;

    if (!limiter) {
      return true; // Rate limiting disabled
    }

    try {
      const result = await limiter.consume(ip);
      response.setHeader('X-RateLimit-Limit', limit.toString());
      response.setHeader('X-RateLimit-Remaining', result.remainingPoints.toString());
      return true;
    } catch (rateLimiterRes) {
      await this.logBlockedRequest(ip, path, 'rate_limit_exceeded');
      
      const retryAfter = Math.ceil((rateLimiterRes as { msBeforeNext: number }).msBeforeNext / 1000);
      response.setHeader('Retry-After', retryAfter.toString());
      response.setHeader('X-RateLimit-Limit', limit.toString());
      response.setHeader('X-RateLimit-Remaining', '0');

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Record a login failure for the given IP
   * Call this from AuthService when login fails
   */
  async recordLoginFailure(ip: string): Promise<void> {
    if (!this.loginFailureLimiter) return;

    try {
      await this.loginFailureLimiter.consume(ip);
    } catch {
      // Already at limit - will be blocked on next request
    }
  }

  /**
   * Clear login failures for an IP after successful login
   */
  async clearLoginFailures(ip: string): Promise<void> {
    if (!this.loginFailureLimiter) return;

    try {
      await this.loginFailureLimiter.delete(ip);
    } catch (error) {
      this.logger.error(`Failed to clear login failures: ${error}`);
    }
  }

  private getClientIp(request: Request): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const ips = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : xForwardedFor.split(',')[0];
      return ips.trim();
    }

    const xRealIp = request.headers['x-real-ip'];
    if (xRealIp) {
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    }

    return request.ip || request.socket?.remoteAddress || 'unknown';
  }

  private async logBlockedRequest(
    ip: string,
    path: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.techEventLogService.warn(
        'SECURITY_AUTH_RATE_LIMIT_BLOCKED',
        `Auth request blocked: ${reason}`,
        {
          ip,
          path,
          reason,
          source: 'AuthRateLimiterGuard',
        },
      );
    } catch (error) {
      this.logger.error(`Failed to log blocked request: ${error}`);
    }
  }
}

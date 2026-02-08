// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction,Request, Response } from 'express';

import { RateLimitService } from '../services/rate-limit.service';

@Injectable()
export class GlobalRateLimitMiddleware implements NestMiddleware {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = this.getClientIp(req);
    const limiterName = this.getLimiterName(req.path);

    const result = await this.rateLimitService.consume(limiterName, ip);

    // Set rate limit headers
    const config = this.rateLimitService.getConfig(limiterName);
    if (config) {
      res.setHeader('X-RateLimit-Limit', config.points);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000));
    }

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter || 60);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁，请稍后再试',
          retryAfter: result.retryAfter,
        },
      });
      return;
    }

    next();
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown'
    );
  }

  private getLimiterName(path: string): string {
    if (path.startsWith('/api/v1/public/')) {
      return 'public_page';
    }
    if (path.startsWith('/api/v1/auth/login')) {
      return 'login_attempt';
    }
    if (path.startsWith('/api/v1/')) {
      return 'admin_api';
    }
    return 'global_api';
  }
}

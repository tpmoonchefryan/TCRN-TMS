// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
} from '@nestjs/common';
import { Request } from 'express';

import { TechEventLogService } from '../../modules/log/services/tech-event-log.service';
import { RateLimiterService } from '../services/rate-limiter.service';

/**
 * Rate Limiter Guard
 * Applies rate limiting to public endpoints
 */
@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly logger = new Logger(RateLimiterGuard.name);

  constructor(
    private readonly rateLimiterService: RateLimiterService,
    private readonly techEventLogService: TechEventLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    
    const ip = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];
    const path = request.path;

    const result = await this.rateLimiterService.checkRateLimit(ip, userAgent);

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', '60');
    response.setHeader('X-RateLimit-Remaining', result.remaining.toString());

    if (!result.allowed) {
      // Log blocked request
      await this.logBlockedRequest(ip, userAgent, path, 'rate_limit_exceeded');

      response.setHeader('Retry-After', result.retryAfter?.toString() || '60');
      
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: Request): string {
    // Check various headers for proxied requests
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

  /**
   * Log blocked request to TechEventLog
   */
  private async logBlockedRequest(
    ip: string,
    userAgent: string | undefined,
    path: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.techEventLogService.warn(
        'SECURITY_RATE_LIMIT_BLOCKED',
        `Request blocked: ${reason}`,
        {
          ip,
          userAgent: userAgent || 'none',
          path,
          reason,
          source: 'RateLimiterGuard',
        },
      );
    } catch (error) {
      this.logger.error(`Failed to log blocked request: ${error}`);
    }
  }
}

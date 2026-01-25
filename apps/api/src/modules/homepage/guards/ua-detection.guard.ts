// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';

import { TechEventLogService } from '../../log/services/tech-event-log.service';

/**
 * Blocked User-Agent patterns (malicious crawlers)
 */
const BLOCKED_UA_PATTERNS = [
  /^$/,                           // Empty UA
  /python-requests/i,             // Default Python requests
  /scrapy/i,                      // Scrapy crawler
  /HTTrack/i,                     // Website mirroring tool
  /MJ12bot/i,                     // Malicious SEO crawler
  /PetalBot/i,                    // Aggressive crawler
  /dotbot/i,                      // SEO crawler
  /SemrushBot/i,                  // SEO crawler (optional)
  /AhrefsBot/i,                   // SEO crawler (optional)
];

/**
 * Allowed bot patterns (legitimate search engines and social platforms)
 */
const ALLOWED_BOTS = [
  /Googlebot/i,
  /Bingbot/i,
  /baiduspider/i,
  /YandexBot/i,
  /DuckDuckBot/i,
  /Slurp/i,                       // Yahoo
  /facebookexternalhit/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /Discordbot/i,
  /TelegramBot/i,
  /WhatsApp/i,
  /Applebot/i,
];

/**
 * UA Detection Guard
 * Blocks known malicious crawlers while allowing legitimate bots
 */
@Injectable()
export class UaDetectionGuard implements CanActivate {
  private readonly logger = new Logger(UaDetectionGuard.name);

  constructor(
    private readonly techEventLogService: TechEventLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userAgent = request.headers['user-agent'] || '';
    const ip = this.getClientIp(request);
    const path = request.path;

    // Allow legitimate bots
    if (ALLOWED_BOTS.some((pattern) => pattern.test(userAgent))) {
      return true;
    }

    // Block malicious UAs
    if (BLOCKED_UA_PATTERNS.some((pattern) => pattern.test(userAgent))) {
      this.logger.warn(`Blocked request from UA: ${userAgent.substring(0, 100)}, IP: ${ip}`);
      
      // Log to TechEventLog
      await this.logBlockedRequest(ip, userAgent, path, 'malicious_user_agent');
      
      return false;
    }

    return true;
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      'unknown'
    );
  }

  /**
   * Log blocked request to TechEventLog
   */
  private async logBlockedRequest(
    ip: string,
    userAgent: string,
    path: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.techEventLogService.warn(
        'SECURITY_UA_BLOCKED',
        `Request blocked: ${reason}`,
        {
          ip,
          userAgent: userAgent.substring(0, 200),
          path,
          reason,
          source: 'UaDetectionGuard',
        },
      );
    } catch (error) {
      this.logger.error(`Failed to log blocked request: ${error}`);
    }
  }
}


// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

interface UaCheckResult {
  allowed: boolean;
  reason?: string;
  isBot: boolean;
  isSuspicious: boolean;
}

// Known malicious UA patterns
const BLOCKED_UA_PATTERNS = [
  { pattern: /python-requests/i, reason: 'Python requests library' },
  { pattern: /python-urllib/i, reason: 'Python urllib library' },
  { pattern: /scrapy/i, reason: 'Scrapy crawler' },
  { pattern: /HTTrack/i, reason: 'HTTrack website copier' },
  { pattern: /MJ12bot/i, reason: 'Majestic SEO bot' },
  { pattern: /DotBot/i, reason: 'DotBot crawler' },
  { pattern: /AhrefsBot/i, reason: 'Ahrefs SEO bot' },
  { pattern: /SemrushBot/i, reason: 'Semrush SEO bot' },
  { pattern: /zgrab/i, reason: 'ZGrab scanner' },
  { pattern: /masscan/i, reason: 'Masscan scanner' },
  { pattern: /nmap/i, reason: 'Nmap scanner' },
];

// Allowed legitimate bots
const ALLOWED_BOTS = [
  { pattern: /Googlebot/i, name: 'Google' },
  { pattern: /Bingbot/i, name: 'Bing' },
  { pattern: /baiduspider/i, name: 'Baidu' },
  { pattern: /YandexBot/i, name: 'Yandex' },
  { pattern: /DuckDuckBot/i, name: 'DuckDuckGo' },
  { pattern: /facebookexternalhit/i, name: 'Facebook' },
  { pattern: /Twitterbot/i, name: 'Twitter' },
  { pattern: /LinkedInBot/i, name: 'LinkedIn' },
  { pattern: /Discordbot/i, name: 'Discord' },
  { pattern: /Slackbot/i, name: 'Slack' },
  { pattern: /TelegramBot/i, name: 'Telegram' },
];

// Suspicious UA patterns (flag but don't block in normal mode)
const SUSPICIOUS_PATTERNS = [
  { pattern: /curl/i, reason: 'curl command' },
  { pattern: /wget/i, reason: 'wget command' },
  { pattern: /httpie/i, reason: 'HTTPie client' },
  { pattern: /Go-http-client/i, reason: 'Go HTTP client' },
  { pattern: /Java\//i, reason: 'Java HTTP client' },
];

@Injectable()
export class UaDetectionService {
  /**
   * Check User-Agent
   */
  check(userAgent: string | undefined): UaCheckResult {
    if (!userAgent || userAgent.length < 5) {
      return {
        allowed: false,
        reason: 'Empty or too short User-Agent',
        isBot: false,
        isSuspicious: true,
      };
    }

    // Check if it's an allowed legitimate bot
    for (const bot of ALLOWED_BOTS) {
      if (bot.pattern.test(userAgent)) {
        return {
          allowed: true,
          isBot: true,
          isSuspicious: false,
        };
      }
    }

    // Check if it's a blocked malicious UA
    for (const blocked of BLOCKED_UA_PATTERNS) {
      if (blocked.pattern.test(userAgent)) {
        return {
          allowed: false,
          reason: blocked.reason,
          isBot: true,
          isSuspicious: true,
        };
      }
    }

    // Check for suspicious patterns (flag but allow in normal mode)
    for (const suspicious of SUSPICIOUS_PATTERNS) {
      if (suspicious.pattern.test(userAgent)) {
        return {
          allowed: true,
          reason: suspicious.reason,
          isBot: false,
          isSuspicious: true,
        };
      }
    }

    return {
      allowed: true,
      isBot: false,
      isSuspicious: false,
    };
  }

  /**
   * Strict mode check (blocks suspicious UAs)
   */
  checkStrict(userAgent: string | undefined): UaCheckResult {
    const result = this.check(userAgent);

    if (result.isSuspicious && result.allowed) {
      return {
        ...result,
        allowed: false,
      };
    }

    return result;
  }
}

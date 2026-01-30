// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../../redis';
import { CaptchaMode } from '../dto/marshmallow.dto';

import { TrustScoreService } from './trust-score.service';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface CaptchaDecision {
  required: boolean;
  reason?: string;
  forceReject?: boolean;  // If true, reject the request entirely (honeypot, etc.)
  trustLevel?: string;
}

export interface CaptchaContext {
  ip: string;
  fingerprint: string;
  userAgent: string;
  honeypotValue?: string;  // Hidden field value - should be empty for real users
  contentPreview?: string; // Optional content for risk pre-analysis
}

// Auto mode thresholds
const AUTO_MODE_CONFIG = {
  ipRequestThreshold: 3,          // Require CAPTCHA after N requests per hour from same IP
  fingerprintRequestThreshold: 5, // Require CAPTCHA after N requests per hour from same fingerprint
  multipleFingerprints: 5,        // Max fingerprints from same IP before suspicious
  trustScoreLowThreshold: 40,     // Require CAPTCHA if trust score below this
  captchaFailRateThreshold: 0.5,  // Require CAPTCHA if fail rate > 50%
};

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly trustScoreService: TrustScoreService,
  ) {}

  // =============================================================================
  // Core Methods
  // =============================================================================

  /**
   * Determine if CAPTCHA is required
   */
  async shouldRequireCaptcha(
    mode: CaptchaMode,
    context: CaptchaContext,
  ): Promise<CaptchaDecision> {
    // 0. Honeypot check - immediate rejection for bots
    if (context.honeypotValue) {
      this.logger.warn(`Honeypot triggered from IP: ${context.ip}`);
      return { required: true, reason: 'honeypot_triggered', forceReject: true };
    }

    if (mode === CaptchaMode.ALWAYS) {
      return { required: true, reason: 'config_always' };
    }

    if (mode === CaptchaMode.NEVER) {
      return { required: false };
    }

    // Auto mode: intelligent evaluation
    return this.evaluateAutoMode(context);
  }

  /**
   * Evaluate auto mode with multiple factors
   */
  private async evaluateAutoMode(context: CaptchaContext): Promise<CaptchaDecision> {
    const { ip, fingerprint, userAgent } = context;

    // 1. Check for suspicious UA first (quick check)
    if (this.isSuspiciousUA(userAgent)) {
      return { required: true, reason: 'suspicious_ua' };
    }

    // 2. Track fingerprint from this IP
    const fpCount = await this.trustScoreService.trackIpFingerprint(ip, fingerprint);
    if (fpCount > AUTO_MODE_CONFIG.multipleFingerprints) {
      this.logger.debug(`Multiple fingerprints (${fpCount}) from IP: ${ip}`);
      return { required: true, reason: 'multiple_fingerprints' };
    }

    // 3. Check trust score
    const trustScore = await this.trustScoreService.getTrustScore(fingerprint);
    if (trustScore.level === 'blocked') {
      return { required: true, reason: 'trust_blocked', forceReject: true, trustLevel: 'blocked' };
    }
    if (trustScore.level === 'suspicious' || trustScore.score < AUTO_MODE_CONFIG.trustScoreLowThreshold) {
      return { required: true, reason: 'trust_suspicious', trustLevel: trustScore.level };
    }

    // 4. Check CAPTCHA history (recent failures)
    const hasRecentFailure = await this.trustScoreService.hasRecentCaptchaFailure(fingerprint, 30);
    if (hasRecentFailure) {
      return { required: true, reason: 'recent_captcha_failure' };
    }

    // 5. Check CAPTCHA pass rate
    const passRate = await this.trustScoreService.getCaptchaPassRate(fingerprint);
    if (passRate < AUTO_MODE_CONFIG.captchaFailRateThreshold) {
      return { required: true, reason: 'low_captcha_pass_rate' };
    }

    // 6. Check IP frequency
    const ipKey = `captcha:ip:${ip}`;
    const ipCount = await this.redisService.incr(ipKey);
    if (ipCount === 1) {
      await this.redisService.expire(ipKey, 3600);
    }
    if (ipCount > AUTO_MODE_CONFIG.ipRequestThreshold) {
      return { required: true, reason: 'ip_frequency' };
    }

    // 7. Check fingerprint frequency
    const fpKey = `captcha:fp:${fingerprint}`;
    const fpReqCount = await this.redisService.incr(fpKey);
    if (fpReqCount === 1) {
      await this.redisService.expire(fpKey, 3600);
    }
    if (fpReqCount > AUTO_MODE_CONFIG.fingerprintRequestThreshold) {
      return { required: true, reason: 'fingerprint_frequency' };
    }

    // 8. Check for unusual time (optional - can be enabled based on config)
    if (this.isUnusualHour()) {
      // Only flag for suspicious time if other factors are borderline
      if (trustScore.level === 'neutral' && ipCount > 1) {
        return { required: true, reason: 'unusual_time' };
      }
    }

    // 9. Check UA change from same fingerprint
    const uaChanged = await this.checkUAChange(fingerprint, userAgent);
    if (uaChanged) {
      return { required: true, reason: 'ua_change_detected' };
    }

    // All checks passed - trusted users don't need CAPTCHA
    if (trustScore.level === 'trusted') {
      return { required: false, trustLevel: 'trusted' };
    }

    // Default: first-time visitors with neutral score don't need CAPTCHA
    return { required: false, trustLevel: trustScore.level };
  }

  /**
   * Verify Turnstile token and record result
   */
  async verifyTurnstile(token: string, ip: string, fingerprint?: string): Promise<boolean> {
    const secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY');

    if (!secretKey) {
      this.logger.warn('Turnstile secret key not configured');
      return true; // Skip verification in dev
    }

    try {
      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: secretKey,
            response: token,
            remoteip: ip,
          }),
        },
      );

      const result = await response.json();
      const passed = result.success === true;

      // Record CAPTCHA result for trust scoring
      if (fingerprint) {
        await this.trustScoreService.recordCaptchaResult(fingerprint, ip, passed);
      }

      return passed;
    } catch (error) {
      this.logger.error('Turnstile verification failed', error);
      return false;
    }
  }

  // =============================================================================
  // Detection Methods
  // =============================================================================

  /**
   * Check if UA is suspicious (likely a bot)
   */
  private isSuspiciousUA(userAgent: string): boolean {
    if (!userAgent || userAgent.length < 10) {
      return true;
    }

    const suspiciousPatterns = [
      /curl/i,
      /wget/i,
      /python-requests/i,
      /python-urllib/i,
      /python-httpx/i,
      /scrapy/i,
      /httpclient/i,
      /java\//i,
      /libwww/i,
      /lwp/i,
      /node-fetch/i,
      /axios/i,
      /got\//i,
      /phantom/i,
      /headless/i,
      /selenium/i,
      /webdriver/i,
      /puppeteer/i,
      /playwright/i,
      /mechanize/i,
      /aiohttp/i,
      /httpie/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * Check if current hour is unusual (potential bot activity)
   * Most human users are active during daytime hours
   */
  private isUnusualHour(): boolean {
    const hour = new Date().getUTCHours();
    // UTC 18-22 corresponds to roughly 2-6 AM in East Asia (major user base)
    // Adjust based on actual user demographics
    return hour >= 18 && hour <= 22;
  }

  /**
   * Check if UA has changed for a fingerprint (potential spoofing)
   */
  private async checkUAChange(fingerprint: string, currentUA: string): Promise<boolean> {
    const key = `captcha:ua:${fingerprint}`;
    const storedUA = await this.redisService.get(key);

    if (!storedUA) {
      // First time seeing this fingerprint, store the UA
      await this.redisService.set(key, currentUA, 86400); // 24 hour TTL
      return false;
    }

    // Check if UA significantly changed (not just minor version updates)
    const significantChange = this.isSignificantUAChange(storedUA, currentUA);

    if (significantChange) {
      // Update stored UA and flag as suspicious
      await this.redisService.set(key, currentUA, 86400);
      this.logger.debug(`UA change detected for fingerprint: ${fingerprint.substring(0, 8)}...`);
    }

    return significantChange;
  }

  /**
   * Check if UA change is significant (different browser/OS)
   */
  private isSignificantUAChange(oldUA: string, newUA: string): boolean {
    // Extract browser and OS from UA for comparison
    const extractBrowser = (ua: string): string => {
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      if (ua.includes('Opera')) return 'Opera';
      return 'Other';
    };

    const extractOS = (ua: string): string => {
      if (ua.includes('Windows')) return 'Windows';
      if (ua.includes('Mac')) return 'Mac';
      if (ua.includes('Linux')) return 'Linux';
      if (ua.includes('Android')) return 'Android';
      if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
      return 'Other';
    };

    const oldBrowser = extractBrowser(oldUA);
    const newBrowser = extractBrowser(newUA);
    const oldOS = extractOS(oldUA);
    const newOS = extractOS(newUA);

    // Browser or OS change is significant
    return oldBrowser !== newBrowser || oldOS !== newOS;
  }
}

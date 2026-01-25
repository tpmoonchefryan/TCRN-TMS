// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../redis';

// =============================================================================
// Types and Interfaces
// =============================================================================

export type TrustLevel = 'trusted' | 'neutral' | 'suspicious' | 'blocked';

export interface TrustScore {
  score: number;        // 0-100, initial 50
  level: TrustLevel;
  factors: TrustFactor[];
  lastUpdated: number;
}

export interface TrustFactor {
  type: TrustFactorType;
  delta: number;
  timestamp: number;
  details?: string;
}

export type TrustFactorType =
  | 'captcha_pass'
  | 'captcha_fail'
  | 'content_clean'
  | 'content_flagged'
  | 'content_rejected'
  | 'rate_limit_hit'
  | 'time_decay'
  | 'initial';

// Trust level thresholds
const TRUST_THRESHOLDS = {
  blocked: 20,      // 0-20 = blocked
  suspicious: 40,   // 21-40 = suspicious
  neutral: 70,      // 41-70 = neutral
  trusted: 100,     // 71-100 = trusted
};

// Trust score changes for different events
const TRUST_DELTAS = {
  captcha_pass: 5,
  captcha_fail: -15,
  content_clean: 2,
  content_flagged: -5,
  content_rejected: -20,
  rate_limit_hit: -10,
  time_decay: 1,  // Daily decay towards neutral (50)
};

// Cache TTL (30 days)
const TRUST_SCORE_TTL = 30 * 24 * 60 * 60;

// Maximum history entries to keep
const MAX_HISTORY_ENTRIES = 50;

@Injectable()
export class TrustScoreService {
  private readonly logger = new Logger(TrustScoreService.name);

  constructor(private readonly redisService: RedisService) {}

  // =============================================================================
  // Core Methods
  // =============================================================================

  /**
   * Get trust score for a fingerprint
   */
  async getTrustScore(fingerprint: string): Promise<TrustScore> {
    const key = this.getFingerprintKey(fingerprint);
    const cached = await this.redisService.get(key);

    if (cached) {
      try {
        const score = JSON.parse(cached) as TrustScore;
        // Apply time decay if needed
        return this.applyTimeDecay(score);
      } catch {
        // Invalid cache, return default
      }
    }

    // Return default score for new users
    return this.getDefaultScore();
  }

  /**
   * Get trust score for an IP address
   */
  async getIpTrustScore(ip: string): Promise<TrustScore> {
    const key = this.getIpKey(ip);
    const cached = await this.redisService.get(key);

    if (cached) {
      try {
        const score = JSON.parse(cached) as TrustScore;
        return this.applyTimeDecay(score);
      } catch {
        // Invalid cache
      }
    }

    return this.getDefaultScore();
  }

  /**
   * Update trust score for a fingerprint
   */
  async updateFingerprintScore(
    fingerprint: string,
    factorType: TrustFactorType,
    details?: string,
  ): Promise<TrustScore> {
    const currentScore = await this.getTrustScore(fingerprint);
    const updatedScore = this.applyFactor(currentScore, factorType, details);

    const key = this.getFingerprintKey(fingerprint);
    await this.redisService.set(key, JSON.stringify(updatedScore), TRUST_SCORE_TTL);

    // Also update history
    await this.addHistoryEntry(fingerprint, factorType, details);

    this.logger.debug(`Updated trust score for fp:${fingerprint.substring(0, 8)}... -> ${updatedScore.score} (${updatedScore.level})`);

    return updatedScore;
  }

  /**
   * Update trust score for an IP
   */
  async updateIpScore(
    ip: string,
    factorType: TrustFactorType,
    details?: string,
  ): Promise<TrustScore> {
    const currentScore = await this.getIpTrustScore(ip);
    const updatedScore = this.applyFactor(currentScore, factorType, details);

    const key = this.getIpKey(ip);
    await this.redisService.set(key, JSON.stringify(updatedScore), TRUST_SCORE_TTL);

    return updatedScore;
  }

  /**
   * Record CAPTCHA result
   */
  async recordCaptchaResult(
    fingerprint: string,
    ip: string,
    passed: boolean,
  ): Promise<void> {
    const factorType: TrustFactorType = passed ? 'captcha_pass' : 'captcha_fail';

    await Promise.all([
      this.updateFingerprintScore(fingerprint, factorType),
      this.updateIpScore(ip, factorType),
      this.addCaptchaHistory(fingerprint, passed, ip),
    ]);
  }

  /**
   * Record content submission result
   */
  async recordContentResult(
    fingerprint: string,
    ip: string,
    result: 'clean' | 'flagged' | 'rejected',
  ): Promise<void> {
    const factorTypeMap = {
      clean: 'content_clean' as TrustFactorType,
      flagged: 'content_flagged' as TrustFactorType,
      rejected: 'content_rejected' as TrustFactorType,
    };

    const factorType = factorTypeMap[result];

    await Promise.all([
      this.updateFingerprintScore(fingerprint, factorType),
      this.updateIpScore(ip, factorType),
    ]);
  }

  /**
   * Record rate limit hit
   */
  async recordRateLimitHit(fingerprint: string, ip: string): Promise<void> {
    await Promise.all([
      this.updateFingerprintScore(fingerprint, 'rate_limit_hit'),
      this.updateIpScore(ip, 'rate_limit_hit'),
    ]);
  }

  // =============================================================================
  // History Methods
  // =============================================================================

  /**
   * Get CAPTCHA history for a fingerprint
   */
  async getCaptchaHistory(fingerprint: string): Promise<Array<{ passed: boolean; timestamp: number; ip: string }>> {
    const key = `trust:captcha_history:${fingerprint}`;
    const history = await this.redisService.lrange(key, 0, 19); // Last 20 entries

    return history.map((entry) => {
      try {
        return JSON.parse(entry);
      } catch {
        return { passed: false, timestamp: 0, ip: '' };
      }
    });
  }

  /**
   * Get CAPTCHA pass rate for a fingerprint
   */
  async getCaptchaPassRate(fingerprint: string): Promise<number> {
    const history = await this.getCaptchaHistory(fingerprint);

    if (history.length === 0) {
      return 1; // No history = assume good
    }

    const passes = history.filter((h) => h.passed).length;
    return passes / history.length;
  }

  /**
   * Check if fingerprint has failed CAPTCHA recently
   */
  async hasRecentCaptchaFailure(fingerprint: string, withinMinutes: number = 30): Promise<boolean> {
    const history = await this.getCaptchaHistory(fingerprint);
    const cutoff = Date.now() - withinMinutes * 60 * 1000;

    return history.some((h) => !h.passed && h.timestamp > cutoff);
  }

  // =============================================================================
  // IP Fingerprint Tracking
  // =============================================================================

  /**
   * Track fingerprints seen from an IP
   */
  async trackIpFingerprint(ip: string, fingerprint: string): Promise<number> {
    const key = `trust:ip_fps:${ip}`;

    await this.redisService.sadd(key, fingerprint);
    await this.redisService.expire(key, 3600); // 1 hour window

    return await this.redisService.scard(key);
  }

  /**
   * Get count of unique fingerprints from an IP
   */
  async getIpFingerprintCount(ip: string): Promise<number> {
    const key = `trust:ip_fps:${ip}`;
    return await this.redisService.scard(key);
  }

  /**
   * Check if IP has seen too many fingerprints (potential bot farm)
   */
  async hasExcessiveFingerprints(ip: string, threshold: number = 5): Promise<boolean> {
    const count = await this.getIpFingerprintCount(ip);
    return count > threshold;
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private getFingerprintKey(fingerprint: string): string {
    return `trust:fp:${fingerprint}`;
  }

  private getIpKey(ip: string): string {
    return `trust:ip:${ip}`;
  }

  private getDefaultScore(): TrustScore {
    return {
      score: 50,
      level: 'neutral',
      factors: [{ type: 'initial', delta: 0, timestamp: Date.now() }],
      lastUpdated: Date.now(),
    };
  }

  private applyFactor(
    current: TrustScore,
    factorType: TrustFactorType,
    details?: string,
  ): TrustScore {
    const delta = TRUST_DELTAS[factorType] || 0;
    const newScore = Math.max(0, Math.min(100, current.score + delta));

    const newFactor: TrustFactor = {
      type: factorType,
      delta,
      timestamp: Date.now(),
      details,
    };

    // Keep only recent factors (last 20)
    const factors = [newFactor, ...current.factors].slice(0, 20);

    return {
      score: newScore,
      level: this.scoreToLevel(newScore),
      factors,
      lastUpdated: Date.now(),
    };
  }

  private applyTimeDecay(score: TrustScore): TrustScore {
    const now = Date.now();
    const daysSinceUpdate = (now - score.lastUpdated) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate < 1) {
      return score; // No decay needed
    }

    // Decay towards neutral (50)
    const decayDays = Math.floor(daysSinceUpdate);
    let newScore = score.score;

    for (let i = 0; i < decayDays; i++) {
      if (newScore > 50) {
        newScore = Math.max(50, newScore - TRUST_DELTAS.time_decay);
      } else if (newScore < 50) {
        newScore = Math.min(50, newScore + TRUST_DELTAS.time_decay);
      }
    }

    if (newScore === score.score) {
      return score;
    }

    return {
      ...score,
      score: newScore,
      level: this.scoreToLevel(newScore),
      lastUpdated: now,
    };
  }

  private scoreToLevel(score: number): TrustLevel {
    if (score <= TRUST_THRESHOLDS.blocked) {
      return 'blocked';
    }
    if (score <= TRUST_THRESHOLDS.suspicious) {
      return 'suspicious';
    }
    if (score <= TRUST_THRESHOLDS.neutral) {
      return 'neutral';
    }
    return 'trusted';
  }

  private async addHistoryEntry(
    fingerprint: string,
    factorType: TrustFactorType,
    details?: string,
  ): Promise<void> {
    const key = `trust:history:${fingerprint}`;
    const entry = JSON.stringify({
      type: factorType,
      timestamp: Date.now(),
      details,
    });

    await this.redisService.lpush(key, entry);
    await this.redisService.ltrim(key, 0, MAX_HISTORY_ENTRIES - 1);
    await this.redisService.expire(key, TRUST_SCORE_TTL);
  }

  private async addCaptchaHistory(
    fingerprint: string,
    passed: boolean,
    ip: string,
  ): Promise<void> {
    const key = `trust:captcha_history:${fingerprint}`;
    const entry = JSON.stringify({
      passed,
      timestamp: Date.now(),
      ip,
    });

    await this.redisService.lpush(key, entry);
    await this.redisService.ltrim(key, 0, 19); // Keep last 20
    await this.redisService.expire(key, TRUST_SCORE_TTL);
  }
}

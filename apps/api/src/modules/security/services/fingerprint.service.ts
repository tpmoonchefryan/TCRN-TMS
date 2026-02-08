// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class FingerprintService {
  private readonly logger = new Logger(FingerprintService.name);
  private readonly secretKey: string;
  private readonly previousKey: string | null;
  private readonly keyVersion: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>(
      'FINGERPRINT_SECRET_KEY',
      'dev-fingerprint-key-min-32-chars',
    );
    this.previousKey = this.configService.get<string>('FINGERPRINT_PREVIOUS_KEY') || null;
    this.keyVersion = this.configService.get<string>('FINGERPRINT_KEY_VERSION', 'v1');

    if (this.secretKey.length < 32) {
      this.logger.warn('FINGERPRINT_SECRET_KEY should be at least 32 characters');
    }
  }

  /**
   * Generate technical fingerprint
   */
  generateFingerprint(tenantId: string, userId: string): string {
    const payload = `${tenantId}|${userId}`;
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Generate versioned fingerprint
   */
  generateVersionedFingerprint(
    tenantId: string,
    userId: string,
  ): { fingerprint: string; version: string } {
    return {
      fingerprint: this.generateFingerprint(tenantId, userId),
      version: this.keyVersion,
    };
  }

  /**
   * Generate short fingerprint for watermark
   */
  generateShortFingerprint(tenantId: string, userId: string): string {
    return this.generateFingerprint(tenantId, userId).substring(0, 16);
  }

  /**
   * Verify fingerprint
   */
  verifyFingerprint(fingerprint: string, tenantId: string, userId: string): boolean {
    const expected = this.generateFingerprint(tenantId, userId);

    try {
      return crypto.timingSafeEqual(
        Buffer.from(fingerprint, 'hex'),
        Buffer.from(expected, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Verify with key rotation support
   */
  verifyWithRotation(
    fingerprint: string,
    tenantId: string,
    userId: string,
  ): { valid: boolean; keyVersion: string } {
    // Try current key first
    if (this.verifyFingerprint(fingerprint, tenantId, userId)) {
      return { valid: true, keyVersion: this.keyVersion };
    }

    // Try previous key if available
    if (this.previousKey) {
      const previousValid = this.verifyWithKey(fingerprint, tenantId, userId, this.previousKey);
      if (previousValid) {
        return { valid: true, keyVersion: 'previous' };
      }
    }

    return { valid: false, keyVersion: 'invalid' };
  }

  /**
   * Verify with specific key
   */
  private verifyWithKey(
    fingerprint: string,
    tenantId: string,
    userId: string,
    key: string,
  ): boolean {
    const payload = `${tenantId}|${userId}`;
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(payload);
    const expected = hmac.digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(fingerprint, 'hex'),
        Buffer.from(expected, 'hex'),
      );
    } catch {
      return false;
    }
  }
}

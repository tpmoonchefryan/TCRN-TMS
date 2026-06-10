// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ErrorCodes } from '@tcrn/shared';

interface FailureEntry {
  count: number;
  expiresAt: number;
  blockedUntil: number | null;
}

@Injectable()
export class AuthFailureLimiterService {
  private readonly failures = new Map<string, FailureEntry>();
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private readonly lockoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.maxFailures = Number(this.configService.get('AUTH_FAILURE_MAX_ATTEMPTS', 5));
    this.windowMs = Number(this.configService.get('AUTH_FAILURE_WINDOW_MS', 15 * 60 * 1000));
    this.lockoutMs = Number(this.configService.get('AUTH_FAILURE_LOCKOUT_MS', 15 * 60 * 1000));
  }

  async assertCanAttempt(ipAddress: string): Promise<void> {
    const key = this.normalizeKey(ipAddress);
    const entry = this.readEntry(key);

    if (entry?.blockedUntil && entry.blockedUntil > Date.now()) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_ACCOUNT_LOCKED,
        message: 'Too many failed login attempts. Please try again later.',
        details: {
          lockedUntil: new Date(entry.blockedUntil).toISOString(),
        },
      });
    }
  }

  async recordFailure(ipAddress: string): Promise<void> {
    const key = this.normalizeKey(ipAddress);
    const now = Date.now();
    const current = this.readEntry(key);
    const nextCount = (current?.count ?? 0) + 1;

    this.failures.set(key, {
      count: nextCount,
      expiresAt: now + this.windowMs,
      blockedUntil: nextCount >= this.maxFailures ? now + this.lockoutMs : null,
    });
  }

  async clearFailures(ipAddress: string): Promise<void> {
    this.failures.delete(this.normalizeKey(ipAddress));
  }

  normalizeFailure(): UnauthorizedException {
    return new UnauthorizedException({
      code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
      message: 'Invalid username or password',
    });
  }

  private readEntry(key: string): FailureEntry | null {
    const entry = this.failures.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.failures.delete(key);
      return null;
    }

    return entry;
  }

  private normalizeKey(ipAddress: string): string {
    return ipAddress.trim() || 'unknown';
  }
}

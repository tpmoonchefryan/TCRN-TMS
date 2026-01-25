// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { AppConfig } from '@tcrn/shared';
import * as argon2 from 'argon2';


/**
 * Password Validation Result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Password Service
 * PRD §19 P-9: Password policy & hashing with Argon2id
 */
@Injectable()
export class PasswordService {
  /**
   * Hash a password using Argon2id
   */
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MiB
      timeCost: 3,
      parallelism: 4,
    });
  }

  /**
   * Verify a password against a hash
   */
  async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Validate password against policy
   * PRD §19 P-9: Password complexity requirements
   */
  validate(password: string): PasswordValidationResult {
    const errors: string[] = [];
    const policy = AppConfig.PASSWORD;

    // Check minimum length
    if (password.length < policy.MIN_LENGTH) {
      errors.push(`Password must be at least ${policy.MIN_LENGTH} characters`);
    }

    // Check uppercase
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check lowercase
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check number
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check special character
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password is the same as the old one
   */
  async isSamePassword(newPassword: string, oldHash: string): Promise<boolean> {
    return this.verify(newPassword, oldHash);
  }

  /**
   * Calculate password expiry date
   */
  getPasswordExpiryDate(): Date {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + AppConfig.PASSWORD.EXPIRY_DAYS);
    return expiryDate;
  }

  /**
   * Check if password is expired
   */
  isPasswordExpired(passwordChangedAt: Date | null): boolean {
    if (!passwordChangedAt) {
      return true; // Force reset if never changed
    }

    const expiryDate = new Date(passwordChangedAt);
    expiryDate.setDate(expiryDate.getDate() + AppConfig.PASSWORD.EXPIRY_DAYS);
    
    return new Date() > expiryDate;
  }
}

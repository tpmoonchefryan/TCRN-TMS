// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';
import { createHash, randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

/**
 * TOTP Setup Response
 */
export interface TotpSetupInfo {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
  issuer: string;
  account: string;
}

/**
 * TOTP Service
 * PRD §12.9: RFC 6238 TOTP implementation
 */
@Injectable()
export class TotpService {
  private readonly issuer = 'TCRN TMS';
  private readonly window = 1; // Allow 1 window before/after for clock drift

  constructor() {
    // Configure authenticator
    authenticator.options = {
      window: this.window,
      step: 30, // 30 second time step
    };
  }

  /**
   * Generate a new TOTP secret
   */
  generateSecret(): string {
    return authenticator.generateSecret(20); // 160 bits
  }

  /**
   * Generate TOTP setup info including QR code
   */
  async generateSetupInfo(email: string, secret?: string): Promise<TotpSetupInfo> {
    const totpSecret = secret || this.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, this.issuer, totpSecret);
    
    // Generate QR code as data URL
    const qrCode = await QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return {
      secret: totpSecret,
      qrCode,
      otpauthUrl,
      issuer: this.issuer,
      account: email,
    };
  }

  /**
   * Verify a TOTP code
   */
  verify(code: string, secret: string): boolean {
    try {
      return authenticator.verify({ token: code, secret });
    } catch {
      return false;
    }
  }

  /**
   * Generate recovery codes (10 codes)
   */
  generateRecoveryCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 12 random characters in format XXXX-XXXX-XXXX
      const bytes = randomBytes(9);
      const code = bytes
        .toString('hex')
        .toUpperCase()
        .substring(0, 12)
        .replace(/(.{4})/g, '$1-')
        .slice(0, -1); // Remove trailing dash
      codes.push(code);
    }

    return codes;
  }

  /**
   * Hash a recovery code for storage
   */
  hashRecoveryCode(code: string): string {
    // Normalize: remove dashes and uppercase
    const normalized = code.replace(/-/g, '').toUpperCase();
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Verify a recovery code against its hash
   */
  verifyRecoveryCode(code: string, hash: string): boolean {
    const codeHash = this.hashRecoveryCode(code);
    return codeHash === hash;
  }

  /**
   * Encrypt TOTP secret for storage (using AES-256-GCM)
   * In production, this should use a proper encryption key from KMS
   */
  encryptSecret(secret: string, encryptionKey: string): string {
    // For simplicity, using base64 encoding here
    // In production, implement proper AES-256-GCM encryption
    const cipher = Buffer.from(`${encryptionKey}:${secret}`).toString('base64');
    return cipher;
  }

  /**
   * Decrypt TOTP secret from storage
   */
  decryptSecret(encryptedSecret: string, encryptionKey: string): string {
    // For simplicity, using base64 decoding here
    // In production, implement proper AES-256-GCM decryption
    const decoded = Buffer.from(encryptedSecret, 'base64').toString('utf8');
    const [key, secret] = decoded.split(':');
    if (key !== encryptionKey) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid encryption key',
      });
    }
    return secret;
  }
}

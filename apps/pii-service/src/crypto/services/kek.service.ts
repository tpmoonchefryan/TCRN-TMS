// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import * as crypto from 'crypto';

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Key Encryption Key (KEK) Service
 * Manages the master key used to encrypt/decrypt tenant DEKs
 */
@Injectable()
export class KekService implements OnModuleInit {
  private kek: Buffer | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.loadKek();
  }

  /**
   * Load KEK from environment or secure storage
   * In production, this should integrate with AWS KMS, HashiCorp Vault, etc.
   */
  private loadKek(): void {
    const kekBase64 = this.configService.get<string>('PII_KEK');

    if (!kekBase64) {
      // Generate a development KEK if not provided
      if (this.configService.get('NODE_ENV') === 'development') {
        this.kek = crypto.randomBytes(32);
        console.warn('WARNING: Using auto-generated KEK. DO NOT use in production!');
        return;
      }
      throw new Error('PII_KEK environment variable is required');
    }

    this.kek = Buffer.from(kekBase64, 'base64');

    if (this.kek.length !== 32) {
      throw new Error('KEK must be 256 bits (32 bytes)');
    }
  }

  /**
   * Get the KEK for DEK encryption/decryption
   */
  getKek(): Buffer {
    if (!this.kek) {
      throw new Error('KEK not initialized');
    }
    return this.kek;
  }

  /**
   * Encrypt data using KEK (for encrypting DEKs)
   */
  encryptWithKek(plaintext: Buffer): Buffer {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.getKek(), iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    // Format: IV (12 bytes) + Tag (16 bytes) + Ciphertext
    return Buffer.concat([iv, tag, encrypted]);
  }

  /**
   * Decrypt data using KEK (for decrypting DEKs)
   */
  decryptWithKek(ciphertext: Buffer | Uint8Array): Buffer {
    // Convert Uint8Array to Buffer if needed (Prisma 6.x returns Uint8Array)
    const buffer = Buffer.isBuffer(ciphertext) ? ciphertext : Buffer.from(ciphertext);
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.getKek(), iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
  }
}

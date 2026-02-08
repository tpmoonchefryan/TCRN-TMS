// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

import { DekService } from './dek.service';

/**
 * Crypto Service
 * Provides high-level encryption/decryption for PII data
 */
@Injectable()
export class CryptoService {
  constructor(private readonly dekService: DekService) {}

  /**
   * Encrypt a string value
   */
  async encryptString(tenantId: string, plaintext: string | null): Promise<Buffer | null> {
    if (!plaintext) return null;

    const dek = await this.dekService.getDekForTenant(tenantId);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    // Format: IV (12 bytes) + Tag (16 bytes) + Ciphertext
    return Buffer.concat([iv, tag, encrypted]);
  }

  /**
   * Decrypt a buffer to string
   */
  async decryptString(tenantId: string, ciphertext: Buffer | Uint8Array | null): Promise<string | null> {
    if (!ciphertext) return null;

    // Convert Uint8Array to Buffer if needed (Prisma 6.x returns Uint8Array)
    const buffer = Buffer.isBuffer(ciphertext) ? ciphertext : Buffer.from(ciphertext);

    const dek = await this.dekService.getDekForTenant(tenantId);
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  /**
   * Encrypt JSON data
   */
  async encryptJson(tenantId: string, data: unknown): Promise<Buffer | null> {
    if (data === null || data === undefined) return null;
    return this.encryptString(tenantId, JSON.stringify(data));
  }

  /**
   * Decrypt JSON data
   */
  async decryptJson<T>(tenantId: string, ciphertext: Buffer | Uint8Array | null): Promise<T | null> {
    if (!ciphertext) return null;
    const json = await this.decryptString(tenantId, ciphertext);
    return json ? JSON.parse(json) : null;
  }

  /**
   * Compute SHA-256 hash for data integrity verification
   */
  computeHash(data: object): string {
    const json = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Verify data integrity
   */
  verifyHash(data: object, expectedHash: string): boolean {
    return this.computeHash(data) === expectedHash;
  }
}
